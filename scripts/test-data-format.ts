// Import required libraries for data validation and file operations
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Test script for validating the format of Aave position data
 * This ensures that all position data is properly formatted with correct decimal places,
 * address checksums, and complete information
 */

// Define Protocol enum to match the one in the project
enum Protocol {
  AAVE = 'AAVE',
}

// Define simplified types for testing to avoid dependencies on the full implementation
interface Asset {
  symbol: string;
  address?: string;
  amount: string;
  valueETH?: string;
}

// Define the user position interface for validation
interface UserPosition {
  protocol: Protocol | string;
  network: string;
  version: string;
  userAddress: string;
  collateral: string | null;
  debt: string | null;
  healthFactor: string;
  fetchedTimestamp: number;
  borrowedAssets: Asset[];
  suppliedAssets: Asset[];
  liquidationRisk?: {
    threshold: string;
    currentLTV: string;
  };
  details?: {
    onChainData?: {
      totalCollateral: string;
      totalDebt: string;
      healthFactor: string;
    };
  };
}

// Define a sample position for testing
const samplePosition: UserPosition = {
  protocol: Protocol.AAVE,
  network: 'ethereum',
  version: 'v3',
  userAddress: '0xf0bb20865277aBd641a307eCe5Ee04E79073416C',
  collateral: '0.076366803747782627',
  debt: '0.067992162433900694',
  healthFactor: '1.067012152039174497',
  fetchedTimestamp: Math.floor(Date.now() / 1000),
  borrowedAssets: [
    {
      symbol: 'WETH',
      amount: '313206.696181665595940955',
      valueETH: '0',
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    }
  ],
  suppliedAssets: [
    {
      symbol: 'weETH',
      address: '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee',
      amount: '331295.829066971248053061'
    }
  ],
  liquidationRisk: {
    threshold: '9500',
    currentLTV: '9300'
  },
  details: {
    onChainData: {
      totalCollateral: '76366803747782627',
      totalDebt: '67992162433900694',
      healthFactor: '1067012152039174497'
    }
  }
};

// Function to format position data for better readability
function formatPositionData(position: UserPosition) {
  // Format numbers to have appropriate decimal places
  const formatNumber = (value: string | null | undefined, decimals = 6) => {
    if (!value) return '0.000000';
    const num = parseFloat(value);
    return num.toFixed(decimals);
  };

  // Format health factor with 4 decimal places
  const healthFactor = formatNumber(position.healthFactor, 4);
  
  // Format collateral and debt with 6 decimal places
  const collateral = formatNumber(position.collateral);
  const debt = formatNumber(position.debt);
  
  // Format borrowed assets
  const borrowedAssets = position.borrowedAssets.map(asset => ({
    symbol: asset.symbol,
    address: asset.address ? ethers.getAddress(asset.address) : undefined, // Ensure proper checksum if address exists
    amount: formatNumber(asset.amount, 8),
    valueETH: asset.valueETH ? formatNumber(asset.valueETH) : '0.000000'
  }));
  
  // Format supplied assets
  const suppliedAssets = position.suppliedAssets.map(asset => ({
    symbol: asset.symbol,
    address: asset.address ? ethers.getAddress(asset.address) : undefined, // Ensure proper checksum if address exists
    amount: formatNumber(asset.amount, 8)
  }));
  
  // Format liquidation risk
  const liquidationRisk = {
    threshold: position.liquidationRisk?.threshold 
      ? (parseInt(position.liquidationRisk.threshold) / 100).toFixed(2) + '%'
      : 'N/A',
    currentLTV: position.liquidationRisk?.currentLTV
      ? (parseInt(position.liquidationRisk.currentLTV) / 100).toFixed(2) + '%'
      : 'N/A'
  };
  
  // Create a summary for the position
  const summary = {
    protocol: position.protocol,
    network: position.network,
    version: position.version,
    userAddress: ethers.getAddress(position.userAddress), // Ensure proper checksum
    collateral: `${collateral} ETH`,
    debt: `${debt} ETH`,
    healthFactor,
    fetchedTimestamp: new Date(position.fetchedTimestamp * 1000).toISOString(),
    borrowedAssets,
    suppliedAssets,
    liquidationRisk,
    details: position.details
  };
  
  return summary;
}

