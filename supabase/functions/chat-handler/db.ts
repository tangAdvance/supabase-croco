// Database query functions for Chat Backend Architecture

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type {
  UserContext,
  Character,
  Message,
  Memory,
  HistoryMessage,
  UserProfileItem,
  MessageInput,
  MemoryInput,
} from './types.ts';
import { NotFoundError, AuthorizationError } from './types.ts';
import { trackQuery } from './connection-pool.ts';

// ============================================================================
// Supabase Client Singleton (Connection Pool Reuse - Requirement 8.1)
// ============================================================================

/**
 * Initialize Supabase client at module level for connection reuse
 * 
 * Benefits:
 * - Single client instance shared across all function invocations
 * - Automatic HTTP connection pooling by the underlying fetch client
 * - Reduced connection establishment overhead
 * - Optimal for Deno Deploy's isolate-based architecture
 * 
 * The Supabase client automatically manages:
 * - Connection pooling
 * - Request queuing
 * - Automatic retries
 * - Connection lifecycle
 */
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  // Connection pool is managed automatically by the fetch client
  // No manual configuration needed for Deno Deploy
});

/**
 * Export the Supabase client for direct access if needed
 * This allows other modules to use the same client instance
 */
export { supabase };

/**
 * Get user context including user profile data
 * @param userId - User UUID
 * @returns UserContext with aggregated user data
 * @throws NotFoundError if user does not exist
 */
export async function getUserContext(userId: string): Promise<UserContext> {
  // Parallel queries for better performance (Requirement 8.1)
  const [userResult, profileResult] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single(),
    supabase
      .from('user_profile')
      .select('key, value, importance')
      .eq('user_id', userId),
  ]);

  const { data: user, error: userError } = userResult;
  const { data: profileItems, error: profileError } = profileResult;

  if (userError || !user) {
    throw new NotFoundError(`User not found: ${userId}`);
  }

  if (profileError) {
    console.error('[getUserContext] Error fetching user profile:', profileError);
  }

  // Aggregate user context with default values
  const userContext: UserContext = {
    id: user.id,
    name: user.name || '用户',
    age: user.age || 10,
    interests: user.interests || [],
    grade: user.grade || '未知',
    avatar_url: user.avatar_url || '',
    profile: (profileItems || []).map((item) => ({
      key: item.key,
      value: item.value,
      importance: item.importance,
    })),
  };

  return userContext;
}

/**
 * Get character configuration
 * @param characterId - Character UUID
 * @returns Character configuration
 * @throws NotFoundError if character does not exist
 * @throws AuthorizationError if character is not active
 */
export async function getCharacter(characterId: string): Promise<Character> {
  const { data: character, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single();

  if (error || !character) {
    throw new NotFoundError(`Character not found: ${characterId}`);
  }

  // Verify character is active
  if (!character.is_active) {
    throw new NotFoundError(`Character is not active: ${characterId}`);
  }

  return {
    id: character.id,
    name: character.name,
    slug: character.slug,
    personality: character.personality || '',
    system_prompt: character.system_prompt,
    tone: character.tone || '',
    expertise: character.expertise || [],
    target_age_group: character.target_age_group || [],
    model: character.model || 'claude-sonnet-4-20250514',
    temperature: character.temperature || 0.7,
    max_tokens: character.max_tokens || 1000,
    is_active: character.is_active,
    is_premium: character.is_premium || false,
  };
}

/**
 * Get conversation history messages
 * @param conversationId - Conversation UUID
 * @param limit - Maximum number of messages to return (default: 10)
 * @returns Array of history messages in chronological order
 */
export async function getConversationHistory(
  conversationId: string,
  limit: number = 10
): Promise<HistoryMessage[]> {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getConversationHistory] Error fetching messages:', error);
    return [];
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // Reverse to get chronological order (oldest first)
  return messages.reverse().map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));
}

/**
 * Get character memories for a specific user
 * @param characterId - Character UUID
 * @param userId - User UUID
 * @param limit - Maximum number of memories to return (default: 5)
 * @returns Array of memories sorted by importance (descending)
 */
