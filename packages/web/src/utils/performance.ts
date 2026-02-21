interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100;

  trackEvent(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}:`, value, metadata ? metadata : '');
    }
  }

  trackTiming(name: string, duration: number, metadata?: Record<string, any>) {
    this.trackEvent(`timing.${name}`, duration, metadata);
  }

  trackApiCall(endpoint: string, duration: number, status: number) {
    this.trackTiming(`api.${endpoint}`, duration, { status, success: status >= 200 && status < 300 });
  }

  trackComponentRender(componentName: string, duration: number) {
    this.trackTiming(`render.${componentName}`, duration);
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name.startsWith(name));
    }
    return [...this.metrics];
  }

  getAverage(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  clear() {
    this.metrics = [];
  }

  getReport(): string {
    const timingMetrics = this.metrics.filter(m => m.name.startsWith('timing.'));
    const grouped: Record<string, number[]> = {};

    timingMetrics.forEach(m => {
      const key = m.name.replace('timing.', '');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m.value);
    });

    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    Object.entries(grouped).forEach(([key, values]) => {
      summary[key] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });

    return JSON.stringify(summary, null, 2);
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    try {
      const result = fn(...args);
      const duration = performance.now() - start;
      performanceMonitor.trackTiming(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      performanceMonitor.trackTiming(`${name}.error`, duration);
      throw error;
    }
  }) as T;
}

export function usePerformanceTracking(name: string) {
  const startRef = { current: 0 };

  const start = () => {
    startRef.current = performance.now();
  };

  const end = () => {
    if (startRef.current > 0) {
      const duration = performance.now() - startRef.current;
      performanceMonitor.trackTiming(name, duration);
      startRef.current = 0;
    }
  };

  return { start, end };
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    performanceMonitor.trackEvent('error', 1, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    performanceMonitor.trackEvent('unhandled_rejection', 1, {
      reason: event.reason?.toString()
    });
  });
}
