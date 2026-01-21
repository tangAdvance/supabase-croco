# Chat Handler Edge Function API 文档

## 概述

Chat Handler 是一个 Supabase Edge Function，用于处理用户与 AI 角色的对话请求。它负责聚合用户上下文、角色信息、对话历史和记忆，然后调用 N8N 工作流生成 AI 回复。

## Edge Functions 列表

### 1. Chat Handler

**函数名称**: `chat-handler`

**端点路径**: 
```
POST https://<project-ref>.supabase.co/functions/v1/chat-handler
```

**功能描述**:
- 处理用户与 AI 角色的对话请求
- 聚合用户上下文、角色信息、对话历史和记忆
- 调用 N8N 工作流生成 AI 回复
- 保存消息和提取的记忆到数据库
- 支持多种意图类型（闲聊、学习、图片生成等）

---

## API 详细说明

### 请求格式

#### Headers
```http
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>
```

#### Request Body

```typescript
{
  "userId": string,           // 用户 ID (UUID) - 必填
  "characterId": string,      // 角色 ID (UUID) - 必填
  "conversationId"?: string,  // 会话 ID (UUID) - 可选，为空则创建新会话
  "message": string           // 用户消息内容 - 必填
}
```

**字段说明**:
- `userId`: 用户的唯一标识符，必须是有效的 UUID
- `characterId`: AI 角色的唯一标识符，必须是有效的 UUID
- `conversationId`: 会话的唯一标识符（可选）
  - 如果提供，将继续现有会话
  - 如果为空或不提供，将创建新会话
- `message`: 用户发送的消息内容，不能为空

---

### 响应格式

#### 成功响应 (200 OK)

```typescript
{
  "response": string,         // AI 回复内容
  "intentType": string,       // 意图类型
  "mode": string,            // 对话模式
  "timestamp": string,       // 响应时间戳 (ISO 8601)
  "conversationId": string,  // 会话 ID (UUID)
  "messageId": string        // 消息 ID (UUID)
}
```

**字段说明**:
- `response`: AI 生成的回复文本
- `intentType`: 识别的意图类型，可能的值：
  - `chat`: 普通闲聊
  - `learning`: 学习相关
  - `image_generation`: 图片生成请求
  - `story`: 故事讲述
  - `game`: 游戏互动
  - `unknown`: 未识别的意图
- `mode`: 对话模式，可能的值：
  - `normal`: 普通模式
  - `educational`: 教育模式
  - `creative`: 创意模式
- `timestamp`: 响应生成的时间戳
- `conversationId`: 当前会话的 ID
- `messageId`: AI 回复消息的 ID

#### 错误响应 (4xx/5xx)

```typescript
{
  "error": string,    // 错误描述
  "code": string,     // 错误代码
  "details"?: any     // 详细信息（仅开发环境）
}
```

**常见错误代码**:
- `VALIDATION_ERROR`: 请求参数验证失败
- `NOT_FOUND`: 用户或角色不存在
- `AUTHORIZATION_ERROR`: 授权失败
- `N8N_ERROR`: N8N 工作流调用失败
- `DATABASE_ERROR`: 数据库操作失败
- `INTERNAL_ERROR`: 内部服务器错误

---

## 请求/响应示例

### 示例 1: 普通对话

**请求**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "characterId": "987fcdeb-51a2-43f7-b123-456789abcdef",
    "conversationId": "456e7890-e12b-34d5-a678-901234567890",
    "message": "你好，今天天气怎么样？"
  }'
```

**响应**:
```json
{
  "response": "你好！今天天气很不错呢，阳光明媚，适合出去玩耍。你有什么计划吗？",
  "intentType": "chat",
  "mode": "normal",
  "timestamp": "2026-01-12T10:30:00.000Z",
  "conversationId": "456e7890-e12b-34d5-a678-901234567890",
  "messageId": "789a0123-b45c-67d8-e901-234567890abc"
}
```

---

### 示例 2: 学习相关对话

**请求**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "characterId": "987fcdeb-51a2-43f7-b123-456789abcdef",
    "message": "什么是光合作用？"
  }'
```

