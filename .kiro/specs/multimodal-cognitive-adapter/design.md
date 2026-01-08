# 多模态认知适配器 - 设计文档

## Overview

本设计文档描述了小鳄鱼助手的多模态认知适配器架构。核心思想是**年龄分层适配**：根据用户年龄阶段（6-9岁、10-12岁、13-15岁）自动调整所有模态的输出风格，提供符合认知发展规律的个性化体验。

---

## Architecture

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户请求                              │
│         {userId, message, modality, ...}                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Edge Function / N8N                        │
│                                                         │
│  1. 获取用户信息（age, interests, ...）                  │
│  2. 计算年龄阶段（Age Stage Calculator）                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Prompt Registry（提示词注册表）                 │
│                                                         │
│  根据 Age Stage + Modality 查询提示词模板                │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ 对话模态      │  │ 图片模态      │  │ 文章模态      │ │
│  │ - beginner  │  │ - beginner  │  │ - beginner  │ │
│  │ - explorer  │  │ - explorer  │  │ - explorer  │ │
│  │ - advanced  │  │ - advanced  │  │ - advanced  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │ 音乐模态      │  │ 播客模态      │                   │
│  │ - beginner  │  │ - beginner  │                   │
│  │ - explorer  │  │ - explorer  │                   │
│  │ - advanced  │  │ - advanced  │                   │
│  └──────────────┘  └──────────────┘                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Prompt Builder（提示词构建器）                   │
│                                                         │
│  1. 加载基础模板                                         │
│  2. 注入动态参数（用户名、兴趣、记忆）                     │
│  3. 应用角色配置（character personality）                │
│  4. 安全性验证                                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  AI Model（LLM）                        │
│                                                         │
│  使用构建好的提示词生成内容                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              返回适龄内容给用户                           │
└─────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. Age Stage Calculator（年龄阶段计算器）

**职责**：根据用户年龄计算所属的认知发展阶段

**接口**：
```typescript
interface AgeStageCalculator {
  calculate(age: number): AgeStage;
}

type AgeStage = 'beginner' | 'explorer' | 'advanced';

interface AgeStageInfo {
  stage: AgeStage;
  name: string;           // 中文名称：启蒙期、探索期、深化期
  ageRange: [number, number];
  characteristics: string[];
  contentFeatures: string[];
}
```

**实现**：
```typescript
function calculateAgeStage(age: number): AgeStageInfo {
  if (age >= 6 && age <= 9) {
    return {
      stage: 'beginner',
      name: '启蒙期',
      ageRange: [6, 9],
      characteristics: [
        '具象思维为主',
        '注意力集中时间短（10-15分钟）',
        '喜欢故事和游戏',
        '需要即时反馈'
      ],
      contentFeatures: [
        '简单易懂，短句为主',
        '多用比喻、拟人、故事',
        '色彩鲜艳，画面简单',
        '节奏明快，旋律简单'
      ]
    };
  } else if (age >= 10 && age <= 12) {
    return {
      stage: 'explorer',
      name: '探索期',
      ageRange: [10, 12],
      characteristics: [
        '逻辑思维开始发展',
        '好奇心强，喜欢探索',
        '开始理解因果关系',
        '注意力集中时间增加（20-30分钟）'
      ],
      contentFeatures: [
        '逻辑清晰，有因果关系',
        '引导思考，提出问题',
        '细节丰富，信息量适中',
        '多种风格，鼓励探索'
      ]
    };
  } else if (age >= 13 && age <= 15) {
    return {
      stage: 'advanced',
      name: '深化期',
      ageRange: [13, 15],
      characteristics: [
        '抽象思维能力强',
        '批判性思考开始形成',
        '能理解复杂概念',
        '注意力集中时间长（30-45分钟）'
      ],
      contentFeatures: [
        '深度分析，跨学科关联',
        '批判性思考，多角度',
        '专业性强，信息密度高',
        '复杂结构，多层次'
      ]
    };
  } else {
    // 默认使用探索期
    return calculateAgeStage(11);
  }
}
```

---

### 2. Prompt Registry（提示词注册表）

**职责**：集中管理所有模态的提示词模板

