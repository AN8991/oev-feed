import { IsString, IsNotEmpty, IsDate } from 'class-validator';

export class EventDto {
  @IsString()
  @IsNotEmpty()
  id: string = '';

  @IsString()
  @IsNotEmpty()
  type: string = '';

  @IsString()
  @IsNotEmpty()
  positionId: string = '';

  @IsString()
  @IsNotEmpty()
  description: string = '';

  @IsDate()
  timestamp: Date = new Date();
}
