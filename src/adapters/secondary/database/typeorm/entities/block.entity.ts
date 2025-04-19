import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Transaction } from './transaction.entity';

/**
 * Entity for storing blockchain block data
 */
@Entity('blocks')
export class Block extends BaseEntity {
  @Column()
  @Index()
  network!: string;

  @Column({ type: 'bigint' })
  @Index()
  number!: string;

  @Column()
  hash!: string;

  @Column({ name: 'parent_hash' })
  parentHash!: string;

  @Column({ name: 'timestamp', type: 'timestamp' })
  @Index()
  timestamp!: Date;

  @Column({ name: 'gas_used', type: 'bigint' })
  gasUsed!: string;

  @Column({ name: 'gas_limit', type: 'bigint' })
  gasLimit!: string;

  @Column({ name: 'base_fee_per_gas', type: 'bigint', nullable: true })
  baseFeePerGas?: string;

  @Column({ name: 'is_processed', default: false })
  isProcessed!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relationships
  @OneToMany(() => Transaction, transaction => transaction.block)
  transactions!: Transaction[];
}
