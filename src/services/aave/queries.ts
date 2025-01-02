import { gql } from 'graphql-request';

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
