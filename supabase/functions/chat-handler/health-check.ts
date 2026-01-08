// Health Check Endpoint for Connection Pool Monitoring
// This can be used as a separate endpoint or integrated into the main handler

import { getConnectionPoolHealth, logConnectionPoolStats } from './connection-pool.ts';
import { supabase } from './db.ts';

/**
 * Perform a comprehensive health check
 * @returns Health check result
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; message: string };
    connectionPool: { status: string; message: string; stats: any };
    environment: { status: string; message: string };
  };
}> {
  const timestamp = new Date().toISOString();
  const checks = {
    database: { status: 'unknown', message: '' },
    connectionPool: { status: 'unknown', message: '', stats: {} },
    environment: { status: 'unknown', message: '' },
  };

  // Check database connectivity
  try {
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error) {
      checks.database = {
        status: 'unhealthy',
        message: `Database query failed: ${error.message}`,
      };
    } else {
      checks.database = {
        status: 'healthy',
        message: 'Database is accessible',
      };
    }
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: `Database connection failed: ${error.message}`,
    };
  }

  // Check connection pool health
  const poolHealth = getConnectionPoolHealth();
  checks.connectionPool = {
    status: poolHealth.status,
    message: poolHealth.message,
    stats: poolHealth.stats,
  };

  // Check environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'N8N_WEBHOOK_URL',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !Deno.env.get(varName));
  
  if (missingVars.length > 0) {
    checks.environment = {
      status: 'unhealthy',
      message: `Missing environment variables: ${missingVars.join(', ')}`,
    };
  } else {
    checks.environment = {
      status: 'healthy',
      message: 'All required environment variables are set',
    };
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (
    checks.database.status === 'unhealthy' ||
    checks.environment.status === 'unhealthy'
  ) {
    overallStatus = 'unhealthy';
  } else if (
    checks.database.status === 'degraded' ||
    checks.connectionPool.status === 'degraded'
  ) {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    timestamp,
    checks,
  };
}

/**
 * Example usage in a health check endpoint
 * 
 * Add this to your main handler or create a separate health-check function:
 * 
 * ```typescript
 * if (req.url.endsWith('/health')) {
 *   const health = await performHealthCheck();
 *   return new Response(JSON.stringify(health), {
 *     status: health.status === 'healthy' ? 200 : 503,
 *     headers: { 'Content-Type': 'application/json' },
 *   });
 * }
 * ```
 */
