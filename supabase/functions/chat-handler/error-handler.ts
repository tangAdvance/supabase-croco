// Error handling functions for Chat Backend Architecture

import type { ErrorResponse, RequestContext } from './types.ts';
import { ValidationError, AuthorizationError, NotFoundError } from './types.ts';

/**
 * CORS headers for cross-origin requests
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Error codes for different error types
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Log error with context information
 * @param error - Error object
 * @param context - Request context for debugging
 * @param additionalInfo - Additional information to log
 */
export function logError(
  error: Error,
  context?: Partial<RequestContext>,
  additionalInfo?: Record<string, any>
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context: context ? {
      userId: context.userId,
      characterId: context.characterId,
      conversationId: context.conversationId,
      // Don't log full message content for privacy
      messageLength: context.message?.length,
    } : undefined,
    additionalInfo,
  };

  console.error('[ChatHandler Error]', JSON.stringify(logEntry, null, 2));
}

/**
 * Create error response with appropriate status code and message
 * @param error - Error object
 * @param context - Request context for logging
 * @returns Response object with error details
 */
export function handleError(
  error: Error,
  context?: Partial<RequestContext>
): Response {
  // Log the error with context
  logError(error, context);

  let statusCode: number;
  let errorCode: ErrorCode;
  let errorMessage: string;
  let details: any = undefined;

  // Determine error type and set appropriate response
  if (error instanceof ValidationError) {
    // 400 Bad Request - Client sent invalid data
    statusCode = 400;
    errorCode = ErrorCode.VALIDATION_ERROR;
    errorMessage = error.message;
  } else if (error instanceof AuthorizationError) {
    // 403 Forbidden - Client doesn't have permission
    statusCode = 403;
    errorCode = ErrorCode.AUTHORIZATION_ERROR;
    errorMessage = error.message;
  } else if (error instanceof NotFoundError) {
    // 404 Not Found - Requested resource doesn't exist
    statusCode = 404;
    errorCode = ErrorCode.NOT_FOUND;
    errorMessage = error.message;
  } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
    // 504 Gateway Timeout - N8N or external service timeout
    statusCode = 504;
    errorCode = ErrorCode.GATEWAY_TIMEOUT;
    errorMessage = '服务响应超时，请稍后重试';
  } else if (error.message.includes('database') || error.message.includes('Database')) {
    // 500 Internal Server Error - Database error
    statusCode = 500;
    errorCode = ErrorCode.DATABASE_ERROR;
    errorMessage = '数据库操作失败，请稍后重试';
  } else if (error.message.includes('unavailable') || error.message.includes('Unavailable')) {
    // 503 Service Unavailable - External service unavailable
    statusCode = 503;
    errorCode = ErrorCode.SERVICE_UNAVAILABLE;
    errorMessage = '服务暂时不可用，请稍后重试';
  } else {
    // 500 Internal Server Error - Unknown error
    statusCode = 500;
    errorCode = ErrorCode.INTERNAL_ERROR;
    errorMessage = '服务器内部错误，请稍后重试';
  }

  // In development environment, include error details
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
  if (isDevelopment) {
    details = {
      originalMessage: error.message,
      stack: error.stack,
    };
  }

  const errorResponse: ErrorResponse = {
    error: errorMessage,
    code: errorCode,
    details,
  };

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create success response with proper headers
 * @param data - Response data object
 * @param statusCode - HTTP status code (default: 200)
 * @returns Response object
 */
export function createSuccessResponse(
  data: any,
  statusCode: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Handle CORS preflight requests
 * @returns Response for OPTIONS requests
 */
export function handleCorsPreFlight(): Response {
  return new Response('ok', {
    status: 200,
    headers: corsHeaders,
  });
}

/**
 * Wrap async function with error handling
 * Catches errors and returns proper error response
 * @param fn - Async function to wrap
 * @param context - Request context for error logging
 * @returns Wrapped function that handles errors
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Partial<RequestContext>
): Promise<T | Response> {
  return fn().catch((error: Error) => {
    return handleError(error, context);
  });
}

/**
 * Check if response is an error response
 * @param response - Response or data object
 * @returns true if response is an error Response object
 */
export function isErrorResponse(response: any): response is Response {
  return response instanceof Response && response.status >= 400;
}
