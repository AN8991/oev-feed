import { Injectable, Logger } from '@nestjs/common';
import { TimeRange } from '@domain/types/query-parameters';

/**
 * Interface for time range calculation results
 */
export interface TimeRangeResult {
  startTimestamp: number;
  endTimestamp: number;
  startDate: Date;
  endDate: Date;
  description: string;
}

/**
 * Injectable time service for standardized time calculations
 * Uses modern date handling patterns and NestJS dependency injection
 */
@Injectable()
export class TimeService {
  private readonly logger = new Logger(TimeService.name);

  /**
   * Calculate start and end timestamps for a given time range
   * @param timeRange Predefined or custom time range
   * @param fromTimestamp Optional custom start timestamp
   * @param toTimestamp Optional custom end timestamp
   * @param timezone Optional timezone (defaults to UTC)
   * @returns TimeRangeResult with comprehensive time information
   */
  public calculateTimeRange(
    timeRange: TimeRange,
    fromTimestamp?: number,
    toTimestamp?: number,
    timezone: string = 'UTC'
  ): TimeRangeResult {
    const now = new Date();
    
    try {
      switch (timeRange) {
        case TimeRange.CURRENT_MONTH:
          return this.getCurrentMonth(now, timezone);
        
        case TimeRange.LAST_MONTH:
          return this.getLastMonth(now, timezone);
        
        case TimeRange.LAST_3_MONTHS:
          return this.getLastNMonths(now, 3, timezone);
        
        case TimeRange.LAST_6_MONTHS:
          return this.getLastNMonths(now, 6, timezone);
        
        case TimeRange.LAST_YEAR:
          return this.getLastYear(now, timezone);
        
        case TimeRange.CUSTOM:
          return this.getCustomRange(fromTimestamp, toTimestamp, timezone);
        
        default:
          throw new Error(`Unsupported time range: ${timeRange}`);
      }
    } catch (error) {
      this.logger.error(`Error calculating time range for ${timeRange}:`, error);
      throw error;
    }
  }

  /**
   * Get current month time range
   */
  private getCurrentMonth(now: Date, timezone: string): TimeRangeResult {
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now);
    
    return {
      startTimestamp: startDate.getTime(),
      endTimestamp: endDate.getTime(),
      startDate,
      endDate,
      description: `Current month (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
    };
  }

  /**
   * Get last month time range
   */
  private getLastMonth(now: Date, timezone: string): TimeRangeResult {
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    return {
      startTimestamp: startDate.getTime(),
      endTimestamp: endDate.getTime(),
      startDate,
      endDate,
      description: `Last month (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
    };
  }

  /**
   * Get last N months time range
   */
  private getLastNMonths(now: Date, months: number, timezone: string): TimeRangeResult {
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const endDate = new Date(now);
    
    return {
      startTimestamp: startDate.getTime(),
      endTimestamp: endDate.getTime(),
      startDate,
      endDate,
      description: `Last ${months} months (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
    };
  }

  /**
   * Get last year time range
   */
  private getLastYear(now: Date, timezone: string): TimeRangeResult {
    const startDate = new Date(now.getFullYear() - 1, 0, 1);
    const endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    
    return {
      startTimestamp: startDate.getTime(),
      endTimestamp: endDate.getTime(),
      startDate,
      endDate,
      description: `Last year (${startDate.getFullYear()})`
    };
  }

  /**
   * Get custom time range
   */
  private getCustomRange(
    fromTimestamp?: number,
    toTimestamp?: number,
    timezone?: string
  ): TimeRangeResult {
    if (!fromTimestamp || !toTimestamp) {
      throw new Error('Custom time range requires both fromTimestamp and toTimestamp');
    }

    if (fromTimestamp >= toTimestamp) {
      throw new Error('fromTimestamp must be less than toTimestamp');
    }

    const startDate = new Date(fromTimestamp);
    const endDate = new Date(toTimestamp);
    
    return {
      startTimestamp: fromTimestamp,
      endTimestamp: toTimestamp,
      startDate,
      endDate,
      description: `Custom range (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`
    };
  }

  /**
   * Get current timestamp
   */
  public getCurrentTimestamp(): number {
    return Date.now();
  }

  /**
   * Get current date
   */
  public getCurrentDate(): Date {
    return new Date();
  }

  /**
   * Format timestamp to readable string
   */
  public formatTimestamp(timestamp: number, timezone: string = 'UTC'): string {
    return new Date(timestamp).toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Validate if timestamp is within reasonable bounds
   */
  public validateTimestamp(timestamp: number): boolean {
    const date = new Date(timestamp);
    const now = new Date();
    const minDate = new Date('2009-01-01'); // Bitcoin genesis block
    const maxDate = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year in future
    
    return date >= minDate && date <= maxDate;
  }

  /**
   * Get start of day for a given timestamp
   */
  public getStartOfDay(timestamp: number): number {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  /**
   * Get end of day for a given timestamp
   */
  public getEndOfDay(timestamp: number): number {
    const date = new Date(timestamp);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }

  /**
   * Calculate difference between two timestamps in days
   */
  public getDaysDifference(startTimestamp: number, endTimestamp: number): number {
    const diffMs = Math.abs(endTimestamp - startTimestamp);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if two timestamps are on the same day
   */
  public isSameDay(timestamp1: number, timestamp2: number): boolean {
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
}
