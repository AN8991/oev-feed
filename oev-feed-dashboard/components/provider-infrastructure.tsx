'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProviderHealth } from '@/hooks/use-provider-health';
import { 
  Server, 
  Activity, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  TrendingUp,
  Database
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const STATUS_CONFIG = {
  HEALTHY: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
    badge: 'secondary' as const,
  },
  DEGRADED: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: AlertTriangle,
    badge: 'default' as const,
  },
  DOWN: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XCircle,
    badge: 'destructive' as const,
  },
};

export function ProviderInfrastructure() {
  const { data: health, isLoading, error } = useProviderHealth();

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
            Error Loading Provider Status
          </CardTitle>
          <CardDescription className="text-red-700">
            {error instanceof Error ? error.message : 'Failed to load provider health data'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!health) return null;

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DEGRADED;
  };

  // Prepare chart data
  const responseTimeData = health.providers.map((provider) => ({
    name: provider.name,
    avgResponseTime: provider.responseTimeMs,
    p95ResponseTime: provider.responseTimeMs * 1.5, // Estimate P95 as 1.5x avg
  }));

  const requestVolumeData = health.requestDistribution.map((dist) => ({
    name: dist.provider,
    total: dist.requestCount,
    successful: dist.successCount,
    failed: dist.failureCount,
  }));

  const uptimeData = health.providers.map((provider) => ({
    name: provider.name,
    uptime: provider.successRate,
  }));

  // Calculate summary stats
  const totalProviders = health.providers.length;
  const healthyProviders = health.providers.filter(p => p.status === 'healthy').length;
  const degradedProviders = health.providers.filter(p => p.status === 'degraded').length;
  const downProviders = health.providers.filter(p => p.status === 'down').length;
  const avgResponseTime = health.metrics.averageResponseTime;
  const totalRequests = health.metrics.totalRequests;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Provider Infrastructure Status</h2>
        <div className="flex gap-2">
          <Badge variant="secondary">{healthyProviders} Healthy</Badge>
          {degradedProviders > 0 && <Badge variant="default">{degradedProviders} Degraded</Badge>}
          {downProviders > 0 && <Badge variant="destructive">{downProviders} Down</Badge>}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProviders}</div>
            <p className="text-xs text-muted-foreground">
              {healthyProviders} operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {((healthyProviders / totalProviders) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall uptime
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {health.providers.map((provider) => {
          const statusConfig = getStatusConfig(provider.status);
          const StatusIcon = statusConfig.icon;
          const providerRequests = health.requestDistribution.find(r => r.provider === provider.name);
          const circuitBreaker = health.circuitBreakers.find(cb => cb.provider === provider.name);

          return (
            <Card key={provider.name} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${statusConfig.bgColor}`} />
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                    {provider.name}
                  </CardTitle>
                  <Badge variant={statusConfig.badge}>{provider.status.toUpperCase()}</Badge>
                </div>
                <CardDescription>
                  Last checked: {new Date(provider.lastChecked).toLocaleTimeString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Response Time</div>
                    <div className="font-medium">{provider.responseTimeMs}ms</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Success Rate</div>
                    <div className="font-medium">
                      {provider.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Requests</div>
                    <div className="font-medium">{providerRequests?.requestCount.toLocaleString() || 0}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Failed</div>
                    <div className="font-medium">{providerRequests?.failureCount || 0}</div>
                  </div>
                </div>

                {circuitBreaker?.isOpen && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Circuit breaker open - {circuitBreaker.reason}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Response Time Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Response Time Comparison
            </CardTitle>
            <CardDescription>Average vs P95 response times</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="avgResponseTime" fill="#3b82f6" name="Avg" />
                <Bar dataKey="p95ResponseTime" fill="#8b5cf6" name="P95" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Uptime Percentage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Provider Uptime
            </CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={uptimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="uptime" fill="#10b981" name="Uptime %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Request Volume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Request Volume Distribution
          </CardTitle>
          <CardDescription>Total, successful, and failed requests per provider</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={requestVolumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: '12px' }} />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip />
              <Bar dataKey="successful" stackId="a" fill="#10b981" name="Successful" />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* System Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Summary</CardTitle>
          <CardDescription>Overall infrastructure health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">{new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monitoring Period</span>
              <span className="font-medium">Last 24 hours</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Providers Monitored</span>
              <span className="font-medium">{totalProviders}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Average Success Rate</span>
              <span className="font-medium text-green-600">
                {(health.providers.reduce((sum, p) => sum + p.successRate, 0) / totalProviders).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Error Rate</span>
              <span className="font-medium text-red-600">
                {health.metrics.errorRate.toFixed(2)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
