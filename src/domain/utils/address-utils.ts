/**
 * Address Utilities
 * 
 * Part of the domain layer in hexagonal architecture
 * Provides utilities for handling Ethereum addresses
 */

// Import from ethers directly - this is the correct import for ethers v6
import { getAddress } from 'ethers';

/**
 * Normalize an Ethereum address to ensure proper checksum format
 * Returns empty string if input is falsy
 * 
 * @param address The address to normalize
 * @returns Normalized address in checksum format or empty string
 */
export function normalizeAddress(address: string | undefined | null): string {
  if (!address) {
    return '';
  }
  
  try {
    return getAddress(address);
  } catch {
    return address.toLowerCase();
  }
}

/**
 * Normalize an Ethereum address to ensure proper checksum format
 * Returns empty string if input is falsy
 *
 * @param address The address to normalize
 */
export function normalizeAddressChecksum(address: string): string {
  if (!address) return '';
  try {
    return getAddress(address);
  } catch {
    return address.toLowerCase(); // fallback to lowercasing if invalid
  }
}

/**
 * Normalize multiple Ethereum addresses at once
 * 
 * @param addresses Object containing addresses to normalize
 * @returns New object with normalized addresses
 */
export function normalizeAddresses<T extends Record<string, string | undefined | null>>(
  addresses: T
): Record<keyof T, string> {
  const result: Record<string, string> = {};
  
  for (const key in addresses) {
    result[key] = normalizeAddress(addresses[key]);
  }
  
  return result as Record<keyof T, string>;
}
