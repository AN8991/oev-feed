import axios from 'axios';
import { CONTRACT_ADDRESSES, ContractAddressesType } from '@/config/contracts';
import { ENV } from '@/config/env';
import { Protocol } from '@/types/protocols';

// Etherscan API configuration
const ETHERSCAN_API_BASE_URL = 'https://api.etherscan.io/api';

interface ContractVerificationResult {
  protocol: Protocol;
  contractName: string;
  address: string;
  isVerified: boolean;
  contractType?: string;
  compilerVersion?: string;
}

export class ContractVerifier {
  private apiKey: string;

  constructor() {
    // Retrieve Etherscan API key from environment configuration
    this.apiKey = ENV.getEtherscanApiKey();
  }

  // Verify a single contract address
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
      console.error(`Verification error for ${address}:`, error);
      return {
        protocol: this.findProtocolForAddress(address),
        contractName: '',
        address: address,
        isVerified: false
      };
    }
  }

  // Find the protocol for a given contract address
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

  // Verify all contracts in the CONTRACT_ADDRESSES
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

  // Generate a verification report
  async generateVerificationReport(): Promise<void> {
    const results = await this.verifyAllContracts();

    console.log('Contract Verification Report:');
    console.log('----------------------------');
    
    results.forEach(result => {
      console.log(`Protocol: ${result.protocol}`);
      console.log(`Contract: ${result.contractName}`);
      console.log(`Address: ${result.address}`);
      console.log(`Verified: ${result.isVerified ? '✅ Yes' : '❌ No'}`);
      
      if (result.isVerified) {
        console.log(`Contract Type: ${result.contractType}`);
        console.log(`Compiler Version: ${result.compilerVersion}`);
      }
      
      console.log('----------------------------');
    });
  }
}

// Utility function to run verification
export async function runContractVerification() {
  try {
    const verifier = new ContractVerifier();
    await verifier.generateVerificationReport();
  } catch (error) {
    console.error('Contract verification failed:', error);
  }
}

// Export for potential CLI or script usage
export default ContractVerifier;
