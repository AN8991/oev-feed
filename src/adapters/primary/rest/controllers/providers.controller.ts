import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ProvidersService } from '../../../../domain/services/providers.service';
import { ProviderDto } from '../../../../domain/types/provider.dto';

@Controller('api/v1.0.0/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  findAll(): ProviderDto[] {
    return this.providersService.findAll();
  }

  @Get(':name')
  findOne(@Param('name') name: string): ProviderDto {
    const provider = this.providersService.findOne(name);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return provider;
  }
}
