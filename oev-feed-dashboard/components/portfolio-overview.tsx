'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePortfolioSummary } from '@/hooks/use-portfolio';
import { TrendingUp, TrendingDown, Minus, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PortfolioOverviewProps {
  walletAddress: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#991b1b',
};

export function PortfolioOverview({ walletAddress }: PortfolioOverviewProps) {
  const { data: portfolio, isLoading, error } = usePortfolioSummary(walletAddress);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24 bg-slate-100" />
            <CardContent className="h-32 bg-slate-50" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error Loading Portfolio
          </CardTitle>
          <CardDescription className="text-red-700">
            {error instanceof Error ? error.message : 'Failed to load portfolio data'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!portfolio) return null;

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getHealthFactorColor = (hf: number) => {
    if (hf >= 2) return 'text-green-600';
    if (hf >= 1.5) return 'text-yellow-600';
    if (hf >= 1.1) return 'text-orange-600';
    return 'text-red-600';
  };

  // Prepare chart data
  const protocolData = Object.entries(portfolio.protocolDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const networkData = Object.entries(portfolio.networkDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const riskData = [
    { name: 'Low', value: portfolio.riskDistribution.low, color: RISK_COLORS.low },
    { name: 'Medium', value: portfolio.riskDistribution.medium, color: RISK_COLORS.medium },
    { name: 'High', value: portfolio.riskDistribution.high, color: RISK_COLORS.high },
    { name: 'Critical', value: portfolio.riskDistribution.critical, color: RISK_COLORS.critical },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Portfolio Overview</h2>
        <Badge variant="outline" className="text-xs">
          {portfolio.activePositionsCount} Active Position{portfolio.activePositionsCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Collateral */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collateral</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolio.totalCollateralUSD.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {getTrendIcon(portfolio.healthFactorTrend)}
              {portfolio.collateralChange24h === 0 ? 'No change' : `${portfolio.collateralChange24h > 0 ? '+' : ''}${portfolio.collateralChange24h.toFixed(2)}%`} from yesterday
            </p>
          </CardContent>
        </Card>

        {/* Total Debt */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolio.totalDebtUSD.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {getTrendIcon(portfolio.healthFactorTrend)}
              {portfolio.debtChange24h === 0 ? 'No change' : `${portfolio.debtChange24h > 0 ? '+' : ''}${portfolio.debtChange24h.toFixed(2)}%`} from yesterday
            </p>
          </CardContent>
        </Card>

        {/* Health Factor */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Factor</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthFactorColor(portfolio.overallHealthFactor)}`}>
              {portfolio.overallHealthFactor.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {getTrendIcon(portfolio.healthFactorTrend)}
              Trend: {portfolio.healthFactorTrend}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Protocol Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Protocol Distribution</CardTitle>
            <CardDescription>Collateral by protocol</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
                <Pie
                  data={protocolData}
                  cx="55%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {protocolData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Network Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Network Distribution</CardTitle>
            <CardDescription>Collateral by network</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
                <Pie
                  data={networkData}
                  cx="55%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {networkData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Distribution</CardTitle>
            <CardDescription>Positions by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
                <Pie
                  data={riskData}
                  cx="55%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
