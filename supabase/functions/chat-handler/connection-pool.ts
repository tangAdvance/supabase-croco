// Connection Pool Management and Monitoring
// Requirement 8.1: 优化连接管理

/**
 * Connection pool statistics for monitoring
 */
interface ConnectionPoolStats {
  activeConnections: number;
  totalRequests: number;
  averageResponseTime: number;
  lastRequestTime: string;
}

/**
 * Simple in-memory statistics tracker
 * Note: In Deno Deploy, each isolate has its own memory space
 * These stats are per-isolate, not global
 */
class ConnectionPoolMonitor {
  private stats = {
    totalRequests: 0,
    totalResponseTime: 0,
    lastRequestTime: new Date().toISOString(),
  };

  /**
   * Record a database request
   * @param responseTime - Response time in milliseconds
   */
  recordRequest(responseTime: number): void {
    this.stats.totalRequests++;
    this.stats.totalResponseTime += responseTime;
    this.stats.lastRequestTime = new Date().toISOString();
  }

  /**
   * Get current connection pool statistics
   * @returns Connection pool stats
   */
  getStats(): ConnectionPoolStats {
    return {
      activeConnections: 1, // Supabase client uses a single connection per isolate
      totalRequests: this.stats.totalRequests,
      averageResponseTime: this.stats.totalRequests > 0
        ? this.stats.totalResponseTime / this.stats.totalRequests
        : 0,
      lastRequestTime: this.stats.lastRequestTime,
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  reset(): void {
    this.stats = {
      totalRequests: 0,
      totalResponseTime: 0,
      lastRequestTime: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const connectionPoolMonitor = new ConnectionPoolMonitor();

/**
 * Wrapper function to track database query performance
 * @param queryName - Name of the query for logging
 * @param queryFn - Async function that performs the query
 * @returns Query result
 */
export async function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await queryFn();
    const responseTime = performance.now() - startTime;
    
    connectionPoolMonitor.recordRequest(responseTime);
    
    // Log slow queries (> 100ms)
    if (responseTime > 100) {
      console.warn(`[ConnectionPool] Slow query detected: ${queryName} took ${responseTime.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const responseTime = performance.now() - startTime;
    connectionPoolMonitor.recordRequest(responseTime);
    
    console.error(`[ConnectionPool] Query failed: ${queryName} after ${responseTime.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Get connection pool health status
 * @returns Health status object
 */
export function getConnectionPoolHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  stats: ConnectionPoolStats;
  message: string;
} {
  const stats = connectionPoolMonitor.getStats();
  
  // Determine health based on average response time
  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;
  
  if (stats.averageResponseTime < 50) {
    status = 'healthy';
    message = 'Connection pool is performing optimally';
  } else if (stats.averageResponseTime < 200) {
    status = 'degraded';
    message = 'Connection pool performance is degraded';
  } else {
    status = 'unhealthy';
    message = 'Connection pool performance is poor, investigate database';
  }
  
  return { status, stats, message };
}

/**
 * Log connection pool statistics
 * Useful for debugging and monitoring
 */
export function logConnectionPoolStats(): void {
  const health = getConnectionPoolHealth();
  console.log('[ConnectionPool] Health Check:', {
    status: health.status,
    message: health.message,
    stats: health.stats,
  });
}
