# OEV Feed Dashboard - Quick Start Guide

## 🚀 Running the Dashboard

### 1. Start the Backend API (if not already running)
```bash
cd w:\Projects\oev-feed
npm run start
```
Backend will run on: `http://localhost:3000`

### 2. Start the Frontend Dashboard
```bash
cd w:\Projects\oev-feed\oev-feed-dashboard
npm run dev
```
Dashboard will run on: `http://localhost:3001` (or next available port)

### 3. Open in Browser
Navigate to: `http://localhost:3001`

## ✅ What's Implemented (Page 1)

### **Portfolio Overview Panel**
- ✅ Total Collateral USD
- ✅ Total Debt USD
- ✅ Overall Health Factor
- ✅ Active Positions Count
- ✅ Protocol Distribution (Pie Chart)
- ✅ Network Distribution (Pie Chart)
- ✅ Risk Distribution (Pie Chart)
- ✅ Auto-refresh every 30 seconds

### **Features**
- ✅ Wallet address search
- ✅ Real-time data from backend API
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design
- ✅ Modern UI with shadcn/ui components

## 📋 Still To Build

### **Day 2: Risk Assessment Dashboard**
- Composite Risk Score display
- Health Factor History chart (7 days)
- LTV Analysis with utilization
- Liquidation Distance calculator
- Asset Concentration metrics
- Risk Alerts panel

### **Day 3: Provider Infrastructure Status**
- Provider health status cards
- Request distribution charts
- Circuit breaker monitoring
- Performance metrics
- Auto-refresh every 60 seconds

## 🎨 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Data Fetching**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

## 🔧 Configuration

Environment variables are in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## 📝 Default Wallet Address

The dashboard comes pre-loaded with:
```
0x600Eb478EA253561E2Ca3A1d98be53d109879A3A
```

You can change this in the search box to view any wallet with positions in your database.

## 🐛 Troubleshooting

### Dashboard shows "No data"
- Make sure the backend is running
- Verify the wallet address has positions in the database
- Check browser console for API errors

### CORS errors
- Backend should allow localhost:3001
- Check NestJS CORS configuration if needed

### Port conflicts
- Frontend uses next available port after 3000
- Backend uses port 3000
- Change ports in configuration if needed
