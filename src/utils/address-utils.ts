import { ethers } from 'ethers';

//Normalize an Ethereum address to ensure proper checksum format or empty string if input is false
export function normalizeAddress(address: string | undefined | null): string {
  if (!address) {
    return '';
  }
  
  try {
    return ethers.getAddress(address);
  } catch (error) {
    throw new Error(`Invalid Ethereum address format: ${address}`);
  }
}


//Normalize multiple Ethereum addresses at once. Return New object with normalized addresses
export function normalizeAddresses<T extends Record<string, string | undefined | null>>(
  addresses: T
): Record<keyof T, string> {
  const result: Record<string, string> = {};
  
  for (const key in addresses) {
    result[key] = normalizeAddress(addresses[key]);
  }
  
  return result as Record<keyof T, string>;
}
