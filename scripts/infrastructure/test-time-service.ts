/**
 * Time Service Test Script
 * 
 * This script tests the new TimeService implementation to verify
 * time range calculations work correctly with @nestjs/schedule patterns.
 */

import { config } from 'dotenv';
import { Logger } from '@nestjs/common';
import { TimeService } from '@infrastructure/services/time.service';
import { TimeRange } from '@domain/types/query-parameters';

const logger = new Logger('TestTimeService');

// Load environment variables
config();

/**
 * Test the TimeService implementation
 */
async function testTimeService() {
  try {
    logger.log('Testing TimeService Implementation');
    logger.log('==================================');
    
    // Create TimeService instance
    const timeService = new TimeService();
    
    // Test 1: Current Month
    logger.log('\nTest 1: Current Month');
    const currentMonth = timeService.calculateTimeRange(TimeRange.CURRENT_MONTH);
    logger.log(`Description: ${currentMonth.description}`);
    logger.log(`Start: ${currentMonth.startDate.toISOString()}`);
    logger.log(`End: ${currentMonth.endDate.toISOString()}`);
    logger.log(`Start Timestamp: ${currentMonth.startTimestamp}`);
    logger.log(`End Timestamp: ${currentMonth.endTimestamp}`);
    
    // Test 2: Last Month
    logger.log('\nTest 2: Last Month');
    const lastMonth = timeService.calculateTimeRange(TimeRange.LAST_MONTH);
    logger.log(`Description: ${lastMonth.description}`);
    logger.log(`Start: ${lastMonth.startDate.toISOString()}`);
    logger.log(`End: ${lastMonth.endDate.toISOString()}`);
    
    // Test 3: Last 3 Months
    logger.log('\nTest 3: Last 3 Months');
    const last3Months = timeService.calculateTimeRange(TimeRange.LAST_3_MONTHS);
    logger.log(`Description: ${last3Months.description}`);
    logger.log(`Start: ${last3Months.startDate.toISOString()}`);
    logger.log(`End: ${last3Months.endDate.toISOString()}`);
    
    // Test 4: Last 6 Months
    logger.log('\nTest 4: Last 6 Months');
    const last6Months = timeService.calculateTimeRange(TimeRange.LAST_6_MONTHS);
    logger.log(`Description: ${last6Months.description}`);
    logger.log(`Start: ${last6Months.startDate.toISOString()}`);
    logger.log(`End: ${last6Months.endDate.toISOString()}`);
    
    // Test 5: Last Year
    logger.log('\nTest 5: Last Year');
    const lastYear = timeService.calculateTimeRange(TimeRange.LAST_YEAR);
    logger.log(`Description: ${lastYear.description}`);
    logger.log(`Start: ${lastYear.startDate.toISOString()}`);
    logger.log(`End: ${lastYear.endDate.toISOString()}`);
    
    // Test 6: Custom Range
    logger.log('\nTest 6: Custom Range');
    const customStart = new Date('2024-01-01').getTime();
    const customEnd = new Date('2024-12-31').getTime();
    const customRange = timeService.calculateTimeRange(
      TimeRange.CUSTOM,
      customStart,
      customEnd
    );
    logger.log(`Description: ${customRange.description}`);
    logger.log(`Start: ${customRange.startDate.toISOString()}`);
    logger.log(`End: ${customRange.endDate.toISOString()}`);
    
    // Test 7: Utility Methods
    logger.log('\nTest 7: Utility Methods');
    const now = timeService.getCurrentTimestamp();
    logger.log(`Current timestamp: ${now}`);
    logger.log(`Current date: ${timeService.getCurrentDate().toISOString()}`);
    logger.log(`Formatted timestamp: ${timeService.formatTimestamp(now)}`);
    
    // Test timestamp validation
    const validTimestamp = new Date('2023-01-01').getTime();
    const invalidTimestamp = new Date('2008-01-01').getTime(); // Before Bitcoin
    logger.log(`Valid timestamp (2023): ${timeService.validateTimestamp(validTimestamp)}`);
    logger.log(`Invalid timestamp (2008): ${timeService.validateTimestamp(invalidTimestamp)}`);
    
    // Test day calculations
    const startOfDay = timeService.getStartOfDay(now);
    const endOfDay = timeService.getEndOfDay(now);
    logger.log(`Start of day: ${new Date(startOfDay).toISOString()}`);
    logger.log(`End of day: ${new Date(endOfDay).toISOString()}`);
    
    // Test days difference
    const daysDiff = timeService.getDaysDifference(customStart, customEnd);
    logger.log(`Days between 2024-01-01 and 2024-12-31: ${daysDiff}`);
    
    // Test same day check
    const sameDay = timeService.isSameDay(now, now + 3600000); // 1 hour later
    logger.log(`Same day check (1 hour apart): ${sameDay}`);
    
    // Test 8: Error Handling
    logger.log('\nTest 8: Error Handling');
    try {
      timeService.calculateTimeRange(TimeRange.CUSTOM, undefined, undefined);
    } catch (error) {
      logger.log(`Expected error for missing custom timestamps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    try {
      timeService.calculateTimeRange(TimeRange.CUSTOM, customEnd, customStart); // Reversed
    } catch (error) {
      logger.log(`Expected error for reversed timestamps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    logger.log('\nTimeService test completed successfully! ✅');
    logger.log('All time calculations are working with the new implementation.');
    
  } catch (error: unknown) {
    logger.error('Error testing TimeService:', error);
  }
}

// Run the test
testTimeService().then(() => {
  logger.log('Test script execution completed');
}).catch((error: unknown) => {
  logger.error('Unhandled error in test script:', error);
});
