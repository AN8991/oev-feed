# How to run the OEV Feed application locally:

1. Copy the contents of .env.example file to .env and fill in the values
2. Create database: `npx ts-node -r tsconfig-paths/register scripts/database/create-database.ts`
3. OPTIONAL (If you have a db and want a fresh start): `npx ts-node -r tsconfig-paths/register scripts/database/reset-database.ts`
4. Run `npm install` to install dependencies
5. Run `npm run build` to build the application
6. Run `npm run start:dev` to start the application in development mode
7. The application will start on http://localhost:3000 (or the port specified in your .env).

# API Access:

API Documentation: http://localhost:3000/api/v1/docs
Metrics: http://localhost:3000/metrics

## Available API Endpoints (Read-Only):

### Risk Assessment APIs:
- GET /api/v1/risk-assessment/user/:address - Get risk assessment for specific user
- GET /api/v1/risk-assessment/positions/at-risk - Get positions at risk
- GET /api/v1/risk-assessment/positions/critical - Get critical positions
- GET /api/v1/risk-assessment/alerts/:address - Get risk alerts for user

### Position APIs:
- GET /api/v1/positions - Get all positions with pagination
- GET /api/v1/positions/user/:address - Get positions for specific user
- GET /api/v1/positions/test - Health check for positions API

### Provider APIs:
- GET /api/v1/providers - Get all blockchain RPC providers
- GET /api/v1/providers/:name - Get specific provider details

### Events APIs:
- GET /api/v1/events - Get all OEV events

**Note**: Data ingestion is handled exclusively by scripts to ensure data consistency. 
Use discovery scripts in `scripts/discovery/` to populate the database.