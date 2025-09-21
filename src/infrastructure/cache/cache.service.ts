/**
 * Simple In-Memory Cache Service
 * Provides basic caching functionality without external dependencies
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Cache key prefixes for different data types
 */
export enum CachePrefix {
  ADAPTER_CONFIG = 'adapter:config',
  PROTOCOL_DATA = 'protocol:data',
  PROVIDER_HEALTH = 'provider:health',
  USER_POSITIONS = 'user:positions',
  RISK_ASSESSMENT = 'risk:assessment',
  CONTRACT_ABI = 'contract:abi',
  TOKEN_METADATA = 'token:metadata',
  NETWORK_CONFIG = 'network:config',
  PRICE_DATA = 'price:data'
}

/**
 * Cache TTL (Time To Live) configurations in seconds
 */
export const CacheTTL = {
  ADAPTER_CONFIG: 3600, // 1 hour
  NETWORK_CONFIG: 3600, // 1 hour
  CONTRACT_ABI: 7200, // 2 hours
  PROTOCOL_DATA: 300, // 5 minutes
  TOKEN_METADATA: 1800, // 30 minutes
  PROVIDER_HEALTH: 60, // 1 minute
  USER_POSITIONS: 120, // 2 minutes
  RISK_ASSESSMENT: 180, // 3 minutes
  PRICE_DATA: 30, // 30 seconds
  DEFAULT: 300 // 5 minutes
} as const;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class SimpleCacheService {
  private readonly logger = new Logger(SimpleCacheService.name);
  private readonly cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Generate a cache key with prefix and identifier
   */
  private generateKey(prefix: CachePrefix, identifier: string): string {
    return `${prefix}:${identifier}`;
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  /**
   * Get TTL for a specific cache prefix
   */
  private getTTLForPrefix(prefix: CachePrefix): number {
    switch (prefix) {
      case CachePrefix.ADAPTER_CONFIG:
        return CacheTTL.ADAPTER_CONFIG;
      case CachePrefix.PROTOCOL_DATA:
        return CacheTTL.PROTOCOL_DATA;
      case CachePrefix.PROVIDER_HEALTH:
        return CacheTTL.PROVIDER_HEALTH;
      case CachePrefix.USER_POSITIONS:
        return CacheTTL.USER_POSITIONS;
      case CachePrefix.RISK_ASSESSMENT:
        return CacheTTL.RISK_ASSESSMENT;
      case CachePrefix.CONTRACT_ABI:
        return CacheTTL.CONTRACT_ABI;
      case CachePrefix.TOKEN_METADATA:
        return CacheTTL.TOKEN_METADATA;
      case CachePrefix.NETWORK_CONFIG:
        return CacheTTL.NETWORK_CONFIG;
      case CachePrefix.PRICE_DATA:
        return CacheTTL.PRICE_DATA;
      default:
        return CacheTTL.DEFAULT;
    }
  }

  /**
   * Get cached data
   */
  async get<T>(prefix: CachePrefix, identifier: string): Promise<T | null> {
    try {
      const key = this.generateKey(prefix, identifier);
      const entry = this.cache.get(key);
      
      if (entry && !this.isExpired(entry)) {
        this.logger.debug(`Cache HIT: ${key}`);
        return entry.data as T;
      }
      
      // Remove expired entry
      if (entry) {
        this.cache.delete(key);
      }
      
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache GET error for ${prefix}:${identifier}:`, error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set<T>(
    prefix: CachePrefix, 
    identifier: string, 
    data: T, 
    ttl?: number
  ): Promise<void> {
    try {
      const key = this.generateKey(prefix, identifier);
      const cacheTTL = ttl || this.getTTLForPrefix(prefix);
      
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL
      };
      
      this.cache.set(key, entry);
      
      this.logger.debug(`Cache SET: ${key} (TTL: ${cacheTTL}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for ${prefix}:${identifier}:`, error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(prefix: CachePrefix, identifier: string): Promise<void> {
    try {
      const key = this.generateKey(prefix, identifier);
      this.cache.delete(key);
      
      this.logger.debug(`Cache DELETE: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DELETE error for ${prefix}:${identifier}:`, error);
    }
  }

  /**
   * Clear all cache entries with a specific prefix
   */
  async clearPrefix(prefix: CachePrefix): Promise<void> {
    try {
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${prefix}:`)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.cache.delete(key));
      
      this.logger.log(`Cache CLEAR: ${keysToDelete.length} keys with prefix ${prefix}`);
    } catch (error) {
      this.logger.error(`Cache CLEAR error for prefix ${prefix}:`, error);
    }
  }

  /**
   * Get or set cached data (cache-aside pattern)
   */
  async getOrSet<T>(
    prefix: CachePrefix,
    identifier: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(prefix, identifier);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, fetch the data
    try {
      const data = await fetchFunction();
      
      // Cache the result
      await this.set(prefix, identifier, data, ttl);
      
      return data;
    } catch (error) {
      this.logger.error(`Error fetching data for cache ${prefix}:${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Check if a cache entry exists
   */
  async exists(prefix: CachePrefix, identifier: string): Promise<boolean> {
    const data = await this.get(prefix, identifier);
    return data !== null;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    const now = Date.now();
    let totalEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalEntries++;
      totalSize += JSON.stringify(entry).length;
      
      if (this.isExpired(entry)) {
        expiredEntries++;
      }
    }

    return {
      totalEntries,
      expiredEntries,
      activeEntries: totalEntries - expiredEntries,
      approximateSize: `${Math.round(totalSize / 1024)}KB`,
      hitRate: 'Not tracked in simple implementation'
    };
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const testKey = 'health:check';
      const testValue = { timestamp: Date.now() };
      
      // Test write
      await this.set(CachePrefix.ADAPTER_CONFIG, testKey, testValue, 1);
      
      // Test read
      const retrieved = await this.get(CachePrefix.ADAPTER_CONFIG, testKey);
      
      // Test delete
      await this.delete(CachePrefix.ADAPTER_CONFIG, testKey);
      
      if (retrieved) {
        return {
          status: 'healthy',
          details: {
            read: 'ok',
            write: 'ok',
            delete: 'ok',
            stats: await this.getStats()
          }
        };
      } else {
        return {
          status: 'unhealthy',
          details: { error: 'Cache read/write test failed' }
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.log('Cache cleared completely');
  }
}
