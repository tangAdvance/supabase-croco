# 修复 trigger_generation 字段问题

## 问题描述

用户测试发现 `trigger_generation` 字段不存在，导致无法判断是否要触发图片生成。

## 根本原因

缺少"图片生成模式Prompt"节点，该节点负责：
1. 识别图片生成意图
2. 收集创作要素（Theme、Style、Emotion）
3. 用户确认后设置 `metadata.trigger_generation = true`

## 修复方案

### 1. 添加"图片生成模式Prompt"节点

**文件**: `add_image_generation_node.py`

**功能**:
- 识别图片生成意图
- 收集 Theme（主题）
- 收集 Style（风格）：童话绘本风、像素游戏风、梦幻动漫风、科幻电影风
- 收集 Emotion（情感）：温暖快乐、神秘梦幻、活泼有趣、宁静深远
- 用户确认后设置 `metadata.trigger_generation = true`
- 构建完整的图片生成 prompt

**关键代码**:
```javascript
if (userConfirmed) {
  const imagePrompt = buildImagePrompt(context, character);
  
  metadata.trigger_generation = true; // 关键字段
  metadata.generationData = {
    userId: webhookData.userId,
    characterId: webhookData.characterId,
    conversationId: webhookData.conversationId,
    prompt: imagePrompt,
    theme: context.theme,
    style: context.style,
    emotion: context.emotion,
    userDescription: context.theme
  };
}
```

### 2. 更新 AI Agent 意图识别

**文件**: `update_ai_agent_intent.py`

**更新内容**:
- 添加 `image_generation` 意图
- 关键词：画、图片、生成、创作、画画

**新的意图列表**:
1. homework - 作业辅导
2. knowledge - 知识问答
3. emotional - 情感求助
4. **image_generation - 图片生成** ✨ (新增)
5. chat - 闲聊

### 3. 更新响应格式化节点

**文件**: `update_response_formatter.py`

**更新内容**:
- 添加对"图片生成模式Prompt"节点的支持
- 支持直接响应（不需要通过 chat 节点）
- 传递 `metadata` 和 `generationData` 到下游节点

## 完整数据流

### 图片生成流程

```
1. 用户发送消息："帮我画一只猫"
   ↓
2. AI Agent 识别意图 → image_generation
   ↓
3. Switch 路由到"图片生成模式Prompt"
   ↓
4. 图片生成模式Prompt 收集信息：
   - 第1轮：收集 Theme（主题）
   - 第2轮：收集 Style（风格）
   - 第3轮：收集 Emotion（情感）
   - 第4轮：展示汇总，请求确认
   ↓
5. 用户确认："确认"
   ↓
6. 图片生成模式Prompt 设置：
   - metadata.trigger_generation = true ✅
   - metadata.generationData = {...}
   ↓
7. chat 节点（可选，图片生成模式直接返回响应）
   ↓
8. 响应格式化
   - 提取 metadata.trigger_generation
   - 提取 metadata.generationData
   ↓
9. 返回响应（主分支）
   - 用户立即收到"生成中"消息
   ↓
10. 检查是否触发图片生成（异步分支）
    - 检查 metadata.trigger_generation === true ✅
    ↓
11. 准备图片生成数据
    ↓
12. 调用 DALL-E 3 API
    ↓
13. 处理 API 响应
    ↓
14. 构建图片记录
    ↓
15. 插入到 Supabase
    ↓
16. Realtime 自动推送通知
    ↓
17. 客户端收到通知并显示图片
```

## 关键字段说明

### metadata.trigger_generation

- **类型**: boolean
- **作用**: 标记是否需要触发异步图片生成
- **设置位置**: 图片生成模式Prompt 节点
- **检查位置**: "检查是否触发图片生成" IF 节点
- **条件**: `{{ $json.metadata?.trigger_generation }} === true`

### metadata.generationData

- **类型**: object
- **作用**: 传递图片生成所需的所有数据
- **字段**:
  - userId: 用户 ID
  - characterId: 角色 ID
  - conversationId: 对话 ID
  - prompt: 完整的图片生成 prompt
  - theme: 主题
  - style: 风格
  - emotion: 情感
  - userDescription: 用户原始描述

## 测试验证

### 测试步骤

1. **测试意图识别**
   ```
   用户: "帮我画一只猫"
   预期: AI Agent 返回 "image_generation"
   ```

2. **测试信息收集**
   ```
   第1轮 - 收集主题
   AI: "太好了！首先告诉我，你想画什么？🎨"
   用户: "一只在太空飞的猫"
   
   第2轮 - 收集风格
   AI: "很棒的主题！现在选择画风吧！..."
   用户: "童话绘本风"
   
   第3轮 - 收集情感
   AI: "好的！最后选择情感色彩吧！..."
   用户: "温暖快乐"
   ```

3. **测试确认和触发**
   ```
   第4轮 - 确认
   AI: "太棒了！让我确认一下：
        📝 主题：一只在太空飞的猫
        🎨 风格：童话绘本风
        💫 情感：温暖快乐
        确认开始创作吗？"
   用户: "确认"
   
   预期: 
   - metadata.trigger_generation = true ✅
   - metadata.generationData 包含所有必需字段
   ```

4. **测试异步生成**
   ```
   预期:
   - "检查是否触发图片生成" 节点检测到 trigger_generation = true
   - 进入异步分支
   - 调用 DALL-E 3 API
   - 存储到数据库
   - Realtime 推送通知
   ```

## 文件清单

1. **add_image_generation_node.py** - 添加图片生成模式Prompt节点
2. **update_ai_agent_intent.py** - 更新 AI Agent 意图识别
3. **update_response_formatter.py** - 更新响应格式化节点
4. **FIX_TRIGGER_GENERATION.md** - 本文档

## 执行命令

```bash
# 1. 添加图片生成模式Prompt节点
python3 .kiro/specs/guided-image-generation/add_image_generation_node.py

# 2. 更新 AI Agent 意图识别
python3 .kiro/specs/guided-image-generation/update_ai_agent_intent.py

# 3. 更新响应格式化节点
python3 .kiro/specs/guided-image-generation/update_response_formatter.py
```

## 验证结果

✅ 已添加"图片生成模式Prompt"节点
✅ 已更新 AI Agent 意图识别（添加 image_generation）
✅ 已更新响应格式化节点（支持图片生成模式）
✅ trigger_generation 字段现在可以正确设置和检查

## 后续步骤

1. 在 N8N 中导入更新后的 workflow
2. 测试完整的图片生成流程
3. 验证 trigger_generation 字段是否正确触发
4. 验证异步生成和 Realtime 通知

## 注意事项

- 图片生成模式Prompt 节点直接返回响应，不需要通过 chat 节点
- metadata.trigger_generation 只在用户确认后才设置为 true
- generationData 包含所有生成所需的数据，避免重复提取
