export const GET_USER_POSITIONS = `
  query GetUserPositions($address: String!) {
    userPositions(where: { user: $address }) {
      collateral
      debt
      healthFactor
    }
  }
`;
