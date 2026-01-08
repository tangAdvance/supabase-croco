# 多模态认知适配器 - 实现指南

## 📋 概述

本文档提供多模态认知适配器的具体实现步骤和代码示例。

---

## 🎯 实现目标

1. ✅ 创建年龄分层提示词管理系统
2. ✅ 集成到现有聊天系统
3. ✅ 集成到现有播客系统
4. ⏳ 为未来模态预留扩展接口

---

## 📁 已完成的工作

### 1. 提示词文件结构

```
.kiro/prompts/
├── README.md                  # ✅ 使用说明
├── registry.json              # ✅ 提示词索引
├── chat/                      # ✅ 对话模态
│   ├── beginner.md            # ✅ 启蒙期
│   ├── explorer.md            # ✅ 探索期
│   └── advanced.md            # ✅ 深化期
└── podcast/                   # 🚧 播客模态
    └── beginner.md            # ✅ 启蒙期（示例）
```

### 2. 规范文档

- ✅ `requirements.md` - 需求文档
- ✅ `design.md` - 设计文档
- ✅ `implementation-guide.md` - 本文档

---

## 🔧 实现步骤

### 步骤 1：创建年龄阶段计算器

在 `supabase/functions/chat-handler/` 创建新文件：

**文件**: `age-stage-calculator.ts`

```typescript
export type AgeStage = 'beginner' | 'explorer' | 'advanced';

export interface AgeStageInfo {
  stage: AgeStage;
  name: string;
  ageRange: [number, number];
  characteristics: string[];
  contentFeatures: string[];
}

export function calculateAgeStage(age: number): AgeStageInfo {
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
        '色彩鲜艳，画面简单'
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
        '开始理解因果关系'
      ],
      contentFeatures: [
        '逻辑清晰，有因果关系',
        '引导思考，提出问题',
        '细节丰富，信息量适中'
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
        '能理解复杂概念'
      ],
      contentFeatures: [
        '深度分析，跨学科关联',
        '批判性思考，多角度',
        '专业性强，信息密度高'
      ]
    };
  } else {
    // 默认使用探索期
    return calculateAgeStage(11);
  }
}
```

---

### 步骤 2：创建提示词加载器

**文件**: `prompt-loader.ts`

```typescript
import { AgeStage } from './age-stage-calculator.ts';

export type Modality = 'chat' | 'podcast' | 'image' | 'article' | 'music';

export interface PromptTemplate {
  version: string;
  modality: Modality;
  stage: AgeStage;
  content: string;
}

export class PromptLoader {
  private cache: Map<string, string> = new Map();
  
  async loadPrompt(modality: Modality, stage: AgeStage): Promise<string> {
    const key = `${modality}-${stage}`;
    
    // 检查缓存
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    
    // 从文件加载
    const filePath = `.kiro/prompts/${modality}/${stage}.md`;
    
    try {
      const content = await Deno.readTextFile(filePath);
      
      // 提取基础提示词部分（## 基础提示词 到 ## 风格指南之间的内容）
      const basePromptMatch = content.match(/## 基础提示词\n\n([\s\S]*?)\n\n## 风格指南/);
      const styleGuideMatch = content.match(/## 风格指南\n\n([\s\S]*?)\n\n## 示例对比/);
      
      let prompt = '';
      if (basePromptMatch) {
        prompt += basePromptMatch[1];
      }
      if (styleGuideMatch) {
        prompt += '\n\n' + styleGuideMatch[1];
      }
      
      // 缓存
      this.cache.set(key, prompt);
      
      return prompt;
    } catch (error) {
      console.error(`[PromptLoader] Failed to load prompt: ${filePath}`, error);
      // 返回默认提示词
      return this.getDefaultPrompt(modality, stage);
    }
  }
  
  private getDefaultPrompt(modality: Modality, stage: AgeStage): string {
    return `你是一个 AI 助手，正在和一个 ${stage} 阶段的用户对话。`;
  }
  
  // 预加载所有提示词
  async preloadAll(): Promise<void> {
    const modalities: Modality[] = ['chat', 'podcast'];
    const stages: AgeStage[] = ['beginner', 'explorer', 'advanced'];
    
    for (const modality of modalities) {
      for (const stage of stages) {
        await this.loadPrompt(modality, stage);
      }
    }
    
    console.log('[PromptLoader] All prompts preloaded');
  }
}
```

---

### 步骤 3：创建提示词构建器

**文件**: `prompt-builder.ts`

```typescript
export interface PromptContext {
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
  additionalParams?: Record<string, string>;
}

export function buildPrompt(template: string, context: PromptContext): string {
  let prompt = template;
  
  // 替换基础参数
  prompt = prompt.replace(/\{\{userName\}\}/g, context.user.name || '小朋友');
  prompt = prompt.replace(/\{\{userAge\}\}/g, context.user.age.toString());
  prompt = prompt.replace(/\{\{userGrade\}\}/g, context.user.grade || '未知');
  
  // 替换兴趣
  const interests = context.user.interests.join('、') || '学习';
  prompt = prompt.replace(/\{\{userInterests\}\}/g, interests);
  
  // 替换角色信息
  prompt = prompt.replace(/\{\{characterName\}\}/g, context.character.name);
  prompt = prompt.replace(/\{\{characterPersonality\}\}/g, context.character.personality);
  
  // 注入记忆（取前3条）
  const topMemories = context.memories
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3)
    .map(m => `- ${m.key}: ${m.value}`)
    .join('\n');
  prompt = prompt.replace(/\{\{userMemories\}\}/g, topMemories || '暂无记忆');
  
  // 替换额外参数
  if (context.additionalParams) {
    for (const [key, value] of Object.entries(context.additionalParams)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      prompt = prompt.replace(regex, value);
    }
  }
  
  // 安全性验证
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

### 步骤 4：修改聊天处理函数

**文件**: `supabase/functions/chat-handler/index.ts`

```typescript
import { calculateAgeStage } from './age-stage-calculator.ts';
import { PromptLoader } from './prompt-loader.ts';
import { buildPrompt } from './prompt-builder.ts';

