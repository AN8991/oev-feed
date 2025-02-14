import { PrismaClient, Position, User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library.js';
import { UserProtocolPosition, Protocol } from '@/types/protocols';
import { GetUserPositionsOptions } from '@/types/database';
import { DatabaseError } from '@/errors/database.error';
import { log } from '@/utils/logger';

// Centralized service for database interactions and user position management.
export class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: ['warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  // Get the singleton instance of DatabaseService
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Initialize database connection
  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.prisma.$connect();
      this.isConnected = true;
      log.info('Database connection established');
    }
  }

  // Gracefully disconnect from database
  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.prisma.$disconnect();
      this.isConnected = false;
      log.info('Database connection closed');
    }
  }

  // Create or update a user in the database
  private async upsertUser(address: string): Promise<User> {
    if (!address || typeof address !== 'string') {
      throw new DatabaseError('Invalid address provided');
    }

    try {
      return await this.prisma.user.upsert({
        where: { address },
        update: {},
        create: { address },
      });
    } catch (error) {
      log.error('Error upserting user', { error, address });
      throw new DatabaseError('Failed to upsert user', error as Error);
    }
  }

  // Validate position data before processing
  private validatePositions(positions: UserProtocolPosition[]): void {
    if (!positions || positions.length === 0) {
      throw new DatabaseError('No positions provided');
    }

    positions.forEach((position, index) => {
      if (!position.protocol || !position.network) {
        throw new DatabaseError(`Invalid position at index ${index}: missing protocol or network`);
      }
      if (position.collateral && isNaN(Number(position.collateral))) {
        throw new DatabaseError(`Invalid collateral value at index ${index}`);
      }
      if (position.debt && isNaN(Number(position.debt))) {
        throw new DatabaseError(`Invalid debt value at index ${index}`);
      }
      if (position.healthFactor && isNaN(Number(position.healthFactor))) {
        throw new DatabaseError(`Invalid health factor at index ${index}`);
      }
    });
  }

  // Convert position data to database format for UserPosition model
  private processUserPosition(position: UserProtocolPosition, address: string) {
    return {
      protocol: position.protocol,
      network: position.network,
      userAddress: address,
      collateral: position.collateral?.toString() || '0',
      debt: position.debt?.toString() || '0',
      healthFactor: position.healthFactor?.toString() || '0',
      timestamp: Math.floor(position.timestamp),
      details: position.details || null
    };
  }

  // Convert position data to database format for Position model
  private processActivePosition(position: UserProtocolPosition, userId: string) {
    return {
      userId,
      protocol: position.protocol,
      collateral: new Decimal(position.collateral?.toString() || '0'),
      debt: new Decimal(position.debt?.toString() || '0'),
      healthFactor: new Decimal(position.healthFactor?.toString() || '0'),
      lastUpdated: new Date(position.timestamp * 1000)
    };
  }

  // Save user positions to the database with transaction support
  public async savePositions(address: string, positions: UserProtocolPosition[]) {
    try {
      this.validatePositions(positions);
      
      return await this.prisma.$transaction(async (tx) => {
        const user = await this.upsertUser(address);
        
        // Save historical positions
        const savedHistoricalPositions = await Promise.all(
          positions.map(position => 
            tx.userPosition.create({
              data: this.processUserPosition(position, address)
            })
          )
        );

        // Update active positions
        const savedActivePositions = await Promise.all(
          positions.map(position => 
            tx.position.upsert({
              where: {
                userId_protocol: {
                  userId: user.id,
                  protocol: position.protocol
                }
              },
              update: this.processActivePosition(position, user.id),
              create: this.processActivePosition(position, user.id)
            })
          )
        );

        log.info('Positions saved successfully', { 
          address, 
          historicalCount: savedHistoricalPositions.length,
          activeCount: savedActivePositions.length
        });

        return {
          historical: savedHistoricalPositions,
          active: savedActivePositions
        };
      });
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error;
      }
      log.error('Error saving positions', { error, address });
      throw new DatabaseError('Failed to save positions', error as Error);
    }
  }

  // Retrieve user positions with pagination and filtering support
  public async getUserPositions(
    address: string,
    options: GetUserPositionsOptions = {}
  ) {
    if (!address) {
      throw new DatabaseError('Address is required');
    }

    try {
      const { limit = 50, offset = 0, protocol } = options;

      const positions = await this.prisma.userPosition.findMany({
        where: {
          userAddress: address,
          ...(protocol && { protocol })
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset
      });

      log.info('Positions retrieved successfully', { 
        address, 
        count: positions.length 
      });

      return positions;
    } catch (error) {
      log.error('Error getting user positions', { error, address });
      throw new DatabaseError('Failed to retrieve user positions', error as Error);
    }
  }

  // Get total count of positions for pagination
  public async getUserPositionsCount(address: string, protocol?: Protocol): Promise<number> {
    try {
      return await this.prisma.userPosition.count({
        where: {
          userAddress: address,
          ...(protocol && { protocol })
        }
      });
    } catch (error) {
      log.error('Error getting positions count', { error, address });
      throw new DatabaseError('Failed to get positions count', error as Error);
    }
  }
}
