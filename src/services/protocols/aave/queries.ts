// GraphQL queries for fetching Aave protocol data from subgraphs
import { gql } from 'graphql-request';

// GraphQL query to fetch individual user's Aave positions, including balance, debt, and health factor
export const GET_USER_POSITIONS = gql`
  query GetUserPositions($userAddress: String!) {
    userReserves(where: { user: $userAddress }) {
      currentATokenBalance
      currentStableDebt
      currentVariableDebt
      reserve {
        symbol
        decimals
        price {
          priceInEth
        }
      }
    }
    user(id: $userAddress) {
      healthFactor
      totalCollateralETH
      totalDebtETH
    }
  }
`;

// GraphQL query to fetch overall Aave protocol positions and reserve statistics within a specific timestamp range
export const GET_PROTOCOL_POSITIONS = gql`
  query GetProtocolPositions($fromTimestamp: Int!, $toTimestamp: Int!) {
    reserves {
      symbol
      decimals
      price {
        priceInEth
      }
      totalATokenSupply
      availableLiquidity
      totalCurrentVariableDebt
      totalCurrentStableDebt
      lastUpdateTimestamp
    }
  }
`;
