import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'prestamos_vistos' })
export class PrestamoVisto {
  @PrimaryColumn({ name: 'prestamo_id', type: 'text' })
  prestamoId!: string;

  @Column({ type: 'date' })
  semana!: string;

  @Column({ name: 'libro_id', type: 'text' })
  libroId!: string;

  @Column({ type: 'boolean' })
  devuelto!: boolean;
}