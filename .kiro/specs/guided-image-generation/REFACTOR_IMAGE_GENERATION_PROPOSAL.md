# 图片生成流程重构方案

## 📋 问题分析

### 当前问题
现有的"图片生成模式Prompt"节点使用硬编码的 Code 节点来判断对话进度：

```javascript
// 检查信息收集进度
if (!context.theme) {
  response = `太好了！首先告诉我，你想画什么？🎨`;
} else if (!context.style) {
  response = `很棒的主题！现在选择画风吧！...`;
} else if (!context.emotion) {
  response = `好的！最后选择情感色彩吧！...`;
}
```

**缺点**：
- ❌ 缺乏灵活性：无法根据用户输入智能调整对话
- ❌ 体验僵硬：固定的问答流程，不够自然
- ❌ 难以扩展：添加新的收集维度需要修改代码
- ❌ 无法处理意外输入：用户可能一次性提供多个信息

---

## 🎯 重构目标

1. **智能对话**：使用 AI 节点判断对话进度和生成回复
2. **自然交互**：AI 能够根据用户输入灵活调整问题
3. **易于维护**：减少硬编码，提高可扩展性
4. **保持结构**：维持现有的 4 步收集流程（主题→风格→情感→确认）

---

## 💡 方案对比

### 方案 1：集成到现有流程（推荐）⭐

**架构**：在现有的 AI Agent 流程中添加图片生成专用的 AI 节点

**优点**：
- ✅ 复用现有的 Webhook、AI Agent、响应格式化等节点
- ✅ 统一的错误处理和日志记录
- ✅ 保持架构一致性
- ✅ 易于维护和调试

**缺点**：
- ⚠️ 需要修改现有流程（但改动可控）
- ⚠️ 图片生成逻辑与其他模式耦合

**适用场景**：
- 图片生成是核心功能之一
- 需要与其他模式共享上下文和记忆
- 希望保持统一的用户体验

---

### 方案 2：独立模块（备选）

**架构**：创建独立的 N8N 工作流，通过 HTTP Request 调用

**优点**：
- ✅ 完全独立，不影响现有流程
- ✅ 可以单独部署和测试
- ✅ 解耦合，易于替换

**缺点**：
- ❌ 需要额外的 HTTP 调用（增加延迟）
- ❌ 需要重复实现上下文管理、错误处理等
- ❌ 增加系统复杂度
- ❌ 难以共享用户记忆和对话历史

**适用场景**：
- 图片生成是独立的附加功能
- 需要独立部署和扩展
- 不需要与主流程共享上下文

---

## 🏗️ 方案 1 详细设计（推荐）

### 架构图

```
Webhook
  ↓
AI Agent (意图识别)
  ↓
Switch (根据 intentType 路由)
  ├─ homework/knowledge → 苏格拉底模式Prompt → chat
  ├─ emotional → 心理安全模式Prompt → chat
  ├─ chat → 正常对话模式Prompt → chat
  └─ image_generation → 图片生成智能引导 (新) → chat
       ↓
     响应格式化
       ↓
     Switch (检查 trigger_generation)
       ├─ true → 调用 Replicate API → 构建图片记录 → 插入 Supabase
       └─ false → 返回响应
```

### 核心改动

#### 1. 替换"图片生成模式Prompt"节点

**旧节点**：Code 节点（硬编码逻辑）

**新节点**：AI Agent 节点 + Code 节点（智能引导）

**节点名称**：`图片生成智能引导`

**实现方式**：

```javascript
// Code 节点：构建图片生成专用的 System Prompt
const webhookData = $('Webhook').first().json.body;
const { message, userProfile, character, history } = webhookData;

// 从历史对话中提取已收集的信息
let context = {
  theme: null,
  style: null,
  emotion: null
};

// 分析最近的对话历史，提取已收集的信息
if (history && history.length > 0) {
  const recentMessages = history.slice(-6);
  // 使用简单的关键词匹配或 AI 提取
  // 这里可以调用一个轻量级的 AI 来提取上下文
}

// 构建 System Prompt
const systemPrompt = `你是小鳄鱼助手🐊，正在帮助孩子创作一幅图片。

**你的任务：**
通过自然对话，收集以下信息来生成图片：
1. **主题 (Theme)**：孩子想画什么？（如：向日葵、小猫、城堡）
2. **风格 (Style)**：什么画风？（如：童话绘本、水彩画、卡通风格）
3. **情感 (Emotion)**：希望画面传达什么感觉？（如：温暖快乐、神秘梦幻、活泼可爱）

**当前收集进度：**
- 主题：${context.theme || '未收集'}
- 风格：${context.style || '未收集'}
- 情感：${context.emotion || '未收集'}

**对话规则：**
1. 🎨 **自然引导**：不要像填表格一样问问题，要像朋友聊天
2. 🧠 **智能识别**：如果用户一次性提供多个信息，要能识别并提取
3. 💡 **提供灵感**：如果用户不知道怎么选，给3-4个具体例子
4. ✅ **确认环节**：收集完所有信息后，总结并让用户确认
5. 🚀 **触发生成**：用户确认后，设置 trigger_generation = true

**风格预设（供参考）：**
- 童话绘本风：柔和的色彩，温馨的画面
- 水彩画风：朦胧的笔触，艺术感
- 卡通风格：鲜艳的色彩，可爱的造型
- 像素艺术：复古游戏风格
- 油画风格：厚重的笔触，经典艺术感

**情感预设（供参考）：**
- 温暖快乐：明亮的色调，阳光感
- 神秘梦幻：柔和的光影，魔法感
- 活泼可爱：鲜艳的色彩，童趣感
- 宁静平和：淡雅的色调，安静感
- 冒险刺激：动感的构图，张力感

