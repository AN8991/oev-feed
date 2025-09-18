/**
 * Address Utilities
 * 
 * Part of the domain layer in hexagonal architecture
 * Provides utilities for handling Ethereum addresses
 */

// Import from ethers v6 - now working with proper type definitions
import { getAddress, isAddress } from 'ethers';

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
    const trimmed = address.trim();
    // Use ethers isAddress for proper validation
    if (!isAddress(trimmed)) {
      return '';
    }
    // Use ethers getAddress for proper checksum formatting
    return getAddress(trimmed);
  } catch (error) {
    // If ethers validation fails, return empty string
    return '';
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
    const trimmed = address.trim();
    // Use ethers isAddress for proper validation
    if (!isAddress(trimmed)) {
      return address.toLowerCase();
    }
    // Use ethers getAddress for proper checksum formatting
    return getAddress(trimmed);
  } catch (error) {
    // If ethers validation fails, return lowercase
    return address.toLowerCase();
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
