# How to run the OEV Feed application locally:

1. Copy the contents of .env.example file to .env and fill in the values
2. Create database: `npx ts-node -r tsconfig-paths/register scripts/database/create-database.ts`
3. OPTIONAL (If you have a db and want a fresh start): `npx ts-node -r tsconfig-paths/register scripts/database/reset-database.ts`
4. Run `npm install` to install dependencies
5. Run `npm run build` to build the application
6. Run `npm run start:dev` to start the application in development mode
7. The application will start on http://localhost:3000 (or the port specified in your .env).

# API Access:

API Documentation: http://localhost:3000/api
Health Check: http://localhost:3000/health
Metrics: http://localhost:3000/metrics

Risk Assessment APIs:
- GET /api/v1.0.0/risk-assessment/user/:address
- GET /api/v1.0.0/risk-assessment/positions/at-risk

Position APIs:
- GET /api/v1.0.0/positions
- GET /api/v1.0.0/providers