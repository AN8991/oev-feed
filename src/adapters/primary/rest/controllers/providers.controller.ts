import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../../../secondary/database/typeorm/entities/provider.entity';
import { ProviderDto } from '../../../../domain/types/provider.dto';

@Controller('providers')
export class ProvidersController {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
  ) {}

  @Get()
  async findAll(): Promise<ProviderDto[]> {
    const providers = await this.providerRepo.find();
    return providers.map(provider => this.mapToDto(provider));
  }

  @Get(':name')
  async findOne(@Param('name') name: string): Promise<ProviderDto> {
    const provider = await this.providerRepo.findOneBy({ name });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return this.mapToDto(provider);
  }

  private mapToDto(provider: Provider): ProviderDto {
    const dto = new ProviderDto();
    dto.name = provider.name;
    dto.network = provider.network || 'unknown';
    dto.status = 'active'; // Default status since not in entity
    dto.lastChecked = new Date(); // Default to current time
    dto.healthScore = 100; // Default health score
    return dto;
  }
}
