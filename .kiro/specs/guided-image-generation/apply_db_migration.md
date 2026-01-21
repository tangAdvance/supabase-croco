# 手动应用数据库迁移

由于 `supabase db push` 连接问题，请手动在 Supabase Dashboard 中执行以下 SQL。

## 步骤

### 1. 登录 Supabase Dashboard

访问: https://supabase.com/dashboard/project/riwghatatpylyrejmlvi

### 2. 打开 SQL Editor

在左侧菜单中选择 "SQL Editor"

### 3. 执行迁移 SQL

复制并执行以下 SQL：

```sql
-- Migration: Add image_generation intent_type and creative mode to messages table
-- This migration updates the CHECK constraints to support the guided image generation feature

-- ============================================================================
-- Update intent_type constraint to include 'image_generation'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_intent_type_check;

-- Add the new constraint with 'image_generation' included
ALTER TABLE public.messages 
ADD CONSTRAINT messages_intent_type_check 
CHECK (intent_type = ANY (ARRAY[
  'homework'::text, 
  'knowledge'::text, 
  'chat'::text, 
  'emotional'::text,
  'image_generation'::text  -- New: for guided image generation
]));

-- ============================================================================
-- Update mode constraint to include 'creative'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_mode_check;

-- Add the new constraint with 'creative' included
ALTER TABLE public.messages 
ADD CONSTRAINT messages_mode_check 
CHECK (mode = ANY (ARRAY[
  'socratic'::text, 
  'normal'::text, 
  'encourage'::text,
  'creative'::text,      -- New: for guided image generation
  'emotional'::text      -- Also add emotional mode for consistency
]));

-- ============================================================================
-- Add comment to document the changes
-- ============================================================================

COMMENT ON CONSTRAINT messages_intent_type_check ON public.messages IS 
'Allowed intent types: homework, knowledge, chat, emotional, image_generation';

COMMENT ON CONSTRAINT messages_mode_check ON public.messages IS 
'Allowed modes: socratic, normal, encourage, creative, emotional';
```

### 4. 验证迁移

执行以下查询验证约束已更新：

```sql
-- 查看 messages 表的约束
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.messages'::regclass 
AND conname IN ('messages_intent_type_check', 'messages_mode_check');
```

预期结果应该包含：
- `messages_intent_type_check`: 包含 `'image_generation'`
- `messages_mode_check`: 包含 `'creative'` 和 `'emotional'`

### 5. 测试

发送测试消息验证修复：

```bash
curl -X POST https://riwghatatpylyrejmlvi.supabase.co/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "test-user-id",
    "characterId": "test-character-id",
    "conversationId": "test-conversation-id",
    "message": "我想画一朵花"
  }'
```

预期：
- ✅ 消息成功保存
- ✅ 无 23514 约束错误
- ✅ 返回图片生成响应

## 完成！

数据库迁移和 Edge Function 部署都已完成。
