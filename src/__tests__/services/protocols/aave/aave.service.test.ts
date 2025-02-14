// Mock configurations
import { ENV } from 'config/env';

jest.mock('config/env', () => ({
  ENV: {
    getAlchemyEthereumRpcUrl: () => 'https://eth-mainnet.mock.url',
    getAlchemyEthereumWsUrl: () => 'wss://eth-mainnet.mock.url',
  }
}));

jest.mock('config/contracts', () => ({
  CONTRACT_ADDRESSES: {
    AAVE: {
      V3_ETH_MAINNET: {
        POOL: '0x123',
        POOL_DATA_PROVIDER: '0x456',
        ORACLE: '0x789',
      },
    },
  }
}));

// Mock the Network enum
jest.mock('types/networks', () => ({
  Network: {
    ETHEREUM: 'ethereum',
    // Add other networks as needed
  }
}));

// Mock the protocols types
jest.mock('types/protocols', () => ({
  Protocol: {
    AAVE: 'aave'
  },
  DataSourceType: {
    ON_CHAIN: 'ON_CHAIN',
    SUBGRAPH: 'SUBGRAPH'
  }
}));

// Mock logger
jest.mock('utils/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock NotificationService
jest.mock('services/notifications', () => {
  const mockNotificationService = {
    handlePositionChange: jest.fn(),
    handleHealthFactorChange: jest.fn(),
  };
  
  return {
    NotificationService: {
      getInstance: jest.fn().mockReturnValue(mockNotificationService),
    },
  };
});

import { AaveService } from 'services/protocols/aave';
import { Network } from 'types/networks';
import { Protocol, DataSourceType, ProtocolQueryParams } from 'types/protocols';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { log } from 'utils/logger';

// Mock Prisma
const mockPrismaClient = {
  userPosition: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

// Mock ethers
jest.mock('ethers');

// Mock console.error for testing
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('AaveService', () => {
  let service: AaveService;
  let mockProvider: jest.Mocked<ethers.JsonRpcProvider>;
  let mockWsProvider: jest.Mocked<ethers.WebSocketProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ethers Provider
    mockProvider = {
      // Add necessary provider methods
    } as any;
    
    mockWsProvider = {
      // Add necessary WebSocket provider methods
    } as any;

    (ethers.JsonRpcProvider as jest.Mock).mockImplementation(() => mockProvider);
    (ethers.WebSocketProvider as jest.Mock).mockImplementation(() => mockWsProvider);
    (ethers.Contract as jest.Mock).mockImplementation((address) => ({
      address,
      // Add necessary contract methods
    }));

    service = new AaveService(Network.ETHEREUM);
  });

  describe('constructor', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize with default network', () => {
      const service = new AaveService();
      expect(ethers.JsonRpcProvider).toHaveBeenCalledWith('https://eth-mainnet.mock.url');
      expect(ethers.WebSocketProvider).toHaveBeenCalledWith('wss://eth-mainnet.mock.url');
      expect(PrismaClient).toHaveBeenCalled();
    });

    it('should initialize contracts correctly', () => {
      jest.clearAllMocks();
      const service = new AaveService();
      expect(ethers.Contract).toHaveBeenCalledTimes(3);
      expect(ethers.Contract).toHaveBeenCalledWith('0x123', expect.any(Array), expect.any(Object));
      expect(ethers.Contract).toHaveBeenCalledWith('0x456', expect.any(Array), expect.any(Object));
      expect(ethers.Contract).toHaveBeenCalledWith('0x789', expect.any(Array), expect.any(Object));
    });

    it('should not initialize WebSocket provider when wsUrl is not provided', () => {
      const originalMock = jest.requireMock('config/env');
      originalMock.ENV.getAlchemyEthereumWsUrl = () => '';
      
      const service = new AaveService();
      expect(ethers.WebSocketProvider).not.toHaveBeenCalled();
      
      // Restore the original mock
      originalMock.ENV.getAlchemyEthereumWsUrl = () => 'wss://eth-mainnet.mock.url';
    });

    it('should throw error when contract addresses are not found', () => {
      const originalMock = jest.requireMock('config/contracts');
      originalMock.CONTRACT_ADDRESSES.AAVE = {};
      
      expect(() => new AaveService()).toThrow('Aave V3 contracts not found');
      
      // Restore the original mock
      originalMock.CONTRACT_ADDRESSES.AAVE = {
        V3_ETH_MAINNET: {
          POOL: '0x123',
          POOL_DATA_PROVIDER: '0x456',
          ORACLE: '0x789',
        },
      };
    });
  });

  describe('getDataSourceType', () => {
    it('should return ON_CHAIN when no subgraph URL is provided', () => {
      expect(service.getDataSourceType()).toBe(DataSourceType.ON_CHAIN);
    });

    it('should return SUBGRAPH when subgraph URL is provided', () => {
      service = new AaveService(Network.ETHEREUM);
      (service as any).subgraphUrl = 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3';
      expect(service.getDataSourceType()).toBe(DataSourceType.SUBGRAPH);
    });
  });

  describe('getPositions', () => {
    const mockQueryParams = {
      protocol: Protocol.AAVE,
      network: Network.ETHEREUM,
      fromTimestamp: 1000,
      toTimestamp: 2000,
    };

    it('should fetch and transform positions correctly', async () => {
      const mockRawPositions = [
        {
          protocol: Protocol.AAVE,
          network: Network.ETHEREUM,
          userAddress: '0x123',
          collateral: '1000',
          debt: '500',
          healthFactor: '2',
          timestamp: new Date('2024-01-01').getTime(),
          details: JSON.stringify({
            borrowedAssets: '[]',
            liquidationRisk: {
              threshold: '0.8',
              currentLTV: '0.5'
            }
          })
        }
      ];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: 1000,
        debt: 500,
        healthFactor: '2'
      });
    });

    it('should handle positions with string details', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: 'some string details'
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].details).toBe('some string details');
    });

    it('should handle positions with null values', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: null,
        debt: null,
        healthFactor: '0',
        timestamp: new Date('2024-01-01').getTime(),
        details: null
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].collateral).toBeNull();
      expect(result[0].debt).toBeNull();
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPrismaClient.userPosition.findMany.mockRejectedValue(error);

      await expect((service as any).getPositions(mockQueryParams)).rejects.toThrow('Database error');
      expect(console.error).toHaveBeenCalledWith('Error fetching Aave positions:', error);
    });

    it('should handle positions with complex details object', async () => {
      const liquidationRisk = {
        threshold: '0.8',
        currentLTV: '0.5'
      };

      const borrowedAssets = [{
        symbol: 'DAI',
        amount: '1000'
      }];

      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: {
          borrowedAssets: JSON.stringify(borrowedAssets),
          liquidationRisk
        }
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].borrowedAssets).toEqual(borrowedAssets);
      expect(result[0].liquidationRisk).toEqual(liquidationRisk);
    });

    it('should handle invalid JSON in details', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: 'invalid json'
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].borrowedAssets).toEqual([]);
      expect(result[0].liquidationRisk).toBeUndefined();
    });

    it('should handle positions with missing details fields', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: {
          // Empty details object to test undefined handling
        }
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].borrowedAssets).toEqual([]);
      expect(result[0].liquidationRisk).toBeUndefined();
    });

    it('should handle positions with non-string borrowedAssets', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: {
          borrowedAssets: 123, // Non-string value
          liquidationRisk: {
            threshold: '0.8',
            currentLTV: '0.5'
          }
        }
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].borrowedAssets).toEqual([]);
      expect(result[0].liquidationRisk).toBeDefined();
    });

    it('should handle positions with invalid borrowedAssets JSON', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: {
          borrowedAssets: '{invalid:json}',
          liquidationRisk: {
            threshold: '0.8',
            currentLTV: '0.5'
          }
        }
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].borrowedAssets).toEqual([]);
      expect(result[0].liquidationRisk).toBeDefined();
    });

    it('should handle positions with null collateral and debt', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: null,
        debt: null,
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: {}
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].collateral).toBeNull();
      expect(result[0].debt).toBeNull();
    });

    it('should handle positions with string details and liquidationRisk', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: JSON.stringify({
          liquidationRisk: {
            threshold: '0.8',
            currentLTV: '0.5'
          }
        })
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].borrowedAssets).toEqual([]);
      expect(result[0].liquidationRisk).toBeUndefined();
    });

    it('should handle positions with non-array borrowedAssets JSON', async () => {
      const mockRawPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: new Date('2024-01-01').getTime(),
        details: {
          borrowedAssets: '{"notAnArray": true}', // Valid JSON but not an array
          liquidationRisk: {
            threshold: '0.8',
            currentLTV: '0.5'
          }
        }
      }];

      mockPrismaClient.userPosition.findMany.mockResolvedValue(mockRawPositions);

      const result = await (service as any).getPositions(mockQueryParams);

      expect(result).toHaveLength(1);
      expect(result[0].borrowedAssets).toEqual([]);
      expect(result[0].liquidationRisk).toBeDefined();
    });
  });

  describe('getHealthFactor', () => {
    const mockQueryParams = {
      protocol: Protocol.AAVE,
      network: Network.ETHEREUM,
      fromTimestamp: 1000,
      toTimestamp: 2000,
    };

    it('should return the latest health factor', async () => {
      const mockPosition = {
        healthFactor: '1.5'
      };

      mockPrismaClient.userPosition.findFirst.mockResolvedValue(mockPosition);

      const result = await service.getHealthFactor(mockQueryParams);
      expect(result).toBe('1.5');
    });

    it('should return "0" when no positions found', async () => {
      mockPrismaClient.userPosition.findFirst.mockResolvedValue(null);

      const result = await service.getHealthFactor(mockQueryParams);
      expect(result).toBe('0');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPrismaClient.userPosition.findFirst.mockRejectedValue(error);

      await expect(service.getHealthFactor(mockQueryParams)).rejects.toThrow('Database error');
      expect(log.error).toHaveBeenCalledWith('Error calculating Aave health factor', error);
    });
  });

  describe('fetchUserPositions', () => {
    it('should fetch user positions with correct parameters', async () => {
      const mockPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: 1704067200,
        borrowedAssets: [],
        liquidationRisk: undefined,
        details: {}
      }];

      const mockParams = {
        userAddress: '0x123',
        fromTimestamp: 1000,
        toTimestamp: 2000
      };

      jest.spyOn(service as any, 'getPositions').mockResolvedValue(mockPositions);

      const result = await service.fetchUserPositions(mockParams);

      expect(result).toHaveLength(1);
      expect(result[0].userAddress).toBe('0x123');
      expect(result[0].borrowedAssets).toEqual([]);
    });

    it('should handle empty positions', async () => {
      (service as any).getPositions = jest.fn().mockResolvedValue([]);

      const params: ProtocolQueryParams = {
        userAddress: '0x123'
      };

      const result = await service.fetchUserPositions(params);
      expect(result).toHaveLength(0);
    });

    it('should use current timestamp when toTimestamp is not provided', async () => {
      const mockDate = 1643673600000; // 2022-02-01
      jest.spyOn(Date, 'now').mockImplementation(() => mockDate);

      (service as any).getPositions = jest.fn().mockResolvedValue([]);

      const params: ProtocolQueryParams = {
        userAddress: '0x123',
        fromTimestamp: 1000
      };

      await service.fetchUserPositions(params);

      expect((service as any).getPositions).toHaveBeenCalledWith({
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        fromTimestamp: 1000,
        toTimestamp: Math.floor(mockDate / 1000)
      });
    });

    it('should handle errors gracefully', async () => {
      (service as any).getPositions = jest.fn().mockRejectedValue(new Error('Network error'));

      const params: ProtocolQueryParams = {
        userAddress: '0x123'
      };

      await expect(service.fetchUserPositions(params)).rejects.toThrow('Network error');
    });

    it('should handle fetchUserPositions with userAddress', async () => {
      const mockPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '0x123',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: 1704067200,
        borrowedAssets: [],
        liquidationRisk: undefined,
        details: {}
      }];

      const mockParams = {
        userAddress: '0x123',
        fromTimestamp: 1000,
        toTimestamp: 2000
      };

      jest.spyOn(service as any, 'getPositions').mockResolvedValue(mockPositions);

      const result = await service.fetchUserPositions(mockParams);

      expect(result).toHaveLength(1);
      expect(result[0].userAddress).toBe('0x123');
      expect(result[0].borrowedAssets).toEqual([]);
    });

    it('should handle fetchUserPositions without userAddress', async () => {
      const mockPositions = [{
        protocol: Protocol.AAVE,
        network: Network.ETHEREUM,
        userAddress: '',
        collateral: '1000',
        debt: '500',
        healthFactor: '2',
        timestamp: 1704067200,
        borrowedAssets: [],
        liquidationRisk: undefined,
        details: {}
      }];

      const mockParams = {
        fromTimestamp: 1000
      };

      jest.spyOn(service as any, 'getPositions').mockResolvedValue(mockPositions);

      const result = await service.fetchUserPositions(mockParams);

      expect(result).toHaveLength(1);
      expect(result[0].userAddress).toBe('');
      expect(result[0].borrowedAssets).toEqual([]);
    });
  });
});
