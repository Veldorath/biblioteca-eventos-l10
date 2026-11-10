import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'kpi_minuto' })
@Index('ix_kpi_minuto_minuto', ['minuto'])
export class KpiMinuto {
  @PrimaryColumn({ name: 'evento_id', type: 'uuid' })
  eventoId!: string;

  @Column({ type: 'timestamptz' })
  minuto!: Date;

  @Column({ name: 'libro_id', type: 'text' })
  libroId!: string;

  @Column({ type: 'text' })
  tipo!: string;
}