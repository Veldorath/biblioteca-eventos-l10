import type { Message } from '@platformatic/kafka';
import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';

export type Mensaje = Message<string, string, string, string>;

export class EventoInvalido extends Error {}

export class Contrato<T extends object> {
  constructor(private readonly dto: new () => T) {}

  validar(m: Mensaje): T {
    let crudo: unknown;
    try {
      crudo = JSON.parse(m.value);
    } catch (error) {
      throw new EventoInvalido(`no es un JSON de evento (${(error as Error).message})`);
    }

    if (crudo === null || typeof crudo !== 'object' || Array.isArray(crudo)) {
      throw new EventoInvalido('el sobre debe ser un objeto JSON');
    }

    const evento = plainToInstance(this.dto, crudo);
    const errores = validateSync(evento, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errores.length > 0) {
      throw new EventoInvalido(motivos(errores).join('; '));
    }

    return evento;
  }
}

function motivos(errores: ValidationError[], ruta = ''): string[] {
  return errores.flatMap((e) => [
    ...(e.constraints ? [`${ruta}${e.property} (${Object.keys(e.constraints).join(', ')})`] : []),
    ...motivos(e.children ?? [], `${ruta}${e.property}.`),
  ]);
}