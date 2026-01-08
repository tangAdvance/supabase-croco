// Connection Pool Tests
// Tests for connection pool reuse and monitoring

import { assertEquals, assertExists } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  connectionPoolMonitor,
  trackQuery,
  getConnectionPoolHealth,
} from './connection-pool.ts';

Deno.test('ConnectionPoolMonitor - should record requests', () => {
  // Reset stats before test
  connectionPoolMonitor.reset();
  
  // Record some requests
  connectionPoolMonitor.recordRequest(50);
  connectionPoolMonitor.recordRequest(100);
  connectionPoolMonitor.recordRequest(75);
  
  const stats = connectionPoolMonitor.getStats();
  
  assertEquals(stats.totalRequests, 3);
  assertEquals(stats.averageResponseTime, 75); // (50 + 100 + 75) / 3
  assertExists(stats.lastRequestTime);
});

Deno.test('ConnectionPoolMonitor - should calculate average correctly', () => {
  connectionPoolMonitor.reset();
  
  // Record requests with known values
  connectionPoolMonitor.recordRequest(10);
  connectionPoolMonitor.recordRequest(20);
  connectionPoolMonitor.recordRequest(30);
  connectionPoolMonitor.recordRequest(40);
  
  const stats = connectionPoolMonitor.getStats();
  
  assertEquals(stats.totalRequests, 4);
  assertEquals(stats.averageResponseTime, 25); // (10 + 20 + 30 + 40) / 4
});

Deno.test('ConnectionPoolMonitor - should reset stats', () => {
  connectionPoolMonitor.reset();
  
  connectionPoolMonitor.recordRequest(100);
  connectionPoolMonitor.recordRequest(200);
  
  let stats = connectionPoolMonitor.getStats();
  assertEquals(stats.totalRequests, 2);
  
  // Reset
  connectionPoolMonitor.reset();
  
  stats = connectionPoolMonitor.getStats();
  assertEquals(stats.totalRequests, 0);
  assertEquals(stats.averageResponseTime, 0);
});

Deno.test('trackQuery - should track successful query', async () => {
  connectionPoolMonitor.reset();
  
  const result = await trackQuery('testQuery', async () => {
    // Simulate a query that takes 50ms
    await new Promise(resolve => setTimeout(resolve, 50));
    return { data: 'test' };
  });
  
  assertEquals(result.data, 'test');
  
  const stats = connectionPoolMonitor.getStats();
  assertEquals(stats.totalRequests, 1);
  // Response time should be around 50ms (with some tolerance)
  assertEquals(stats.averageResponseTime > 40 && stats.averageResponseTime < 100, true);
});

Deno.test('trackQuery - should track failed query', async () => {
  connectionPoolMonitor.reset();
  
  try {
    await trackQuery('failingQuery', async () => {
      await new Promise(resolve => setTimeout(resolve, 30));
      throw new Error('Query failed');
    });
  } catch (error) {
    assertEquals(error.message, 'Query failed');
  }
  
  // Should still record the request even if it failed
  const stats = connectionPoolMonitor.getStats();
  assertEquals(stats.totalRequests, 1);
});

Deno.test('getConnectionPoolHealth - should return healthy status', () => {
  connectionPoolMonitor.reset();
  
  // Record fast queries
  connectionPoolMonitor.recordRequest(30);
  connectionPoolMonitor.recordRequest(40);
  connectionPoolMonitor.recordRequest(35);
  
  const health = getConnectionPoolHealth();
  
  assertEquals(health.status, 'healthy');
  assertEquals(health.message, 'Connection pool is performing optimally');
  assertExists(health.stats);
});

Deno.test('getConnectionPoolHealth - should return degraded status', () => {
  connectionPoolMonitor.reset();
  
  // Record slower queries
  connectionPoolMonitor.recordRequest(100);
  connectionPoolMonitor.recordRequest(150);
  connectionPoolMonitor.recordRequest(120);
  
  const health = getConnectionPoolHealth();
  
  assertEquals(health.status, 'degraded');
  assertEquals(health.message, 'Connection pool performance is degraded');
});

Deno.test('getConnectionPoolHealth - should return unhealthy status', () => {
  connectionPoolMonitor.reset();
  
  // Record very slow queries
  connectionPoolMonitor.recordRequest(300);
  connectionPoolMonitor.recordRequest(400);
  connectionPoolMonitor.recordRequest(350);
  
  const health = getConnectionPoolHealth();
  
  assertEquals(health.status, 'unhealthy');
  assertEquals(health.message, 'Connection pool performance is poor, investigate database');
});

Deno.test('ConnectionPoolMonitor - should handle zero requests', () => {
  connectionPoolMonitor.reset();
  
  const stats = connectionPoolMonitor.getStats();
  
  assertEquals(stats.totalRequests, 0);
  assertEquals(stats.averageResponseTime, 0);
  assertEquals(stats.activeConnections, 1);
});
