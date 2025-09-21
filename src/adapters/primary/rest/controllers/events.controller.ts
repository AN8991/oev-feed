import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OevEvent } from '../../../secondary/database/typeorm/entities/oev-event.entity';
import { EventDto } from '../../../../application/dto/event.dto';
import { EventMapper } from '../../../../application/mappers/event.mapper';
import { 
  SuccessResponse, 
  ErrorResponse,
  EventResponseDto
} from '../../../../application/dto/api-response.dto';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    @InjectRepository(OevEvent)
    private readonly eventRepo: Repository<OevEvent>,
    private readonly eventMapper: EventMapper,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all OEV events',
    description: 'Retrieve all Oracle Extractable Value (OEV) events from the system'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved all OEV events',
    type: SuccessResponse<EventResponseDto[]>
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error',
    type: ErrorResponse
  })
  async findAll(): Promise<SuccessResponse<EventDto[]>> {
    const events = await this.eventRepo.find();
    const eventDtos = this.eventMapper.toDtoArray(events);
    return new SuccessResponse(eventDtos, 'OEV events retrieved successfully');
  }
}
