# Risk Metrics Calculation Explained

## 📊 Overview
This document explains how each risk metric is calculated in the OEV Feed Dashboard.

---

## 1. 🎯 HHI Score (Herfindahl-Hirschman Index)

### **What is it?**
The HHI is a measure of market concentration used to assess portfolio diversification. Higher scores indicate more concentration (less diversification).

### **How we calculate it:**
```typescript
// For each asset in your portfolio:
// 1. Calculate percentage of total portfolio value
const percentage = (assetValue / totalPortfolioValue) * 100;

// 2. Square each percentage and sum them
hhiScore += percentage * percentage;
```

### **Example from your data:**
- **AAVE**: 50.42% → 50.42² = 2,542
- **USDT**: 0.06% → 0.06² = 0.004
- **USDe**: 49.3% → 49.3² = 2,430
- **Total HHI**: ~5,001

### **Interpretation:**
- **< 1,500**: EXCELLENT diversification (many small positions)
- **1,500-2,500**: GOOD diversification
- **2,500-5,000**: FAIR diversification
- **> 5,000**: POOR diversification (concentrated portfolio)

**Your score of 5,001 = POOR** because you have 2 large positions (AAVE 50%, USDe 49%) dominating your portfolio.

---

## 2. 💧 Liquidation Distance (Price Drop %)

### **What is it?**
The percentage price drop needed before your position gets liquidated.

### **How we calculate it:**
```typescript
// For each position:
const healthFactor = position.healthFactor; // e.g., 1.10

// Simplified formula:
priceDropNeeded = (healthFactor - 1) * 100;

// Example: Health Factor = 1.10
// Price drop = (1.10 - 1) * 100 = 10%
```

### **Your data shows:**
- **Overall**: 10.20% price drop to liquidation
- **sUSDe**: -10.20%
- **USDe**: -10.20%
- **USDT**: -10.20%

### **Why -10.20%?**
This means if your collateral assets (AAVE, USDe, USDT) drop by **10.20%** in value, your positions will be at risk of liquidation.

### **Real Formula (Aave V3):**
```
Liquidation occurs when: Health Factor < 1.0

Health Factor = (Collateral × Liquidation Threshold) / Total Debt

Price Drop % = ((Current HF - 1) / Current HF) × 100
```

**Note:** The current implementation uses a simplified calculation. For production, you should use:
```typescript
priceDropNeeded = ((healthFactor - 1) / healthFactor) * 100;
```

---

## 3. 📈 Health Factor History (7-Day Trend)

### **Current Implementation:**
**⚠️ IMPORTANT: This is currently MOCK DATA**

```typescript
// Generate 7 days of simulated data
const avgHealthFactor = currentHealthFactor; // e.g., 1.10

for (let i = 6; i >= 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  
  // Add random variance (±10%)
  const variance = (Math.random() - 0.5) * 0.2;
  const value = avgHealthFactor + variance;
  
  history.push({ timestamp: date, value });
}
```

### **Why Mock Data?**
The backend doesn't currently store historical health factor data. Each time you query, it generates random variations around your current health factor.

### **To Implement Real Historical Data:**
You need to:
1. **Create a new table**: `position_history`
   ```sql
   CREATE TABLE position_history (
     id UUID PRIMARY KEY,
     position_id UUID REFERENCES positions(id),
     health_factor DECIMAL,
     ltv DECIMAL,
     collateral_usd DECIMAL,
     debt_usd DECIMAL,
     timestamp TIMESTAMP DEFAULT NOW()
   );
   ```

2. **Add a scheduled job** to snapshot positions every hour/day:
   ```typescript
   @Cron('0 * * * *') // Every hour
   async snapshotPositions() {
     const positions = await this.positionsService.getAllActivePositions();
     for (const position of positions) {
       await this.positionHistoryRepo.save({
         positionId: position.id,
         healthFactor: position.healthFactor,
         ltv: position.ltv,
         collateralUsd: position.collateralAmountUSD,
         debtUsd: position.debtAmountUSD,
         timestamp: new Date(),
       });
     }
   }
   ```

