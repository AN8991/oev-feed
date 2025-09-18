/**
 * Numeric Utilities
 * 
 * Part of the domain layer in hexagonal architecture
 * Provides utilities for handling and formatting numeric values related to blockchain data
 */

import { Logger } from '@nestjs/common';
import { formatUnits, parseUnits, MaxUint256 } from 'ethers';

const logger = new Logger('NumericUtils');

/**
 * Formats a BigInt, string, or number value to Ether units
 * Handles different input types and returns a standardized string representation
 * 
 * @param value The value to format (BigInt, string, or number)
 * @returns The formatted value as a string in Ether units
 */
export function formatToEther(value: bigint | string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0';
  }

  try {
    // Use ethers formatUnits for proper wei to ether conversion
    return formatUnits(value.toString(), 18);
  } catch (error) {
    // If conversion fails, return '0'
    logger.error('Error formatting value to Ether:', error);
    return '0';
  }
}

/**
 * Formats a health factor value with appropriate handling for large values
 * 
 * @param healthFactor The health factor value (BigInt, string, or number)
 * @param maxDisplayValue Optional maximum value to display (defaults to 100)
 * @returns The formatted health factor as a string
 */
export function formatHealthFactor(
  healthFactor: bigint | string | number | null | undefined,
  maxDisplayValue: number = 100
): string {
  if (healthFactor === null || healthFactor === undefined) {
    return '0';
  }

  try {
    // Convert to string first to handle different input types
    const healthFactorStr = healthFactor.toString();
    
    // Check if it's already a decimal string (e.g., "1.5")
    if (healthFactorStr.includes('.')) {
      const numValue = parseFloat(healthFactorStr);
      return numValue > maxDisplayValue 
        ? maxDisplayValue.toString() 
        : numValue.toFixed(4);
    }
    
    // Handle BigInt or string representing a BigInt
    const healthFactorBigInt = BigInt(healthFactorStr);
    
    // Use ethers formatUnits for proper wei to ether conversion
    const formattedHealthFactor = formatUnits(healthFactorBigInt.toString(), 18);
    
    // Parse as float for comparison and formatting
    const numericValue = parseFloat(formattedHealthFactor);
    
    // Cap at maxDisplayValue if it's extremely large
    if (numericValue > maxDisplayValue) {
      return maxDisplayValue.toString();
    }
    
    // Format with 4 decimal places
    return numericValue.toFixed(4);
  } catch (error) {
    logger.error('Error formatting health factor:', error);
    return '0';
  }
}

/**
 * Formats a value to a specific number of decimal places with proper units
 * 
 * @param value The value to format (BigInt, string, or number)
 * @param decimals The number of decimals for the token (default: 18)
 * @param displayDecimals The number of decimal places to display (default: 4)
 * @returns The formatted value as a string
 */
export function formatTokenAmount(
  value: bigint | string | number | null | undefined,
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  if (value === null || value === undefined) {
    return '0';
  }

  try {
    const formatted = formatUnits(value.toString(), decimals);
    const numericValue = parseFloat(formatted);
    return numericValue.toFixed(displayDecimals);
  } catch (error) {
    logger.error('Error formatting token amount:', error);
    return '0';
  }
}

/**
 * Checks if a value represents an unlimited/maximum allowance
 * 
 * @param value The value to check
 * @returns True if the value represents unlimited allowance
 */
export function isUnlimitedAllowance(value: bigint | string | number): boolean {
  try {
    const valueBigInt = BigInt(value.toString());
    // Check if value is close to MaxUint256 (within 1% for gas optimization scenarios)
    const threshold = MaxUint256 * BigInt(99) / BigInt(100);
    return valueBigInt >= threshold;
  } catch (error) {
    logger.error('Error checking unlimited allowance:', error);
    return false;
  }
}

/**
 * Safely converts a value to BigInt
 * 
 * @param value The value to convert
 * @returns The BigInt representation or 0n if conversion fails
 */
export function toBigInt(value: bigint | string | number | null | undefined): bigint {
  if (value === null || value === undefined) {
    return 0n;
  }

  try {
    return BigInt(value.toString());
  } catch (error) {
    logger.error('Error converting to BigInt:', error);
    return 0n;
  }
}
