import { PrismaClient } from '@prisma/client';
import { UserPosition } from '@/types/protocols';
import { log } from '@/utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async upsertUser(address: string) {
    try {
      return await this.prisma.user.upsert({
        where: { address },
        update: {},
        create: { address },
      });
    } catch (error) {
      log.error('Error upserting user', { error, address });
      throw error;
    }
  }

  async savePositions(address: string, positions: UserPosition[]) {
    try {
      const user = await this.upsertUser(address);

      const savedPositions = await Promise.all(
        positions.map((position) =>
          this.prisma.position.create({
            data: {
              userId: user.id,
              protocol: position.protocol,
              collateral: position.collateral,
              debt: position.debt,
              healthFactor: position.healthFactor,
              lastUpdated: new Date(position.timestamp * 1000),
            },
          })
        )
      );

      return savedPositions;
    } catch (error) {
      log.error('Error saving positions', { error, address });
      throw error;
    }
  }

  async getUserPositions(address: string) {
    try {
      return await this.prisma.position.findMany({
        where: {
          user: {
            address,
          },
        },
        orderBy: {
          lastUpdated: 'desc',
        },
      });
    } catch (error) {
      log.error('Error getting user positions', { error, address });
      throw error;
    }
  }
}
