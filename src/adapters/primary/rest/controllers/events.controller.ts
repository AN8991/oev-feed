import { Controller, Get } from '@nestjs/common';
import { EventsService } from '../../../../domain/services/events.service';
import { EventDto } from '../../../../domain/types/event.dto';

@Controller('api/v1.0.0/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(): EventDto[] {
    return this.eventsService.findAll();
  }
}
