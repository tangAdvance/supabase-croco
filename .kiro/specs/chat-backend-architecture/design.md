# Design Document

## Overview

本设计文档描述了小鳄鱼助手聊天后端的架构改进方案。核心思想是**职责分离**：Supabase 边缘函数负责数据层和业务逻辑，n8n 工作流专注于 AI 编排。这种设计提高了系统的可维护性、可测试性和扩展性。

## Architecture

### 整体架构图

```
┌─────────────┐
│   客户端     │
│  (Flutter)  │
└──────┬──────┘
       │ POST /chat-handler
       │ {userId, characterId, conversationId, message}
       ↓
┌─────────────────────────────────────────────────┐
│         Supabase Edge Function                  │
│              (chat-handler)                     │
│                                                 │
│  1. 验证请求参数                                 │
│  2. 获取用户上下文 (users + user_profile)        │
│  3. 获取角色配置 (characters)                    │
│  4. 获取对话历史 (messages, 最近10条)            │
│  5. 获取角色记忆 (character_user_memories)      │
│  6. 聚合完整上下文                               │
└──────┬──────────────────────────────────────────┘
       │ POST /webhook/croco-chat
       │ {message, userId, conversationId, userProfile, 
       │  character, history, memories}
       ↓
┌─────────────────────────────────────────────────┐
│              N8N Workflow                       │
│                                                 │
│  1. 意图识别 (AI Agent)                         │
│  2. 模式选择 (Switch)                           │
│  3. Prompt 构建 (Code Node)                     │
│  4. LLM 调用 (DeepSeek)                         │
│  5. 响应格式化                                   │
└──────┬──────────────────────────────────────────┘
       │ Response
       │ {response, intentType, mode}
       ↓
┌─────────────────────────────────────────────────┐
│         Supabase Edge Function                  │
│              (chat-handler)                     │
│                                                 │
│  7. 存储用户消息 (messages)                      │
│  8. 存储 AI 响应 (messages)                      │
│  9. 提取并存储记忆 (character_user_memories)    │
│  10. 更新会话时间戳 (conversations)              │
│  11. 返回响应给客户端                            │
└─────────────────────────────────────────────────┘
```

### 数据流向

1. **请求阶段**: 客户端 → Edge Function → 数据库（读取）
2. **AI 处理阶段**: Edge Function → N8N → LLM
3. **响应阶段**: N8N → Edge Function → 数据库（写入）→ 客户端

## Components and Interfaces

### 1. Edge Function: chat-handler

**职责**:
- API 网关和请求验证
- 数据库交互（读取和写入）
- 业务逻辑（会话管理、记忆提取）
- 错误处理和日志记录

**输入接口**:
```typescript
interface ChatRequest {
  userId: string;           // 用户 ID (UUID)
  characterId: string;      // 角色 ID (UUID)
  conversationId?: string;  // 会话 ID (UUID, 可选，为空则创建新会话)
  message: string;          // 用户消息内容
}
```

**输出接口**:
```typescript
interface ChatResponse {
  response: string;         // AI 回复内容
  intentType: string;       // 意图类型
  mode: string;            // 对话模式
  timestamp: string;       // 响应时间戳
  conversationId: string;  // 会话 ID
  messageId: string;       // 消息 ID
}
```

**错误响应**:
```typescript
interface ErrorResponse {
  error: string;           // 错误描述
  code: string;           // 错误代码
  details?: any;          // 详细信息（开发环境）
}
```

### 2. N8N Workflow Context Interface

