/*
 * File: http-methods.utils.ts
 * Description: Utility functions for HTTP methods validation and operations.
 * Layer: Domain
 */

import { HttpMethods } from '../enums/httpMethods';

/**
 * Validate if a string is a valid HTTP method
 */
export function isValidHttpMethod(method: string): method is HttpMethods {
  return Object.values(HttpMethods).includes(method.toUpperCase() as HttpMethods);
}

/**
 * Normalize HTTP method string to enum value
 */
export function normalizeHttpMethod(method: string): HttpMethods {
  const upperMethod = method.toUpperCase();
  return isValidHttpMethod(upperMethod) ? upperMethod : HttpMethods.GET;
}

/**
 * Get all supported HTTP methods
 */
export function getSupportedHttpMethods(): HttpMethods[] {
  return Object.values(HttpMethods);
}

/**
 * Check if HTTP method is safe (idempotent and cacheable)
 */
export function isSafeHttpMethod(method: HttpMethods): boolean {
  return [HttpMethods.GET, HttpMethods.HEAD, HttpMethods.OPTIONS].includes(method);
}

/**
 * Check if HTTP method is idempotent
 */
export function isIdempotentHttpMethod(method: HttpMethods): boolean {
  return [
    HttpMethods.GET, 
    HttpMethods.HEAD, 
    HttpMethods.PUT, 
    HttpMethods.DELETE, 
    HttpMethods.OPTIONS
  ].includes(method);
}

/**
 * Check if HTTP method typically has a request body
 */
export function methodHasBody(method: HttpMethods): boolean {
  return [HttpMethods.POST, HttpMethods.PUT, HttpMethods.PATCH].includes(method);
}

/**
 * Get HTTP method description for documentation
 */
export function getHttpMethodDescription(method: HttpMethods): string {
  const descriptions: Record<HttpMethods, string> = {
    [HttpMethods.GET]: 'Retrieve data from the server',
    [HttpMethods.POST]: 'Create new resources or submit data',
    [HttpMethods.PUT]: 'Update or replace existing resources',
    [HttpMethods.DELETE]: 'Remove resources from the server',
    [HttpMethods.PATCH]: 'Partially update existing resources',
    [HttpMethods.HEAD]: 'Retrieve headers without response body',
    [HttpMethods.OPTIONS]: 'Get allowed methods and CORS information'
  };
  
  return descriptions[method] || 'Unknown HTTP method';
}

/**
 * HTTP method configuration for different use cases
 */
export const HttpMethodConfig = {
  // Methods that should be logged by default
  LOGGED_METHODS: [
    HttpMethods.POST, 
    HttpMethods.PUT, 
    HttpMethods.DELETE, 
    HttpMethods.PATCH
  ],
  
  // Methods that should have metrics collected
  METRICS_METHODS: Object.values(HttpMethods),
  
  // Methods that require authentication
  AUTHENTICATED_METHODS: [
    HttpMethods.POST, 
    HttpMethods.PUT, 
    HttpMethods.DELETE, 
    HttpMethods.PATCH
  ],
  
  // Methods that are cacheable
  CACHEABLE_METHODS: [
    HttpMethods.GET, 
    HttpMethods.HEAD
  ]
} as const;
