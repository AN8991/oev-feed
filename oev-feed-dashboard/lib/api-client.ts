import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Response Types
export interface PortfolioSummary {
  totalCollateralUSD: number;
  totalDebtUSD: number;
  overallHealthFactor: number;
  activePositionsCount: number;
  collateralChange24h: number;
  debtChange24h: number;
  healthFactorTrend: 'up' | 'down' | 'stable';
  protocolDistribution: Record<string, number>;
  networkDistribution: Record<string, number>;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface RiskAssessment {
  compositeRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  healthFactorHistory: Array<{
    timestamp: string;
    value: number;
  }>;
  ltvAnalysis: {
    currentLTV: number;
    maxLTV: number;
    utilizationPercentage: number;
  };
  liquidationDistance: {
    overallPercentage: number;
    topRiskyAssets: Array<{
      symbol: string;
      priceDropNeeded: number;
    }>;
  };
  assetConcentration: {
    hhiScore: number;
    diversificationRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    topConcentratedAssets: Array<{
      symbol: string;
      percentage: number;
    }>;
  };
  alerts: Array<{
    id: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    type: string;
    message: string;
    affectedPosition: string;
    recommendedAction: string;
    timestamp: string;
  }>;
}

export interface ProviderHealth {
  providers: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    responseTimeMs: number;
    successRate: number;
    lastChecked: string;
  }>;
  requestDistribution: Array<{
    provider: string;
    requestCount: number;
    successCount: number;
    failureCount: number;
  }>;
  circuitBreakers: Array<{
    provider: string;
    isOpen: boolean;
    reason: string;
    retryAfter: string;
    fallbackProvider: string;
  }>;
  metrics: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    fallbackActivations: number;
  };
}

// API Functions
export const portfolioApi = {
  getSummary: async (walletAddress: string): Promise<PortfolioSummary> => {
    const { data } = await apiClient.get('/portfolio/summary', {
      params: { walletAddress },
    });
    return data;
  },
};

export const riskApi = {
  getAssessment: async (walletAddress: string): Promise<RiskAssessment> => {
    const { data } = await apiClient.get('/risk/assessment', {
      params: { walletAddress },
    });
    return data;
  },
};

export const providerApi = {
  getHealth: async (): Promise<ProviderHealth> => {
    const { data } = await apiClient.get('/provider-health');
    return data;
  },
};

// Wallet Address Types
export interface WalletAddress {
  address: string;
  positionCount: number;
  lastUpdated: string;
}

export const walletsApi = {
  getAddresses: async (): Promise<WalletAddress[]> => {
    const { data } = await apiClient.get('/wallets/addresses');
    return data;
  },
};
