import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OevEvent } from '../../../secondary/database/typeorm/entities/oev-event.entity';
import { EventDto } from '../../../../domain/types/event.dto';

@Controller('events')
export class EventsController {
  constructor(
    @InjectRepository(OevEvent)
    private readonly eventRepo: Repository<OevEvent>,
  ) {}

  @Get()
  async findAll(): Promise<EventDto[]> {
    const events = await this.eventRepo.find();
    return events.map(event => this.mapToDto(event));
  }

  private mapToDto(event: OevEvent): EventDto {
    const dto = new EventDto();
    dto.id = event.id;
    dto.type = event.eventType;
    dto.positionId = event.transactionId; // Using transactionId as positionId for now
    dto.description = `${event.eventType} event on ${event.network}`;
    dto.timestamp = event.timestamp;
    return dto;
  }
}
