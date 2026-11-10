import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout as esperar } from 'node:timers/promises';
import {
  Consumer,
  MessagesStream,
  MessagesStreamFallbackModes,
  MessagesStreamModes,
  stringDeserializers,
} from '@platformatic/kafka';
import { Contrato, EventoInvalido } from './contrato.js';

export type Resultado = 'nuevo' | 'duplicado' | 'ignorado';

export interface Procesador<T> {
  procesar(evento: T): Promise<Resultado>;
}

export type OpcionesGrupo<T extends object> = {
  grupo: string;
  topics: string[];
  dto: new () => T;
  desdeElPrincipio?: boolean;
};

const ESPERA_REINTENTO_MS = 2000;
const CADA_RESUMEN_MS = 10_000;

export abstract class ConsumidorKafka<T extends object>
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly log: Logger;
  private readonly consumidor: Consumer<string, string, string, string>;
  private readonly contrato: Contrato<T>;
  private flujo?: MessagesStream<string, string, string, string>;
  private reloj?: NodeJS.Timeout;
  private cerrando = false;
  private readonly cuenta = { nuevos: 0, duplicados: 0, ignorados: 0, invalidos: 0 };
  private ultimoResumen = '';

  protected constructor(
    config: ConfigService,
    private readonly opciones: OpcionesGrupo<T>,
    private readonly negocio: Procesador<T>,
  ) {
    this.log = new Logger(opciones.grupo);
    this.contrato = new Contrato(opciones.dto);
    this.consumidor = new Consumer({
      groupId: opciones.grupo,
      clientId: 'biblioteca-eventos',
      bootstrapBrokers: config.getOrThrow<string>('KAFKA_BROKERS').split(','),
      deserializers: stringDeserializers,
    });
  }

  async onModuleInit(): Promise<void> {
    this.flujo = await this.consumidor.consume({
      topics: this.opciones.topics,
      autocommit: false,
      mode: this.opciones.desdeElPrincipio
        ? MessagesStreamModes.EARLIEST
        : MessagesStreamModes.COMMITTED,
      fallbackMode: MessagesStreamFallbackModes.EARLIEST,
    });

    this.log.log(`grupo ${this.opciones.grupo} leyendo ${this.opciones.topics.join(' y ')}`);
    this.reloj = setInterval(() => this.resumir(), CADA_RESUMEN_MS);
    void this.leer();
  }

  private async leer(): Promise<void> {
    try {
      for await (const mensaje of this.flujo!) {
        const donde = `${mensaje.topic}[${mensaje.partition}]@${mensaje.offset}`;
        let evento: T;

        try {
          evento = this.contrato.validar(mensaje);
        } catch (error) {
          if (!(error instanceof EventoInvalido)) throw error;

          this.cuenta.invalidos++;
          this.log.warn(`${donde} INVALIDO: ${error.message}`);
          await mensaje.commit();
          continue;
        }

        const resultado = await this.procesarHastaEscribir(evento, donde);
        if (resultado === undefined) return;

        if (resultado === 'nuevo') this.cuenta.nuevos++;
        if (resultado === 'ignorado') this.cuenta.ignorados++;
        if (resultado === 'duplicado') {
          this.cuenta.duplicados++;
          this.log.warn(`${donde} DUPLICADO: ya estaba procesado, no suma`);
        }

        await mensaje.commit();
      }
    } catch (error) {
      if (!this.cerrando) {
        this.log.error(`el consumidor se detuvo: ${(error as Error).message}`);
      }
    }
  }

  private async procesarHastaEscribir(
    evento: T,
    donde: string,
  ): Promise<Resultado | undefined> {
    while (!this.cerrando) {
      try {
        return await this.negocio.procesar(evento);
      } catch (error) {
        this.log.error(
          `${donde} no se pudo escribir, se reintenta en 2 s: ${(error as Error).message}`,
        );
        await esperar(ESPERA_REINTENTO_MS);
      }
    }

    return undefined;
  }

  private resumir(): void {
    const { nuevos, duplicados, ignorados, invalidos } = this.cuenta;
    const texto = `desde el arranque: ${nuevos} nuevos, ${duplicados} duplicados, ${ignorados} ignorados, ${invalidos} invalidos`;

    if (texto === this.ultimoResumen || nuevos + duplicados + ignorados + invalidos === 0) {
      return;
    }

    this.ultimoResumen = texto;
    this.log.log(texto);
  }

  async onModuleDestroy(): Promise<void> {
    this.cerrando = true;
    clearInterval(this.reloj);
    this.resumir();
    await this.flujo?.close();
    await this.consumidor.close();
  }
}