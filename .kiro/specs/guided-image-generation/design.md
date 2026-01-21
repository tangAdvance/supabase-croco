# Design Document

## Overview

本设计文档描述了小鳄鱼助手的引导式图片生成功能。该功能将图片生成能力无缝集成到现有的聊天对话中，通过多轮对话引导孩子完成创作要素的收集（主题、风格、情感），最终生成符合其想象的图片。

核心设计理念：
- **对话式引导**：通过自然对话收集创作要素，而非表单填写
- **职责分离**：Edge Function 负责数据聚合，N8N 负责 AI 逻辑和异步任务
- **无状态设计**：利用对话历史作为状态，避免额外的状态管理表
- **异步生成**：图片生成不阻塞对话，用户体验流畅
- **实时通知**：通过 Supabase Realtime 自动推送生成结果

## Architecture

### 整体架构图

```
┌─────────────┐
│   客户端     │
│  (Flutter)  │
└──────┬──────┘
       │ POST /chat-handler
       │ {userId, characterId, conversationId, message: "确认，开始生成"}
       ↓
┌─────────────────────────────────────────────────┐
│         Supabase Edge Function                  │
│              (chat-handler)                     │
│                                                 │
│  1. 验证请求参数                                 │
│  2. 获取用户上下文                               │
│  3. 获取角色配置                                 │
│  4. 获取对话历史（包含图片生成上下文）            │
│  5. 聚合完整上下文                               │
└──────┬──────────────────────────────────────────┘
       │ POST /webhook/croco-chat
       │ {message, userId, conversationId, userProfile, 
       │  character, history}
       ↓
┌─────────────────────────────────────────────────┐
│              N8N Workflow                       │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ 1. 意图识别                               │  │
│  │    - 判断是否为图片生成意图               │  │
│  │    - 分析对话历史提取已收集信息           │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 2. 信息收集判断                           │  │
│  │    - 检查 Theme、Style、Emotion           │  │
│  │    - 判断是否完整                         │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 3. 分支处理                               │  │
│  │    ├─ 信息不完整 → 继续引导               │  │
│  │    └─ 信息完整 + 用户确认 → 生成图片      │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 4. 立即返回响应（不等待生成）             │  │
│  │    {response: "开始创作...",              │  │
│  │     intentType: "image_generation"}       │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │ 5. 异步分支（后台执行）                   │  │
│  │    ├─ 构建完整 Prompt                     │  │
│  │    ├─ 调用图片生成 API                    │  │
│  │    ├─ 等待生成完成                        │  │
│  │    └─ 插入 user_generated_images 表       │  │
│  └───────────────────────────────────────────┘  │
└──────┬──────────────────────────────────────────┘
       │ Response (立即返回)
       │ {response, intentType, mode}
       ↓
┌─────────────────────────────────────────────────┐
│         Supabase Edge Function                  │
│              (chat-handler)                     │
│                                                 │
│  6. 存储用户消息和 AI 响应                       │
│  7. 返回响应给客户端                             │
└──────┬──────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│  客户端 (Flutter)                               │
│  - 显示"AI 正在创作中..."                        │
│  - 订阅 Supabase Realtime                       │
└─────────────────────────────────────────────────┘

... 10-20 秒后（异步完成）...

┌─────────────────────────────────────────────────┐
│  N8N 异步分支完成                                │
│  - INSERT INTO user_generated_images            │
└──────┬──────────────────────────────────────────┘
       │
       ↓ (Supabase Realtime 自动推送)
┌─────────────────────────────────────────────────┐
│  客户端 (Flutter)                               │
│  - 收到 Realtime 通知                           │
│  - 显示生成的图片                                │
│  - 提供操作选项（保存/重新生成/收藏）            │
└─────────────────────────────────────────────────┘
```

### 数据流向

1. **意图识别阶段**: 客户端 → Edge Function → N8N → 识别图片生成意图
2. **信息收集阶段**: 多轮对话，N8N 引导收集 Theme、Style、Emotion
3. **确认阶段**: 用户确认 → N8N 立即返回响应
4. **异步生成阶段**: N8N 后台调用图片 API → 存储到数据库
5. **通知阶段**: Supabase Realtime → 客户端显示图片

