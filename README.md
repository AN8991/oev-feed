# OEV Feed - DeFi Lending Protocol Data Aggregator

A Next.js application that aggregates and monitors user lending and borrowing data from various DeFi protocols.

## Reset to last push & removing untracked changes
cd /Users/auro/Documents/Projects/oev-feed && git reset --hard origin/main
cd /Users/auro/Documents/Projects/oev-feed && git clean -fd

## Supported Protocols at present
- AAVE Protocol

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

- Next.js with TypeScript
- GraphQL
- PostgreSQL
- Ethers.js/Web3.js
- TailwindCSS

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

## Setting up PostgreSQL Database:
- Install PostgreSQL if you haven't already
- Create a new database called oev_feed
- Update the .env file with your database credentials

Set up Environment Variables:
- Copy .env.example to .env if not already done
- Update the variables in .env file accordingly.
DATABASE_URL: Your PostgreSQL connection string with username:password

```bash
# Run the Prisma Dependencies:
npx prisma generate
npx prisma db push

npm run prisma:generate

# Run the development server
npm run dev

Visit [http://localhost:3000](http://localhost:3000) to see the application.
```