**响应**:
```json
{
  "response": "光合作用是植物利用阳光、水和二氧化碳制造食物的过程。就像植物的厨房一样，它们用阳光作为能量，把水和空气中的二氧化碳变成糖分，同时释放出氧气。这个过程主要发生在叶子里的叶绿体中。",
  "intentType": "learning",
  "mode": "educational",
  "timestamp": "2026-01-12T10:35:00.000Z",
  "conversationId": "abc12345-def6-7890-ghij-klmnopqrstuv",
  "messageId": "def67890-abc1-2345-6789-0abcdef12345"
}
```

---

### 示例 3: 图片生成请求

**请求**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "characterId": "987fcdeb-51a2-43f7-b123-456789abcdef",
    "conversationId": "456e7890-e12b-34d5-a678-901234567890",
    "message": "帮我画一只可爱的小猫咪"
  }'
```

**响应**:
```json
{
  "response": "好的！我正在为你画一只可爱的小猫咪，请稍等片刻...",
  "intentType": "image_generation",
  "mode": "creative",
  "timestamp": "2026-01-12T10:40:00.000Z",
  "conversationId": "456e7890-e12b-34d5-a678-901234567890",
  "messageId": "ghi78901-jkl2-3456-7890-mnopqrstuvwx"
}
```

**注意**: 图片生成是异步操作，实际图片会通过 Supabase Realtime 推送到客户端。

---

### 示例 4: 创建新会话

**请求** (不提供 conversationId):
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "characterId": "987fcdeb-51a2-43f7-b123-456789abcdef",
    "message": "你好！"
  }'
```

**响应**:
```json
{
  "response": "你好！很高兴认识你！我是小鳄鱼，有什么可以帮助你的吗？",
  "intentType": "chat",
  "mode": "normal",
  "timestamp": "2026-01-12T10:45:00.000Z",
  "conversationId": "new-conv-id-1234-5678-90ab-cdef12345678",
  "messageId": "msg-id-abcd-efgh-ijkl-mnopqrstuvwx"
}
```

---

### 示例 5: 错误响应 - 验证失败

**请求** (缺少必填字段):
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "message": "你好"
  }'
```

**响应** (400 Bad Request):
```json
{
  "error": "Missing required field: characterId",
  "code": "VALIDATION_ERROR"
}
```

---

### 示例 6: 错误响应 - 用户不存在

**请求**:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000000",
    "characterId": "987fcdeb-51a2-43f7-b123-456789abcdef",
    "message": "你好"
  }'
```

**响应** (404 Not Found):
```json
{
  "error": "User not found",
  "code": "NOT_FOUND"
}
```

---

## 内部处理流程

### 1. 请求验证
- 验证请求体格式
- 验证必填字段
- 验证 UUID 格式

### 2. 数据聚合（并行查询）
- 获取或创建会话
- 获取用户上下文（年龄、兴趣、年级等）
- 获取角色信息（性格、系统提示词等）
- 获取对话历史（最近 10 条）
- 获取角色记忆（最近 5 条）

### 3. 调用 N8N 工作流
- 将聚合的数据发送到 N8N
- N8N 处理意图识别、AI 生成等
- 超时时间：30 秒

### 4. 异步后处理
- 保存用户消息
- 保存 AI 回复
- 提取并保存记忆
- 更新会话时间戳

### 5. 返回响应
- 构建响应对象
- 返回给客户端

---

## 性能优化

- **并行查询**: 用户上下文、角色信息、历史和记忆并行获取
- **异步处理**: 记忆提取和会话更新不阻塞响应
- **连接池**: 使用数据库连接池提高性能
- **超时控制**: N8N 调用设置 30 秒超时

---

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `N8N_WEBHOOK_URL` | N8N 工作流 Webhook URL | 是 |
| `SUPABASE_URL` | Supabase 项目 URL | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | 是 |

---

## 相关文档

- [部署指南](./DEPLOYMENT.md)
- [环境变量配置](./ENV_VARIABLES.md)
- [性能优化](./PERFORMANCE_OPTIMIZATION.md)
- [快速部署](./QUICK_DEPLOY.md)

---

## 版本历史

- **v1.0** (2026-01-12): 初始版本
  - 基础对话功能
  - 意图识别
  - 记忆提取
  - 图片生成支持
