/**
 * ESLint Configuration Update Script
 * 
 * This script updates the existing ESLint configuration to include
 * rules for enforcing hexagonal architecture import patterns.
 */

const fs = require('fs');
const path = require('path');

// Path to the existing ESLint config
const eslintConfigPath = path.resolve(__dirname, '..', '.eslintrc.js');
// Path to our hexagonal architecture ESLint rules
const hexagonalRulesPath = path.resolve(__dirname, '..', '.eslintrc.hexagonal.js');

console.log('Updating ESLint configuration to enforce hexagonal architecture...');

// Check if the existing ESLint config exists
if (!fs.existsSync(eslintConfigPath)) {
  console.error(`Error: Could not find existing ESLint config at ${eslintConfigPath}`);
  process.exit(1);
}

// Read the existing ESLint config
let eslintConfig;
try {
  // Read the file as a string
  const configContent = fs.readFileSync(eslintConfigPath, 'utf8');
  
  // Extract the configuration object
  const configMatch = configContent.match(/module\.exports\s*=\s*({[\s\S]*})/);
  if (!configMatch) {
    throw new Error('Could not parse ESLint configuration');
  }
  
  // Parse the configuration object
  eslintConfig = eval(`(${configMatch[1]})`);
} catch (error) {
  console.error(`Error reading existing ESLint config: ${error.message}`);
  process.exit(1);
}

// Read the hexagonal architecture rules
let hexagonalRules;
try {
  // Read the file as a string
  const rulesContent = fs.readFileSync(hexagonalRulesPath, 'utf8');
  
  // Extract the configuration object
  const rulesMatch = rulesContent.match(/module\.exports\s*=\s*({[\s\S]*})/);
  if (!rulesMatch) {
    throw new Error('Could not parse hexagonal architecture rules');
  }
  
  // Parse the configuration object
  hexagonalRules = eval(`(${rulesMatch[1]})`);
} catch (error) {
  console.error(`Error reading hexagonal architecture rules: ${error.message}`);
  process.exit(1);
}

// Merge the configurations
const mergedConfig = {
  ...eslintConfig,
  plugins: [
    ...(eslintConfig.plugins || []),
    ...(hexagonalRules.plugins || []).filter(plugin => 
      !(eslintConfig.plugins || []).includes(plugin)
    )
  ],
  settings: {
    ...(eslintConfig.settings || {}),
    ...(hexagonalRules.settings || {})
  },
  rules: {
    ...(eslintConfig.rules || {}),
    ...(hexagonalRules.rules || {})
  }
};

// Create a backup of the existing config
const backupPath = `${eslintConfigPath}.backup`;
fs.copyFileSync(eslintConfigPath, backupPath);
console.log(`Backup of existing ESLint config created at ${backupPath}`);

// Write the merged configuration back to the ESLint config file
try {
  const configContent = `/**
 * ESLint Configuration
 * Updated to include hexagonal architecture import rules
 */
module.exports = ${JSON.stringify(mergedConfig, null, 2)};
`;
  fs.writeFileSync(eslintConfigPath, configContent, 'utf8');
  console.log(`ESLint configuration updated successfully!`);
} catch (error) {
  console.error(`Error writing updated ESLint config: ${error.message}`);
  process.exit(1);
}

console.log('\nHexagonal architecture import rules have been added to your ESLint configuration.');
console.log('You may need to install the following ESLint plugins:');
console.log('  npm install --save-dev eslint-plugin-import eslint-plugin-boundaries');
console.log('\nTo run ESLint with the new rules:');
console.log('  npx eslint src/ --ext .ts');
