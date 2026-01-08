// Unit tests for validation functions

import { assertEquals, assertThrows } from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import { isValidUUID, validateChatRequest, validateRequestBody, sanitizeInput } from './validation.ts';
import { ValidationError } from './types.ts';

Deno.test('isValidUUID - valid UUID', () => {
  const validUUIDs = [
    '123e4567-e89b-12d3-a456-426614174000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '550e8400-e29b-41d4-a716-446655440000',
  ];

  validUUIDs.forEach((uuid) => {
    assertEquals(isValidUUID(uuid), true, `Should validate ${uuid} as valid UUID`);
  });
});

Deno.test('isValidUUID - invalid UUID', () => {
  const invalidUUIDs = [
    'not-a-uuid',
    '123',
    '',
    '123e4567-e89b-12d3-a456',
    '123e4567-e89b-12d3-a456-426614174000-extra',
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  ];

  invalidUUIDs.forEach((uuid) => {
    assertEquals(isValidUUID(uuid), false, `Should validate ${uuid} as invalid UUID`);
  });
});

Deno.test('validateChatRequest - valid request', () => {
  const validRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: 'Hello, this is a test message',
    conversationId: '550e8400-e29b-41d4-a716-446655440000',
  };

  // Should not throw
  validateChatRequest(validRequest);
});

Deno.test('validateChatRequest - missing userId', () => {
  const invalidRequest = {
    userId: '',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: 'Hello',
  };

  assertThrows(
    () => validateChatRequest(invalidRequest as any),
    ValidationError,
    'userId is required'
  );
});

Deno.test('validateChatRequest - invalid userId format', () => {
  const invalidRequest = {
    userId: 'not-a-uuid',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: 'Hello',
  };

  assertThrows(
    () => validateChatRequest(invalidRequest),
    ValidationError,
    'userId must be a valid UUID format'
  );
});

Deno.test('validateChatRequest - missing characterId', () => {
  const invalidRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: '',
    message: 'Hello',
  };

  assertThrows(
    () => validateChatRequest(invalidRequest as any),
    ValidationError,
    'characterId is required'
  );
});

Deno.test('validateChatRequest - invalid characterId format', () => {
  const invalidRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'invalid-uuid',
    message: 'Hello',
  };

  assertThrows(
    () => validateChatRequest(invalidRequest),
    ValidationError,
    'characterId must be a valid UUID format'
  );
});

Deno.test('validateChatRequest - missing message', () => {
  const invalidRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: '',
  };

  assertThrows(
    () => validateChatRequest(invalidRequest as any),
    ValidationError,
    'message is required'
  );
});

Deno.test('validateChatRequest - empty message (whitespace only)', () => {
  const invalidRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: '   ',
  };

  assertThrows(
    () => validateChatRequest(invalidRequest),
    ValidationError,
    'message cannot be empty or whitespace only'
  );
});

Deno.test('validateChatRequest - message too long', () => {
  const invalidRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: 'x'.repeat(10001),
  };

  assertThrows(
    () => validateChatRequest(invalidRequest),
    ValidationError,
    'message exceeds maximum length'
  );
});

Deno.test('validateChatRequest - invalid conversationId format', () => {
  const invalidRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: 'Hello',
    conversationId: 'not-a-uuid',
  };

  assertThrows(
    () => validateChatRequest(invalidRequest),
    ValidationError,
    'conversationId must be a valid UUID format'
  );
});

Deno.test('validateChatRequest - optional conversationId can be undefined', () => {
  const validRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: 'Hello',
  };

  // Should not throw
  validateChatRequest(validRequest);
});

Deno.test('validateRequestBody - valid body', () => {
  const validBody = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    characterId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    message: 'Hello',
  };

  const result = validateRequestBody(validBody);
  assertEquals(result, validBody);
});

Deno.test('validateRequestBody - null body', () => {
  assertThrows(
    () => validateRequestBody(null),
    ValidationError,
    'Request body must be a valid JSON object'
  );
});

Deno.test('validateRequestBody - non-object body', () => {
  assertThrows(
    () => validateRequestBody('not an object'),
    ValidationError,
    'Request body must be a valid JSON object'
  );
});

Deno.test('sanitizeInput - normal input', () => {
  const input = '  Hello, world!  ';
  const result = sanitizeInput(input);
  assertEquals(result, 'Hello, world!');
});

Deno.test('sanitizeInput - empty input', () => {
  const result = sanitizeInput('');
  assertEquals(result, '');
});

Deno.test('sanitizeInput - input exceeds max length', () => {
  const input = 'x'.repeat(15000);
  const result = sanitizeInput(input, 10000);
  assertEquals(result.length, 10000);
});

Deno.test('sanitizeInput - non-string input', () => {
  const result = sanitizeInput(null as any);
  assertEquals(result, '');
});
