/*
 * File: risk-assessment.port.ts
 * Description: Port for risk assessment operations in the domain layer.
 * Layer: Domain - Secondary Port
 */

import { RiskAssessmentModel } from '@domain/models/risk.model';
import { UserProtocolPosition } from '@domain/types/protocols';

/**
 * Secondary port for risk assessment operations
 * Defines the contract for risk assessment services
 */
export interface RiskAssessmentPort {
  /**
   * Calculate risk assessment for a single position
   * @param position User position data
   * @returns Complete risk assessment
   */
  calculateRiskAssessment(position: UserProtocolPosition): Promise<RiskAssessmentModel>;

  /**
   * Calculate risk assessments for multiple positions
   * @param positions Array of user positions
   * @returns Array of risk assessments
   */
  calculateBulkRiskAssessments(positions: UserProtocolPosition[]): Promise<RiskAssessmentModel[]>;

  /**
   * Get risk assessment for a specific user and protocol
   * @param userAddress User wallet address
   * @param protocol Protocol identifier
   * @param network Network identifier
   * @returns Risk assessment if position exists
   */
  getRiskAssessmentByUser(
    userAddress: string,
    protocol: string,
    network: string
  ): Promise<RiskAssessmentModel | null>;

  /**
   * Get all risk assessments with specified risk level
   * @param riskLevel Risk level to filter by
   * @param limit Maximum number of results
   * @returns Array of risk assessments
   */
  getRiskAssessmentsByLevel(
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    limit?: number
  ): Promise<RiskAssessmentModel[]>;

  /**
   * Get positions at risk of liquidation
   * @param healthFactorThreshold Maximum health factor threshold
   * @param limit Maximum number of results
   * @returns Array of at-risk positions
   */
  getPositionsAtRisk(
    healthFactorThreshold: number,
    limit?: number
  ): Promise<RiskAssessmentModel[]>;
}
