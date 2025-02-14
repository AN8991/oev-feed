import { Protocol, UserProtocolPosition, ProtocolDataService } from '@/types/protocols';
import { Network } from '@/types/networks';
import { AaveService } from './protocols/aave';
import { log } from '@/utils/logger';

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
  static getService(protocol: Protocol): ProtocolDataService {
    try {
      if (!protocol) {
        throw this.createError(
          'Protocol parameter is required',
          ErrorCode.PROTOCOL_REQUIRED
        );
      }

      // Return cached service instance if available
      if (this.services.has(protocol)) {
        const service = this.services.get(protocol);
        if (service) return service;
      }

      // Create new service instance based on protocol
      let service: ProtocolDataService;
      switch (protocol) {
        case Protocol.AAVE:
          service = new AaveService();
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
    address: string,
    network: Network = Network.ETHEREUM
  ): Promise<UserProtocolPosition[]> {
    if (!address) {
      throw this.createError(
        'Address parameter is required',
        ErrorCode.MISSING_ADDRESS
      );
    }

    try {
      // Currently only fetching from AAVE, but prepared for multiple protocols
      const service = this.getService(Protocol.AAVE);
      const positions = await service.fetchUserPositions({
        userAddress: address,
        protocolSpecificFilters: { network }
      });
      
      if (!positions || !Array.isArray(positions)) {
        throw this.createError(
          'Invalid positions data received',
          ErrorCode.INVALID_POSITIONS,
          { address }
        );
      }

      return positions;
    } catch (error) {
      // Re-throw service errors, wrap other errors
      if ((error as ServiceError).code) {
        throw error;
      }
      throw this.createError(
        'Failed to fetch user positions',
        ErrorCode.POSITION_FETCH_ERROR,
        { address, network, originalError: error }
      );
    }
  }
}