**输入接口**:
```typescript
interface N8NRequest {
  message: string;                    // 用户消息
  userId: string;                     // 用户 ID
  conversationId: string;             // 会话 ID
  userProfile: {
    age: number;                      // 年龄
    interests: string[];              // 兴趣爱好
    grade: string;                    // 年级
    name: string;                     // 姓名
    recentMemories: Array<{           // 最近记忆
      key: string;
      value: string;
      importance: number;
    }>;
  };
  character: {
    name: string;                     // 角色名称
    personality: string;              // 性格描述
    system_prompt: string;            // 系统提示词
    tone: string;                     // 语气
    expertise: string[];              // 专长领域
    target_age_group: string[];       // 目标年龄段
  };
  history: Array<{                    // 对话历史
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

**输出接口**:
```typescript
interface N8NResponse {
  response: string;        // AI 生成的回复
  intentType: string;      // 识别的意图类型
  mode: string;           // 使用的对话模式
}
```

### 3. Database Query Functions

**getUserContext**:
```typescript
async function getUserContext(userId: string): Promise<UserContext> {
  // 查询 users 表和 user_profile 表
  // 返回用户画像信息
}
```

**getCharacter**:
```typescript
async function getCharacter(characterId: string): Promise<Character> {
  // 查询 characters 表
  // 验证角色是否激活
  // 返回角色配置
}
```

**getConversationHistory**:
```typescript
async function getConversationHistory(
  conversationId: string, 
  limit: number = 10
): Promise<Message[]> {
  // 查询 messages 表
  // 按时间倒序，取最近 N 条
  // 返回消息列表
}
```

**getCharacterMemories**:
```typescript
async function getCharacterMemories(
  characterId: string,
  userId: string,
  limit: number = 5
): Promise<Memory[]> {
  // 查询 character_user_memories 表
  // 按 importance 降序排序
  // 返回记忆列表
}
```

**saveMessage**:
```typescript
async function saveMessage(message: MessageInput): Promise<string> {
  // 插入 messages 表
  // 返回消息 ID
}
```

**saveMemory**:
```typescript
async function saveMemory(memory: MemoryInput): Promise<void> {
  // 插入或更新 character_user_memories 表
}
```

## Data Models

### UserContext
```typescript
interface UserContext {
  id: string;
  name: string;
  age: number;
  interests: string[];
  grade: string;
  avatar_url: string;
  profile: Array<{
    key: string;
    value: string;
    importance: number;
  }>;
}
```

### Character
```typescript
interface Character {
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
```

### Message
```typescript
interface Message {
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
```

### Memory
```typescript
interface Memory {
  id: string;
  character_id: string;
  user_id: string;
  memory_key: string;
  memory_value: string;
  importance: number;
  created_at: string;
  updated_at: string;
}
```

## Correctness Properties

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 上下文数据完整性
*对于任何*聊天请求，Edge Function 应该从数据库获取完整的用户上下文（users + user_profile）、角色配置（characters）、对话历史（最近 10 条 messages）和角色记忆（最多 5 条 character_user_memories），并将这些数据完整传递给 N8N Workflow。
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 10.1, 10.2**

### Property 2: 消息存储完整性
*对于任何*成功的聊天请求，用户消息和 AI 响应都应该被正确存储到 messages 表中，且包含完整的元数据（intent_type、mode、tokens_used），同时会话的 updated_at 时间戳应该被更新。
**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

### Property 3: 参数验证
*对于任何*缺少必需参数（userId、characterId、message）或参数格式错误的请求，系统应该返回 400 错误和详细的错误信息，不进行任何数据库操作。
**Validates: Requirements 5.2, 5.3**

### Property 4: 会话归属验证
*对于任何*包含 conversationId 的请求，如果该会话不属于请求的 userId，系统应该返回 403 错误，不允许访问或修改该会话。
**Validates: Requirements 6.3, 6.4**

### Property 5: 角色状态验证
*对于任何*请求的 characterId，如果角色不存在应该返回 404 错误，如果角色未激活（is_active=false）应该返回 403 错误，只有激活的角色才能被使用。
**Validates: Requirements 9.2, 9.3**

### Property 6: 异步操作不阻塞主流程
*对于任何*聊天请求，即使消息存储、记忆提取或会话更新等异步操作失败，系统仍应该返回 AI 响应给客户端，不阻塞主流程。
**Validates: Requirements 3.4, 4.5, 8.3, 8.4**

### Property 7: 记忆去重和更新
*对于任何*新提取的记忆，如果 memory_key 已存在于同一 character_id 和 user_id 组合下，系统应该更新 updated_at 时间戳而不是创建新记录，且所有记忆的 importance 值应该在 1-10 范围内。
**Validates: Requirements 4.2, 4.3, 4.4**

### Property 8: 响应格式一致性
*对于任何*成功的聊天请求，返回的响应应该包含 response、intentType、mode、timestamp、conversationId、messageId 字段，且格式符合 ChatResponse 接口定义。
**Validates: Requirements 5.4**

### Property 9: 新会话创建
*对于任何*conversationId 为空或不存在的请求，系统应该创建新的 Conversation 记录，设置正确的 user_id、character_id，并将 is_active 设为 true。
**Validates: Requirements 6.1, 6.2**

### Property 10: 并发请求隔离
*对于任何*并发到达的聊天请求，每个请求应该独立处理，不会互相干扰，每个请求的消息和记忆应该正确关联到对应的用户和会话。
**Validates: Requirements 8.5**

### Property 11: 用户数据默认值
*对于任何*用户信息不完整的情况（如 age、interests、grade 缺失），系统应该使用合理的默认值（age=10, interests=[], grade='未知'），确保 N8N Workflow 能正常处理。
**Validates: Requirements 10.4**

### Property 12: N8N 响应格式验证
*对于任何*从 N8N Workflow 返回的响应，应该包含 response、intentType、mode 字段，如果字段缺失，Edge Function 应该使用默认值或返回错误。
**Validates: Requirements 2.6**

## Error Handling

### 错误分类

1. **客户端错误 (4xx)**
   - 400 Bad Request: 参数缺失或格式错误
   - 403 Forbidden: 权限不足（会话不属于用户、付费角色未授权）
   - 404 Not Found: 资源不存在（角色、用户、会话）

2. **服务端错误 (5xx)**
   - 500 Internal Server Error: 数据库错误、N8N 调用失败
   - 503 Service Unavailable: N8N 服务不可用
   - 504 Gateway Timeout: N8N 调用超时

### 错误处理策略

```typescript
// 统一错误处理函数
function handleError(error: Error, context: RequestContext): Response {
  // 记录错误日志
  console.error('[ChatHandler Error]', {
    error: error.message,
    stack: error.stack,
    context: {
      userId: context.userId,
      conversationId: context.conversationId,
      timestamp: new Date().toISOString()
    }
  });

  // 根据错误类型返回不同响应
  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'VALIDATION_ERROR'
      }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (error instanceof AuthorizationError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'AUTHORIZATION_ERROR'
      }),
      { status: 403, headers: corsHeaders }
    );
  }

  // 默认返回 500
  return new Response(
    JSON.stringify({
      error: '服务暂时不可用，请稍后重试',
      code: 'INTERNAL_ERROR'
    }),
    { status: 500, headers: corsHeaders }
  );
}
```

### 降级策略

1. **N8N 调用失败**: 返回友好错误信息，不存储消息
2. **消息存储失败**: 记录错误日志，但仍返回 AI 响应给用户
3. **记忆提取失败**: 记录错误日志，不影响主流程

## Testing Strategy

### 单元测试

使用 Deno 的测试框架测试各个函数：

1. **数据查询函数测试**
   - 测试 getUserContext 正确返回用户信息
   - 测试 getCharacter 正确验证角色状态
   - 测试 getConversationHistory 正确排序和限制数量
   - 测试 getCharacterMemories 按重要性排序

2. **数据写入函数测试**
   - 测试 saveMessage 正确存储消息
   - 测试 saveMemory 正确处理新增和更新

3. **错误处理测试**
   - 测试参数验证逻辑
   - 测试各种错误场景的响应格式

### 集成测试

1. **端到端流程测试**
   - 测试完整的聊天流程（请求 → 数据库 → N8N → 响应）
   - 测试新会话创建流程
   - 测试会话归属验证

2. **N8N 集成测试**
   - 测试 N8N webhook 调用
   - 测试 N8N 响应解析

### 属性测试

使用 Deno 的 property-based testing 库（如 fast-check）：

1. **Property 1 测试**: 生成随机聊天请求，验证消息存储完整性
2. **Property 2 测试**: 验证上下文数据一致性
3. **Property 3 测试**: 生成随机会话 ID，验证归属检查
4. **Property 4 测试**: 生成各种无效参数组合，验证错误响应
5. **Property 5 测试**: 测试各种角色状态组合
6. **Property 6 测试**: 模拟异步操作失败，验证不阻塞主流程
7. **Property 7 测试**: 生成重复记忆，验证去重逻辑
8. **Property 8 测试**: 验证所有成功响应的格式一致性

每个属性测试至少运行 100 次迭代。

## Implementation Notes

### N8N Workflow 改进要点

1. **移除数据库查询节点**: N8N 不再直接查询 Supabase
2. **简化 Prompt 构建**: 使用 Edge Function 传递的完整上下文
3. **保留核心 AI 逻辑**: 意图识别、模式选择、LLM 调用
4. **优化内存管理**: 使用 Simple Memory 节点管理对话上下文

### Edge Function 性能优化

1. **并行查询**: 使用 Promise.all 并行查询用户、角色、历史、记忆
2. **连接池**: 复用 Supabase 客户端连接
3. **异步写入**: 消息存储和记忆提取使用异步方式
4. **超时控制**: N8N 调用设置 30 秒超时

### 安全考虑

1. **参数验证**: 严格验证所有输入参数
2. **SQL 注入防护**: 使用 Supabase 的参数化查询
3. **权限验证**: 验证用户对会话的访问权限
4. **敏感信息**: 不在日志中记录消息内容
