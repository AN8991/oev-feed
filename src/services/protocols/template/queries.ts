/**
 * GraphQL queries for Protocol subgraph
 */
export const PROTOCOL_QUERIES = {
  USER_DATA: `
    query getUserData($userAddress: String!) {
      user(id: $userAddress) {
        id
        positions {
          id
          collateral
          debt
          healthFactor
          liquidationThreshold
          reserves {
            id
            symbol
            amount
          }
        }
      }
    }
  `,
  
  RESERVE_DATA: `
    query getReserveData {
      reserves {
        id
        symbol
        name
        decimals
        price
        totalSupply
        totalBorrowed
      }
    }
  `
};
