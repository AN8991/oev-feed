// Mapping of contract names to their addresses for a single network
export type NetworkContracts = {
  [contractName: string]: string;
};

// Mapping of network names to their specific contract addresses
export type ProtocolNetworks = {
  [networkName: string]: NetworkContracts;
};

// Comprehensive mapping of protocols to their network-specific contract addresses
export type ContractAddressesType = {
  [protocol: string]: ProtocolNetworks;
};

// Centralized configuration of contract addresses across different protocols and networks
export const CONTRACT_ADDRESSES: ContractAddressesType = {
  // Aave V3 contract addresses for Ethereum mainnet
  AAVE: {
    V3_ETH_MAINNET: {
      // Aave Pool contract for managing liquidity and user positions
      POOL: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      // Data provider contract for retrieving protocol-specific information
      POOL_DATA_PROVIDER: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
      // Price oracle contract for fetching asset prices
      ORACLE: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
      // Rewards controller contract for managing protocol rewards
      REWARDS_CONTROLLER: '0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb'
    }
  }
};

// Type inference of CONTRACT_ADDRESSES for improved type checking and autocompletion
export type ContractAddresses = typeof CONTRACT_ADDRESSES;