## Components and Interfaces

### 1. N8N Workflow: Image Generation Handler

**职责**:
- 识别图片生成意图
- 分析对话历史提取已收集信息
- 引导用户收集创作要素
- 构建图片生成 Prompt
- 异步调用图片生成 API
- 存储生成结果到数据库

**输入接口** (继承现有 N8NRequest):
```typescript
interface N8NRequest {
  message: string;
  userId: string;
  conversationId: string;
  userProfile: UserProfile;
  character: Character;
  history: Message[];  // 包含 metadata 中的图片生成上下文
}
```

**输出接口** (扩展现有 N8NResponse):
```typescript
interface N8NResponse {
  response: string;
  intentType: string;  // 可以是 'image_generation'
  mode: string;
  // 不需要额外字段，异步处理在 N8N 内部完成
}
```

**Message Metadata 结构**:
```typescript
interface MessageMetadata {
  // 图片生成相关
  image_theme?: string;      // 主题描述
  image_style?: string;      // 风格选择
  image_emotion?: string;    // 情感选择
  image_details?: string[];  // 额外细节
}
```

### 2. Image Generation API Interface

**调用接口** (DALL-E 3 示例):
```typescript
interface ImageGenerationRequest {
  model: string;           // 'dall-e-3'
  prompt: string;          // 完整的生成提示词
  size: string;            // '1024x1024'
  quality: string;         // 'standard' | 'hd'
  n: number;              // 生成数量
}

interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url: string;           // 图片 URL
    revised_prompt?: string;
  }>;
}
```

### 3. Database: user_generated_images Table

**表结构**:
```typescript
interface UserGeneratedImage {
  id: string;                    // UUID
  user_id: string;               // 用户 ID
  character_id: string;          // 角色 ID
  conversation_id: string;       // 对话 ID
  image_url: string;             // 图片 URL
  thumbnail_url?: string;        // 缩略图 URL
  prompt: string;                // 生成提示词
  style: string;                 // 风格
  emotion: string;               // 情感
  user_description: string;      // 用户原始描述
  metadata: {
    model: string;               // 使用的模型
    generation_time: number;     // 生成耗时（秒）
    size: string;                // 图片尺寸
    api_provider: string;        // API 提供商
  };
  is_favorite: boolean;          // 是否收藏
  is_deleted: boolean;           // 是否删除
  created_at: string;            // 创建时间
  updated_at: string;            // 更新时间
}
```

### 4. Supabase Realtime Notification

**订阅配置**:
```typescript
interface RealtimeSubscription {
  channel: string;               // 'image-generation'
  event: 'INSERT';               // 监听插入事件
  schema: 'public';
  table: 'user_generated_images';
  filter: string;                // `user_id=eq.${userId}`
}

interface RealtimePayload {
  eventType: 'INSERT';
  new: UserGeneratedImage;       // 新插入的记录
  old: null;
  schema: 'public';
  table: 'user_generated_images';
}
```

## Data Models

### CreationContext (存储在 Message.metadata 中)

```typescript
interface CreationContext {
  theme: string;          // 主题："一只在太空飞的猫"
  style: string;          // 风格："storybook" | "pixel" | "anime" | "scifi"
  emotion: string;        // 情感："warm" | "mysterious" | "playful" | "calm"
  details: string[];      // 额外细节：["戴宇航帽", "背景有星星"]
}
```

### StylePreset (风格预设)

```typescript
interface StylePreset {
  id: string;                    // 'storybook'
  name: string;                  // '童话绘本风'
  description: string;           // '温暖柔和，像故事书里的插画'
  prompt_suffix: string;         // 'children\'s book illustration, watercolor'
  example_image_url?: string;    // 示例图片
  character_affinity?: string[]; // 适合的角色类型
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'storybook',
    name: '童话绘本风',
    description: '温暖柔和，像故事书里的插画',
    prompt_suffix: 'children\'s book illustration, watercolor, soft colors, whimsical',
  },
  {
    id: 'pixel',
    name: '像素游戏风',
    description: '复古可爱，像经典游戏',
    prompt_suffix: '8-bit pixel art, retro game style, vibrant colors',
  },
  {
    id: 'anime',
    name: '梦幻动漫风',
    description: '色彩流动，像宫崎骏的夏天',
    prompt_suffix: 'anime style, Studio Ghibli inspired, dreamy atmosphere, soft lighting',
  },
  {
    id: 'scifi',
    name: '科幻电影风',
    description: '酷炫逼真，像电影海报',
    prompt_suffix: 'sci-fi concept art, cinematic, detailed, futuristic, dramatic lighting',
  },
];
```