**接口**：
```typescript
interface PromptRegistry {
  // 获取提示词模板
  getPrompt(modality: Modality, stage: AgeStage): PromptTemplate;
  
  // 注册新的提示词模板
  registerPrompt(modality: Modality, stage: AgeStage, template: PromptTemplate): void;
  
  // 获取所有支持的模态
  getSupportedModalities(): Modality[];
  
  // 获取提示词版本信息
  getVersion(modality: Modality, stage: AgeStage): string;
}

type Modality = 'chat' | 'image' | 'article' | 'music' | 'podcast';

interface PromptTemplate {
  version: string;
  modality: Modality;
  stage: AgeStage;
  basePrompt: string;           // 基础提示词
  styleGuide: string;           // 风格指南
  examples?: string[];          // 示例（可选）
  parameters: PromptParameter[]; // 支持的动态参数
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    description: string;
  };
}

interface PromptParameter {
  name: string;              // 参数名，如 {{userName}}
  required: boolean;         // 是否必需
  defaultValue?: string;     // 默认值
  description: string;       // 参数说明
}
```

**文件结构**：
```
.kiro/prompts/
├── README.md                          # 使用说明
├── registry.json                      # 提示词注册表索引
├── chat/                              # 对话模态
│   ├── beginner.md                    # 启蒙期提示词
│   ├── explorer.md                    # 探索期提示词
│   └── advanced.md                    # 深化期提示词
├── image/                             # 图片模态
│   ├── beginner.md
│   ├── explorer.md
│   └── advanced.md
├── article/                           # 文章模态
│   ├── beginner.md
│   ├── explorer.md
│   └── advanced.md
├── music/                             # 音乐模态
│   ├── beginner.md
│   ├── explorer.md
│   └── advanced.md
└── podcast/                           # 播客模态
    ├── beginner.md
    ├── explorer.md
    └── advanced.md
```

---

### 3. Prompt Builder（提示词构建器）

**职责**：将模板和动态参数组合成最终的提示词

**接口**：
```typescript
interface PromptBuilder {
  build(
    template: PromptTemplate,
    context: PromptContext
  ): string;
}

interface PromptContext {
  user: {
    name: string;
    age: number;
    interests: string[];
    grade: string;
  };
  character: {
    name: string;
    personality: string;
    expertise: string[];
  };
  memories: Array<{
    key: string;
    value: string;
    importance: number;
  }>;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  additionalParams?: Record<string, any>;
}
```

**实现逻辑**：
```typescript
function buildPrompt(template: PromptTemplate, context: PromptContext): string {
  let prompt = template.basePrompt;
  
  // 1. 替换基础参数
  prompt = prompt.replace(/\{\{userName\}\}/g, context.user.name || '小朋友');
  prompt = prompt.replace(/\{\{userAge\}\}/g, context.user.age.toString());
  prompt = prompt.replace(/\{\{userGrade\}\}/g, context.user.grade || '未知');
  
  // 2. 替换兴趣标签
  const interests = context.user.interests.join('、') || '学习';
  prompt = prompt.replace(/\{\{userInterests\}\}/g, interests);
  
  // 3. 替换角色信息
  prompt = prompt.replace(/\{\{characterName\}\}/g, context.character.name);
  prompt = prompt.replace(/\{\{characterPersonality\}\}/g, context.character.personality);
  
  // 4. 注入记忆（取前3条重要记忆）
  const topMemories = context.memories
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map(m => `- ${m.key}: ${m.value}`)
    .join('\n');
  prompt = prompt.replace(/\{\{userMemories\}\}/g, topMemories || '暂无记忆');
  
  // 5. 添加风格指南
  prompt += '\n\n' + template.styleGuide;
  
  // 6. 安全性验证
  prompt = sanitizePrompt(prompt);
  
  return prompt;
}

function sanitizePrompt(prompt: string): string {
  // 移除潜在的注入攻击
  prompt = prompt.replace(/\[INST\]/g, '');
  prompt = prompt.replace(/\[\/INST\]/g, '');
  prompt = prompt.replace(/<\|im_start\|>/g, '');
  prompt = prompt.replace(/<\|im_end\|>/g, '');
  
  return prompt;
}
```

---

## Data Models

