import express from 'express';
import path from 'path';
import fs from 'fs';
import { providerHealthMonitor, ProviderHealthStatus } from './provider-health-monitor';
import { metrics, MetricDataPoint, ProviderMetric } from './metrics-collector';
import { logger, LogCategory } from './structured-logger';
import { ProviderFactory } from '../../adapters/secondary/providers/provider-factory';

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  /**
   * Port to run the dashboard server on
   * Default: 3000
   */
  port: number;
  
  /**
   * Host to bind the dashboard server to
   * Default: 'localhost'
   */
  host: string;
  
  /**
   * Data refresh interval in milliseconds
   * Default: 10000 (10 seconds)
   */
  refreshIntervalMs: number;
}

/**
 * Dashboard service class
 */
export class DashboardService {
  private static instance: DashboardService;
  private app: express.Application;
  private server: any;
  private config: DashboardConfig;
  private readonly defaultConfig: DashboardConfig = {
    port: 3000,
    host: 'localhost',
    refreshIntervalMs: 10000
  };
  
  /**
   * Constructor
   * @param config Dashboard configuration
   */
  private constructor(config?: Partial<DashboardConfig>) {
    this.config = {
      ...this.defaultConfig,
      ...config
    };
    
    // Create Express app
    this.app = express();
    
    // Configure middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../../public')));
    
    // Configure routes
    this.configureRoutes();
    
    logger.info('Dashboard service initialized', LogCategory.GENERAL, {
      config: this.config
    });
  }
  