### EmotionPreset (情感预设)

```typescript
interface EmotionPreset {
  id: string;
  name: string;
  description: string;
  prompt_suffix: string;
  color_palette: string[];
}

const EMOTION_PRESETS: EmotionPreset[] = [
  {
    id: 'warm',
    name: '温暖快乐',
    description: '明亮的色彩，让人开心',
    prompt_suffix: 'warm lighting, cozy atmosphere, bright and cheerful, happy mood',
    color_palette: ['#FFD700', '#FFA500', '#FF6B6B'],
  },
  {
    id: 'mysterious',
    name: '神秘梦幻',
    description: '深邃的色调，充满想象',
    prompt_suffix: 'mysterious mood, deep colors, ethereal lighting, magical atmosphere',
    color_palette: ['#9B59B6', '#3498DB', '#1ABC9C'],
  },
  {
    id: 'playful',
    name: '活泼有趣',
    description: '鲜艳的颜色，充满活力',
    prompt_suffix: 'playful and fun, vibrant colors, dynamic composition, energetic',
    color_palette: ['#E74C3C', '#F39C12', '#2ECC71'],
  },
  {
    id: 'calm',
    name: '宁静深远',
    description: '柔和的色彩，让人放松',
    prompt_suffix: 'peaceful and serene, soft colors, gentle lighting, tranquil mood',
    color_palette: ['#95A5A6', '#BDC3C7', '#ECF0F1'],
  },
];
```

## Correctness Properties

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 意图识别准确性
*对于任何*包含图片生成关键词（"画"、"图片"、"生成"、"创作"）的用户消息，N8N Workflow 应该正确识别为 image_generation 意图，并在响应的 metadata 中标记 intent_type 为 'image_generation'。
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: 信息收集完整性
*对于任何*图片生成流程，在用户确认生成前，N8N Workflow 应该确保 Theme、Style、Emotion 三个要素都已收集，且存储在对话历史的 Message.metadata 中。
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: 对话历史状态一致性
*对于任何*图片生成会话，N8N Workflow 通过分析对话历史提取的 CreationContext 应该与最近消息的 metadata 中存储的信息一致。
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 4: 异步生成不阻塞
*对于任何*用户确认生成的请求，N8N Workflow 应该在 5 秒内返回"生成中"响应给 Edge Function，不等待图片生成完成，用户可以继续发送消息。
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 5: 图片记录存储完整性
*对于任何*成功生成的图片，N8N Workflow 应该在 user_generated_images 表中插入完整记录，包含 user_id、character_id、conversation_id、image_url、prompt、style、emotion、user_description 字段。
**Validates: Requirements 6.1, 6.3, 6.4**

### Property 6: Realtime 通知触发
*对于任何*插入到 user_generated_images 表的新记录，Supabase Realtime 应该自动推送通知给订阅该 user_id 的客户端。
**Validates: Requirements 6.2, 6.5**

### Property 7: 角色风格融合
*对于任何*图片生成请求，N8N Workflow 构建的 Image_Prompt 应该包含当前 Character 的 personality 或 tone 相关的描述词。
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 8: 确认前可修改
*对于任何*用户提出的修改请求（在确认前），N8N Workflow 应该更新对应的 CreationContext 字段，并重新展示汇总信息请求确认。
**Validates: Requirements 4.3, 4.4**

### Property 9: 生成失败不影响对话
*对于任何*图片生成 API 调用失败的情况，N8N Workflow 应该记录错误日志，但不阻塞用户的后续对话请求。
**Validates: Requirements 5.4, 9.1, 9.2, 9.3**

### Property 10: 用户数据隔离
*对于任何*用户查询图片的请求，系统应该只返回该 user_id 对应的 User_Generated_Image 记录，不返回其他用户的图片。
**Validates: Requirements 12.1, 12.2, 12.3**

