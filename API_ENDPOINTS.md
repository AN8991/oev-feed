# OEV Feed API Endpoints

## Overview
The OEV Feed application provides REST API endpoints for fetching DeFi position data and risk assessments from integrated protocol adapters (Aave V2/V3).

## Base URL
```
http://localhost:3000/api/v1.0.0
```

## Positions Endpoints

### GET /positions
Retrieve all stored positions from the database.

**Response:**
```json
[
  {
    "id": "aave-v3-ethereum-0x123...-1234567890",
    "userAddress": "0x123...",
    "protocol": "aave-v3",
    "network": "ethereum",
    "assetAddress": "0x456...",
    "assetSymbol": "WETH",
    "collateralAmount": "1.5",
    "collateralAmountUSD": "3000.00",
    "debtAmount": "0.8",
    "debtAmountUSD": "1600.00",
    "healthFactor": "2.5",
    "liquidationThreshold": "0.85",
    "ltv": "0.53",
    "lastUpdated": "1640995200000"
  }
]
```

### GET /positions/user/:address
Retrieve positions for a specific user address.

**Parameters:**
- `address` (path): Ethereum wallet address (0x...)

**Example:**
```
GET /positions/user/0x79682489385337996edd00eb56b4238b597bfae7
```

### POST /positions/fetch
Fetch live position data from protocol adapters and save to database.

**Request Body:**
```json
{
  "userAddresses": [
    "0x79682489385337996edd00eb56b4238b597bfae7",
    "0x742d35Cc6634C0532925a3b8D4C9db96c5b8d2D6"
  ]
}
```

**Response:**
```json
[
  {
    "id": "aave-v3-ethereum-0x123...-1234567890",
    "userAddress": "0x123...",
    "protocol": "aave-v3",
    "network": "ethereum",
    // ... position data
  }
]
```

## Risk Assessment Endpoints

### GET /risk-assessment/user/:address
Get comprehensive risk assessment for all positions of a user.

**Parameters:**
- `address` (path): Ethereum wallet address

**Response:**
```json
[
  {
    "positionId": "aave-v3-ethereum-0x123...",
    "userAddress": "0x123...",
    "protocol": "AAVE",
    "network": "ethereum",
    "riskLevel": "MEDIUM",
    "compositeRiskScore": 65.4,
    "healthFactor": "2.1",
    "liquidationThreshold": "0.85",
    "currentLTV": "0.53",
    "totalCollateralUSD": "3000.00",
    "totalDebtUSD": "1600.00",
    "riskMetrics": {
      "healthFactorScore": 75.0,
      "ltvScore": 60.0,
      "liquidationThresholdScore": 70.0,
      "assetConcentrationScore": 85.0
    },
    "riskAlerts": [
      {
        "type": "MEDIUM_HEALTH_FACTOR",
        "message": "Health factor is approaching risky levels",
        "severity": "MEDIUM",
        "threshold": 1.5,
        "currentValue": 2.1
      }
    ],
    "liquidationDistance": "52.4%",
    "timestamp": 1640995200000
  }
]
```

### GET /risk-assessment/positions/at-risk
Get positions with health factors below specified threshold.

**Query Parameters:**
- `healthFactorThreshold` (optional): Health factor threshold (default: 1.2)
- `limit` (optional): Maximum number of results (default: 50)

**Example:**
```
GET /risk-assessment/positions/at-risk?healthFactorThreshold=1.5&limit=20
```

## Test Endpoints

### GET /positions/test
Test endpoint to verify the positions API is working.

**Response:**
```json
{
  "message": "Positions API is working!",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "endpoints": [
    "GET /positions - Get all positions",
    "GET /positions/user/:address - Get positions for specific user",
    "POST /positions/fetch - Fetch and save positions from protocols"
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid wallet address format",
  "error": "Bad Request"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "No positions found for address: 0x123...",
  "error": "Not Found"
}
```

## Usage Examples

### Fetch Live Data and Calculate Risk
```bash
# 1. Fetch live position data
curl -X POST http://localhost:3000/api/v1.0.0/positions/fetch \
  -H "Content-Type: application/json" \
  -d '{"userAddresses": ["0x79682489385337996edd00eb56b4238b597bfae7"]}'

# 2. Get risk assessment for the user
curl http://localhost:3000/api/v1.0.0/risk-assessment/user/0x79682489385337996edd00eb56b4238b597bfae7

# 3. Check positions at risk
curl http://localhost:3000/api/v1.0.0/risk-assessment/positions/at-risk?healthFactorThreshold=1.3
```

## Supported Protocols
- **Aave V2** on Ethereum
- **Aave V3** on Ethereum

## Environment Variables Required
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/oev_feed

# RPC Providers
ETHEREUM_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY
INFURA_API_KEY=your_infura_key
ALCHEMY_API_KEY=your_alchemy_key

# Aave Contract Addresses
AAVE_V3_ETHEREUM_POOL=0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
AAVE_V2_ETHEREUM_POOL=0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9
```
