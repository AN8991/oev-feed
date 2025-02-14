# OEV Feed - DeFi Lending Protocol Data Aggregator

A Next.js application that aggregates and monitors user lending and borrowing data from various DeFi protocols.

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

## Project Structure

```
src/
├── __tests__/                  # Test files
│   ├── __mocks__/             # Mock files for testing
│   └── services/              # Service tests
├── app/                       # Next.js app directory
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout component
│   └── page.tsx              # Main page component
├── components/               # React components
│   ├── DateRangePicker.tsx   # Date range selection component
│   ├── Dropdown.tsx          # Dropdown menu component
│   ├── ExportButton.tsx      # Data export component
│   ├── LastUpdatedPicker.tsx # Last updated filter
│   ├── Notifications.tsx     # Notifications component
│   ├── PositionDisplay.tsx   # Position display component
│   └── TransactionHistory.tsx # Transaction history component
├── config/                   # Configuration files
│   ├── contracts.ts          # Contract addresses and ABIs
│   ├── env.ts               # Environment configuration
│   ├── providers/           # Blockchain provider configurations
│   └── subgraphs.ts         # Subgraph endpoints
├── errors/                   # Custom error definitions
├── services/                # Core services
│   ├── cache/              # Caching service
│   ├── database.ts         # Database service
│   ├── export/            # Data export service
│   ├── factory.ts         # Service factory
│   ├── history/          # Historical data service
│   ├── notifications/    # Notification service
│   ├── protocols/        # Protocol-specific services
│   │   ├── aave/        # Aave protocol implementation
│   │   ├── base.ts      # Base protocol service
│   │   └── sync.ts      # Protocol sync service
│   └── realtime/        # Real-time update service
├── types/                # TypeScript type definitions
└── utils/               # Utility functions
    ├── contractVerification.ts
    ├── errors.ts
    ├── logger.ts
    ├── rateLimit.ts
    └── retry.ts
```

The project follows a modular architecture with clear separation of concerns:

- `__tests__/`: Contains all test files and mocks
- `app/`: Next.js application files and pages
- `components/`: Reusable React components
- `config/`: Configuration files for environment, contracts, and providers
- `services/`: Core business logic and protocol implementations
- `types/`: TypeScript type definitions
- `utils/`: Helper functions and utilities