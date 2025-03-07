# OEV Feed - DeFi Lending Protocol Data Aggregator

A backend service that aggregates and monitors user lending and borrowing data from various DeFi protocols.

## Reset to last push & removing untracked changes
cd /Users/auro/Documents/Projects/oev-feed && git reset --hard origin/main
cd /Users/auro/Documents/Projects/oev-feed && git clean -fd

## Supported Protocols at present
- AAVE Protocol (V3 focus)

## Future supported Protocols
- Ironclad Finance
- Lendle Protocol
- Orbit Protocol
- Silo Protocol

## Features

- Fetch user address data from lending & borrowing protocols
- Monitor health data for user borrowings
- GraphQL integration with protocol subgraphs
- Smart contract data fetching for protocols without subgraphs
- High-performance PostgreSQL database for local data storage
- Structured schema for efficient data querying

## Tech Stack

- TypeScript
- GraphQL
- PostgreSQL
- Ethers.js v6+
- Prisma ORM

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

## Setting up PostgreSQL Database:
- Install PostgreSQL if you haven't already
- Create a new database called oev_feed
- Update the .env file with your database credentials

Set up Environment Variables:
- Copy .env.example to .env if not already done
- Update the variables in .env file accordingly.
- DATABASE_URL: Your PostgreSQL connection string with username:password
- ALCHEMY_API_KEY: Your Alchemy API key for blockchain access
- INFURA_API_KEY: Your Infura API key (alternative provider)

```bash
# Run the Prisma Dependencies:
npx prisma generate
npx prisma db push

# Or use the npm script
npm run prisma:generate

# Run the tests
npm run test:all
```

## Available Scripts

- `test:aave`: Test Aave service functionality
- `test:address-validation`: Test Ethereum address validation
- `test:data-format`: Test data formatting
- `test:all`: Run all tests
- `verify:contracts`: Verify contract addresses
- `prisma:generate`: Generate Prisma client

## Implementation Notes

- The system currently focuses on Aave V3 protocol
- All Ethereum addresses are normalized using `ethers.getAddress()` to ensure proper checksum validation
- The Aave V3 contract's `getUserAccountData` method returns data as an array (tuple) when using ethers.js v6+
- Official address book packages like `@bgd-labs/aave-address-book` are used for contract addresses