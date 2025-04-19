/**
 * Database-specific types
 * 
 * Part of the secondary adapter layer in hexagonal architecture
 * Contains database-specific type definitions used in database operations
 */

import { Protocol } from '@domain/types/protocols';

export interface GetUserPositionsOptions {
  limit?: number;
  offset?: number;
  protocol?: Protocol;
}
