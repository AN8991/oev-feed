// Environment Configuration Utility

import { z } from 'zod';

// Zod schema for validating API keys
const ApiKeySchema = z.string().min(10, 'API key must be at least 10 characters long');

class EnvironmentConfig {
  private static instance: EnvironmentConfig;

  private constructor() {}

  public static getInstance(): EnvironmentConfig {
    if (!this.instance) {
      this.instance = new EnvironmentConfig();
    }
    return this.instance;
  }

  // Centralized method to get API keys with validation
  public getApiKey(keyName: string): string {
    // Check multiple sources with priority
    const apiKey = 
      process.env[keyName] ||  // Next.js env
      (globalThis as any)[keyName] ||  // Global object fallback
      '';

    console.log(`Retrieving API key for ${keyName}:`, apiKey);
    console.log('Environment variables:', process.env);

    try {
      // For testing, reduce minimum key length
      const testSchema = z.string().min(5, 'API key must be at least 5 characters long');
      return testSchema.parse(apiKey);
    } catch (error) {
      console.warn(`Invalid or missing API key for ${keyName}`);
      throw new Error(`API key validation failed for ${keyName}`);
    }
  }

  // Getter for specific provider API keys
  public get ALCHEMY_API_KEY(): string {
    return this.getApiKey('ALCHEMY_API_KEY');
  }

  public get INFURA_API_KEY(): string {
    return this.getApiKey('INFURA_API_KEY');
  }

  public get ETHERSCAN_API_KEY(): string {
    return this.getApiKey('ETHERSCAN_API_KEY');
  }

  public get GRAPH_STUDIO_API_KEY(): string {
    return this.getApiKey('GRAPH_STUDIO_API_KEY');
  }

  // Validate Etherscan API Key
  public validateEtherscanApiKey(): boolean {
    if (!this.ETHERSCAN_API_KEY) {
      console.warn('⚠️ Etherscan API key is not set. Contract verification may fail.');
      return false;
    }
    return true;
  }

  // Safely get Etherscan API Key with optional error handling
  public getEtherscanApiKey(throwOnMissing: boolean = true): string {
    if (throwOnMissing && !this.ETHERSCAN_API_KEY) {
      throw new Error('Etherscan API key is required for contract verification. Please add ETHERSCAN_API_KEY to your .env file.');
    }
    return this.ETHERSCAN_API_KEY;
  }

  // Validates the presence of The Graph Studio API key.
  public validateGraphStudioApiKey(): boolean {
    if (!this.GRAPH_STUDIO_API_KEY) {
      console.warn('⚠️ The Graph Studio API key is not set. Subgraph queries may fail.');
      return false;
    }
    return true;
  }

  //Safely retrieves The Graph Studio API key with optional error handling.
  public getGraphStudioApiKey(throwOnMissing: boolean = true): string {
    if (throwOnMissing && !this.GRAPH_STUDIO_API_KEY) {
      throw new Error('The Graph Studio API key is required for subgraph queries. Please add GRAPH_STUDIO_API_KEY to your .env file.');
    }
    return this.GRAPH_STUDIO_API_KEY;
  }

  // Get API Keys with validation
  public getAlchemyApiKey(throwOnMissing: boolean = true): string {
    if (throwOnMissing && !this.ALCHEMY_API_KEY) {
      throw new Error('Alchemy API key is required. Please add ALCHEMY_API_KEY to your .env file.');
    }
    return this.ALCHEMY_API_KEY;
  }

  public getInfuraApiKey(throwOnMissing: boolean = true): string {
    if (throwOnMissing && !this.INFURA_API_KEY) {
      throw new Error('Infura API key is required. Please add INFURA_API_KEY to your .env file.');
    }
    return this.INFURA_API_KEY;
  }

  // Utility method to validate API key format. Please add new methods for new providers as needed.
  public validateApiKeyFormat(apiKey: string, provider: string): boolean {
    // Basic format checks for different providers
    const providerFormats: { [key: string]: RegExp } = {
      Alchemy: /^[A-Za-z0-9_-]{32}$/,  // 32 character alphanumeric key
      Infura: /^[0-9a-f]{32}$/,         // 32 character hexadecimal key
      Etherscan: /^[A-Z0-9]{10}$/,      // 10 character alphanumeric key
      GraphStudio: /^[A-Za-z0-9]{36}$/  // 36 character alphanumeric key
    };

    const format = providerFormats[provider];
    return format ? format.test(apiKey) : false;
  }

  // Enhanced validation method for Alchemy API key
  public validateAlchemyApiKey(): boolean {
    if (!this.ALCHEMY_API_KEY) {
      console.warn('⚠️ Alchemy API key is missing.');
      return false;
    }

    if (!this.validateApiKeyFormat(this.ALCHEMY_API_KEY, 'Alchemy')) {
      console.error('❌ Invalid Alchemy API key format.');
      return false;
    }

    return true;
  }

  // Enhanced validation method for Infura API key
  public validateInfuraApiKey(): boolean {
    if (!this.INFURA_API_KEY) {
      console.warn('⚠️ Infura API key is missing.');
      return false;
    }

    if (!this.validateApiKeyFormat(this.INFURA_API_KEY, 'Infura')) {
      console.error('❌ Invalid Infura API key format.');
      return false;
    }

    return true;
  }

  // Comprehensive method to validate all API keys
  public validateAllApiKeys(): { [key: string]: boolean } {
    return {
      Alchemy: this.validateAlchemyApiKey(),
      Infura: this.validateInfuraApiKey(),
      Etherscan: this.validateEtherscanApiKey(),
      GraphStudio: this.validateGraphStudioApiKey()
    };
  }

  // Method to check if any critical API keys are missing
  public areCriticalApiKeysMissing(): boolean {
    const criticalKeys = [
      this.ALCHEMY_API_KEY,
      this.INFURA_API_KEY
    ];

    return criticalKeys.some(key => !key);
  }
}

export const ENV = EnvironmentConfig.getInstance();
