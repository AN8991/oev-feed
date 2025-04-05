import { Network } from '../../../types/networks';
import { Protocol } from '../../../types/protocols';
import { ExtendedProtocolConfig, BaseConfigBuilder } from '../common/protocol-config';
import { normalizeAddress } from '../../../utils/address-utils';

//Configuration for Protocol service
export interface ProtocolConfig extends ExtendedProtocolConfig {
  contractAddress: string;
  // Add other protocol-specific configuration properties here
}

//Builder for Protocol service configuration
export class ProtocolConfigBuilder extends BaseConfigBuilder<ProtocolConfig> {
  constructor() {
    super();
    // Set default protocol
    this.withProtocol(Protocol.AAVE); // Using AAVE as a placeholder, should be replaced with actual protocol
  }

  //Set the contract address
  withContractAddress(address: string): this {
    // Normalize address to ensure proper checksum
    this.config.contractAddress = normalizeAddress(address);
    return this;
  }

  //TODO:Add other protocol-specific configuration methods here

  //Validate the configuration
  validate(): void {
    super.validate();
    
    const protocolRequiredFields: (keyof ProtocolConfig)[] = [
      'contractAddress'
      // Add other required fields here
    ];
    
    const missingFields = protocolRequiredFields.filter(
      field => !this.config[field as keyof typeof this.config]
    );
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required Protocol configuration fields: ${missingFields.join(', ')}`);
    }
  }
}
