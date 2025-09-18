import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../../../secondary/database/typeorm/entities/provider.entity';
import { ProviderDto } from '../../../../application/dto/provider.dto';
import { ProviderMapper } from '../../../../application/mappers/provider.mapper';

@Controller('providers')
export class ProvidersController {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly providerMapper: ProviderMapper,
  ) {}

  @Get()
  async findAll(): Promise<ProviderDto[]> {
    const providers = await this.providerRepo.find();
    return this.providerMapper.toDtoArray(providers);
  }

  @Get(':name')
  async findOne(@Param('name') name: string): Promise<ProviderDto> {
    const provider = await this.providerRepo.findOneBy({ name });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return this.providerMapper.toDto(provider);
  }
}
