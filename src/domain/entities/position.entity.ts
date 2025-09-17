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
  network!: string;

  @Column()
  assetAddress!: string;

  @Column()
  assetSymbol!: string;

  @Column('decimal', { precision: 36, scale: 18 })
  collateralAmount!: string;

  @Column('decimal', { precision: 36, scale: 2 })
  collateralAmountUSD!: string;

  @Column('decimal', { precision: 36, scale: 18 })
  debtAmount!: string;

  @Column('decimal', { precision: 36, scale: 2 })
  debtAmountUSD!: string;

  @Column()
  healthFactor!: string;

  @Column()
  liquidationThreshold!: string;

  @Column()
  ltv!: string;

  @Column('json', { nullable: true })
  suppliedAssets?: {
    symbol: string;
    address: string;
    amount: string;
    valueUSD?: string;
    valueETH?: string;
  }[];

  @Column('json', { nullable: true })
  borrowedAssets?: {
    symbol: string;
    address: string;
    amount: string;
    valueUSD?: string;
    valueETH?: string;
  }[];

  @Column('decimal', { precision: 36, scale: 2, nullable: true })
  totalCollateralUSD?: string;

  @Column('decimal', { precision: 36, scale: 2, nullable: true })
  totalDebtUSD?: string;

  @Column({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdated!: Date;
}
