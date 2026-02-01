import { cache } from '../utils/cache.js';
import { coinGeckoService } from './CoinGeckoService.js';

export interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export interface ChartDataset {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    borderWidth: 2;
    tension: number;
    pointRadius: number;
    pointHoverRadius: number;
  }[];
}

export class ChartService {
  async getTokenPriceChart(coinId: string, timeframe: string): Promise<ChartDataset> {
    const cacheKey = `chart:price:${coinId}:${timeframe}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Map timeframe to days for CoinGecko
    const daysMap: Record<string, number> = {
      '1H': 0.04,   // 1 hour = ~1/24 of a day
      '1D': 1,
      '7D': 7,
      '30D': 30,
      '90D': 90,
      '1Y': 365,
      'ALL': 'max' as any,
    };

    const days = daysMap[timeframe] || 7;

    try {
      const marketData = await coinGeckoService.getMarketChart(coinId, days);
      
      // Format data for Chart.js
      const prices = marketData.prices;
      const labels: string[] = [];
      const dataPoints: number[] = [];

      prices.forEach((price: [number, number]) => {
        const timestamp = price[0];
        const value = price[1];
        
        labels.push(this.formatTimestamp(timestamp, timeframe));
        dataPoints.push(value);
      });

      // Sample data points to reduce chart size for large datasets
      const sampledLabels = this.sampleData(labels, timeframe);
      const sampledData = this.sampleData(dataPoints, timeframe);

      const chartData: ChartDataset = {
        labels: sampledLabels,
        datasets: [
          {
            label: 'Price (USD)',
            data: sampledData,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      };

      // Cache for 5 minutes
      cache.set(cacheKey, chartData, 300);
      return chartData;
    } catch (error) {
      console.error('[ChartService] Error fetching chart data:', error);
      throw error;
    }
  }

  private formatTimestamp(timestamp: number, timeframe: string): string {
    const date = new Date(timestamp);
    
    switch (timeframe) {
      case '1H':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case '1D':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case '7D':
        return date.toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit' });
      case '30D':
      case '90D':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '1Y':
      case 'ALL':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString();
    }
  }

  private sampleData(data: any[], timeframe: string): any[] {
    const maxPoints = 100; // Maximum points to show on chart
    
    if (data.length <= maxPoints) return data;
    
    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }

  // Generate chart options for Chart.js
  getChartOptions(timeframe: string) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context: any) => {
              return `$${context.parsed.y.toFixed(4)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 8,
            color: '#9ca3af',
          },
        },
        y: {
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            color: '#9ca3af',
            callback: (value: any) => {
              return '$' + value.toFixed(2);
            },
          },
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    };
  }
}

export const chartService = new ChartService();
