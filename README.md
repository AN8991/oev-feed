# OEV Feed - DeFi Lending Protocol Data Aggregator

A Next.js application that aggregates and monitors user lending and borrowing data from various DeFi protocols.

## Supported Protocols

- Silo Protocol
- Orbit Protocol
- AAVE Protocol
- Ironclad Finance
- Lendle Protocol

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

# Run the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
src/
├── app/           # Next.js app directory
├── components/    # React components
├── config/        # Configuration files
│   ├── subgraphs.ts
│   └── contracts.ts
├── lib/          # Library code
├── types/        # TypeScript types
└── utils/        # Utility functions
    └── logger.ts