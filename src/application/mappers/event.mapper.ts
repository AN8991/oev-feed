import { Injectable } from '@nestjs/common';
import { OevEvent } from '../../adapters/secondary/database/typeorm/entities/oev-event.entity';
import { EventDto } from '../dto/event.dto';

/**
 * Event Mapper
 * 
 * Maps between OevEvent entities and EventDto objects
 */
@Injectable()
export class EventMapper {
  /**
   * Maps an OevEvent entity to an EventDto
   * 
   * @param event The OevEvent entity to map
   * @returns The mapped EventDto
   */
  toDto(event: OevEvent): EventDto {
    const dto = new EventDto();
    dto.id = event.id;
    dto.type = event.eventType;
    dto.positionId = event.transactionId; // Using transactionId as positionId for now
    dto.description = this.generateDescription(event);
    dto.timestamp = event.timestamp;
    return dto;
  }

  /**
   * Maps multiple OevEvent entities to EventDto objects
   * 
   * @param events Array of OevEvent entities to map
   * @returns Array of mapped EventDto objects
   */
  toDtoArray(events: OevEvent[]): EventDto[] {
    return events.map(event => this.toDto(event));
  }

  /**
   * Generates a descriptive message for the event
   * 
   * @param event The OevEvent entity
   * @returns A descriptive string for the event
   */
  private generateDescription(event: OevEvent): string {
    return `${event.eventType} event on ${event.network}`;
  }
}
