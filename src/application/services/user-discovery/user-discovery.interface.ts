/*
 * File: user-discovery.interface.ts
 * Description: Interfaces for user discovery functionality.
 * Layer: Application
 */

import { Protocol } from '@domain/enums/protocols.enum';
import { Network } from '@domain/enums/networks.enum';

export interface UserDiscoveryResult {
  address: string;
  protocol: Protocol;
  network: Network;
  healthFactor: number;
  collateral: string;
  debt: string;
}

export interface UserDiscoveryService {
  discoverAndSaveUsers(
    protocol: Protocol,
    network: Network,
    fromTimestamp: Date,
    toTimestamp: Date
  ): Promise<{ discovered: number; saved: number; updated: number }>;
}
