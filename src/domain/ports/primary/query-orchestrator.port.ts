import { PositionModel } from '../../models/position.model';
import { PositionFilterCriteria } from '../../types/position-filter.types';
import { TimeRange } from '../../types/query-parameters';

/**
 * Parameters for querying user positions across protocols
 */
export interface ProtocolQueryParameters {
  /**
   * List of user addresses to query. 
   * If empty, throws an error.
   */
  userAddresses?: string[];

  /**
   * Optional filter criteria to apply to positions
   */
  filterCriteria?: PositionFilterCriteria;

  /**
   * Optional list of protocols to query
   * Defaults to all supported protocols if not specified
   */
  protocols?: string[];

  /**
   * Optional list of networks to query
   * Defaults to all supported networks if not specified
   */
  networks?: string[];

  /**
   * Time range for querying positions
   */
  timeRange?: TimeRange;

  /**
   * Custom start timestamp for querying positions
   * Required if timeRange is CUSTOM
   */
  fromTimestamp?: number;

  /**
   * Custom end timestamp for querying positions
   * Required if timeRange is CUSTOM
   */
  toTimestamp?: number;
}

/**
 * Metadata for query results
 */
export interface QueryMetadata {
  /**
   * Start time of the query
   */
  startTime: number;

  /**
   * Total number of positions found
   */
  totalCount: number;

  /**
   * Protocols queried with their status
   */
  protocols: {
    protocol: string;
    network: string;
    success: boolean;
    error?: string;
  }[];

  /**
   * Indicates if the result is partial (some protocols failed)
   */
  partialResult: boolean;

  /**
   * Start timestamp of the queried time range
   */
  startTimestamp?: number;

  /**
   * End timestamp of the queried time range
   */
  endTimestamp?: number;
}

/**
 * Result of a protocol query
 */
export interface QueryResult {
  /**
   * Positions found in the query
   */
  positions: PositionModel[];

  /**
   * Metadata about the query
   */
  metadata: QueryMetadata;
}

/**
 * Result of a single protocol and network query
 */
export interface PositionQueryResult {
  /**
   * Whether the query was successful
   */
  success: boolean;

  /**
   * Protocol queried
   */
  protocol: string;

  /**
   * Network queried
   */
  network: string;

  /**
   * Positions found (if successful)
   */
  positions?: PositionModel[];

  /**
   * Error message (if query failed)
   */
  error?: string;
}

/**
 * Primary port for orchestrating queries across multiple protocols
 */
export interface QueryOrchestratorPort {
  /**
   * Query user positions across multiple protocols
   * @param params Query parameters
   * @returns Query result with positions and metadata
   */
  queryUserPositions(params: ProtocolQueryParameters): Promise<QueryResult>;

  /**
   * Get health factors for a user across multiple protocols
   * @param userAddress User address to query health factors for
   * @param protocols Optional list of protocols to query
   * @param networks Optional list of networks to query
   * @returns Map of protocol+network to health factor
   */
  getHealthFactors(
    userAddress: string,
    protocols?: string[],
    networks?: string[]
  ): Promise<Map<string, string>>;
}
