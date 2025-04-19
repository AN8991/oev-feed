import { Controller, Get, Post, Put, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { PositionsService } from '../../../../domain/services/positions.service';
import { PositionDto, CreatePositionDto, UpdatePositionDto } from '../../../../domain/types/position.dto';

@Controller('api/v1.0.0/positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  findAll(): PositionDto[] {
    return this.positionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): PositionDto {
    const position = this.positionsService.findOne(id);
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    return position;
  }

  @Post()
  create(@Body() dto: CreatePositionDto): PositionDto {
    return this.positionsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto): PositionDto {
    const updated = this.positionsService.update(id, dto);
    if (!updated) {
      throw new NotFoundException('Position not found');
    }
    return updated;
  }

  @Delete(':id')
  remove(@Param('id') id: string): { deleted: boolean } {
    const deleted = this.positionsService.remove(id);
    if (!deleted) {
      throw new NotFoundException('Position not found');
    }
    return { deleted };
  }
}
