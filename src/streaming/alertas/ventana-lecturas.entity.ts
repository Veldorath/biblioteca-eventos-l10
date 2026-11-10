import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'ventanas_lectura' })
export class VentanaLecturas {
  @PrimaryColumn({ name: 'libro_id', type: 'text' })
  libroId!: string;

  @PrimaryColumn({ type: 'timestamptz' })
  ventana!: Date;

  @Column({ type: 'int' })
  terminadas!: number;

  @Column({ name: 'en_error', type: 'int' })
  enError!: number;
}