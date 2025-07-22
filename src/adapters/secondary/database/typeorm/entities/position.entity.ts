// TypeORM entity for Position
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';

@Entity('positions')
export class PositionEntity {
  @PrimaryColumn()
  id!: string;

  @ManyToOne(() => UserEntity, user => user.positions, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column()
  userAddress!: string;

  @Column()
  protocol!: string;

  @Column()
  network!: string;

  @Column()
  assetAddress!: string;

  @Column()
  assetSymbol!: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  collateralAmount!: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  collateralAmountUSD!: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  debtAmount!: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  debtAmountUSD!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  healthFactor!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  liquidationThreshold!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  ltv!: string;

  @Column({ type: 'bigint' })
  lastUpdated!: string;
}
