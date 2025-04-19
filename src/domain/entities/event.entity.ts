import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  type!: string;

  @Column()
  positionId!: string;

  @Column()
  description!: string;

  @Column({ type: 'timestamp' })
  timestamp!: Date;
}