**重要：你的回复必须是 JSON 格式：**
{
  "response": "你的对话回复",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "theme": "已识别的主题（如果有）",
    "style": "已识别的风格（如果有）",
    "emotion": "已识别的情感（如果有）",
    "trigger_generation": false,  // 只有用户确认后才设为 true
    "generationData": {  // 只有 trigger_generation = true 时才包含
      "prompt": "完整的英文 prompt",
      "theme": "主题",
      "style": "风格",
      "emotion": "情感"
    }
  },
  "memories": []
}

**示例对话流程：**

用户："我想画一朵花"
AI："太好了！🌸 你想画什么花呢？比如向日葵、玫瑰、还是樱花？"

用户："向日葵"
AI："向日葵真棒！☀️ 那你喜欢什么风格呢？我可以帮你画成：
- 童话绘本风（温馨可爱）
- 水彩画风（艺术朦胧）
- 卡通风格（鲜艳活泼）
你更喜欢哪种？"

用户："童话绘本风"
AI："好的！最后一个问题，你希望这幅画给人什么感觉呢？
- 温暖快乐（阳光明媚）
- 宁静平和（安静美好）
- 活泼可爱（充满童趣）"

用户："温暖快乐"
AI："完美！让我确认一下：
🎨 主题：向日葵
🖌️ 风格：童话绘本风
💛 情感：温暖快乐

这样可以吗？如果没问题，我就开始画啦！"

用户："可以"
AI：（设置 trigger_generation = true，触发图片生成）

**当前用户消息：**
${message}

请根据当前收集进度，生成合适的回复。`;

return {
  json: {
    systemPrompt,
    userMessage: message,
    metadata: {
      mode: 'creative',
      intentType: 'image_generation',
      context: context
    }
  }
};
```

#### 2. 添加 AI Agent 节点

**节点名称**：`图片生成对话 AI`

**配置**：
- Model: `gpt-4o-mini` 或 `gpt-3.5-turbo`
- Temperature: `0.7`（保持创意性）
- Max Tokens: `500`
- System Prompt: 从上一个 Code 节点获取
- User Message: 从上一个 Code 节点获取

#### 3. 添加上下文提取节点

**节点名称**：`提取图片生成上下文`

**作用**：从 AI 的 JSON 响应中提取 metadata，传递给后续节点

```javascript
// 获取 AI 响应
const aiResponse = $input.first().json;

// 解析 JSON
let parsedResponse;
try {
  parsedResponse = JSON.parse(aiResponse.output);
} catch (e) {
  // 如果解析失败，尝试提取 JSON 部分
  const jsonMatch = aiResponse.output.match(/```json\s*([\s\S]*?)\s*```/) || 
                    aiResponse.output.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } else {
    // 默认响应
    parsedResponse = {
      response: aiResponse.output,
      metadata: {
        mode: 'creative',
        intentType: 'image_generation',
        trigger_generation: false
      },
      memories: []
    };
  }
}

return {
  json: parsedResponse
};
```

### 节点连接

```
AI Agent (意图识别)
  ↓
Switch
  ↓ (image_generation)
图片生成智能引导 (Code)
  ↓
图片生成对话 AI (AI Agent)
  ↓
提取图片生成上下文 (Code)
  ↓
响应格式化
  ↓
Switch (检查 trigger_generation)
  ├─ true → 调用 Replicate API
  └─ false → 返回响应
```

---

## 🔧 实施步骤

### 步骤 1：备份现有工作流
```bash
cp n8n.json n8n.json.backup
```

### 步骤 2：删除旧的"图片生成模式Prompt"节点

### 步骤 3：添加新节点
1. 添加"图片生成智能引导" Code 节点
2. 添加"图片生成对话 AI" AI Agent 节点
3. 添加"提取图片生成上下文" Code 节点

### 步骤 4：更新 Switch 路由
确保 `image_generation` 路由指向新的"图片生成智能引导"节点

### 步骤 5：更新"响应格式化"节点
确保能够处理新的 metadata 结构

### 步骤 6：测试
- 测试意图识别："我想画一朵花"
- 测试信息收集：逐步提供主题、风格、情感
- 测试一次性输入："我想画一朵温暖的童话风格向日葵"
- 测试确认流程："可以"、"确认"
- 测试图片生成触发

---

## 📊 方案对比总结

| 维度 | 方案 1：集成到现有流程 | 方案 2：独立模块 |
|------|----------------------|----------------|
| **实施难度** | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ 较高 |
| **维护成本** | ⭐⭐ 低 | ⭐⭐⭐⭐ 高 |
| **性能** | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐⭐ 一般（额外 HTTP 调用）|
| **灵活性** | ⭐⭐⭐⭐ 好 | ⭐⭐⭐⭐⭐ 优秀 |
| **上下文共享** | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐ 差 |
| **解耦程度** | ⭐⭐⭐ 一般 | ⭐⭐⭐⭐⭐ 优秀 |

**推荐**：方案 1（集成到现有流程）

**理由**：
1. 图片生成是核心功能，应该与其他模式保持一致
2. 需要共享用户上下文和对话历史
3. 实施成本更低，维护更简单
4. 性能更好（减少 HTTP 调用）

---

## 🎯 下一步

请确认选择哪个方案，我将：
1. 生成完整的 Python 脚本来更新 N8N 工作流
2. 创建测试用例
3. 更新相关文档

**注意事项**：
- ✅ 使用 `.first()` 而不是 `.item` 访问节点数据（参考 ISSUES.md）
- ✅ 所有 JSON 解析都添加错误处理
- ✅ AI 响应格式统一为 JSON
- ✅ metadata 结构保持一致

---

**文档版本**：1.0  
**创建日期**：2025-01-12  
**作者**：开发团队
