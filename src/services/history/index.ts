import { PrismaClient, TransactionType } from '@prisma/client';
import { Protocol } from '@/types/protocols';
import { Network } from '@/types/networks';
import { ProtocolQueryParams } from '@/types/protocols';
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

export interface TransactionQueryParams extends ProtocolQueryParams {
  protocol: Protocol;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
  type?: TransactionType;
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
          userAddress: params.userAddress,
          ...(params.startTime && {
            timestamp: {
              gte: params.startTime,
            },
          }),
          ...(params.endTime && {
            timestamp: {
              lte: params.endTime,
            },
          }),
          ...(params.type && {
            type: params.type,
          }),
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: params.limit || 100,
        skip: params.offset || 0,
      });

      return transactions.map((tx) => ({
        id: tx.id,
        timestamp: tx.timestamp,
        protocol: tx.protocol as Protocol,
        network: tx.network as Network,
        address: tx.userAddress,
        type: tx.type,
        amount: tx.amount,
        asset: tx.asset,
        txHash: tx.txHash,
      }));
    } catch (error) {
      log.error('Error fetching transaction history', {
        error,
        params,
      });
      throw error;
    }
  }

  async storeTransaction(transaction: Omit<TransactionHistory, 'id'>): Promise<void> {
    try {
      await this.prisma.transaction.create({
        data: {
          protocol: transaction.protocol,
          network: transaction.network,
          userAddress: transaction.address.toLowerCase(),
          type: transaction.type,
          amount: transaction.amount,
          asset: transaction.asset,
          txHash: transaction.txHash,
          timestamp: transaction.timestamp,
        },
      });

      log.info('Transaction stored successfully', {
        protocol: transaction.protocol,
        network: transaction.network,
        address: transaction.address,
        type: transaction.type,
        txHash: transaction.txHash,
      });
    } catch (error) {
      log.error('Error storing transaction', {
        error,
        transaction,
      });
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
