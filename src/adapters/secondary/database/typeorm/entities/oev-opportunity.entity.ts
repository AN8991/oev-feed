import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OevEvent } from './oev-event.entity';

/**
 * Entity for storing OEV opportunities (MEV extraction possibilities)
 */
@Entity('oev_opportunities')
export class OevOpportunity extends BaseEntity {
  @ManyToOne(() => OevEvent, oevEvent => oevEvent.opportunities)
  @JoinColumn({ name: 'oev_event_id' })
  oevEvent!: OevEvent;

  @Column({ name: 'oev_event_id' })
  oevEventId!: string;

  @Column()
  @Index()
  network!: string;

  @Column({ name: 'protocol_name' })
  @Index()
  protocolName!: string;

  @Column({ name: 'opportunity_type' })
  @Index()
  opportunityType!: string;

  @Column({ name: 'contract_address' })
  @Index()
  contractAddress!: string;

  @Column({ name: 'timestamp', type: 'timestamp' })
  @Index()
  timestamp!: Date;

  @Column({ name: 'block_number', type: 'bigint' })
  @Index()
  blockNumber!: string;

  @Column({ name: 'estimated_profit', type: 'decimal', precision: 18, scale: 8 })
  estimatedProfit!: number;

  @Column({ name: 'profit_token' })
  profitToken!: string;

  @Column({ name: 'profit_usd', type: 'decimal', precision: 18, scale: 2, nullable: true })
  profitUsd?: number;

  @Column({ name: 'gas_estimate', type: 'bigint', nullable: true })
  gasEstimate?: string;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2 })
  confidenceScore!: number;

  @Column({ name: 'execution_strategy', nullable: true })
  executionStrategy?: string;

  @Column({ name: 'is_executed', default: false })
  isExecuted!: boolean;

  @Column({ name: 'execution_tx_hash', nullable: true })
  executionTxHash?: string;

  @Column({ name: 'actual_profit', type: 'decimal', precision: 18, scale: 8, nullable: true })
  actualProfit?: number;

  @Column({ name: 'actual_profit_usd', type: 'decimal', precision: 18, scale: 2, nullable: true })
  actualProfitUsd?: number;

  @Column({ type: 'jsonb' })
  data!: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
