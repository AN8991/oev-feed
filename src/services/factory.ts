import { Protocol, UserProtocolPosition, ProtocolDataService } from '../types/protocols';
import { Network } from '../types/networks';
import { AaveServiceFactory } from './protocols/aave/aave-factory';
import { AaveConfigBuilder } from './protocols/aave/aave-config';
import { log } from '../utils/logger';
import { ENV } from '../config/env';
import { NETWORK_CONFIGS } from '../types/networks';

// Custom error interface for protocol service errors
interface ServiceError extends Error {
  code: string;
  protocol?: Protocol;
  network?: Network;
  context?: Record<string, unknown>;
}

// Service factory error codes
const enum ErrorCode {
  PROTOCOL_REQUIRED = 'PROTOCOL_REQUIRED',
  UNSUPPORTED_PROTOCOL = 'UNSUPPORTED_PROTOCOL',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  SERVICE_ERROR = 'SERVICE_ERROR',
  MISSING_ADDRESS = 'MISSING_ADDRESS',
  INVALID_POSITIONS = 'INVALID_POSITIONS',
  POSITION_FETCH_ERROR = 'POSITION_FETCH_ERROR'
}

// Factory class for creating and managing protocol services
export class ProtocolServiceFactory {
  // Cache of protocol service instances
  private static services: Map<Protocol, ProtocolDataService> = new Map();

  // Create a new service error with consistent formatting
  private static createError(message: string, code: ErrorCode, context?: Record<string, unknown>): ServiceError {
    const error = new Error(message) as ServiceError;
    error.code = code;
    if (context) {
      error.context = context;
      log.error(message, context);
    } else {
      log.error(message);
    }
    return error;
  }

  // Get or create a service instance for the specified protocol
  static async getService(protocol: Protocol, network: Network = Network.ETHEREUM): Promise<ProtocolDataService> {
    try {
      if (!protocol) {
        throw this.createError(
          'Protocol parameter is required',
          ErrorCode.PROTOCOL_REQUIRED
        );
      }

      // Return cached service instance if available
      const cacheKey = `${protocol}-${network}`;
      if (this.services.has(protocol)) {
        const service = this.services.get(protocol);
        if (service) return service;
      }

      // Create new service instance based on protocol
      let service: ProtocolDataService;
      switch (protocol) {
        case Protocol.AAVE:
          // Use the AaveServiceFactory to create a properly configured service
          const networkConfig = NETWORK_CONFIGS[network];
          const configBuilder = new AaveConfigBuilder()
            .withNetwork(network)
            .withRpcUrl(networkConfig.rpcUrl)
            .withProtocol(protocol);
            
          if (networkConfig.wsUrl) {
            configBuilder.withWsUrl(networkConfig.wsUrl);
          }
          
          // Create the service using the factory
          service = await AaveServiceFactory.getInstance().createService(configBuilder.build());
          break;
        default:
          throw this.createError(
            `Protocol ${protocol} not supported. Only AAVE is currently supported.`,
            ErrorCode.UNSUPPORTED_PROTOCOL,
            { protocol }
          );
      }

      // Cache and return the new service instance
      this.services.set(protocol, service);
      return service;

    } catch (error) {
      // Re-throw service errors, wrap other errors
      if ((error as ServiceError).code) {
        throw error;
      }
      throw this.createError(
        'Failed to get protocol service',
        ErrorCode.SERVICE_ERROR,
        { protocol, originalError: error }
      );
    }
  }

  // Fetch user positions across all supported protocols
  static async getUserPositionsAcrossProtocols(
    userAddress: string,
    protocols: Protocol[] = Object.values(Protocol)
  ): Promise<UserProtocolPosition[]> {
    if (!userAddress) {
      throw this.createError(
        'User address is required for fetching positions',
        ErrorCode.MISSING_ADDRESS
      );
    }

    const allPositions: UserProtocolPosition[] = [];
    const errors: Error[] = [];

    // Fetch positions from each protocol in parallel
    await Promise.all(
      protocols.map(async (protocol) => {
        try {
          const service = await this.getService(protocol);
          const positions = await service.fetchUserPositions({
            userAddress,
            protocol
          });

          if (Array.isArray(positions)) {
            allPositions.push(...positions);
          } else {
            throw this.createError(
              `Invalid positions returned from ${protocol}`,
              ErrorCode.INVALID_POSITIONS,
              { protocol }
            );
          }
        } catch (error) {
          errors.push(error as Error);
          log.error(`Error fetching positions for ${protocol}`, {
            protocol,
            error
          });
        }
      })
    );

    // If no positions were found and there were errors, throw an error
    if (allPositions.length === 0 && errors.length > 0) {
      throw this.createError(
        'Failed to fetch positions from any protocol',
        ErrorCode.POSITION_FETCH_ERROR,
        { errors }
      );
    }

    return allPositions;
  }
}