  /**
   * Get dashboard service instance (singleton)
   * @param config Dashboard configuration
   */
  public static getInstance(config?: Partial<DashboardConfig>): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService(config);
    }
    return DashboardService.instance;
  }
  
  /**
   * Configure Express routes
   */
  private configureRoutes(): void {
    // API routes
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });
    
    // Provider health endpoints
    this.app.get('/api/providers/health', (req, res) => {
      const results = Array.from(providerHealthMonitor.getAllHealthCheckResults().values());
      res.json(results);
    });
    
    this.app.get('/api/providers/health/:network', (req, res) => {
      const network = req.params.network;
      const results = providerHealthMonitor.getNetworkHealthCheckResults(network);
      res.json(results);
    });
    
    // Provider metrics endpoints
    this.app.get('/api/metrics/current', (req, res) => {
      const currentMetrics = metrics.getMetrics();
      res.json(currentMetrics);
    });
    
    this.app.get('/api/metrics/files', (req, res) => {
      const metricsDir = path.join(process.cwd(), 'metrics');
      
      if (!fs.existsSync(metricsDir)) {
        return res.json([]);
      }
      
      const files = fs.readdirSync(metricsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: `/api/metrics/files/${file}`,
          timestamp: new Date(file.replace('metrics-', '').replace('.json', '')).getTime()
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      res.json(files);
    });
    
    this.app.get('/api/metrics/files/:filename', (req, res) => {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'metrics', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Metrics file not found' });
      }
      
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const metricsData = JSON.parse(fileContent);
        res.json(metricsData);
      } catch (error) {
        res.status(500).json({ error: 'Failed to read metrics file' });
      }
    });
    
    // Provider configuration endpoints
    this.app.get('/api/providers/networks', async (req, res) => {
      try {
        const networks = ProviderFactory.getAvailableNetworks();
        res.json(networks);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get available networks' });
      }
    });
    
    this.app.get('/api/providers/types', (req, res) => {
      try {
        const types = Object.values(ProviderFactory.getProviderTypes());
        res.json(types);
      } catch (error) {
        res.status(500).json({ error: 'Failed to get provider types' });
      }
    });
    
    // Dashboard UI
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
    
    // Fallback route
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }
  
  /**
   * Start the dashboard server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create public directory if it doesn't exist
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // Create dashboard HTML file
        this.createDashboardHtml();
        
        // Start server
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          logger.info(
            `Dashboard server started at http://${this.config.host}:${this.config.port}`,
            LogCategory.GENERAL
          );
          resolve();
        });
      } catch (error) {
        logger.error(
          'Failed to start dashboard server',
          LogCategory.GENERAL,
          {},
          error instanceof Error ? error : new Error(String(error))
        );
        reject(error);
      }
    });
  }
  
  /**
   * Stop the dashboard server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((error: Error) => {
        if (error) {
          logger.error(
            'Failed to stop dashboard server',
            LogCategory.GENERAL,
            {},
            error
          );
          reject(error);
        } else {
          logger.info('Dashboard server stopped', LogCategory.GENERAL);
          resolve();
        }
      });
    });
  }
  
  /**
   * Create dashboard HTML file
   */
  private createDashboardHtml(): void {
    const htmlPath = path.join(process.cwd(), 'public', 'index.html');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Provider Monitoring Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8f9fa;
      padding-top: 20px;
    }
    .card {
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      border: none;
    }
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      font-weight: 600;
    }
    .status-healthy {
      color: #28a745;
    }
    .status-degraded {
      color: #ffc107;
    }
    .status-unhealthy {
      color: #dc3545;
    }
    .status-unknown {
      color: #6c757d;
    }
    .provider-card {
      transition: all 0.3s ease;
    }
    .provider-card:hover {
      transform: translateY(-5px);
    }
    .chart-container {
      position: relative;
      height: 250px;
      width: 100%;
    }
    .nav-tabs .nav-link {
      border: none;
      color: #495057;
      font-weight: 500;
    }
    .nav-tabs .nav-link.active {
      color: #007bff;
      background-color: transparent;
      border-bottom: 2px solid #007bff;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="mb-4">
      <h1 class="text-center">Provider Monitoring Dashboard</h1>
      <p class="text-center text-muted">Real-time monitoring of blockchain provider health and performance</p>
    </header>
    
    <div class="row mb-4">
      <div class="col-md-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>Provider Health Overview</span>
            <div>
              <select id="networkSelector" class="form-select form-select-sm" style="width: 150px; display: inline-block;">
                <option value="all">All Networks</option>
              </select>
              <button id="refreshButton" class="btn btn-sm btn-outline-primary ms-2">
                <span id="refreshIcon">↻</span> Refresh
              </button>
            </div>
          </div>
          <div class="card-body">
            <div id="providersContainer" class="row">
              <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading provider data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Response Time (ms)</div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="responseTimeChart"></canvas>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">Request Success Rate (%)</div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="successRateChart"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mb-4">
      <div class="col-md-12">
        <div class="card">
          <div class="card-header">
            <ul class="nav nav-tabs card-header-tabs" id="metricsTab" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="requests-tab" data-bs-toggle="tab" data-bs-target="#requests" type="button" role="tab" aria-controls="requests" aria-selected="true">Request Metrics</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="blocks-tab" data-bs-toggle="tab" data-bs-target="#blocks" type="button" role="tab" aria-controls="blocks" aria-selected="false">Block Heights</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="rate-limits-tab" data-bs-toggle="tab" data-bs-target="#rate-limits" type="button" role="tab" aria-controls="rate-limits" aria-selected="false">Rate Limits</button>
              </li>
            </ul>
          </div>
          <div class="card-body">
            <div class="tab-content" id="metricsTabContent">
              <div class="tab-pane fade show active" id="requests" role="tabpanel" aria-labelledby="requests-tab">
                <div class="chart-container">
                  <canvas id="requestsChart"></canvas>
                </div>
              </div>
              <div class="tab-pane fade" id="blocks" role="tabpanel" aria-labelledby="blocks-tab">
                <div class="chart-container">
                  <canvas id="blocksChart"></canvas>
                </div>
              </div>
              <div class="tab-pane fade" id="rate-limits" role="tabpanel" aria-labelledby="rate-limits-tab">
                <div class="chart-container">
                  <canvas id="rateLimitsChart"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // Dashboard configuration
    const config = {
      refreshInterval: ${this.config.refreshIntervalMs},
      colors: {
        alchemy: '#6B46C1',
        infura: '#FF6B6B',
        default: '#3498DB'
      },
      statusColors: {
        healthy: '#28a745',
        degraded: '#ffc107',
        unhealthy: '#dc3545',
        unknown: '#6c757d'
      }
    };
    
    // Charts
    let responseTimeChart;
    let successRateChart;
    let requestsChart;
    let blocksChart;
    let rateLimitsChart;
    
    // Data
    let providers = [];
    let networks = [];
    let selectedNetwork = 'all';
    
    // Initialize dashboard
    document.addEventListener('DOMContentLoaded', async () => {
      // Initialize charts
      initCharts();
      
      // Load networks
      await loadNetworks();
      
      // Load provider data
      await loadProviderData();
      
      // Set up refresh interval
      setInterval(async () => {
        await loadProviderData();
      }, config.refreshInterval);
      
      // Set up refresh button
      document.getElementById('refreshButton').addEventListener('click', async () => {
        const icon = document.getElementById('refreshIcon');
        icon.classList.add('fa-spin');
        await loadProviderData();
        setTimeout(() => {
          icon.classList.remove('fa-spin');
        }, 500);
      });
      
      // Set up network selector
      document.getElementById('networkSelector').addEventListener('change', (e) => {
        selectedNetwork = e.target.value;
        loadProviderData();
      });
    });
    
    // Initialize charts
    function initCharts() {
      // Response time chart
      responseTimeChart = new Chart(
        document.getElementById('responseTimeChart'),
        {
          type: 'line',
          data: {
            labels: [],
            datasets: []
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Response Time (ms)'
                }
              }
            }
          }
        }
      );
      
      // Success rate chart
      successRateChart = new Chart(
        document.getElementById('successRateChart'),
        {
          type: 'line',
          data: {
            labels: [],
            datasets: []
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                min: 0,
                max: 100,
                title: {
                  display: true,
                  text: 'Success Rate (%)'
                }
              }
            }
          }
        }
      );
      
      // Requests chart
      requestsChart = new Chart(
        document.getElementById('requestsChart'),
        {
          type: 'bar',
          data: {
            labels: [],
            datasets: []
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Request Count'
                }
              }
            }
          }
        }
      );
      
      // Blocks chart
      blocksChart = new Chart(
        document.getElementById('blocksChart'),
        {
          type: 'line',
          data: {
            labels: [],
            datasets: []
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: false,
                title: {
                  display: true,
                  text: 'Block Height'
                }
              }
            }
          }
        }
      );
      
      // Rate limits chart
      rateLimitsChart = new Chart(
        document.getElementById('rateLimitsChart'),
        {
          type: 'bar',
          data: {
            labels: [],
            datasets: []
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Remaining Requests'
                }
              }
            }
          }
        }
      );
    }
    
    // Load networks
    async function loadNetworks() {
      try {
        const response = await fetch('/api/providers/networks');
        networks = await response.json();
        
        const selector = document.getElementById('networkSelector');
        networks.forEach(network => {
          const option = document.createElement('option');
          option.value = network;
          option.textContent = network.charAt(0).toUpperCase() + network.slice(1);
          selector.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load networks:', error);
      }
    }
    
    // Load provider data
    async function loadProviderData() {
      try {
        // Fetch provider health data
        const url = selectedNetwork === 'all' 
          ? '/api/providers/health' 
          : \`/api/providers/health/\${selectedNetwork}\`;
        
        const response = await fetch(url);
        providers = await response.json();
        
        // Update provider cards
        updateProviderCards();
        
        // Update charts
        updateCharts();
      } catch (error) {
        console.error('Failed to load provider data:', error);
      }
    }
    
    // Update provider cards
    function updateProviderCards() {
      const container = document.getElementById('providersContainer');
      
      if (providers.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-5"><p>No provider data available</p></div>';
        return;
      }
      
      container.innerHTML = '';
      
      providers.forEach(provider => {
        const statusClass = \`status-\${provider.status}\`;
        const color = getProviderColor(provider.providerType);
        
        const card = document.createElement('div');
        card.className = 'col-md-4 col-sm-6 mb-3';
        card.innerHTML = \`
          <div class="card provider-card h-100" style="border-top: 3px solid \${color}">
            <div class="card-body">
              <h5 class="card-title">\${provider.provider}</h5>
              <h6 class="card-subtitle mb-2 text-muted">\${provider.providerType} - \${provider.network}</h6>
              
              <div class="d-flex justify-content-between align-items-center mt-3">
                <span class="fw-bold \${statusClass}">
                  \${provider.status.toUpperCase()}
                </span>
                <span class="badge bg-primary rounded-pill">
                  Score: \${provider.score}
                </span>
              </div>
              
              <hr>
              
              <div class="small">
                <div class="d-flex justify-content-between mb-1">
                  <span>Response Time:</span>
                  <span>\${provider.responseTime ? \`\${provider.responseTime} ms\` : 'N/A'}</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                  <span>Block Number:</span>
                  <span>\${provider.blockNumber || 'N/A'}</span>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Last Check:</span>
                  <span>\${new Date(provider.timestamp).toLocaleTimeString()}</span>
                </div>
                
                \${provider.rateLimit ? \`
                <div class="mt-2 pt-2 border-top">
                  <div class="d-flex justify-content-between mb-1">
                    <span>Rate Limit:</span>
                    <span>\${provider.rateLimit.remaining} / \${provider.rateLimit.limit}</span>
                  </div>
                  <div class="progress" style="height: 5px;">
                    <div class="progress-bar" role="progressbar" 
                      style="width: \${(provider.rateLimit.remaining / provider.rateLimit.limit) * 100}%;" 
                      aria-valuenow="\${provider.rateLimit.remaining}" 
                      aria-valuemin="0" 
                      aria-valuemax="\${provider.rateLimit.limit}">
                    </div>
                  </div>
                  <div class="text-end mt-1">
                    <small class="text-muted">Resets: \${new Date(provider.rateLimit.resetTimestamp).toLocaleTimeString()}</small>
                  </div>
                </div>
                \` : ''}
                
                \${provider.error ? \`
                <div class="mt-2 pt-2 border-top">
                  <div class="text-danger small">
                    <strong>Error:</strong> \${provider.error}
                  </div>
                </div>
                \` : ''}
              </div>
            </div>
          </div>
        \`;
        
        container.appendChild(card);
      });
    }
    
    // Update charts
    function updateCharts() {
      if (providers.length === 0) {
        return;
      }
      
      // Group providers by type
      const providersByType = {};
      providers.forEach(provider => {
        if (!providersByType[provider.providerType]) {
          providersByType[provider.providerType] = [];
        }
        providersByType[provider.providerType].push(provider);
      });
      
      // Update response time chart
      updateResponseTimeChart(providersByType);
      
      // Update success rate chart
      updateSuccessRateChart(providersByType);
      
      // Update requests chart
      updateRequestsChart(providersByType);
      
      // Update blocks chart
      updateBlocksChart(providersByType);
      
      // Update rate limits chart
      updateRateLimitsChart(providersByType);
    }
    
    // Update response time chart
    function updateResponseTimeChart(providersByType) {
      const labels = Object.keys(providersByType);
      const datasets = [];
      
      Object.entries(providersByType).forEach(([type, providers]) => {
        const data = providers.map(p => p.responseTime || 0);
        const avgResponseTime = data.reduce((a, b) => a + b, 0) / data.length;
        
        datasets.push({
          label: type,
          data: [avgResponseTime],
          backgroundColor: getProviderColor(type),
          borderColor: getProviderColor(type),
          borderWidth: 1
        });
      });
      
      responseTimeChart.data.labels = ['Average Response Time'];
      responseTimeChart.data.datasets = datasets;
      responseTimeChart.update();
    }
    
    // Update success rate chart
    function updateSuccessRateChart(providersByType) {
      const datasets = [];
      
      Object.entries(providersByType).forEach(([type, providers]) => {
        const successRates = providers.map(p => p.score);
        const avgSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;
        
        datasets.push({
          label: type,
          data: [avgSuccessRate],
          backgroundColor: getProviderColor(type),
          borderColor: getProviderColor(type),
          borderWidth: 1
        });
      });
      
      successRateChart.data.labels = ['Success Rate'];
      successRateChart.data.datasets = datasets;
      successRateChart.update();
    }
    
    // Update requests chart
    function updateRequestsChart(providersByType) {
      const labels = [];
      const successData = [];
      const failureData = [];
      
      Object.entries(providersByType).forEach(([type, providers]) => {
        labels.push(type);
        
        // Calculate total success and failure counts
        let totalSuccess = 0;
        let totalFailure = 0;
        
        providers.forEach(provider => {
          // Estimate from score
          const requestCount = 100; // Placeholder
          const failureRate = (100 - provider.score) / 100;
          
          totalSuccess += requestCount * (1 - failureRate);
          totalFailure += requestCount * failureRate;
        });
        
        successData.push(totalSuccess);
        failureData.push(totalFailure);
      });
      
      requestsChart.data.labels = labels;
      requestsChart.data.datasets = [
        {
          label: 'Successful Requests',
          data: successData,
          backgroundColor: '#28a745',
          borderColor: '#28a745',
          borderWidth: 1
        },
        {
          label: 'Failed Requests',
          data: failureData,
          backgroundColor: '#dc3545',
          borderColor: '#dc3545',
          borderWidth: 1
        }
      ];
      requestsChart.update();
    }
    
    // Update blocks chart
    function updateBlocksChart(providersByType) {
      const datasets = [];
      
      // Group by network first
      const networkProviders = {};
      
      providers.forEach(provider => {
        if (!networkProviders[provider.network]) {
          networkProviders[provider.network] = {};
        }
        
        if (!networkProviders[provider.network][provider.providerType]) {
          networkProviders[provider.network][provider.providerType] = [];
        }
        
        networkProviders[provider.network][provider.providerType].push(provider);
      });
      
      // Create datasets for each network and provider type
      Object.entries(networkProviders).forEach(([network, typeProviders]) => {
        Object.entries(typeProviders).forEach(([type, providers]) => {
          const blockNumbers = providers
            .filter(p => p.blockNumber !== undefined)
            .map(p => p.blockNumber);
          
          if (blockNumbers.length > 0) {
            datasets.push({
              label: \`\${network} - \${type}\`,
              data: blockNumbers,
              backgroundColor: getProviderColor(type),
              borderColor: getProviderColor(type),
              borderWidth: 1
            });
          }
        });
      });
      
      blocksChart.data.labels = ['Current Block Height'];
      blocksChart.data.datasets = datasets;
      blocksChart.update();
    }
    
    // Update rate limits chart
    function updateRateLimitsChart(providersByType) {
      const labels = [];
      const remainingData = [];
      const limitData = [];
      
      providers.forEach(provider => {
        if (provider.rateLimit) {
          labels.push(\`\${provider.network} - \${provider.provider}\`);
          remainingData.push(provider.rateLimit.remaining);
          limitData.push(provider.rateLimit.limit);
        }
      });
      
      rateLimitsChart.data.labels = labels;
      rateLimitsChart.data.datasets = [
        {
          label: 'Remaining Requests',
          data: remainingData,
          backgroundColor: '#28a745',
          borderColor: '#28a745',
          borderWidth: 1
        },
        {
          label: 'Total Limit',
          data: limitData,
          backgroundColor: '#6c757d',
          borderColor: '#6c757d',
          borderWidth: 1,
          hidden: true
        }
      ];
      rateLimitsChart.update();
    }
    
    // Get provider color
    function getProviderColor(providerType) {
      const type = providerType.toLowerCase();
      return config.colors[type] || config.colors.default;
    }
  </script>
</body>
</html>`;
    
    fs.writeFileSync(htmlPath, html);
    logger.info('Created dashboard HTML file', LogCategory.GENERAL);
  }
}

// Export singleton instance
export const dashboard = DashboardService.getInstance();
