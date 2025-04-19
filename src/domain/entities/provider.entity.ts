import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  network!: string;

  @Column()
  status!: string;

  @Column({ type: 'timestamp' })
  lastChecked!: Date;

  @Column('int')
  healthScore!: number;
}
