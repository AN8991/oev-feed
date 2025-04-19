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

  @Column({ type: 'bigint' })
  collateralAmount!: string;

  @Column({ type: 'bigint' })
  collateralAmountETH!: string;

  @Column({ type: 'bigint' })
  debtAmount!: string;

  @Column({ type: 'bigint' })
  debtAmountETH!: string;

  @Column({ type: 'bigint' })
  healthFactor!: string;

  @Column({ type: 'bigint' })
  liquidationThreshold!: string;

  @Column({ type: 'bigint' })
  ltv!: string;

  @Column({ type: 'bigint' })
  lastUpdated!: string;
}
