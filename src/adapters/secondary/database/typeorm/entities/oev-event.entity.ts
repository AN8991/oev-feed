import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Transaction } from './transaction.entity';
import { OevOpportunity } from './oev-opportunity.entity';

/**
 * Entity for storing OEV-related events (oracle updates, etc.)
 */
@Entity('oev_events')
export class OevEvent extends BaseEntity {
  @ManyToOne(() => Transaction, transaction => transaction.oevEvents)
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;

  @Column({ name: 'transaction_id' })
  transactionId!: string;

  @Column()
  @Index()
  network!: string;

  @Column({ name: 'protocol_name' })
  @Index()
  protocolName!: string;

  @Column({ name: 'event_type' })
  @Index()
  eventType!: string;

  @Column({ name: 'contract_address' })
  @Index()
  contractAddress!: string;

  @Column({ name: 'oracle_address' })
  @Index()
  oracleAddress!: string;

  @Column({ name: 'block_number', type: 'bigint' })
  @Index()
  blockNumber!: string;

  @Column({ name: 'log_index' })
  logIndex!: number;

  @Column({ name: 'timestamp', type: 'timestamp' })
  @Index()
  timestamp!: Date;

  @Column({ type: 'jsonb' })
  data!: Record<string, any>;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue?: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue?: string;

  @Column({ name: 'price_impact', type: 'decimal', precision: 18, scale: 8, nullable: true })
  priceImpact?: number;

  @Column({ name: 'is_analyzed', default: false })
  isAnalyzed!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relationships
  @OneToMany(() => OevOpportunity, opportunity => opportunity.oevEvent)
  opportunities!: OevOpportunity[];
}
