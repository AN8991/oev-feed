export const CONTRACT_ADDRESSES = {
  SILO: {
    MAINNET: {
      LENS: '0x07C89166B1e0d76Fe7D0887c8D28cE7B2c50343B',
      ROUTER: '0x36B40793fa2700F199ECa3568f232E5d4A129c5C',
      REPOSITORY: '0x8658047e48CC09161f4152c79155Dac1d710Ff0a'
    },
  },
  ORBIT: {
    MAINNET: {
      LENDING_POOL: '0x0F7bBe1E17E6f9C469C4634C3C0Cb89Bd5F86f2F',
      ORACLE: '0x3E4B51076d7e9B844B92F8c6377087f9cf8C8696',
      REWARDS: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3'
    },
  },
  AAVE: {
    V3_ETH_MAINNET: {
      POOL: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      POOL_DATA_PROVIDER: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',
      ORACLE: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',
      REWARDS_CONTROLLER: '0x8164Cc65827dcFe994AB23944CBC90e0aa80bFcb'
    },
  },
  IRONCLAD: {
    MAINNET: {
      VAULT: '0x41c1f182A9e8C38839B2a644D6367C9D5c457592',
      STRATEGY: '0x2B67E972A28C6adf3cAc9F63C61b6e51B4f09dBc',
      REWARDS: '0x1234567890123456789012345678901234567890'
    },
  },
  LENDLE: {
    MAINNET: {
      CONTROLLER: '0x8c6D0c6677A06b3a7F0Fb8495dAb496f1618f34b',
      MARKET: '0x080B5ce373fE2103A7086b31DabF1E7ae3eA2C1B',
      ORACLE: '0x3E4B51076d7e9B844B92F8c6377087f9cf8C8696'
    },
  }
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES;