// 初始化提示词加载器
const promptLoader = new PromptLoader();
await promptLoader.preloadAll();

async function handleChatRequest(request: ChatRequest): Promise<ChatResponse> {
  // 1. 获取用户信息
  const user = await getUserContext(request.userId);
  const character = await getCharacter(request.characterId);
  const memories = await getCharacterMemories(request.characterId, request.userId);
  
  // 2. 计算年龄阶段
  const ageStage = calculateAgeStage(user.age);
  console.log(`[Chat] User age: ${user.age}, stage: ${ageStage.stage}`);
  
  // 3. 加载提示词模板
  const promptTemplate = await promptLoader.loadPrompt('chat', ageStage.stage);
  
  // 4. 构建最终提示词
  const systemPrompt = buildPrompt(promptTemplate, {
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
  
  // 5. 调用 N8N
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

### 步骤 5：修改 N8N 工作流（播客系统）

在 N8N 的 "构建 AI Prompt" 节点中：

```javascript
// 获取用户信息
const user = $input.item.json.user;
const character = $input.item.json.character;
const searchContent = $input.item.json.searchContent;

// 计算年龄阶段
function calculateAgeStage(age) {
  if (age >= 6 && age <= 9) return 'beginner';
  if (age >= 10 && age <= 12) return 'explorer';
  if (age >= 13 && age <= 15) return 'advanced';
  return 'explorer';
}

const ageStage = calculateAgeStage(user.age);

// 加载对应的提示词模板（从环境变量）
const promptTemplates = {
  beginner: $env.PROMPT_PODCAST_BEGINNER,
  explorer: $env.PROMPT_PODCAST_EXPLORER,
  advanced: $env.PROMPT_PODCAST_ADVANCED
};

let prompt = promptTemplates[ageStage];

// 替换动态参数
prompt = prompt.replace(/\{\{userName\}\}/g, user.name);
prompt = prompt.replace(/\{\{userAge\}\}/g, user.age);
prompt = prompt.replace(/\{\{userGrade\}\}/g, user.grade || '未知');
prompt = prompt.replace(/\{\{userInterests\}\}/g, user.interests.join('、'));
prompt = prompt.replace(/\{\{characterName\}\}/g, character.name);
prompt = prompt.replace(/\{\{searchContent\}\}/g, searchContent);

// 注入记忆
const memories = $input.item.json.memories || [];
const memoryText = memories
  .slice(0, 3)
  .map(m => `- ${m.memory_key}: ${m.memory_value}`)
  .join('\n');
prompt = prompt.replace(/\{\{userMemories\}\}/g, memoryText || '暂无记忆');

return { 
  prompt: prompt, 
  ageStage: ageStage 
};
```

---

## 📊 测试计划

### 1. 单元测试

```typescript
// age-stage-calculator.test.ts
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { calculateAgeStage } from "./age-stage-calculator.ts";

Deno.test("calculateAgeStage - beginner", () => {
  assertEquals(calculateAgeStage(6).stage, "beginner");
  assertEquals(calculateAgeStage(9).stage, "beginner");
});

Deno.test("calculateAgeStage - explorer", () => {
  assertEquals(calculateAgeStage(10).stage, "explorer");
  assertEquals(calculateAgeStage(12).stage, "explorer");
});

Deno.test("calculateAgeStage - advanced", () => {
  assertEquals(calculateAgeStage(13).stage, "advanced");
  assertEquals(calculateAgeStage(15).stage, "advanced");
});
```

### 2. 集成测试

创建测试用户，验证不同年龄段的回复风格。

---

## 🚀 部署步骤

### 1. 部署 Edge Function

```bash
cd supabase/functions/chat-handler
./deploy.sh
```

### 2. 配置 N8N 环境变量

在 N8N Cloud 中添加环境变量：

```
PROMPT_PODCAST_BEGINNER=[从 .kiro/prompts/podcast/beginner.md 复制内容]
PROMPT_PODCAST_EXPLORER=[待创建]
PROMPT_PODCAST_ADVANCED=[待创建]
```

### 3. 测试

使用不同年龄的测试用户验证功能。

---

## 📝 后续工作

### 待完成的提示词

1. ⏳ `podcast/explorer.md`
2. ⏳ `podcast/advanced.md`
3. ⏳ 图片、文章、音乐模态的提示词（未来）

### 待实现的功能

1. ⏳ 提示词版本管理
2. ⏳ A/B 测试支持
3. ⏳ 效果监控和分析
4. ⏳ 提示词热更新

---

**文档版本**: 1.0  
**创建日期**: 2025-01-08  
**维护者**: 开发团队
