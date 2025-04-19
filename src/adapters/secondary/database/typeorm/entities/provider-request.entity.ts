import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Provider } from './provider.entity';

/**
 * Entity for tracking provider requests and their outcomes
 */
@Entity('provider_requests')
export class ProviderRequest extends BaseEntity {
  @ManyToOne(() => Provider, provider => provider.requests)
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @Column({ length: 50 })
  network!: string;

  @Column({ length: 100 })
  method!: string;

  @Column({ type: 'jsonb', nullable: true })
  params?: any;

  @Column({ type: 'int' })
  responseTime!: number;

  @Column({ default: false })
  isError!: boolean;

  @Column({ length: 255, nullable: true })
  errorMessage?: string;

  @Column({ length: 50, nullable: true })
  errorType?: string;

  @Column({ default: false })
  isRateLimit!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