### Property 11: 并发请求隔离
*对于任何*并发到达的图片生成请求，N8N Workflow 应该为每个请求创建独立的异步任务，不会互相干扰，每个图片记录应该关联到正确的 user_id 和 conversation_id。
**Validates: Requirements 11.1, 11.2, 11.3**

### Property 12: Prompt 构建一致性
*对于任何*相同的 CreationContext（Theme、Style、Emotion），N8N Workflow 构建的 Image_Prompt 应该包含对应的 StylePreset 和 EmotionPreset 的 prompt_suffix。
**Validates: Requirements 7.2**

## Error Handling

### 错误分类

1. **用户输入错误**
   - 意图不明确：无法判断是否想生成图片
   - 描述过于简单：Theme 信息不足

2. **API 调用错误**
   - 图片生成 API 超时（> 60 秒）
   - API 返回错误（如内容违规、配额不足）
   - 网络连接失败

3. **数据库错误**
   - 插入 user_generated_images 失败
   - Realtime 推送失败

### 错误处理策略

**1. 意图识别失败**
```typescript
// N8N Code Node
if (!isImageGenerationIntent(message)) {
  // 如果不确定，可以询问用户
  return {
    response: "你是想让我帮你画一张图吗？如果是的话，告诉我你想画什么！",
    intentType: "clarification",
    mode: "normal"
  };
}
```

**2. 信息收集不完整**
```typescript
// N8N Code Node
const context = extractCreationContext(history);

if (!context.theme) {
  return {
    response: "太好了！首先告诉我，你想画什么？",
    intentType: "image_generation",
    mode: "creative"
  };
}

if (!context.style) {
  return {
    response: "现在选择画风！你喜欢哪种风格？\n🎨 童话绘本风\n🎮 像素游戏风\n🌈 梦幻动漫风\n🎬 科幻电影风",
    intentType: "image_generation",
    mode: "creative"
  };
}

// ... 继续收集
```

**3. 图片生成 API 失败**
```typescript
// N8N HTTP Request Node - Error Handler
try {
  const response = await callImageAPI(prompt);
  return response;
} catch (error) {
  console.error('[ImageGen] API Error:', error);
  
  // 记录错误
  await logError({
    type: 'image_generation_api_error',
    userId: userId,
    conversationId: conversationId,
    error: error.message,
    prompt: prompt,
  });
  
  // 可选：通知用户（通过 Realtime 或下次对话）
  await notifyUserOfFailure(userId, conversationId);
  
  // 不抛出错误，不影响主流程
  return null;
}
```

**4. 数据库插入失败**
```typescript
// N8N Supabase Node - Error Handler
try {
  await supabase
    .from('user_generated_images')
    .insert(imageRecord);
} catch (error) {
  console.error('[ImageGen] DB Insert Error:', error);
  
  // 记录错误但不影响流程
  await logError({
    type: 'image_storage_error',
    userId: userId,
    imageUrl: imageUrl,
    error: error.message,
  });
}
```

### 降级策略

1. **API 不可用**: 返回友好提示，建议稍后重试
2. **生成超时**: 终止请求，记录日志，通知用户
3. **连续失败**: 3 次失败后发送告警，暂时禁用图片生成功能

## Testing Strategy

### 单元测试

使用 N8N 的测试功能和 Deno 测试框架：

1. **意图识别测试**
   - 测试各种图片生成意图的表达方式
   - 测试边界情况（如"画画"vs"画图"）
   - 测试非图片生成意图的过滤

2. **信息提取测试**
   - 测试从对话历史中提取 CreationContext
   - 测试 metadata 解析
   - 测试信息完整性判断

3. **Prompt 构建测试**
   - 测试不同 Style 和 Emotion 组合
   - 测试角色风格融合
   - 测试 Prompt 格式正确性

4. **数据库操作测试**
   - 测试图片记录插入
   - 测试查询和过滤
   - 测试软删除逻辑

### 集成测试

1. **端到端流程测试**
   - 测试完整的图片生成流程（意图识别 → 信息收集 → 确认 → 生成 → 通知）
   - 测试多轮对话收集信息
   - 测试用户修改信息