export async function getCharacterMemories(
  characterId: string,
  userId: string,
  limit: number = 5
): Promise<Memory[]> {
  const { data: memories, error } = await supabase
    .from('character_user_memories')
    .select('*')
    .eq('character_id', characterId)
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getCharacterMemories] Error fetching memories:', error);
    return [];
  }

  return memories || [];
}

/**
 * Save a message to the database
 * @param message - Message input data
 * @returns Message ID of the saved message
 * @throws Error if message save fails
 */
export async function saveMessage(message: MessageInput): Promise<string> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: message.conversation_id,
      user_id: message.user_id,
      character_id: message.character_id,
      role: message.role,
      content: message.content,
      intent_type: message.intent_type,
      mode: message.mode,
      metadata: message.metadata,
      tokens_used: message.tokens_used,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[saveMessage] Error saving message:', error);
    throw new Error(`Failed to save message: ${error.message}`);
  }

  if (!data || !data.id) {
    throw new Error('Failed to save message: No ID returned');
  }

  return data.id;
}

/**
 * Save or update a memory in the database
 * Checks if memory already exists (memory_key + character_id + user_id)
 * If exists, updates updated_at timestamp
 * If not exists, inserts new record
 * @param memory - Memory input data
 * @throws Error if memory save/update fails
 */
export async function saveMemory(memory: MemoryInput): Promise<void> {
  // Check if memory already exists
  const { data: existingMemory, error: checkError } = await supabase
    .from('character_user_memories')
    .select('id')
    .eq('memory_key', memory.memory_key)
    .eq('character_id', memory.character_id)
    .eq('user_id', memory.user_id)
    .maybeSingle();

  if (checkError) {
    console.error('[saveMemory] Error checking existing memory:', checkError);
    throw new Error(`Failed to check existing memory: ${checkError.message}`);
  }

  if (existingMemory) {
    // Memory exists, update updated_at timestamp
    const { error: updateError } = await supabase
      .from('character_user_memories')
      .update({
        memory_value: memory.memory_value,
        importance: memory.importance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingMemory.id);

    if (updateError) {
      console.error('[saveMemory] Error updating memory:', updateError);
      throw new Error(`Failed to update memory: ${updateError.message}`);
    }
  } else {
    // Memory does not exist, insert new record
    const { error: insertError } = await supabase
      .from('character_user_memories')
      .insert({
        character_id: memory.character_id,
        user_id: memory.user_id,
        memory_key: memory.memory_key,
        memory_value: memory.memory_value,
        importance: memory.importance,
      });

    if (insertError) {
      console.error('[saveMemory] Error inserting memory:', insertError);
      throw new Error(`Failed to insert memory: ${insertError.message}`);
    }
  }
}

/**
 * Get or create a conversation
 * Checks if conversationId exists and validates ownership
 * If conversationId is not provided or doesn't exist, creates a new conversation
 * @param conversationId - Optional conversation UUID
 * @param userId - User UUID
 * @param characterId - Character UUID
 * @returns Conversation ID
 * @throws AuthorizationError if conversation doesn't belong to user
 * @throws Error if conversation creation fails
 */
export async function getOrCreateConversation(
  conversationId: string | undefined,
  userId: string,
  characterId: string
): Promise<string> {
  // If conversationId is provided, check if it exists and validate ownership
  if (conversationId) {
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (fetchError) {
      console.error('[getOrCreateConversation] Error fetching conversation:', fetchError);
      throw new Error(`Failed to fetch conversation: ${fetchError.message}`);
    }

    if (conversation) {
      // Conversation exists, validate ownership
      if (conversation.user_id !== userId) {
        throw new AuthorizationError(
          `Conversation ${conversationId} does not belong to user ${userId}`
        );
      }
      return conversationId;
    }
    // If conversation doesn't exist, fall through to create new one
  }

  // Create new conversation
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      character_id: characterId,
      is_active: true,
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[getOrCreateConversation] Error creating conversation:', createError);
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  if (!newConversation || !newConversation.id) {
    throw new Error('Failed to create conversation: No ID returned');
  }

  return newConversation.id;
}

/**
 * Update conversation timestamp
 * Updates the updated_at field of a conversation to current time
 * @param conversationId - Conversation UUID
 * @throws Error if update fails
 */
export async function updateConversationTimestamp(
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) {
    console.error('[updateConversationTimestamp] Error updating conversation:', error);
    throw new Error(`Failed to update conversation timestamp: ${error.message}`);
  }
}

