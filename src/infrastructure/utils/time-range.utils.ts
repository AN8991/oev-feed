import { TimeRange } from '@domain/types/query-parameters';

/**
 * Utility class for calculating time ranges
 */
export class TimeRangeUtils {
  /**
   * Calculate start and end timestamps for a given time range
   * @param timeRange Predefined or custom time range
   * @param fromTimestamp Optional custom start timestamp
   * @param toTimestamp Optional custom end timestamp
   * @returns Object with start and end timestamps
   */
  public static calculateTimeRange(
    timeRange: TimeRange, 
    fromTimestamp?: number, 
    toTimestamp?: number
  ): { startTimestamp: number; endTimestamp: number } {
    const now = new Date();
    
    switch (timeRange) {
      case TimeRange.CURRENT_MONTH:
        return {
          startTimestamp: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
          endTimestamp: now.getTime()
        };
      
      case TimeRange.LAST_MONTH:
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          startTimestamp: lastMonthStart.getTime(),
          endTimestamp: lastMonthEnd.getTime()
        };
      
      case TimeRange.LAST_3_MONTHS:
        const last3MonthsStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return {
          startTimestamp: last3MonthsStart.getTime(),
          endTimestamp: now.getTime()
        };
      
      case TimeRange.LAST_6_MONTHS:
        const last6MonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return {
          startTimestamp: last6MonthsStart.getTime(),
          endTimestamp: now.getTime()
        };
      
      case TimeRange.LAST_YEAR:
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
        return {
          startTimestamp: lastYearStart.getTime(),
          endTimestamp: lastYearEnd.getTime()
        };
      
      case TimeRange.CUSTOM:
        if (!fromTimestamp || !toTimestamp) {
          throw new Error('Custom time range requires both fromTimestamp and toTimestamp');
        }
        return {
          startTimestamp: fromTimestamp,
          endTimestamp: toTimestamp
        };
      
      default:
        throw new Error(`Unsupported time range: ${timeRange}`);
    }
  }
}