2. **N8N Workflow 测试**
   - 使用 N8N 的测试 webhook 测试各个节点
   - 测试异步分支执行
   - 测试错误处理

3. **Realtime 通知测试**
   - 测试 Supabase Realtime 推送
   - 测试客户端订阅和接收
   - 测试通知延迟

### 属性测试

使用 Deno 的 property-based testing 库（如 fast-check）：

1. **Property 1 测试**: 生成随机图片生成意图消息，验证识别准确性
2. **Property 2 测试**: 生成随机对话历史，验证信息提取完整性
3. **Property 3 测试**: 验证对话历史状态一致性
4. **Property 4 测试**: 测试异步生成响应时间 < 5 秒
5. **Property 5 测试**: 验证图片记录存储完整性
6. **Property 6 测试**: 验证 Realtime 通知触发
7. **Property 7 测试**: 验证角色风格融合
8. **Property 8 测试**: 测试修改和重新确认流程
9. **Property 9 测试**: 模拟 API 失败，验证不阻塞对话
10. **Property 10 测试**: 验证用户数据隔离
11. **Property 11 测试**: 测试并发请求隔离
12. **Property 12 测试**: 验证 Prompt 构建一致性

每个属性测试至少运行 100 次迭代。

## Implementation Notes

### N8N Workflow 实现要点

**1. 意图识别节点 (AI Agent / Code Node)**
- 使用正则表达式或 LLM 识别图片生成意图
- 关键词：画、图片、生成、创作、绘制、描绘
- 场景描述：识别具体的主题描述

**2. 信息提取节点 (Code Node)**
```javascript
function extractCreationContext(history) {
  const context = {
    theme: null,
    style: null,
    emotion: null,
    details: []
  };
  
  // 从最近的消息中提取
  for (const msg of history.slice(-10).reverse()) {
    if (msg.metadata?.image_theme && !context.theme) {
      context.theme = msg.metadata.image_theme;
    }
    if (msg.metadata?.image_style && !context.style) {
      context.style = msg.metadata.image_style;
    }
    if (msg.metadata?.image_emotion && !context.emotion) {
      context.emotion = msg.metadata.image_emotion;
    }
    if (msg.metadata?.image_details) {
      context.details.push(...msg.metadata.image_details);
    }
  }
  
  return context;
}
```

**3. Prompt 构建节点 (Code Node)**
```javascript
function buildImagePrompt(context, character) {
  const { theme, style, emotion } = context;
  
  // 获取风格和情感的 prompt suffix
  const stylePrompt = STYLE_PRESETS.find(s => s.id === style)?.prompt_suffix || '';
  const emotionPrompt = EMOTION_PRESETS.find(e => e.id === emotion)?.prompt_suffix || '';
  
  // 结合角色风格
  const characterStyle = character.personality || '';
  
  // 构建最终 prompt
  const prompt = `${theme}, ${stylePrompt}, ${emotionPrompt}, ${characterStyle}, high quality, detailed, professional, safe for children`;
  
  return prompt;
}
```

**4. 异步分支实现 (Split In Batches Node)**
- 使用 N8N 的 Split In Batches 节点实现异步
- 主分支立即返回响应
- 异步分支执行图片生成和存储

**5. HTTP Request 节点配置**
```json
{
  "method": "POST",
  "url": "https://api.openai.com/v1/images/generations",
  "authentication": "headerAuth",
  "headers": {
    "Authorization": "Bearer {{$env.OPENAI_API_KEY}}"
  },
  "body": {
    "model": "dall-e-3",
    "prompt": "={{$json.prompt}}",
    "size": "1024x1024",
    "quality": "standard",
    "n": 1
  },
  "timeout": 60000
}
```

**6. Supabase 节点配置**
```json
{
  "operation": "insert",
  "table": "user_generated_images",
  "data": {
    "user_id": "={{$json.userId}}",
    "character_id": "={{$json.characterId}}",
    "conversation_id": "={{$json.conversationId}}",
    "image_url": "={{$json.data[0].url}}",
    "prompt": "={{$json.prompt}}",
    "style": "={{$json.style}}",
    "emotion": "={{$json.emotion}}",
    "user_description": "={{$json.userDescription}}",
    "metadata": {
      "model": "dall-e-3",
      "generation_time": "={{$json.generationTime}}",
      "api_provider": "openai"
    }
  }
}
```

