/**
 * Contract Verification Service
 * 
 * Part of the infrastructure layer in hexagonal architecture
 * Provides functionality for verifying smart contracts on Etherscan
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CONTRACT_ADDRESSES, ContractAddressesType } from '@infrastructure/config/contracts';
import { Protocol } from '@domain/types/protocols';
import { HttpConfigService } from '@infrastructure/config/http.config';

// Etherscan API response interface
interface EtherscanApiResponse<T = any> {
  status: string;
  message: string;
  result: T;
}

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
  sourceCode?: string;
  abi?: string;
}

/**
 * Service for verifying smart contracts on Etherscan
 */
@Injectable()
export class ContractVerificationService {
  private readonly logger = new Logger(ContractVerificationService.name);
  private readonly etherscanApiKey: string;
  private readonly etherscanConfig: any;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly httpConfigService: HttpConfigService
  ) {
    this.etherscanApiKey = this.configService.get<string>('ETHERSCAN_API_KEY', '');
    this.etherscanConfig = this.httpConfigService.getEtherscanConfig();
  }

  /**
   * Verify a single contract address on Etherscan
   * 
   * @param address Contract address to verify
   * @returns Verification result
   */
  private async verifyContractOnEtherscan(address: string): Promise<ContractVerificationResult> {
    if (!this.etherscanApiKey) {
      throw new Error('Etherscan API key not configured');
    }

    try {
      // Get contract ABI
      const abiResponse = await firstValueFrom(
        this.httpService.get<EtherscanApiResponse<string>>(this.etherscanConfig.baseURL, {
          params: {
            module: 'contract',
            action: 'getabi',
            address,
            apikey: this.etherscanApiKey,
          },
          timeout: this.etherscanConfig.timeout,
        })
      );

      if (abiResponse.data.status !== '1') {
        return {
          protocol: this.findProtocolForAddress(address),
          contractName: '',
          address: address,
          isVerified: false
        };
      }

      // Get contract source code
      const sourceResponse = await firstValueFrom(
        this.httpService.get<EtherscanApiResponse<any[]>>(this.etherscanConfig.baseURL, {
          params: {
            module: 'contract',
            action: 'getsourcecode',
            address,
            apikey: this.etherscanApiKey,
          },
          timeout: this.etherscanConfig.timeout,
        })
      );

      if (sourceResponse.data.status !== '1') {
        return {
          protocol: this.findProtocolForAddress(address),
          contractName: '',
          address: address,
          isVerified: false
        };
      }

      const sourceData = sourceResponse.data.result[0];

      return {
        protocol: this.findProtocolForAddress(address),
        contractName: sourceData.ContractName,
        address: address,
        isVerified: true,
        contractType: sourceData.ContractType,
        compilerVersion: sourceData.CompilerVersion,
        sourceCode: sourceData.SourceCode,
        abi: abiResponse.data.result,
      };
    } catch (error) {
      this.logger.error(
        `Verification error for ${address}`,
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
    if (!this.etherscanApiKey) {
      throw new Error('Etherscan API key not configured');
    }

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

    this.logger.log(
      'Contract Verification Report',
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
        this.logger.log(
          `Verified contract: ${result.contractName} (${result.protocol})`,
          logData
        );
      } else {
        this.logger.warn(
          `Unverified contract: ${result.contractName} (${result.protocol})`,
          logData
        );
      }
    });
  }
}

/**
 * Utility function to run contract verification
 * Note: This function is for standalone usage. In NestJS context, inject ContractVerificationService directly.
 */
export async function runContractVerification(
  httpService: any,
  configService: any,
  httpConfigService: any
): Promise<void> {
  try {
    const verifier = new ContractVerificationService(httpService, configService, httpConfigService);
    await verifier.generateVerificationReport();
  } catch (error) {
    // Note: This is a standalone utility function, so we use console.error here
    // In NestJS context, inject ContractVerificationService directly which uses proper Logger
    console.error('Contract verification failed', { 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}

// Export for potential CLI or script usage
export default ContractVerificationService;
