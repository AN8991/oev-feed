import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';
import { ExtendedProtocolConfig, BaseConfigBuilder } from '../common/protocol-config';
import { ethers } from 'ethers';
import { log } from '../../../utils/logger';
import { AaveV3Ethereum, AaveV2Ethereum } from '@bgd-labs/aave-address-book';
import { normalizeAddress } from '../../../utils/address-utils';

/**
 * Aave protocol version
 */
export enum AaveVersion {
  V2 = 'v2',
  V3 = 'v3'
}

/**
 * Configuration for Aave service
 */
export interface AaveConfig extends ExtendedProtocolConfig {
  poolAddress: string;
  dataProviderAddress: string;
  oracleAddress: string;
  version: AaveVersion;
}

/**
 * Builder for Aave service configuration
 */
export class AaveConfigBuilder extends BaseConfigBuilder<AaveConfig> {
  constructor() {
    super();
    // Set default protocol
    this.withProtocol(Protocol.AAVE);
    // Default to V3
    this.config.version = AaveVersion.V3;
    // Initialize with default addresses from Aave Address Book for V3
    this.config.poolAddress = AaveV3Ethereum.POOL;
    this.config.dataProviderAddress = AaveV3Ethereum.AAVE_PROTOCOL_DATA_PROVIDER;
    this.config.oracleAddress = AaveV3Ethereum.ORACLE;
  }

  /**
   * Set the pool address
   * @param address The pool contract address
   */
  withPoolAddress(address: string): this {
    // Normalize address to ensure proper checksum
    this.config.poolAddress = normalizeAddress(address);
    return this;
  }

  /**
   * Set the data provider address
   * @param address The data provider contract address
   */
  withDataProviderAddress(address: string): this {
    // Normalize address to ensure proper checksum
    this.config.dataProviderAddress = normalizeAddress(address);
    return this;
  }

  /**
   * Set the oracle address
   * @param address The oracle contract address
   */
  withOracleAddress(address: string): this {
    // Normalize address to ensure proper checksum
    this.config.oracleAddress = normalizeAddress(address);
    return this;
  }

  /**
   * Set the Aave protocol version
   * @param version The Aave protocol version
   */
  withVersion(version: AaveVersion): this {
    this.config.version = version;
    return this;
  }

  /**
   * Validate the configuration
   */
  validate(): void {
    super.validate();
    
    const aaveRequiredFields: (keyof AaveConfig)[] = [
      'poolAddress', 
      'dataProviderAddress', 
      'oracleAddress',
      'version'
    ];
    
    const missingFields = aaveRequiredFields.filter(
      field => !this.config[field as keyof typeof this.config]
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required Aave configuration fields: ${missingFields.join(', ')}`);
    }
  }
}