/**
 * Extract memories from conversation content
 * Analyzes user and AI messages to identify key information points
 * Evaluates importance (1-10) and returns memory list
 * @param userMessage - User's message content
 * @param aiResponse - AI's response content
 * @param userContext - User context for personalization
 * @returns Array of memory inputs to be saved
 */
export function extractMemories(
  userMessage: string,
  aiResponse: string,
  userContext: UserContext
): MemoryInput[] {
  const memories: MemoryInput[] = [];
  
  // Combine user message and AI response for analysis
  const conversationText = `用户: ${userMessage}\nAI: ${aiResponse}`;
  
  // Extract personal information patterns
  const patterns = [
    // 兴趣爱好相关
    {
      regex: /(?:我|用户)(?:喜欢|爱好|热爱|感兴趣)(?:的是)?[：:]?\s*([^。，！？\n]{2,20})/g,
      keyPrefix: 'interest',
      importance: 7,
    },
    // 学习相关
    {
      regex: /(?:我|用户)(?:在学|正在学习|学过|擅长)[：:]?\s*([^。，！？\n]{2,20})/g,
      keyPrefix: 'learning',
      importance: 8,
    },
    // 困难/挑战
    {
      regex: /(?:我|用户)(?:不太会|不懂|困难|挑战|问题)[：:]?\s*([^。，！？\n]{2,20})/g,
      keyPrefix: 'challenge',
      importance: 9,
    },
    // 目标/计划
    {
      regex: /(?:我|用户)(?:想要|打算|计划|希望)[：:]?\s*([^。，！？\n]{2,20})/g,
      keyPrefix: 'goal',
      importance: 8,
    },
    // 家庭/朋友
    {
      regex: /(?:我的|用户的)(?:爸爸|妈妈|父母|家人|朋友|同学)[：:]?\s*([^。，！？\n]{2,20})/g,
      keyPrefix: 'relationship',
      importance: 6,
    },
    // 情绪状态
    {
      regex: /(?:我|用户)(?:感到|觉得|很|非常)(?:开心|高兴|难过|伤心|焦虑|紧张|兴奋)/g,
      keyPrefix: 'emotion',
      importance: 7,
    },
  ];

  // Extract memories based on patterns
  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.regex.exec(conversationText)) !== null) {
      const value = match[1]?.trim() || match[0].trim();
      
      if (value && value.length >= 2) {
        // Generate unique memory key
        const timestamp = Date.now();
        const memoryKey = `${pattern.keyPrefix}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
        
        memories.push({
          character_id: '', // Will be set by caller
          user_id: userContext.id,
          memory_key: memoryKey,
          memory_value: value,
          importance: pattern.importance,
        });
      }
    }
  });

  // Extract specific facts mentioned in user message
  // Look for statements like "我今年X岁", "我在X年级"
  const ageMatch = userMessage.match(/(?:我|用户)(?:今年)?(\d{1,2})岁/);
  if (ageMatch && ageMatch[1]) {
    const age = parseInt(ageMatch[1]);
    if (age !== userContext.age && age >= 5 && age <= 18) {
      memories.push({
        character_id: '',
        user_id: userContext.id,
        memory_key: `age_${Date.now()}`,
        memory_value: `用户${age}岁`,
        importance: 9,
      });
    }
  }

  const gradeMatch = userMessage.match(/(?:我|用户)(?:在|是|上)?([一二三四五六七八九十\d]+)年级/);
  if (gradeMatch && gradeMatch[1]) {
    const grade = gradeMatch[1];
    if (grade !== userContext.grade) {
      memories.push({
        character_id: '',
        user_id: userContext.id,
        memory_key: `grade_${Date.now()}`,
        memory_value: `用户在${grade}年级`,
        importance: 9,
      });
    }
  }

  // Limit to top 5 most important memories
  memories.sort((a, b) => b.importance - a.importance);
  return memories.slice(0, 5);
}
