// Validation functions for Chat Backend Architecture

import type { ChatRequest } from './types.ts';
import { ValidationError } from './types.ts';

/**
 * UUID validation regex pattern
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID format
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate chat request parameters
 * Checks for required parameters and validates their formats
 * @param request - Chat request object
 * @throws ValidationError with detailed error message if validation fails
 */
export function validateChatRequest(request: ChatRequest): void {
  const errors: string[] = [];

  // Validate userId
  if (!request.userId) {
    errors.push('userId is required');
  } else if (typeof request.userId !== 'string') {
    errors.push('userId must be a string');
  } else if (!isValidUUID(request.userId)) {
    errors.push('userId must be a valid UUID format');
  }

  // Validate characterId
  if (!request.characterId) {
    errors.push('characterId is required');
  } else if (typeof request.characterId !== 'string') {
    errors.push('characterId must be a string');
  } else if (!isValidUUID(request.characterId)) {
    errors.push('characterId must be a valid UUID format');
  }

  // Validate message
  if (!request.message) {
    errors.push('message is required');
  } else if (typeof request.message !== 'string') {
    errors.push('message must be a string');
  } else if (request.message.trim().length === 0) {
    errors.push('message cannot be empty or whitespace only');
  } else if (request.message.length > 10000) {
    errors.push('message exceeds maximum length of 10000 characters');
  }

  // Validate conversationId (optional, but must be valid UUID if provided)
  if (request.conversationId !== undefined && request.conversationId !== null) {
    if (typeof request.conversationId !== 'string') {
      errors.push('conversationId must be a string');
    } else if (request.conversationId.trim().length > 0 && !isValidUUID(request.conversationId)) {
      errors.push('conversationId must be a valid UUID format');
    }
  }

  // If there are validation errors, throw ValidationError with all error messages
  if (errors.length > 0) {
    throw new ValidationError(
      `Request validation failed: ${errors.join('; ')}`
    );
  }
}

/**
 * Validate request body is valid JSON and contains expected structure
 * @param body - Request body to validate
 * @returns Parsed ChatRequest object
 * @throws ValidationError if body is invalid JSON or missing required structure
 */
export function validateRequestBody(body: any): ChatRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  // Return the body as ChatRequest (will be validated by validateChatRequest)
  return body as ChatRequest;
}

/**
 * Sanitize user input to prevent injection attacks
 * Removes potentially dangerous characters and limits length
 * @param input - User input string
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
