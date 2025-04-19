/**
 * Contract Verification Utility
 * 
 * Part of the domain layer in hexagonal architecture
 * Provides functionality for verifying smart contracts on Etherscan
 */

import axios from 'axios';
import { CONTRACT_ADDRESSES, ContractAddressesType } from '@infrastructure/config/contracts';
import { ENV } from '@infrastructure/config/config';
import { Protocol } from '@domain/types/protocols';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';

// Etherscan API configuration
const ETHERSCAN_API_BASE_URL = 'https://api.etherscan.io/api';

/**
 * Result of contract verification
 */
export interface ContractVerificationResult {
  protocol: Protocol;
  contractName: string;
  address: string;
  isVerified: boolean;
  contractType?: string;
  compilerVersion?: string;
}

/**
 * Service for verifying smart contracts on Etherscan
 */
export class ContractVerifier {
  private apiKey: string;

  constructor() {
    // Retrieve Etherscan API key from environment configuration
    this.apiKey = ENV.getEtherscanApiKey();
  }

  /**
   * Verify a single contract address on Etherscan
   * 
   * @param address Contract address to verify
   * @returns Verification result
   */
  private async verifyContractOnEtherscan(address: string): Promise<ContractVerificationResult> {
    try {
      const response = await axios.get(ETHERSCAN_API_BASE_URL, {
        params: {
          module: 'contract',
          action: 'getabi',
          address: address,
          apikey: this.apiKey
        }
      });

      // Check contract verification status
      if (response.data.status === '1') {
        // Additional contract details request
        const detailsResponse = await axios.get(ETHERSCAN_API_BASE_URL, {
          params: {
            module: 'contract',
            action: 'getsourcecode',
            address: address,
            apikey: this.apiKey
          }
        });

        return {
          protocol: this.findProtocolForAddress(address),
          contractName: detailsResponse.data.result[0].ContractName,
          address: address,
          isVerified: true,
          contractType: detailsResponse.data.result[0].ContractType,
          compilerVersion: detailsResponse.data.result[0].CompilerVersion
        };
      }

      return {
        protocol: this.findProtocolForAddress(address),
        contractName: '',
        address: address,
        isVerified: false
      };
    } catch (error) {
      logger.error(
        `Verification error for ${address}`,
        LogCategory.GENERAL,
        { address, error: error instanceof Error ? error.message : String(error) }
      );
      
      return {
        protocol: this.findProtocolForAddress(address),
        contractName: '',
        address: address,
        isVerified: false
      };
    }
  }

  /**
   * Find the protocol for a given contract address
   * 
   * @param address Contract address
   * @returns Protocol enum value
   */
  private findProtocolForAddress(address: string): Protocol {
    for (const [protocol, networkContracts] of Object.entries(CONTRACT_ADDRESSES)) {
      for (const [networkName, network] of Object.entries(networkContracts)) {
        for (const [contractName, contractAddress] of Object.entries(network)) {
          if (contractAddress.toLowerCase() === address.toLowerCase()) {
            return protocol as Protocol;
          }
        }
      }
    }
    return 'AAVE' as Protocol; // Default fallback
  }

  /**
   * Verify all contracts in the CONTRACT_ADDRESSES configuration
   * 
   * @returns Array of verification results
   */
  async verifyAllContracts(): Promise<ContractVerificationResult[]> {
    // Validate API key before proceeding
    ENV.getEtherscanApiKey();

    const verificationResults: ContractVerificationResult[] = [];

    for (const [protocol, networkContracts] of Object.entries(CONTRACT_ADDRESSES)) {
      for (const network of Object.values(networkContracts)) {
        for (const [contractName, address] of Object.entries(network)) {
          const result = await this.verifyContractOnEtherscan(address as string);
          verificationResults.push({
            ...result,
            contractName
          });
        }
      }
    }

    return verificationResults;
  }

  /**
   * Generate a verification report for all contracts
   */
  async generateVerificationReport(): Promise<void> {
    const results = await this.verifyAllContracts();

    logger.info(
      'Contract Verification Report',
      LogCategory.GENERAL,
      { reportSize: results.length }
    );
    
    results.forEach(result => {
      const logData = {
        protocol: result.protocol,
        contract: result.contractName,
        address: result.address,
        verified: result.isVerified,
        contractType: result.contractType,
        compilerVersion: result.compilerVersion
      };
      
      if (result.isVerified) {
        logger.info(
          `Verified contract: ${result.contractName} (${result.protocol})`,
          LogCategory.GENERAL,
          logData
        );
      } else {
        logger.warn(
          `Unverified contract: ${result.contractName} (${result.protocol})`,
          LogCategory.GENERAL,
          logData
        );
      }
    });
  }
}

/**
 * Utility function to run contract verification
 */
export async function runContractVerification(): Promise<void> {
  try {
    const verifier = new ContractVerifier();
    await verifier.generateVerificationReport();
  } catch (error) {
    logger.error(
      'Contract verification failed',
      LogCategory.GENERAL,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

// Export for potential CLI or script usage
export default ContractVerifier;
