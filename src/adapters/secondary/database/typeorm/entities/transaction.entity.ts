import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Block } from './block.entity';
import { OevEvent } from './oev-event.entity';

/**
 * Entity for storing blockchain transaction data
 */
@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column()
  @Index()
  hash!: string;

  @ManyToOne(() => Block, block => block.transactions)
  @JoinColumn({ name: 'block_id' })
  block!: Block;

  @Column({ name: 'block_id' })
  blockId!: string;

  @Column({ name: 'block_number', type: 'bigint' })
  @Index()
  blockNumber!: string;

  @Column()
  @Index()
  network!: string;

  @Column({ name: 'from_address' })
  @Index()
  fromAddress!: string;

  @Column({ name: 'to_address', nullable: true })
  @Index()
  toAddress?: string;

  @Column({ type: 'bigint' })
  value!: string;

  @Column({ type: 'bigint' })
  gasPrice!: string;

  @Column({ name: 'gas_used', type: 'bigint' })
  gasUsed!: string;

  @Column({ name: 'gas_limit', type: 'bigint' })
  gasLimit!: string;

  @Column({ name: 'transaction_index' })
  transactionIndex!: number;

  @Column({ name: 'is_error', default: false })
  isError!: boolean;

  @Column({ name: 'is_oev_related', default: false })
  @Index()
  isOevRelated!: boolean;

  @Column({ name: 'input_data', type: 'text', nullable: true })
  inputData?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relationships
  @OneToMany(() => OevEvent, oevEvent => oevEvent.transaction)
  oevEvents!: OevEvent[];
}