### Edge Function 修改

**无需修改 Edge Function 代码**！现有的 chat-handler 已经支持：
- 获取对话历史（包含 metadata）
- 传递给 N8N
- 存储响应消息

唯一需要确保的是 Message 的 metadata 字段能够存储 JSON 对象。

### 数据库迁移

**创建 user_generated_images 表**:
```sql
-- 创建表
CREATE TABLE user_generated_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) NOT NULL,
  character_id uuid REFERENCES characters(id) NOT NULL,
  conversation_id uuid REFERENCES conversations(id) NOT NULL,
  image_url text NOT NULL,
  thumbnail_url text,
  prompt text NOT NULL,
  style text NOT NULL,
  emotion text NOT NULL,
  user_description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 创建索引
CREATE INDEX idx_user_images_user_id ON user_generated_images(user_id);
CREATE INDEX idx_user_images_conversation ON user_generated_images(conversation_id);
CREATE INDEX idx_user_images_created_at ON user_generated_images(created_at DESC);
CREATE INDEX idx_user_images_not_deleted ON user_generated_images(user_id, is_deleted) WHERE is_deleted = false;

-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_generated_images;

-- 添加 RLS 策略
ALTER TABLE user_generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own images"
  ON user_generated_images FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert their own images"
  ON user_generated_images FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

CREATE POLICY "Users can update their own images"
  ON user_generated_images FOR UPDATE
  USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));
```

### 客户端实现要点

**1. 订阅 Realtime**:
```dart
void initImageGenerationListener() {
  _imageSubscription = supabase
    .channel('image-generation-${currentUserId}')
    .onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'user_generated_images',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'user_id',
        value: currentUserId,
      ),
      callback: _handleNewImage,
    )
    .subscribe();
}

void _handleNewImage(PostgresChangePayload payload) {
  final imageData = payload.newRecord as Map<String, dynamic>;
  
  // 显示生成完成的图片
  showImageDialog(
    imageUrl: imageData['image_url'],
    prompt: imageData['prompt'],
    onSave: () => _saveToGallery(imageData),
    onRegenerate: () => _regenerateImage(imageData),
    onFavorite: () => _toggleFavorite(imageData['id']),
  );
}
```

**2. 发送生成请求**:
```dart
Future<void> confirmImageGeneration() async {
  setState(() {
    _isGenerating = true;
  });
  
  // 发送确认消息
  await _chatService.sendMessage(
    userId: currentUserId,
    characterId: currentCharacterId,
    conversationId: currentConversationId,
    message: "确认，开始生成",
  );
  
  // 显示生成中 UI
  _showGeneratingIndicator();
}
```

**3. 查询历史图片**:
```dart
Future<List<UserGeneratedImage>> fetchUserImages({
  String? conversationId,
  bool favoritesOnly = false,
}) async {
  var query = supabase
    .from('user_generated_images')
    .select()
    .eq('user_id', currentUserId)
    .eq('is_deleted', false)
    .order('created_at', ascending: false);
  
  if (conversationId != null) {
    query = query.eq('conversation_id', conversationId);
  }
  
  if (favoritesOnly) {
    query = query.eq('is_favorite', true);
  }
  
  final response = await query;
  return (response as List)
    .map((json) => UserGeneratedImage.fromJson(json))
    .toList();
}
```

### 性能优化

1. **异步处理**: 图片生成不阻塞对话，用户体验流畅
2. **Realtime 推送**: 避免轮询，减少服务器负载
3. **索引优化**: 为常用查询字段创建索引
4. **缩略图**: 可选生成缩略图，加快列表加载
5. **CDN**: 图片存储使用 CDN 加速访问

### 安全考虑

1. **内容审核**: 在调用图片生成 API 前，检查 prompt 是否包含不当内容
2. **RLS 策略**: 确保用户只能访问自己的图片
3. **API 密钥**: 图片生成 API 密钥存储在 N8N 环境变量中
4. **配额限制**: 限制每个用户每天的生成次数
5. **存储隔离**: 图片按用户 ID 隔离存储
