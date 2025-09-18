import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OevEvent } from '../../../secondary/database/typeorm/entities/oev-event.entity';
import { EventDto } from '../../../../application/dto/event.dto';
import { EventMapper } from '../../../../application/mappers/event.mapper';

@Controller('events')
export class EventsController {
  constructor(
    @InjectRepository(OevEvent)
    private readonly eventRepo: Repository<OevEvent>,
    private readonly eventMapper: EventMapper,
  ) {}

  @Get()
  async findAll(): Promise<EventDto[]> {
    const events = await this.eventRepo.find();
    return this.eventMapper.toDtoArray(events);
  }
}
