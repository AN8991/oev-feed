import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Provider } from './provider.entity';

/**
 * Entity for tracking provider health metrics
 */
@Entity('provider_health')
export class ProviderHealth extends BaseEntity {
  @ManyToOne(() => Provider, provider => provider.healthChecks)
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ name: 'provider_id' })
  providerId!: string;

  @Column({ length: 50 })
  network!: string;

  @Column({ default: true })
  isHealthy!: boolean;

  @Column({ type: 'int', default: 0 })
  successCount!: number;

  @Column({ type: 'int', default: 0 })
  errorCount!: number;

  @Column({ type: 'int', default: 0 })
  rateLimitCount!: number;

  @Column({ type: 'float', default: 0 })
  averageResponseTime!: number;

  @Column({ type: 'float', default: 0 })
  uptime!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastCheckTime?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