### PromptTemplate 示例

```typescript
// 对话模态 - 启蒙期
const chatBeginnerTemplate: PromptTemplate = {
  version: '1.0.0',
  modality: 'chat',
  stage: 'beginner',
  basePrompt: `你是 {{characterName}}，一个 {{characterPersonality}} 的 AI 助手。

**用户信息**：
- 姓名：{{userName}}
- 年龄：{{userAge}} 岁（启蒙期）
- 年级：{{userGrade}}
- 兴趣：{{userInterests}}

**你对用户的了解**：
{{userMemories}}

**你的任务**：
用简单易懂的方式和 {{userName}} 对话，帮助 TA 学习和成长。`,
  
  styleGuide: `**风格要求（启蒙期 6-9岁）**：
1. 使用简单的词汇和短句
2. 多用比喻、拟人、童话故事
3. 避免复杂的专业术语
4. 语气亲切、鼓励、充满童趣
5. 每次回复控制在 100-200 字
6. 多用表情符号和拟声词
7. 将抽象概念具象化（如：地球像个大磁铁）

**示例**：
- ❌ "引力是由质量产生的时空弯曲效应"
- ✅ "地球妈妈像一块超级大的隐形磁铁，把我们都吸在怀里抱抱"`,
  
  parameters: [
    { name: 'userName', required: true, defaultValue: '小朋友', description: '用户姓名' },
    { name: 'userAge', required: true, defaultValue: '8', description: '用户年龄' },
    { name: 'userGrade', required: false, defaultValue: '小学', description: '用户年级' },
    { name: 'userInterests', required: false, defaultValue: '学习', description: '用户兴趣' },
    { name: 'characterName', required: true, description: '角色名称' },
    { name: 'characterPersonality', required: true, description: '角色性格' },
    { name: 'userMemories', required: false, defaultValue: '暂无记忆', description: '用户记忆' }
  ],
  
  metadata: {
    createdAt: '2025-01-08',
    updatedAt: '2025-01-08',
    author: '产品团队',
    description: '启蒙期（6-9岁）对话提示词模板'
  }
};
```

---

## Integration with Existing Systems

### 1. 与聊天系统集成

**Edge Function 修改**：
```typescript
// supabase/functions/chat-handler/index.ts

import { calculateAgeStage } from './age-stage-calculator.ts';
import { PromptRegistry } from './prompt-registry.ts';
import { PromptBuilder } from './prompt-builder.ts';

async function handleChatRequest(request: ChatRequest): Promise<ChatResponse> {
  // 1. 获取用户信息
  const user = await getUserContext(request.userId);
  const character = await getCharacter(request.characterId);
  const memories = await getCharacterMemories(request.characterId, request.userId);
  
  // 2. 计算年龄阶段
  const ageStage = calculateAgeStage(user.age);
  
  // 3. 获取提示词模板
  const promptRegistry = new PromptRegistry();
  const template = promptRegistry.getPrompt('chat', ageStage.stage);
  
  // 4. 构建提示词
  const promptBuilder = new PromptBuilder();
  const systemPrompt = promptBuilder.build(template, {
    user: {
      name: user.name,
      age: user.age,
      interests: user.interests,
      grade: user.grade
    },
    character: {
      name: character.name,
      personality: character.personality,
      expertise: character.expertise
    },
    memories: memories
  });
  
  // 5. 调用 N8N（传递构建好的 system prompt）
  const n8nResponse = await callN8N({
    message: request.message,
    systemPrompt: systemPrompt,
    ageStage: ageStage.stage,
    // ... 其他参数
  });
  
  return n8nResponse;
}
```

---

### 2. 与播客系统集成

