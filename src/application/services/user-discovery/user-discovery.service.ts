/*
 * File: user-discovery.service.ts
 * Description: Service for discovering and managing users with active protocol positions.
 * Layer: Application
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@adapters/secondary/database/typeorm/entities/user.entity';
import { ProtocolAdapterFactory } from '@adapters/secondary/protocols/protocol-adapter-factory';
import { Protocol } from '@domain/enums/protocols.enum';
import { Network } from '@domain/enums/networks.enum';
import { UserDiscoveryService as IUserDiscoveryService, UserDiscoveryResult } from './user-discovery.interface';

@Injectable()
export class UserDiscoveryService implements IUserDiscoveryService {
  private readonly logger = new Logger(UserDiscoveryService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly protocolAdapterFactory: ProtocolAdapterFactory,
  ) {}

  async discoverAndSaveUsers(
    protocol: Protocol,
    network: Network,
    fromTimestamp: Date,
    toTimestamp: Date
  ): Promise<{ discovered: number; saved: number; updated: number }> {
    this.logger.log(`Starting user discovery for ${protocol} on ${network} from ${fromTimestamp} to ${toTimestamp}`);

    try {
      // Get the protocol adapter
      const adapter = this.protocolAdapterFactory.createAdapter(
        protocol.toLowerCase().replace('_', '-'),
        network.toLowerCase(),
        {} // TODO: Add proper config
      );

      // Call discovery method on adapter
      const discoveredUsers = await (adapter as any).discoverActiveUsers(
        network.toLowerCase(),
        fromTimestamp,
        toTimestamp
      );

      // Process and save users
      let saved = 0;
      let updated = 0;

      for (const userData of discoveredUsers) {
        const existingUser = await this.userRepository.findOne({
          where: { address: userData.address }
        });

        if (existingUser) {
          // Update existing user
          existingUser.protocol = protocol;
          existingUser.network = network;
          existingUser.lastUpdated = new Date();
          await this.userRepository.save(existingUser);
          updated++;
        } else {
          // Create new user
          const newUser = this.userRepository.create({
            address: userData.address,
            protocol: protocol,
            network: network,
            lastUpdated: new Date(),
          });
          await this.userRepository.save(newUser);
          saved++;
        }
      }

      this.logger.log(`Discovery completed: ${discoveredUsers.length} discovered, ${saved} saved, ${updated} updated`);
      return { discovered: discoveredUsers.length, saved, updated };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error during user discovery: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
