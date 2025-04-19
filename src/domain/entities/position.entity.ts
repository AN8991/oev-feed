import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userAddress!: string;

  @Column()
  protocol!: string;

  @Column()
  asset!: string;

  @Column()
  amount!: string;

  @Column()
  healthFactor!: string;

  @Column({ type: 'timestamp' })
  updatedAt!: Date;
}
