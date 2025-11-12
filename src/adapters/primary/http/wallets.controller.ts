import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PositionsService } from '@/application/services/positions.service';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly positionsService: PositionsService) {}

  @Get('addresses')
  @ApiOperation({ summary: 'Get all unique wallet addresses' })
  @ApiResponse({
    status: 200,
    description: 'List of unique wallet addresses with position counts',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          address: { type: 'string', example: '0x600Eb478EA253561E2Ca3A1d98be53d109879A3A' },
          positionCount: { type: 'number', example: 4 },
          lastUpdated: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getUniqueWalletAddresses() {
    try {
      // Get all positions
      const positions = await this.positionsService.getPositions();

      // Group by wallet address and count positions
      const walletMap = new Map<string, { count: number; lastUpdated: Date }>();

      for (const position of positions) {
        const address = position.userAddress;
        const existing = walletMap.get(address);
        const lastUpdated = new Date(position.lastUpdated);

        if (existing) {
          existing.count++;
          if (lastUpdated > existing.lastUpdated) {
            existing.lastUpdated = lastUpdated;
          }
        } else {
          walletMap.set(address, {
            count: 1,
            lastUpdated,
          });
        }
      }

      // Convert to array and sort by position count (descending)
      const wallets = Array.from(walletMap.entries())
        .map(([address, data]) => ({
          address,
          positionCount: data.count,
          lastUpdated: data.lastUpdated.toISOString(),
        }))
        .sort((a, b) => b.positionCount - a.positionCount);

      return wallets;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        `Failed to fetch wallet addresses: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
