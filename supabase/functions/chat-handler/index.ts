// Chat Handler Edge Function
// Main entry point for the chat backend architecture

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import type {
  ChatRequest,
  ChatResponse,
  RequestContext,
  N8NRequest,
  N8NResponse,
  UserProfile,
} from './types.ts';
import { validateChatRequest, validateRequestBody } from './validation.ts';
import {
  handleError,
  handleCorsPreFlight,
  createSuccessResponse,
} from './error-handler.ts';
import {
  getUserContext,
  getCharacter,
  getConversationHistory,
  getCharacterMemories,
  getOrCreateConversation,
  saveMessage,
  saveMemory,
  updateConversationTimestamp,
} from './db.ts';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight();
  }

  let context: Partial<RequestContext> = {};

  try {
    // ========================================================================
    // Step 1: Parse and validate request
    // ========================================================================
    const body = await req.json();
    const requestData: ChatRequest = validateRequestBody(body);
    
    // Validate chat request parameters
    validateChatRequest(requestData);

    // Set context for error logging
    context = {
      userId: requestData.userId,
      characterId: requestData.characterId,
      conversationId: requestData.conversationId,
      message: requestData.message,
    };

    // ========================================================================
    // Step 2: Parallel data queries (Requirements 1.1, 1.2, 1.3, 1.4)
    // ========================================================================
    
    // Get or create conversation first (needed for history query)
    const conversationId = await getOrCreateConversation(
      requestData.conversationId,
      requestData.userId,
      requestData.characterId
    );
    
    // Update context with actual conversation ID
    context.conversationId = conversationId;

    // Parallel queries for better performance
    const [userContext, character, history, memories] = await Promise.all([
      getUserContext(requestData.userId),
      getCharacter(requestData.characterId),
      getConversationHistory(conversationId, 10),
      getCharacterMemories(requestData.characterId, requestData.userId, 5),
    ]);

    // ========================================================================
    // Step 3: Aggregate context data (Requirement 1.5)
    // ========================================================================
    
    // Build user profile for N8N
    const userProfile: UserProfile = {
      age: userContext.age,
      interests: userContext.interests,
      grade: userContext.grade,
      name: userContext.name,
      recentMemories: memories.map(m => ({
        id: m.id,
        character_id: m.character_id,
        user_id: m.user_id,
        memory_key: m.memory_key,
        memory_value: m.memory_value,
        importance: m.importance,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
    };

    // ========================================================================
    // Step 4: Save user message (before calling N8N)
    // ========================================================================
    
    // Save user message first to get the message ID
    const userMessageId = await saveMessage({
      conversation_id: conversationId,
      user_id: requestData.userId,
      character_id: requestData.characterId,
      role: 'user',
      content: requestData.message,
    });

    console.log(`[Main] User message saved: ${userMessageId}`);

    // ========================================================================
    // Step 5: Call N8N Workflow (Requirements 2.1, 2.6, 8.2)
    // ========================================================================
    
    const n8nRequest: N8NRequest = {
      message: requestData.message,
      userId: requestData.userId,
      conversationId: conversationId,
      userMessageId: userMessageId,  // Pass user message ID to N8N
      userProfile,
      character,
      history,
    };

    const n8nResponse = await callN8NWorkflow(n8nRequest);

    // ========================================================================
    // Step 6: Async post-processing (Requirements 4.5, 8.3, 8.4)
    // ========================================================================
    
    // N8N has already saved the AI message, we just get the ID from response
    const aiMessageId = n8nResponse.aiMessageId;

    console.log(`[Main] AI message ID from N8N: ${aiMessageId}`);

    // Extract and save memories asynchronously (don't await)
    extractAndSaveMemories(
      n8nResponse,
      requestData.userId,
      requestData.characterId
    ).catch(error => {
      console.error('[Main] Error extracting memories:', error);
      // Don't throw - this is a non-blocking operation
    });

    // Update conversation timestamp asynchronously (don't await)
    updateConversationTimestamp(conversationId).catch(error => {
      console.error('[Main] Error updating conversation timestamp:', error);
      // Don't throw - this is a non-blocking operation
    });

    // ========================================================================
    // Step 7: Build and return response (Requirement 5.4)
    // ========================================================================
    
    const response: ChatResponse = {
      response: n8nResponse.response,
      intentType: n8nResponse.intentType,
      mode: n8nResponse.mode,
      timestamp: new Date().toISOString(),
      conversationId: conversationId,
      messageId: aiMessageId,
      userMessageId: userMessageId,
    };

    return createSuccessResponse(response);
  } catch (error) {
    // Handle all errors with unified error handler
    return handleError(error as Error, context);
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Call N8N workflow with aggregated context
 * @param request - N8N request with full context
 * @returns N8N response with AI reply
 * @throws Error if N8N call fails or times out
 */
async function callN8NWorkflow(request: N8NRequest): Promise<N8NResponse> {
  const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
  
  if (!n8nWebhookUrl) {
    throw new Error('N8N_WEBHOOK_URL environment variable is not set');
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`N8N workflow returned status ${response.status}`);
    }

    const data = await response.json();

    // Validate N8N response format
    if (!data.response || !data.intentType || !data.mode || !data.aiMessageId) {
      console.warn('[N8N] Response missing required fields, using defaults');
      return {
        response: data.response || '抱歉，我现在无法回答',
        intentType: data.intentType || 'unknown',
        mode: data.mode || 'normal',
        aiMessageId: data.aiMessageId || '',
      };
    }

    return data as N8NResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('N8N workflow timeout after 30 seconds');
    }
    
    throw new Error(`N8N workflow call failed: ${error.message}`);
  }
}

/**
 * Extract and save memories from conversation
 * This is an async operation that should not block the main response
 * @param n8nResponse - N8N response containing AI-extracted memories
 * @param userId - User ID
 * @param characterId - Character ID
 */
async function extractAndSaveMemories(
  n8nResponse: N8NResponse,
  userId: string,
  characterId: string
): Promise<void> {
  try {
    // Use AI-extracted memories from N8N response
    const memories = n8nResponse.memories || [];
    
    if (memories.length === 0) {
      console.log('[extractAndSaveMemories] No memories extracted by AI');
      return;
    }
    
    console.log(`[extractAndSaveMemories] Processing ${memories.length} AI-extracted memories`);
    
    // Save each memory
    for (const memory of memories) {
      try {
        await saveMemory({
          character_id: characterId,
          user_id: userId,
          memory_key: memory.memory_key,
          memory_value: memory.memory_value,
          importance: memory.importance,
        });
        
        console.log(`[extractAndSaveMemories] Saved memory: ${memory.memory_key} = ${memory.memory_value}`);
      } catch (error) {
        console.error('[extractAndSaveMemories] Error saving memory:', error);
        // Continue with other memories even if one fails
      }
    }
  } catch (error) {
    console.error('[extractAndSaveMemories] Error processing memories:', error);
    throw error;
  }
}
