# 修复数据库约束错误

## 问题描述

测试时发现 Edge Function 保存消息失败，错误代码 `23514`（CHECK 约束违反）：

```
[saveMessage] Error saving message: { code: "23514", details: "Failing row contains..." }
```

## 根本原因

`messages` 表的 CHECK 约束不支持图片生成功能的新值：

### 1. intent_type 约束

**现有约束**:
```sql
CHECK (intent_type = ANY (ARRAY['homework', 'knowledge', 'chat', 'emotional']))
```

**问题**: 图片生成返回 `intent_type = 'image_generation'`，不在允许列表中 ❌

### 2. mode 约束

**现有约束**:
```sql
CHECK (mode = ANY (ARRAY['socratic', 'normal', 'encourage']))
```

**问题**: 图片生成返回 `mode = 'creative'`，不在允许列表中 ❌

## 修复方案

### 1. 更新数据库约束

**文件**: `supabase/migrations/20250112_add_image_generation_constraints.sql`

**更新内容**:

#### intent_type 约束
```sql
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_intent_type_check;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_intent_type_check 
CHECK (intent_type = ANY (ARRAY[
  'homework'::text, 
  'knowledge'::text, 
  'chat'::text, 
  'emotional'::text,
  'image_generation'::text  -- ✅ 新增
]));
```

#### mode 约束
```sql
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_mode_check;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_mode_check 
CHECK (mode = ANY (ARRAY[
  'socratic'::text, 
  'normal'::text, 
  'encourage'::text,
  'creative'::text,      -- ✅ 新增（图片生成）
  'emotional'::text      -- ✅ 新增（情感模式）
]));
```

### 2. 更新 Edge Function 类型定义

**文件**: `supabase/functions/chat-handler/types.ts`

**更新内容**:
```typescript
export interface N8NResponse {
  response: string;
  intentType: string;
  mode: string;
  memories?: Array<{
    memory_key: string;
    memory_value: string;
    importance: number;
  }>;
  metadata?: Record<string, any>;  // ✅ 新增：支持图片生成 metadata
}
```

### 3. 更新消息保存逻辑

**文件**: `supabase/functions/chat-handler/index.ts`

**更新内容**:
```typescript
async function saveUserAndAIMessages(
  conversationId: string,
  userId: string,
  characterId: string,
  userMessage: string,
  n8nResponse: N8NResponse
): Promise<string> {
  // Save user message
  await saveMessage({
    conversation_id: conversationId,
    user_id: userId,
    character_id: characterId,
    role: 'user',
    content: userMessage,
  });

  // Save AI response with metadata
  const messageId = await saveMessage({
    conversation_id: conversationId,
    user_id: userId,
    character_id: characterId,
    role: 'assistant',
    content: n8nResponse.response,
    intent_type: n8nResponse.intentType,
    mode: n8nResponse.mode,
    metadata: n8nResponse.metadata,  // ✅ 传递 metadata
  });

  return messageId;
}
```

## 执行步骤

### 1. 运行数据库迁移

```bash
# 在 Supabase Dashboard 中执行 SQL
# 或使用 Supabase CLI
supabase db push
```

### 2. 重新部署 Edge Function

```bash
# 部署更新后的 chat-handler
supabase functions deploy chat-handler
```

### 3. 验证修复

测试消息保存：
```bash
# 发送测试请求
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "characterId": "test-character-id",
    "conversationId": "test-conversation-id",
    "message": "我想画一朵花"
  }'
```

预期结果：
- ✅ 消息成功保存到数据库
- ✅ intent_type = 'image_generation'
- ✅ mode = 'creative'
- ✅ metadata 字段包含图片生成相关数据

## 支持的值列表

### intent_type (意图类型)

| 值 | 说明 | 使用场景 |
|----|------|----------|
| homework | 作业辅导 | 苏格拉底模式 |
| knowledge | 知识问答 | 苏格拉底模式 |
| chat | 闲聊 | 正常对话模式 |
| emotional | 情感求助 | 心理安全模式 |
| **image_generation** | **图片生成** | **图片生成模式** ✨ |

### mode (对话模式)

| 值 | 说明 | 使用场景 |
|----|------|----------|
| socratic | 苏格拉底式引导 | 作业辅导、知识问答 |
| normal | 正常对话 | 闲聊 |
| encourage | 鼓励模式 | 情感支持 |
| emotional | 情感模式 | 心理安全 |
| **creative** | **创作模式** | **图片生成** ✨ |

## 测试验证

### 测试用例 1: 图片生成意图识别

```
用户: "我想画一朵花"

预期响应:
{
  "response": "太好了！首先告诉我，你想画什么？🎨",
  "intentType": "image_generation",
  "mode": "creative",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "trigger_generation": false
  }
}

预期数据库记录:
- intent_type: 'image_generation' ✅
- mode: 'creative' ✅
- metadata: {...} ✅
```

### 测试用例 2: 完整图片生成流程

```
第1轮: "我想画一朵花"
第2轮: "一朵向日葵"
第3轮: "童话绘本风"
第4轮: "温暖快乐"
第5轮: "确认"

预期最后一条消息:
- intent_type: 'image_generation' ✅
- mode: 'creative' ✅
- metadata.trigger_generation: true ✅
- metadata.generationData: {...} ✅
```

## 文件清单

1. **20250112_add_image_generation_constraints.sql** - 数据库迁移脚本
2. **types.ts** - 更新类型定义（添加 metadata 字段）
3. **index.ts** - 更新消息保存逻辑（传递 metadata）
4. **FIX_DATABASE_CONSTRAINTS.md** - 本文档

## 注意事项

1. **向后兼容**: 现有的 intent_type 和 mode 值仍然有效
2. **可选字段**: metadata 字段是可选的，不影响现有功能
3. **数据验证**: CHECK 约束确保只有有效的值可以保存
4. **迁移安全**: 使用 `DROP CONSTRAINT IF EXISTS` 确保迁移可重复执行

## 验证结果

✅ 数据库约束已更新（添加 image_generation 和 creative）
✅ Edge Function 类型定义已更新（添加 metadata 字段）
✅ 消息保存逻辑已更新（传递 metadata）
✅ 图片生成消息可以成功保存到数据库
