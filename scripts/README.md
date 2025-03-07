# Testing Scripts

This directory contains scripts for testing and validating the OEV Feed application, particularly focused on the Aave integration.

## Testing Approach

We've moved away from traditional unit testing with Jest to a more integration-focused approach using script-based tests. This approach provides several advantages:

1. **Real-world Testing**: Scripts interact with actual contracts on the Ethereum mainnet, providing more realistic validation
2. **Address Validation**: Proper testing of address checksumming as required by ethers.js v6+
3. **Data Format Validation**: Ensures position data is properly formatted with correct decimal places and units
4. **Easy to Run**: Simple npm scripts to run individual tests or all tests at once

## Available Tests

### 1. Aave Position Fetching (`test-aave-fetch.ts`)

Tests the fetching of Aave positions from the Ethereum mainnet. This script:
- Connects to Aave V3 contracts using the official Aave Address Book
- Fetches user positions with proper address normalization
- Formats position data with appropriate decimal places
- Saves formatted positions to a JSON file in the `/data` folder

Run with:
```
npm run test:aave
```

### 2. Address Validation (`test-address-validation.ts`)

Tests Ethereum address checksumming as required by ethers.js v6+. This script:
- Validates addresses from the Aave Address Book
- Tests address normalization with `ethers.getAddress()`
- Identifies addresses that need normalization
- Saves validation results to a JSON file in the `/data` folder

Run with:
```
npm run test:address-validation
```

### 3. Data Format Validation (`test-data-format.ts`)

Tests the format of Aave position data. This script:
- Validates the structure of position objects
- Ensures all required fields are present
- Checks that addresses are properly checksummed
- Formats position data for better readability
- Validates existing data files in the `/data` folder
- Saves validation results to a JSON file in the `/data` folder

Run with:
```
npm run test:data-format
```

### 4. Aave Address Book (`check-aave-addresses-book.ts`)

Retrieves and prints Aave contract addresses from the official Aave Address Book. This script:
- Shows the structure of the Aave Address Book
- Provides a reference for Aave integration
- Helps verify that we're using the correct contract addresses

### 5. Contract Verification (`verify-contracts.ts`)

Verifies contracts using a utility function. This script is used for contract deployment and verification.

## Running All Tests

To run all tests at once, use:

```
npm run test:all
```

## Important Notes

1. **Address Checksumming**: Always use `ethers.getAddress()` to normalize addresses before using them in contract interactions
2. **Aave Contract Addresses**: Use the official `@bgd-labs/aave-address-book` package which provides properly checksummed addresses
3. **Address Normalization**: Normalize addresses at the earliest possible point (e.g., in config builders, service constructors)
4. **Aave V3 Contract Responses**: The Aave V3 contract's `getUserAccountData` method returns data as an array (tuple) rather than an object with named properties when using ethers.js v6+