**N8N 工作流修改**：
```javascript
// 在 "构建 AI Prompt" 节点中

const user = $input.item.json.user;
const character = $input.item.json.character;

// 1. 计算年龄阶段
function calculateAgeStage(age) {
  if (age >= 6 && age <= 9) return 'beginner';
  if (age >= 10 && age <= 12) return 'explorer';
  if (age >= 13 && age <= 15) return 'advanced';
  return 'explorer';
}

const ageStage = calculateAgeStage(user.age);

// 2. 加载对应的提示词模板（从文件或环境变量）
const promptTemplates = {
  beginner: `生成一篇适合 6-9 岁儿童的播客文章...`,
  explorer: `生成一篇适合 10-12 岁儿童的播客文章...`,
  advanced: `生成一篇适合 13-15 岁青少年的播客文章...`
};

const basePrompt = promptTemplates[ageStage];

// 3. 注入动态参数
const finalPrompt = basePrompt
  .replace('{{userName}}', user.name)
  .replace('{{userAge}}', user.age)
  .replace('{{userInterests}}', user.interests.join('、'));

return { prompt: finalPrompt, ageStage: ageStage };
```

---

## File Structure

### 提示词文件组织

```
.kiro/
├── prompts/
│   ├── README.md                      # 📖 使用说明
│   ├── registry.json                  # 📋 提示词索引
│   │
│   ├── chat/                          # 💬 对话模态
│   │   ├── beginner.md                # 启蒙期（6-9岁）
│   │   ├── explorer.md                # 探索期（10-12岁）
│   │   └── advanced.md                # 深化期（13-15岁）
│   │
│   ├── podcast/                       # 🎙️ 播客模态
│   │   ├── beginner.md
│   │   ├── explorer.md
│   │   └── advanced.md
│   │
│   ├── image/                         # 🖼️ 图片模态（未来）
│   │   ├── beginner.md
│   │   ├── explorer.md
│   │   └── advanced.md
│   │
│   ├── article/                       # 📝 文章模态（未来）
│   │   ├── beginner.md
│   │   ├── explorer.md
│   │   └── advanced.md
│   │
│   └── music/                         # 🎵 音乐模态（未来）
│       ├── beginner.md
│       ├── explorer.md
│       └── advanced.md
│
└── specs/
    └── multimodal-cognitive-adapter/
        ├── requirements.md            # 需求文档
        ├── design.md                  # 设计文档（本文档）
        └── implementation-guide.md    # 实现指南
```

---

## Implementation Strategy

### 阶段 1：基础设施（第 1 周）

1. ✅ 创建提示词文件结构
2. ✅ 实现 Age Stage Calculator
3. ✅ 实现 Prompt Registry
4. ✅ 实现 Prompt Builder
5. ✅ 编写单元测试

### 阶段 2：对话模态集成（第 2 周）

1. ✅ 编写对话模态的 3 个提示词模板
2. ✅ 修改 Edge Function 集成年龄分层
3. ✅ 修改 N8N 工作流使用新提示词
4. ✅ 测试不同年龄段的对话效果
5. ✅ 收集反馈并优化

### 阶段 3：播客模态集成（第 3 周）

1. ✅ 编写播客模态的 3 个提示词模板
2. ✅ 修改播客 N8N 工作流
3. ✅ 测试不同年龄段的播客生成
4. ✅ 优化文字风格和长度

### 阶段 4：监控和优化（第 4 周）

1. ✅ 添加提示词使用统计
2. ✅ 添加用户反馈收集
3. ✅ A/B 测试不同版本
4. ✅ 持续优化提示词质量

---

## Testing Strategy

### 1. 单元测试

```typescript
// age-stage-calculator.test.ts
Deno.test('calculateAgeStage - beginner', () => {
  assertEquals(calculateAgeStage(6).stage, 'beginner');
  assertEquals(calculateAgeStage(9).stage, 'beginner');
});

Deno.test('calculateAgeStage - explorer', () => {
  assertEquals(calculateAgeStage(10).stage, 'explorer');
  assertEquals(calculateAgeStage(12).stage, 'explorer');
});

Deno.test('calculateAgeStage - advanced', () => {
  assertEquals(calculateAgeStage(13).stage, 'advanced');
  assertEquals(calculateAgeStage(15).stage, 'advanced');
});

Deno.test('calculateAgeStage - default', () => {
  assertEquals(calculateAgeStage(5).stage, 'explorer');
  assertEquals(calculateAgeStage(16).stage, 'explorer');
});
```

### 2. 集成测试

