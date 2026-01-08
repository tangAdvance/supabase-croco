// Unit tests for error handling functions

import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  handleError,
  createSuccessResponse,
  handleCorsPreFlight,
  isErrorResponse,
  ErrorCode,
} from './error-handler.ts';
import { ValidationError, AuthorizationError, NotFoundError } from './types.ts';

Deno.test('handleError - ValidationError returns 400', async () => {
  const error = new ValidationError('Invalid parameters');
  const response = handleError(error);

  assertEquals(response.status, 400);
  
  const body = await response.json();
  assertEquals(body.code, ErrorCode.VALIDATION_ERROR);
  assertEquals(body.error, 'Invalid parameters');
});

Deno.test('handleError - AuthorizationError returns 403', async () => {
  const error = new AuthorizationError('Access denied');
  const response = handleError(error);

  assertEquals(response.status, 403);
  
  const body = await response.json();
  assertEquals(body.code, ErrorCode.AUTHORIZATION_ERROR);
  assertEquals(body.error, 'Access denied');
});

Deno.test('handleError - NotFoundError returns 404', async () => {
  const error = new NotFoundError('Resource not found');
  const response = handleError(error);

  assertEquals(response.status, 404);
  
  const body = await response.json();
  assertEquals(body.code, ErrorCode.NOT_FOUND);
  assertEquals(body.error, 'Resource not found');
});

Deno.test('handleError - timeout error returns 504', async () => {
  const error = new Error('Request timeout occurred');
  const response = handleError(error);

  assertEquals(response.status, 504);
  
  const body = await response.json();
  assertEquals(body.code, ErrorCode.GATEWAY_TIMEOUT);
  assertEquals(body.error, '服务响应超时，请稍后重试');
});

Deno.test('handleError - database error returns 500', async () => {
  const error = new Error('Database connection failed');
  const response = handleError(error);

  assertEquals(response.status, 500);
  
  const body = await response.json();
  assertEquals(body.code, ErrorCode.DATABASE_ERROR);
  assertEquals(body.error, '数据库操作失败，请稍后重试');
});

Deno.test('handleError - service unavailable returns 503', async () => {
  const error = new Error('Service unavailable');
  const response = handleError(error);

  assertEquals(response.status, 503);
  
  const body = await response.json();
  assertEquals(body.code, ErrorCode.SERVICE_UNAVAILABLE);
  assertEquals(body.error, '服务暂时不可用，请稍后重试');
});

Deno.test('handleError - generic error returns 500', async () => {
  const error = new Error('Something went wrong');
  const response = handleError(error);

  assertEquals(response.status, 500);
  
  const body = await response.json();
  assertEquals(body.code, ErrorCode.INTERNAL_ERROR);
  assertEquals(body.error, '服务器内部错误，请稍后重试');
});

Deno.test('handleError - includes context in logs', async () => {
  const error = new Error('Test error');
  const context = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    conversationId: '550e8400-e29b-41d4-a716-446655440000',
    message: 'Test message',
  };

  const response = handleError(error, context);
  
  // Should return a response (error logged internally)
  assertEquals(response.status, 500);
});

Deno.test('createSuccessResponse - returns 200 by default', async () => {
  const data = { message: 'Success' };
  const response = createSuccessResponse(data);

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Content-Type'), 'application/json');
  
  const body = await response.json();
  assertEquals(body.message, 'Success');
});

Deno.test('createSuccessResponse - custom status code', async () => {
  const data = { message: 'Created' };
  const response = createSuccessResponse(data, 201);

  assertEquals(response.status, 201);
  
  const body = await response.json();
  assertEquals(body.message, 'Created');
});

Deno.test('handleCorsPreFlight - returns 200 with CORS headers', () => {
  const response = handleCorsPreFlight();

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('isErrorResponse - identifies error responses', () => {
  const errorResponse = new Response('Error', { status: 400 });
  const successResponse = new Response('OK', { status: 200 });
  const notResponse = { status: 400 };

  assertEquals(isErrorResponse(errorResponse), true);
  assertEquals(isErrorResponse(successResponse), false);
  assertEquals(isErrorResponse(notResponse), false);
});
