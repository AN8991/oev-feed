/**
 * Environment and Configuration Type Definitions
 * 
 * Part of the domain layer in hexagonal architecture
 * Contains type definitions for environment configuration and business-related settings
 */

export enum EEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Provider API configuration interface
 */
export interface ProviderApiConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Network provider configuration
 */
export interface NetworkProviderConfig {
  rpcUrl: string;
  wsUrl?: string;
  chainId: number;
  name: string;
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  url?: string;
}

/**
 * Application configuration interface
 */
export interface AppConfig {
  environment: EEnvironment;
  port: number;
  logLevel: string;
  appUrl: string;
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  defaultType: string;
  priority: string[];
  timeout: number;
  maxRetries: number;
  enableCaching: boolean;
  cacheTtl: number;
  enableFallback: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
}

/**
 * Complete application configuration
 */
export interface ApplicationConfiguration {
  app: AppConfig;
  database: DatabaseConfig;
  providers: {
    alchemy: ProviderApiConfig;
    infura: ProviderApiConfig;
    etherscan: ProviderApiConfig;
    conduit: ProviderApiConfig;
  };
  networks: {
    ethereum: NetworkProviderConfig;
    arbitrum: NetworkProviderConfig;
    blast: NetworkProviderConfig;
  };
  providerSettings: ProviderConfig;
}

/**
 * Type definitions for Node.js environment variables
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Application settings
      NODE_ENV?: EEnvironment;
      PORT?: string;
      LOG_LEVEL?: string;
      NEXT_PUBLIC_APP_URL?: string;

      // Database configuration
      DATABASE_URL?: string;
      DB_HOST?: string;
      DB_PORT?: string;
      DB_USERNAME?: string;
      DB_PASSWORD?: string;
      DB_NAME?: string;

      // Provider API keys
      ALCHEMY_API_KEY?: string;
      INFURA_API_KEY?: string;
      BLOCKDAEMON_API_KEY?: string;
      BLOCKCYPHER_API_KEY?: string;
      QUICKNODE_API_KEY?: string;
      ETHERSCAN_API_KEY?: string;
      ANKR_API_KEY?: string;
      POCKET_API_KEY?: string;
      INFURA_PROJECT_ID?: string;
      INFURA_PROJECT_SECRET?: string;
      CONDUIT_API_KEY?: string;
      GRAPH_STUDIO_API_KEY?: string;

      // Aave V2 Ethereum Contract Addresses
      AAVE_V2_ETHEREUM_POOL?: string;
      AAVE_V2_ETHEREUM_DATA_PROVIDER?: string;
      AAVE_V2_ETHEREUM_ORACLE?: string;

      // Aave V3 Ethereum Contract Addresses
      AAVE_V3_ETHEREUM_POOL?: string;
      AAVE_V3_ETHEREUM_DATA_PROVIDER?: string;
      AAVE_V3_ETHEREUM_ORACLE?: string;

      // Network RPC endpoints
      ETHEREUM_RPC_URL?: string;
      ETHEREUM_WS_URL?: string;
      ARB_RPC_URL?: string;
      ARB_WS_URL?: string;
      BLAST_RPC_URL?: string;
      BLAST_WS_URL?: string;

      // Provider configuration
      DEFAULT_PROVIDER_TYPE?: string;
      PROVIDER_PRIORITY?: string;
      DEFAULT_TIMEOUT?: string;
      DEFAULT_MAX_RETRIES?: string;
      ENABLE_CACHING?: string;
      CACHE_TTL?: string;
      ENABLE_FALLBACK?: string;
      ENABLE_HEALTH_CHECKS?: string;
      HEALTH_CHECK_INTERVAL?: string;

      // Allow for dynamic network-specific configuration
      [key: string]: string | undefined;
    }
  }
}