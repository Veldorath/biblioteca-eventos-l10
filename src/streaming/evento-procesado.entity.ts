import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'eventos_procesados' })
export class EventoProcesado {
  @PrimaryColumn({ type: 'text' })
  grupo!: string;

  @PrimaryColumn({ name: 'evento_id', type: 'uuid' })
  eventoId!: string;

  @CreateDateColumn({ name: 'procesado_en', type: 'timestamptz' })
  procesadoEn!: Date;
}