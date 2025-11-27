'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRiskAssessment } from '@/hooks/use-risk';
import { 
  AlertTriangle, 
  TrendingDown, 
  Shield, 
  PieChart as PieChartIcon,
  AlertCircle,
  Info
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RiskAssessmentProps {
  walletAddress: string;
}

const RISK_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#991b1b',
};

const SEVERITY_COLORS = {
  CRITICAL: 'destructive',
  WARNING: 'default',
  INFO: 'default',
} as const;

const SEVERITY_ICONS = {
  CRITICAL: AlertTriangle,
  WARNING: AlertCircle,
  INFO: Info,
};

export function RiskAssessment({ walletAddress }: RiskAssessmentProps) {
  const { data: risk, isLoading, error } = useRiskAssessment(walletAddress);

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
            <AlertTriangle className="h-5 w-5" />
            Error Loading Risk Assessment
          </CardTitle>
          <CardDescription className="text-red-700">
            {error instanceof Error ? error.message : 'Failed to load risk data'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!risk) return null;

  const getRiskColor = (level: string) => {
    return RISK_COLORS[level as keyof typeof RISK_COLORS] || RISK_COLORS.MEDIUM;
  };

  const getRiskBadgeVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (level === 'LOW') return 'secondary';
    if (level === 'MEDIUM') return 'default';
    if (level === 'HIGH' || level === 'CRITICAL') return 'destructive';
    return 'outline';
  };

  const getDiversificationColor = (rating: string) => {
    if (rating === 'EXCELLENT') return 'text-green-600';
    if (rating === 'GOOD') return 'text-blue-600';
    if (rating === 'FAIR') return 'text-yellow-600';
    return 'text-red-600';
  };

  // Prepare chart data
  const healthFactorData = risk.healthFactorHistory.map((point) => ({
    date: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: point.value,
  }));

  const concentrationData = risk.assetConcentration.topConcentratedAssets.map((asset) => ({
    name: asset.symbol,
    value: asset.percentage,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Risk Assessment</h2>
        <Badge variant={getRiskBadgeVariant(risk.riskLevel)}>
          {risk.riskLevel} RISK
        </Badge>
      </div>

      {/* Composite Risk Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Composite Risk Score
          </CardTitle>
          <CardDescription>Overall risk assessment based on multiple factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg className="w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="16"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke={getRiskColor(risk.riskLevel)}
                  strokeWidth="16"
                  strokeDasharray={`${(risk.compositeRiskScore / 100) * 502.4} 502.4`}
                  strokeLinecap="round"
                  transform="rotate(-90 96 96)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold" style={{ color: getRiskColor(risk.riskLevel) }}>
                  {risk.compositeRiskScore}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Score ranges: 0-39 (Critical), 40-59 (High), 60-79 (Medium), 80-100 (Low)
          </div>
        </CardContent>
      </Card>

      {/* Health Factor History & LTV Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Health Factor History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health Factor History</CardTitle>
            <CardDescription>7-day trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={healthFactorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* LTV Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">LTV Analysis</CardTitle>
            <CardDescription>Loan-to-Value ratio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current LTV</span>
                <span className="font-medium">{risk.ltvAnalysis.currentLTV.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max LTV</span>
                <span className="font-medium">{risk.ltvAnalysis.maxLTV.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium">{risk.ltvAnalysis.utilizationPercentage.toFixed(2)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Utilization Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    risk.ltvAnalysis.utilizationPercentage > 90
                      ? 'bg-red-600'
                      : risk.ltvAnalysis.utilizationPercentage > 75
                      ? 'bg-yellow-600'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(risk.ltvAnalysis.utilizationPercentage, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liquidation Distance & Asset Concentration */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Liquidation Distance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Liquidation Distance
            </CardTitle>
            <CardDescription>Price drop needed for liquidation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-red-600">
                {risk.liquidationDistance.overallPercentage.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Overall price drop to liquidation
              </div>
            </div>
            {risk.liquidationDistance.topRiskyAssets.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Top Risky Assets:</div>
                {risk.liquidationDistance.topRiskyAssets.map((asset, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{asset.symbol}</span>
                    <span className="font-medium text-red-600">
                      -{asset.priceDropNeeded.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Concentration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Asset Concentration
            </CardTitle>
            <CardDescription>Portfolio diversification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">HHI Score</span>
                <span className="font-medium">{risk.assetConcentration.hhiScore.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Diversification</span>
                <span className={`font-medium ${getDiversificationColor(risk.assetConcentration.diversificationRating)}`}>
                  {risk.assetConcentration.diversificationRating}
                </span>
              </div>
            </div>
            {concentrationData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 50 }}>
                  <Pie
                    data={concentrationData}
                    cx="55%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {concentrationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      {risk.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk Alerts</CardTitle>
            <CardDescription>{risk.alerts.length} active alert{risk.alerts.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {risk.alerts.map((alert) => {
              const Icon = SEVERITY_ICONS[alert.severity];
              return (
                <Alert key={alert.id} variant={SEVERITY_COLORS[alert.severity]}>
                  <Icon className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{alert.type}</div>
                      <div className="text-sm">{alert.message}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <strong>Recommended:</strong> {alert.recommendedAction}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Affected: {alert.affectedPosition}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
