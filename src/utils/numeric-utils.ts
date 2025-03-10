import { ethers } from 'ethers';

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
    // Convert string or number to BigInt if needed
    const bigIntValue = typeof value === 'bigint' 
      ? value 
      : BigInt(value.toString());
    
    return ethers.formatEther(bigIntValue);
  } catch (error) {
    // If conversion fails, return '0'
    console.error('Error formatting value to Ether:', error);
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
    
    // Format using ethers.js
    const formattedHealthFactor = ethers.formatEther(healthFactorBigInt);
    
    // Parse as float for comparison and formatting
    const numericValue = parseFloat(formattedHealthFactor);
    
    // Cap at maxDisplayValue if it's extremely large
    if (numericValue > maxDisplayValue) {
      return maxDisplayValue.toString();
    }
    
    // Format with 4 decimal places
    return numericValue.toFixed(4);
  } catch (error) {
    console.error('Error formatting health factor:', error);
    return '0';
  }
}
