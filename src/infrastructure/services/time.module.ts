import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TimeService } from './time.service';

/**
 * Time module providing standardized time calculation services
 * Uses @nestjs/schedule for enhanced time handling capabilities
 */
@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  providers: [TimeService],
  exports: [TimeService]
})
export class TimeModule {}
