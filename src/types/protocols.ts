export interface UserPosition {
  protocol: string;
  collateral: string;
  debt: string;
  healthFactor: string;
  timestamp: number;
}

export interface ProtocolService {
  getUserPositions(address: string): Promise<UserPosition[]>;
  getHealthFactor(address: string): Promise<string>;
}

export enum SupportedProtocols {
  SILO = 'SILO',
  ORBIT = 'ORBIT',
  AAVE = 'AAVE',
  IRONCLAD = 'IRONCLAD',
  LENDLE = 'LENDLE',
}
