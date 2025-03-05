// Mock configurations
import { ENV } from '@/config/env';

jest.mock('@/config/env', () => ({
  ENV: {
    getAlchemyEthereumRpcUrl: () => 'https://eth-mainnet.mock.url',
    getAlchemyEthereumWsUrl: () => 'wss://eth-mainnet.mock.url',
  }
}));

jest.mock('@/config/contracts', () => ({
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
jest.mock('@/types/networks', () => ({
  Network: {
    ETHEREUM: 'ethereum',
    // Add other networks as needed
  }
}));

// Mock the protocols types
jest.mock('@/types/protocols', () => ({
  Protocol: {
    AAVE: 'aave'
  },
  DataSourceType: {
    ON_CHAIN: 'ON_CHAIN',
    SUBGRAPH: 'SUBGRAPH'
  }
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  log: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock NotificationService
jest.mock('@/services/notifications', () => {
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

import { AaveService } from '@/services/protocols/aave/aave-service';
import { AaveConfig, AaveConfigBuilder } from '@/services/protocols/aave/aave-config';
import { Network } from '@/types/networks';
import { Protocol, DataSourceType, ProtocolQueryParams } from '@/types/protocols';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { log } from '@/utils/logger';

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
  let config: AaveConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a test configuration
    config = new AaveConfigBuilder()
      .withNetwork(Network.ETHEREUM)
      .withRpcUrl('https://eth-mainnet.mock.url')
      .withPoolAddress('0x123')
      .withDataProviderAddress('0x456')
      .withOracleAddress('0x789')
      .build();
      
    service = new AaveService(config);
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', async () => {
      expect(service).toBeDefined();
      expect(service.getProtocol()).toBe(Protocol.AAVE);
      expect(service.getNetwork()).toBe(Network.ETHEREUM);
      
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it('should use WebSocket provider when wsUrl is provided', async () => {
      const wsConfig = new AaveConfigBuilder()
        .withNetwork(Network.ETHEREUM)
        .withRpcUrl('https://eth-mainnet.mock.url')
        .withWsUrl('wss://eth-mainnet.mock.url')
        .withPoolAddress('0x123')
        .withDataProviderAddress('0x456')
        .withOracleAddress('0x789')
        .build();
        
      const wsService = new AaveService(wsConfig);
      await wsService.initialize();
      
      // Check if WebSocketProvider was used
      expect(ethers.WebSocketProvider).toHaveBeenCalled();
      
      await wsService.dispose();
    });

    it('should throw error when initialization fails', async () => {
      (ethers.JsonRpcProvider as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      
      const failConfig = new AaveConfigBuilder()
        .withNetwork(Network.ETHEREUM)
        .withRpcUrl('https://eth-mainnet.mock.url')
        .withPoolAddress('0x123')
        .withDataProviderAddress('0x456')
        .withOracleAddress('0x789')
        .build();
        
      const failService = new AaveService(failConfig);
      
      await expect(failService.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('getUserPositions', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should fetch positions from on-chain data', async () => {
      // Mock contract methods
      const mockContract = {
        getUserAccountData: jest.fn().mockResolvedValue({
          totalCollateralBase: ethers.parseUnits('100', 18),
          totalDebtBase: ethers.parseUnits('50', 18),
          healthFactor: ethers.parseUnits('2', 18)
        }),
        getReservesList: jest.fn().mockResolvedValue(['0xtoken1', '0xtoken2'])
      };
      
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
      
      const params: ProtocolQueryParams = { 
        userAddress: '0x123',
        network: Network.ETHEREUM
      };
      
      const positions = await service.getUserPositions(params);
      
      expect(positions).toBeDefined();
      expect(mockContract.getUserAccountData).toHaveBeenCalledWith('0x123');
      expect(mockContract.getReservesList).toHaveBeenCalled();
    });

    it('should handle errors when fetching positions', async () => {
      // Mock contract methods to throw error
      const mockContract = {
        getUserAccountData: jest.fn().mockRejectedValue(new Error('Contract error'))
      };
      
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
      
      const params: ProtocolQueryParams = { 
        userAddress: '0x123',
        network: Network.ETHEREUM
      };
      
      await expect(service.getUserPositions(params)).rejects.toThrow('Contract error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('getHealthFactor', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should fetch health factor from on-chain data', async () => {
      // Mock contract methods
      const mockContract = {
        getUserAccountData: jest.fn().mockResolvedValue({
          healthFactor: ethers.parseUnits('2', 18)
        })
      };
      
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
      
      const params: ProtocolQueryParams = { 
        userAddress: '0x123',
        network: Network.ETHEREUM
      };
      
      const healthFactor = await service.getHealthFactor(params);
      
      expect(healthFactor).toBe('2.0');
      expect(mockContract.getUserAccountData).toHaveBeenCalledWith('0x123');
    });

    it('should handle errors when fetching health factor', async () => {
      // Mock contract methods to throw error
      const mockContract = {
        getUserAccountData: jest.fn().mockRejectedValue(new Error('Contract error'))
      };
      
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
      
      const params: ProtocolQueryParams = { 
        userAddress: '0x123',
        network: Network.ETHEREUM
      };
      
      await expect(service.getHealthFactor(params)).rejects.toThrow('Contract error');
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe('data source fallback', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should use on-chain data source by default', () => {
      expect(service.getDataSourceType()).toBe(DataSourceType.ON_CHAIN);
    });

    it('should fall back to subgraph when on-chain fails', async () => {
      // Mock subgraph URL
      const subgraphConfig = new AaveConfigBuilder()
        .withNetwork(Network.ETHEREUM)
        .withRpcUrl('https://eth-mainnet.mock.url')
        .withPoolAddress('0x123')
        .withDataProviderAddress('0x456')
        .withOracleAddress('0x789')
        .withSubgraphUrl('https://api.thegraph.com/subgraphs/name/aave/protocol')
        .build();
        
      const subgraphService = new AaveService(subgraphConfig);
      await subgraphService.initialize();
      
      // Mock contract methods to throw error
      const mockContract = {
        getUserAccountData: jest.fn().mockRejectedValue(new Error('Contract error')),
        getReservesList: jest.fn().mockRejectedValue(new Error('Contract error'))
      };
      
      (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
      
      // Mock fetch for subgraph
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: '0x123',
              reserves: []
            }
          }
        })
      });
      
      const params: ProtocolQueryParams = { 
        userAddress: '0x123',
        network: Network.ETHEREUM
      };
      
      // This should not throw since it will fall back to subgraph
      await expect(subgraphService.getUserPositions(params)).resolves.not.toThrow();
      
      await subgraphService.dispose();
    });
  });
});
