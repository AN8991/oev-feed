import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PositionsService } from '../../../../domain/services/positions.service';

@Controller('positions')
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get()
  async getPositions() {
    return this.positionsService.getPositions();
  }

  @Get('user/:address')
  async getPositionsByUser(@Param('address') userAddress: string) {
    return this.positionsService.getPositionsByUser(userAddress);
  }

  @Post('fetch')
  async fetchAndSavePositions(@Body('userAddresses') userAddresses: string[]) {
    if (!userAddresses || !Array.isArray(userAddresses)) {
      throw new Error('userAddresses must be an array of wallet addresses');
    }
    return this.positionsService.fetchAndSavePositions(userAddresses);
  }

  @Get('test')
  getTest() {
    return {
      message: 'Positions API is working!',
      timestamp: new Date().toISOString(),
      endpoints: [
        'GET /positions - Get all positions',
        'GET /positions/user/:address - Get positions for specific user',
        'POST /positions/fetch - Fetch and save positions from protocols',
      ],
    };
  }
}
