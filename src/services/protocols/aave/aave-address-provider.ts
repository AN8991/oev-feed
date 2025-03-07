import { Network } from '../../../types/networks';
import { 
  AaveV3Ethereum, 
  AaveV2Ethereum 
} from '@bgd-labs/aave-address-book';
import { AaveVersion } from './aave-config';
import { ethers } from 'ethers';
import { log } from '../../../utils/logger';

// ABI snippet for the LendingPoolAddressesProvider
const LENDING_POOL_ADDRESSES_PROVIDER_ABI = [
  "function getLendingPool() view returns (address)",
  "function getProtocolDataProvider() view returns (address)"
];

export interface AaveAddresses {
  poolAddress: string;
  dataProviderAddress: string;
  oracleAddress: string;
}

/**
 * Provider for Aave contract addresses
 * Uses the official @bgd-labs/aave-address-book package to get verified addresses
 * and dynamically resolves V2 addresses when needed
 */
export class AaveAddressProvider {
  // Cache for resolved V2 addresses
  private static v2AddressCache: Record<string, AaveAddresses> = {};

  /**
   * Get static addresses for a specific network and version
   * Note: For V2, poolAddress may be empty and need to be resolved dynamically
   * @param network The network to get addresses for
   * @param version The Aave protocol version
   * @returns Contract addresses for the specified network and version
   */
  static getAddresses(network: Network, version: AaveVersion): AaveAddresses {
    switch (network) {
      case Network.ETHEREUM:
        return version === AaveVersion.V3 
          ? this.getEthereumV3Addresses() 
          : this.getEthereumV2StaticAddresses();
      default:
        throw new Error(`Unsupported network for Aave: ${network}`);
    }
  }

  /**
   * Get Ethereum V3 addresses from the official address book
   * @returns Aave V3 addresses for Ethereum
   */
  private static getEthereumV3Addresses(): AaveAddresses {
    return {
      poolAddress: AaveV3Ethereum.POOL,
      dataProviderAddress: AaveV3Ethereum.POOL_ADDRESSES_PROVIDER,
      oracleAddress: AaveV3Ethereum.ORACLE
    };
  }

  /**
   * Get static Ethereum V2 addresses from the official address book
   * Note: The poolAddress is empty and will be resolved dynamically when needed
   * @returns Aave V2 addresses for Ethereum
   */
  private static getEthereumV2StaticAddresses(): AaveAddresses {
    return {
      // This will be resolved dynamically
      poolAddress: '', 
      dataProviderAddress: AaveV2Ethereum.AAVE_PROTOCOL_DATA_PROVIDER,
      oracleAddress: AaveV2Ethereum.ORACLE
    };
  }

  /**
   * Dynamically resolve Aave V2 addresses using the provider contract
   * @param provider An ethers provider
   * @param network The network to resolve addresses for
   * @returns A promise resolving to the complete addresses
   */
  static async resolveV2Addresses(
    provider: ethers.Provider,
    network: Network
  ): Promise<AaveAddresses> {
    const cacheKey = network.toString();
    
    // Check cache first
    if (this.v2AddressCache[cacheKey]) {
      log.debug('Using cached Aave V2 addresses', { network });
      return this.v2AddressCache[cacheKey];
    }
    
    // Get static addresses first
    const staticAddresses = this.getEthereumV2StaticAddresses();
    
    try {
      log.info('Resolving Aave V2 addresses dynamically', { network });
      
      // Create a contract instance for the provider
      const providerContract = new ethers.Contract(
        AaveV2Ethereum.POOL_ADDRESSES_PROVIDER,
        LENDING_POOL_ADDRESSES_PROVIDER_ABI,
        provider
      );
      
      // Get the lending pool address
      const lendingPoolAddress = await providerContract.getLendingPool();
      
      const resolvedAddresses = {
        ...staticAddresses,
        poolAddress: lendingPoolAddress
      };
      
      // Verify the resolved addresses
      if (!this.verifyAddresses(resolvedAddresses)) {
        throw new Error('Invalid addresses resolved from Aave V2 provider');
      }
      
      log.info('Successfully resolved Aave V2 addresses', { 
        network, 
        addresses: resolvedAddresses 
      });
      
      // Cache the result
      this.v2AddressCache[cacheKey] = resolvedAddresses;
      return resolvedAddresses;
    } catch (error) {
      log.error('Failed to resolve Aave V2 addresses', { 
        network, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw new Error(`Failed to resolve Aave V2 addresses: ${error}`);
    }
  }

  /**
   * Verify address checksums
   * @param addresses The addresses to verify
   * @returns True if all addresses are valid, false otherwise
   */
  static verifyAddresses(addresses: AaveAddresses): boolean {
    try {
      // Verify each address using ethers.js
      Object.entries(addresses).forEach(([key, address]) => {
        // Skip empty addresses (they'll be resolved dynamically)
        if (address) {
          ethers.getAddress(address); // Will throw if invalid
        }
      });
      return true;
    } catch (error) {
      log.error('Address verification failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
}
