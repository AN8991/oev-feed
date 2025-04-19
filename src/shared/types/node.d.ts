/**
 * Type definitions for Node.js environment variables
 * 
 * Part of the shared layer in hexagonal architecture
 * Contains type definitions that are used across multiple layers
 */

// Type definitions for Node.js
// This file provides type declarations for Node.js environment variables

declare namespace NodeJS {
  interface ProcessEnv {
    // Provider API keys
    ALCHEMY_API_KEY?: string;
    INFURA_API_KEY?: string;
    INFURA_PROJECT_ID?: string;
    INFURA_PROJECT_SECRET?: string;
    
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
    
    // Network-specific provider configuration
    [key: string]: string | undefined;
  }
}
