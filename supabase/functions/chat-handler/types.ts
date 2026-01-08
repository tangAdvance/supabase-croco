// Type definitions for Chat Backend Architecture

// ============================================================================
// Request/Response Interfaces
// ============================================================================

export interface ChatRequest {
  userId: string;           // 用户 ID (UUID)
  characterId: string;      // 角色 ID (UUID)
  conversationId?: string;  // 会话 ID (UUID, 可选，为空则创建新会话)
  message: string;          // 用户消息内容
}

export interface ChatResponse {
  response: string;         // AI 回复内容
  intentType: string;       // 意图类型
  mode: string;            // 对话模式
  timestamp: string;       // 响应时间戳
  conversationId: string;  // 会话 ID
  messageId: string;       // 消息 ID
}

export interface ErrorResponse {
  error: string;           // 错误描述
  code: string;           // 错误代码
  details?: any;          // 详细信息（开发环境）
}

// ============================================================================
// N8N Workflow Interfaces
// ============================================================================

export interface N8NRequest {
  message: string;                    // 用户消息
  userId: string;                     // 用户 ID
  conversationId: string;             // 会话 ID
  userProfile: UserProfile;
  character: Character;
  history: HistoryMessage[];
}

export interface N8NResponse {
  response: string;        // AI 生成的回复
  intentType: string;      // 识别的意图类型
  mode: string;           // 使用的对话模式
  memories?: Array<{      // AI 提取的记忆（可选）
    memory_key: string;
    memory_value: string;
    importance: number;
  }>;
}

// ============================================================================
// User Context Interfaces
// ============================================================================

export interface UserContext {
  id: string;
  name: string;
  age: number;
  interests: string[];
  grade: string;
  avatar_url: string;
  profile: UserProfileItem[];
}

export interface UserProfile {
  age: number;                      // 年龄
  interests: string[];              // 兴趣爱好
  grade: string;                    // 年级
  name: string;                     // 姓名
  recentMemories: Memory[];         // 最近记忆
}

export interface UserProfileItem {
  key: string;
  value: string;
  importance: number;
}

// ============================================================================
// Character Interfaces
// ============================================================================

export interface Character {
  id: string;
  name: string;
  slug: string;
  personality: string;
  system_prompt: string;
  tone: string;
  expertise: string[];
  target_age_group: string[];
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  is_premium: boolean;
}

// ============================================================================
// Message Interfaces
// ============================================================================

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  character_id: string;
  role: 'user' | 'assistant';
  content: string;
  intent_type?: string;
  mode?: string;
  metadata?: Record<string, any>;
  tokens_used?: number;
  created_at: string;
}

export interface MessageInput {
  conversation_id: string;
  user_id: string;
  character_id: string;
  role: 'user' | 'assistant';
  content: string;
  intent_type?: string;
  mode?: string;
  metadata?: Record<string, any>;
  tokens_used?: number;
}

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Memory Interfaces
// ============================================================================

export interface Memory {
  id: string;
  character_id: string;
  user_id: string;
  memory_key: string;
  memory_value: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryInput {
  character_id: string;
  user_id: string;
  memory_key: string;
  memory_value: string;
  importance: number;
}

// ============================================================================
// Conversation Interfaces
// ============================================================================

export interface Conversation {
  id: string;
  user_id: string;
  character_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationInput {
  user_id: string;
  character_id: string;
  is_active: boolean;
}

// ============================================================================
// Context and Utility Types
// ============================================================================

export interface RequestContext {
  userId: string;
  conversationId?: string;
  characterId: string;
  message: string;
}

export interface AggregatedContext {
  userContext: UserContext;
  character: Character;
  history: HistoryMessage[];
  memories: Memory[];
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
