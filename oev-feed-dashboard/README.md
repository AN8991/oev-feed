# OEV Feed Dashboard

A React-based dashboard for monitoring DeFi positions and risk assessment.

## Overview

The dashboard provides three main views:
- **Portfolio Overview**: Total collateral, debt, health factor, and distribution charts
- **Risk Assessment**: Composite risk score, health factor history, LTV analysis, liquidation distance
- **Provider Infrastructure**: Provider health status, response times, uptime metrics

## Getting Started

### Prerequisites
- Node.js 18+
- OEV Feed backend running on port 3000

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser.

**Note**: The dashboard runs on port 3001 by default to avoid conflict with the backend on port 3000.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS 4
- **Components**: shadcn/ui
- **Charts**: Recharts 3.4
- **Data Fetching**: TanStack Query (React Query) 5.90
- **HTTP Client**: Axios 1.13

## Project Structure

```
oev-feed-dashboard/
├── app/
│   ├── layout.tsx           # Root layout with React Query
│   ├── page.tsx             # Main dashboard page
│   └── infrastructure/      # Provider infrastructure page
├── components/
│   ├── portfolio-overview.tsx
│   ├── risk-assessment.tsx
│   └── provider-infrastructure.tsx
├── hooks/
│   ├── use-portfolio.ts
│   ├── use-risk.ts
│   └── use-provider-health.ts
└── lib/
    ├── api-client.ts        # Axios client & API functions
    └── query-client.tsx     # React Query setup
```

## API Integration

The dashboard connects to the OEV Feed backend APIs:
- `GET /api/v1/portfolio/summary?walletAddress={address}`
- `GET /api/v1/risk/assessment?walletAddress={address}`
- `GET /api/v1/provider-health`

## Documentation

- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)**: Full implementation details
- **[DASHBOARD_GUIDE.md](DASHBOARD_GUIDE.md)**: Quick start guide
- **[RISK_METRICS_EXPLAINED.md](RISK_METRICS_EXPLAINED.md)**: Risk calculation explanations