3. **Query historical data**:
   ```typescript
   async getHealthFactorHistory(walletAddress: string, days: number = 7) {
     const sevenDaysAgo = new Date();
     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - days);
     
     return await this.positionHistoryRepo
       .createQueryBuilder('history')
       .leftJoin('history.position', 'position')
       .where('position.userAddress = :walletAddress', { walletAddress })
       .andWhere('history.timestamp >= :startDate', { startDate: sevenDaysAgo })
       .orderBy('history.timestamp', 'ASC')
       .getMany();
   }
   ```

---

## 4. 💰 LTV Analysis (Loan-to-Value)

### **What is it?**
LTV shows how much you've borrowed relative to your collateral value.

### **How we calculate it:**
```typescript
// From your position data:
const currentLTV = position.ltv; // Stored in database (e.g., 9000%)

// Average across all positions:
const avgLTV = totalLTV / positionCount;

// Max LTV (highest among all positions):
const maxLTV = Math.max(...positions.map(p => p.ltv));

// Utilization:
const utilizationPercentage = (currentLTV / maxLTV) * 100;
```

### **Your data shows:**
- **Current LTV**: 9000.00%
- **Max LTV**: 9000.00%
- **Utilization**: 100.00%

### **⚠️ Data Issue Alert:**
**9000% LTV is incorrect!** This suggests a data quality issue. Normal LTV should be:
- **Healthy**: 0-50%
- **Moderate**: 50-75%
- **High Risk**: 75-90%
- **Critical**: 90-100%

### **Likely Causes:**
1. **Database stores LTV as basis points** (9000 = 90.00%)
2. **Calculation error** in the position tracking
3. **Missing decimal conversion**

### **To Fix:**
Check your position entity and ensure LTV is stored correctly:
```typescript
// If stored as basis points (9000 = 90%):
const actualLTV = storedLTV / 100; // 9000 / 100 = 90%

// If stored as decimal (0.90 = 90%):
const actualLTV = storedLTV * 100; // 0.90 * 100 = 90%
```

### **Correct LTV Formula:**
```
LTV = (Total Debt / Total Collateral) × 100

Example:
- Collateral: $101,433
- Debt: $84,680
- LTV = (84,680 / 101,433) × 100 = 83.48%
```

---

## 📝 Summary

| Metric | Current Value | Status | Notes |
|--------|--------------|--------|-------|
| **HHI Score** | 5,001 | ✅ Correct | POOR diversification (2 large assets) |
| **Liquidation Distance** | 10.20% | ⚠️ Simplified | Should use proper Aave formula |
| **Health Factor History** | Varies | ❌ Mock Data | Need to implement historical tracking |
| **LTV Analysis** | 9000% | ❌ Incorrect | Should be ~83.48% based on collateral/debt |

---

## 🔧 Recommended Improvements

### **Priority 1: Fix LTV Calculation**
```typescript
// In risk.controller.ts
const actualLTV = (totalDebt / totalCollateral) * 100;
```

### **Priority 2: Implement Historical Tracking**
- Create `position_history` table
- Add scheduled snapshots
- Query real historical data

### **Priority 3: Improve Liquidation Distance**
```typescript
// Use proper Aave formula
const priceDropNeeded = ((healthFactor - 1) / healthFactor) * 100;
```

### **Priority 4: Add More Metrics**
- Liquidation price per asset
- Collateralization ratio
- Borrow capacity remaining
- Interest rate exposure

---

## 🎓 Further Reading

- **HHI Index**: [Wikipedia - Herfindahl Index](https://en.wikipedia.org/wiki/Herfindahl%E2%80%93Hirschman_index)
- **Aave Health Factor**: [Aave Docs - Risk Parameters](https://docs.aave.com/risk/asset-risk/risk-parameters)
- **LTV Ratio**: [Aave Docs - Loan to Value](https://docs.aave.com/faq/borrowing#what-is-the-loan-to-value-ltv)
