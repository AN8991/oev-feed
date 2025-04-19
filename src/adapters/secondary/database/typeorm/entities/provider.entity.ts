import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ProviderRequest } from './provider-request.entity';
import { ProviderHealth } from './provider-health.entity';

/**
 * Provider entity for storing provider information
 */
@Entity('providers')
export class Provider extends BaseEntity {
  @Column({ length: 50, unique: true })
  name!: string;

  @Column({ length: 50 })
  type!: string;

  @Column({ length: 50, nullable: true })
  network?: string;

  @Column({ nullable: true })
  apiKey?: string;

  @Column({ nullable: true })
  baseUrl?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 100 })
  rateLimit!: number;

  @Column({ default: 0 })
  priority!: number;

  @Column({ type: 'jsonb', nullable: true })
  config?: Record<string, any>;

  // Relationships
  @OneToMany(() => ProviderRequest, (request: ProviderRequest) => request.provider)
  requests!: ProviderRequest[];

  @OneToMany(() => ProviderHealth, (health: ProviderHealth) => health.provider)
  healthChecks!: ProviderHealth[];
}
