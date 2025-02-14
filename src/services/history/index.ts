import { PrismaClient, TransactionType } from '@prisma/client';
import { Protocol } from '@/types/protocols';
import { Network } from '@/types/networks';
import { QueryParams, TransactionQueryParams } from '@/services/protocols/base';
import { log } from '@/utils/logger';

export interface TransactionHistory {
  id: string;
  timestamp: number;
  protocol: Protocol;
  network: Network;
  address: string;
  type: TransactionType;
  amount: string;
  asset: string;
  txHash: string;
}

export class HistoryService {
  private static instance: HistoryService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  async getTransactionHistory(
    params: TransactionQueryParams
  ): Promise<TransactionHistory[]> {
    try {
      // Validate network
      if (params.network !== Network.ETHEREUM) {
        throw new Error('Only Ethereum network is supported');
      }

      // Validate protocol
      if (params.protocol !== Protocol.AAVE) {
        throw new Error('Only AAVE protocol is supported');
      }

      const transactions = await this.prisma.transaction.findMany({
        where: {
          protocol: params.protocol,
          network: params.network,
          ...(params.address && { address: params.address.toLowerCase() }),
          timestamp: {
            gte: params.fromTimestamp,
            lte: params.toTimestamp
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: params.limit || 100,
      });

      return transactions.map(transaction => ({
        ...transaction,
        protocol: Protocol[transaction.protocol as keyof typeof Protocol],
        network: Network[transaction.network as keyof typeof Network],
        address: transaction.address.toLowerCase()
      }));
    } catch (error) {
      log.error('Error fetching transaction history:', error);
      throw error;
    }
  }

  async addTransaction(transaction: Omit<TransactionHistory, 'id'>): Promise<void> {
    try {
      // Validate network
      if (transaction.network !== Network.ETHEREUM) {
        throw new Error('Only Ethereum network is supported');
      }

      // Validate protocol
      if (transaction.protocol !== Protocol.AAVE) {
        throw new Error('Only AAVE protocol is supported');
      }

      await this.prisma.transaction.create({
        data: {
          ...transaction,
          address: transaction.address.toLowerCase(),
          txHash: transaction.txHash.toLowerCase(),
        },
      });
    } catch (error) {
      log.error('Error adding transaction:', error);
      throw error;
    }
  }

  async performMultipleOperations(
    transaction: Omit<TransactionHistory, 'id'>, 
    additionalOperation: () => Promise<void>
  ): Promise<void> {
    try {
      // Validate network
      if (transaction.network !== Network.ETHEREUM) {
        throw new Error('Only Ethereum network is supported');
      }

      // Validate protocol
      if (transaction.protocol !== Protocol.AAVE) {
        throw new Error('Only AAVE protocol is supported');
      }

      await this.prisma.$transaction(async (prisma) => {
        await prisma.transaction.create({
          data: {
            ...transaction,
            address: transaction.address.toLowerCase(),
            txHash: transaction.txHash.toLowerCase(),
          },
        });
        await additionalOperation();
      });
    } catch (error) {
      log.error('Error performing multiple operations:', error);
      throw error;
    }
  }
}
