// TypeORM entity for Position
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

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

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  collateralAmount!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  collateralAmountUSD!: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  debtAmount!: string;

  @Column({ type: 'decimal', precision: 20, scale: 2 })
  debtAmountUSD!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  healthFactor!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  liquidationThreshold!: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  ltv!: string;

  @Column({ type: 'timestamp' })
  lastUpdated!: Date;

  // Risk Assessment Fields
  @Column({ name: 'risk_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  riskScore?: string;

  @Column({ name: 'risk_level', type: 'varchar', length: 20, nullable: true })
  riskLevel?: string;

  @Column({ name: 'risk_assessed_at', type: 'timestamp', nullable: true })
  riskAssessedAt?: Date;
}