```typescript
// prompt-builder.test.ts
Deno.test('buildPrompt - replaces all parameters', () => {
  const template = {
    basePrompt: '你好 {{userName}}，你今年 {{userAge}} 岁',
    // ...
  };
  
  const context = {
    user: { name: '小明', age: 8, interests: [], grade: '二年级' },
    character: { name: '小鳄鱼', personality: '可爱', expertise: [] },
    memories: []
  };
  
  const result = buildPrompt(template, context);
  assert(result.includes('小明'));
  assert(result.includes('8'));
});
```

### 3. 端到端测试

```typescript
// e2e-chat.test.ts
Deno.test('E2E - chat with beginner user', async () => {
  const response = await handleChatRequest({
    userId: 'test-user-beginner',
    characterId: 'little-croc',
    message: '为什么天空是蓝色的？'
  });
  
  // 验证回复风格符合启蒙期特征
  assert(response.response.length < 300); // 简短
  assert(response.response.includes('像')); // 包含比喻
});
```

---

## Performance Considerations

### 1. 提示词缓存

```typescript
class PromptRegistry {
  private cache: Map<string, PromptTemplate> = new Map();
  
  getPrompt(modality: Modality, stage: AgeStage): PromptTemplate {
    const key = `${modality}-${stage}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    const template = this.loadFromFile(modality, stage);
    this.cache.set(key, template);
    return template;
  }
}
```

### 2. 提示词预加载

```typescript
// 在 Edge Function 启动时预加载所有提示词
const promptRegistry = new PromptRegistry();
await promptRegistry.preloadAll();
```

### 3. 参数替换优化

```typescript
// 使用正则表达式批量替换，而不是多次 replace
function buildPrompt(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params[key] || match;
  });
}
```

---

## Security Considerations

### 1. 参数注入防护

```typescript
function sanitizeParameter(value: string): string {
  // 移除特殊字符
  return value
    .replace(/[<>]/g, '')
    .replace(/\[INST\]/g, '')
    .replace(/\[\/INST\]/g, '')
    .substring(0, 500); // 限制长度
}
```

### 2. 提示词访问控制

```typescript
// 只允许加载指定目录下的提示词文件
function loadPromptFile(modality: string, stage: string): string {
  const allowedPath = `.kiro/prompts/${modality}/${stage}.md`;
  
  // 验证路径不包含 ../ 等危险字符
  if (allowedPath.includes('..')) {
    throw new Error('Invalid path');
  }
  
  return Deno.readTextFileSync(allowedPath);
}
```

### 3. 内容安全指令

在所有提示词模板中添加：
```
**内容安全要求**：
- 不生成暴力、色情、歧视性内容
- 不泄露用户隐私信息
- 不提供危险的建议（如自残、违法行为）
- 遇到不当请求时，温和地引导用户
```

---

## Monitoring and Analytics

### 1. 提示词使用统计

```typescript
interface PromptUsageLog {
  promptVersion: string;
  modality: Modality;
  stage: AgeStage;
  userId: string;
  timestamp: string;
  responseTime: number;
  userRating?: number;
}

// 记录每次提示词使用
async function logPromptUsage(log: PromptUsageLog) {
  await supabase.from('prompt_usage_logs').insert(log);
}
```

### 2. 效果分析

```sql
-- 查询不同年龄阶段的平均评分
SELECT 
  stage,
  AVG(user_rating) as avg_rating,
  COUNT(*) as usage_count
FROM prompt_usage_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY stage;

-- 查询低分提示词
SELECT 
  prompt_version,
  modality,
  stage,
  AVG(user_rating) as avg_rating
FROM prompt_usage_logs
WHERE user_rating IS NOT NULL
GROUP BY prompt_version, modality, stage
HAVING AVG(user_rating) < 3.0;
```

---

## Future Enhancements

### 1. 动态难度调整

根据用户的实际表现动态调整内容难度，而不仅仅依赖年龄。

### 2. 多语言支持

支持英文、日文等多语言提示词。

### 3. 个性化风格

根据用户的长期偏好（如喜欢幽默风格 vs 严肃风格）微调提示词。

### 4. 提示词 A/B 测试平台

提供可视化界面进行提示词版本管理和 A/B 测试。

---

**文档版本**: 1.0  
**创建日期**: 2025-01-08  
**维护者**: 开发团队
