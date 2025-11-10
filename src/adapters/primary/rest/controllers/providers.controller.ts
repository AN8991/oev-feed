import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../../../secondary/database/typeorm/entities/provider.entity';
import { ProviderDto } from '../../../../application/dto/provider.dto';
import { ProviderMapper } from '../../../../application/mappers/provider.mapper';
import { 
  SuccessResponse, 
  ErrorResponse,
  ProviderResponseDto
} from '../../../../application/dto/api-response.dto';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    private readonly providerMapper: ProviderMapper,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all providers',
    description: 'Retrieve all blockchain RPC providers with their health status and configuration'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved all providers',
    type: SuccessResponse<ProviderResponseDto[]>
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error',
    type: ErrorResponse
  })
  async findAll(): Promise<SuccessResponse<ProviderDto[]>> {
    const providers = await this.providerRepo.find({
      relations: ['healthChecks'],
    });
    const providerDtos = this.providerMapper.toDtoArray(providers);
    return new SuccessResponse(providerDtos, 'Providers retrieved successfully');
  }

  @Get(':name')
  @ApiOperation({ 
    summary: 'Get provider by name',
    description: 'Retrieve a specific blockchain RPC provider by its name with detailed health information'
  })
  @ApiParam({ 
    name: 'name', 
    description: 'Provider name identifier',
    example: 'infura-mainnet'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved provider details',
    type: SuccessResponse<ProviderResponseDto>
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Provider not found',
    type: ErrorResponse
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error',
    type: ErrorResponse
  })
  async findOne(@Param('name') name: string): Promise<SuccessResponse<ProviderDto>> {
    const provider = await this.providerRepo.findOne({
      where: { name },
      relations: ['healthChecks'],
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    const providerDto = this.providerMapper.toDto(provider);
    return new SuccessResponse(providerDto, `Provider ${name} retrieved successfully`);
  }
}