// Function to validate a position object
function validatePosition(position: UserPosition): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  const requiredFields = ['protocol', 'network', 'version', 'userAddress', 'fetchedTimestamp'];
  for (const field of requiredFields) {
    if (!position[field as keyof UserPosition]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate userAddress is a valid Ethereum address
  try {
    ethers.getAddress(position.userAddress);
  } catch (error) {
    errors.push(`Invalid userAddress: ${position.userAddress}`);
  }
  
  // Validate borrowedAssets
  if (!Array.isArray(position.borrowedAssets)) {
    errors.push('borrowedAssets must be an array');
  } else {
    position.borrowedAssets.forEach((asset, index) => {
      if (!asset.symbol) {
        errors.push(`borrowedAssets[${index}] missing symbol`);
      }
      if (asset.address) {
        try {
          ethers.getAddress(asset.address);
        } catch (error) {
          errors.push(`borrowedAssets[${index}] has invalid address: ${asset.address}`);
        }
      }
      if (!asset.amount) {
        errors.push(`borrowedAssets[${index}] missing amount`);
      }
    });
  }
  
  // Validate suppliedAssets
  if (!Array.isArray(position.suppliedAssets)) {
    errors.push('suppliedAssets must be an array');
  } else {
    position.suppliedAssets.forEach((asset, index) => {
      if (!asset.symbol) {
        errors.push(`suppliedAssets[${index}] missing symbol`);
      }
      if (asset.address) {
        try {
          ethers.getAddress(asset.address);
        } catch (error) {
          errors.push(`suppliedAssets[${index}] has invalid address: ${asset.address}`);
        }
      }
      if (!asset.amount) {
        errors.push(`suppliedAssets[${index}] missing amount`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Function to run the data format validation tests
async function runTests() {
  console.log('🔍 Running Data Format Validation Tests');
  console.log('=======================================');
  
  const results = {
    validationResults: [] as any[],
    formattingExample: {} as any,
    summary: {
      passed: 0,
      failed: 0
    }
  };
  
  // Test the sample position
  console.log('\n📊 Testing sample position format');
  const validation = validatePosition(samplePosition);
  
  if (validation.isValid) {
    console.log('✅ Sample position is valid');
    results.summary.passed++;
  } else {
    console.log('❌ Sample position has errors:');
    validation.errors.forEach(error => console.log(`   - ${error}`));
    results.summary.failed++;
  }
  
  results.validationResults.push({
    position: 'Sample Position',
    isValid: validation.isValid,
    errors: validation.errors
  });
  
  // Format the sample position and show the result
  console.log('\n📋 Formatted position example:');
  const formattedPosition = formatPositionData(samplePosition);
  console.log(JSON.stringify(formattedPosition, null, 2));
  
  results.formattingExample = formattedPosition;
  
  // Check existing data files
  console.log('\n📁 Checking existing data files');
  const dataDir = path.join(__dirname, '..', 'data');
  
  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir)
      .filter(file => file.startsWith('aave-') && file.endsWith('.json'));
    
    console.log(`Found ${files.length} Aave data files`);
    
    for (const file of files) {
      try {
        const filePath = path.join(dataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (Array.isArray(data)) {
          console.log(`\n📄 Checking file: ${file}`);
          
          let fileValid = true;
          const fileResults = {
            file,
            positions: [] as any[]
          };
          
          for (let i = 0; i < data.length; i++) {
            const position = data[i];
            const positionValidation = validatePosition(position);
            
            if (positionValidation.isValid) {
              console.log(`✅ Position ${i + 1} is valid`);
            } else {
              console.log(`❌ Position ${i + 1} has errors:`);
              positionValidation.errors.forEach(error => console.log(`   - ${error}`));
              fileValid = false;
            }
            
            fileResults.positions.push({
              index: i,
              isValid: positionValidation.isValid,
              errors: positionValidation.errors
            });
          }
          
          if (fileValid) {
            console.log(`✅ All positions in ${file} are valid`);
            results.summary.passed++;
          } else {
            console.log(`❌ File ${file} contains invalid positions`);
            results.summary.failed++;
          }
          
          results.validationResults.push(fileResults);
        } else {
          console.log(`⚠️ File ${file} does not contain an array of positions`);
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
  } else {
    console.log('Data directory does not exist');
  }
  
  // Print summary
  console.log('\n📊 Test Summary');
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filePath = path.join(dataDir, `data-format-validation-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${filePath}`);
}

// Run the tests
runTests().catch(console.error);
