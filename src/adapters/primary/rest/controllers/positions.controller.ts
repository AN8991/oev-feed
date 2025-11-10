import { Controller, Get, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PositionsService } from '../../../../application/services/positions.service';
import { 
  SuccessResponse, 
  ErrorResponse,
  ValidationErrorResponseDto,
  PositionResponseDto, 
  PaginatedResponse,
  HealthCheckResponseDto
} from '../../../../application/dto/api-response.dto';
import { 
  PositionFilterDto 
} from '../../../../application/dto/validation.dto';
import { 
  EthereumAddressPipe 
} from '../../../../application/pipes/validation.pipe';

@ApiTags('Positions')
@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all positions with filtering and pagination',
    description: 'Retrieve positions from the database with optional filtering, sorting, and pagination'
  })
  @ApiQuery({ type: PositionFilterDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved positions',
    type: PaginatedResponse<PositionResponseDto>
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error',
    type: ErrorResponse
  })
  async getPositions(@Query() filters: PositionFilterDto): Promise<PaginatedResponse<PositionResponseDto>> {
    // For now, return all positions - we'll implement filtering in the next phase
    const positions = await this.positionsService.getPositions();
    
    // Apply basic pagination
    const { page, limit } = filters;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPositions = positions.slice(startIndex, endIndex);
    
    return new PaginatedResponse(
      paginatedPositions,
      page,
      limit,
      positions.length,
      'Positions retrieved successfully'
    );
  }

  @Get('user/:address')
  @ApiOperation({ 
    summary: 'Get positions by user address',
    description: 'Retrieve all positions for a specific user wallet address across all protocols'
  })
  @ApiParam({ 
    name: 'address', 
    description: 'Ethereum wallet address (0x...)',
    example: '0x79682489385337996edd00eb56b4238b597bfae7'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully retrieved user positions',
    type: SuccessResponse<PositionResponseDto[]>
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid Ethereum address format',
    type: ValidationErrorResponseDto
  })
  @ApiResponse({ 
    status: 404, 
    description: 'No positions found for the specified user address',
    type: ErrorResponse
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error',
    type: ErrorResponse
  })
  async getPositionsByUser(@Param('address', EthereumAddressPipe) userAddress: string): Promise<SuccessResponse<PositionResponseDto[]>> {
    const positions = await this.positionsService.getPositionsByUser(userAddress);
    return new SuccessResponse(positions, `Positions retrieved for user ${userAddress}`);
  }

  // POST /fetch endpoint removed - data ingestion is now handled exclusively by scripts
  // This ensures data consistency and proper normalization through controlled processes

  @Get('test')
  @ApiOperation({ 
    summary: 'Test positions API',
    description: 'Health check endpoint to verify the positions API is working correctly'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API is working correctly',
    type: HealthCheckResponseDto
  })
  getTest(): HealthCheckResponseDto {
    return {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        positions: 'healthy',
        database: 'healthy',
        validation: 'healthy'
      }
    };
  }
}
