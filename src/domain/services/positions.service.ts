import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../entities/position.entity';
import { CreatePositionDto, UpdatePositionDto } from '@domain/types/position.dto';

@Injectable()
export class PositionsService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
  ) {}

  async findAll(): Promise<Position[]> {
    return this.positionRepo.find();
  }

  async findOne(id: string): Promise<Position | null> {
    return this.positionRepo.findOneBy({ id });
  }

  async create(dto: CreatePositionDto): Promise<Position> {
    const position = this.positionRepo.create({ ...dto, updatedAt: new Date() });
    return this.positionRepo.save(position);
  }

  async update(id: string, dto: UpdatePositionDto): Promise<Position | null> {
    const position = await this.findOne(id);
    if (!position) return null;
    Object.assign(position, dto, { updatedAt: new Date() });
    await this.positionRepo.save(position);
    return position;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.positionRepo.delete(id);
    return result.affected === 1;
  }
}
