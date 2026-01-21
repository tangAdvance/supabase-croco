# 图片生成流程快速测试指南

## 🚀 快速开始

### 前置条件
- ✅ N8N 工作流已更新
- ✅ OpenAI API Key 已配置
- ✅ Edge Function 已部署
- ✅ 数据库迁移已执行

---

## 📋 测试用例

### 测试 1: 基础流程（逐步收集）

**目标**: 验证 AI 能够逐步引导用户收集信息

**步骤**:
```
1. 发送: "我想画一朵花"
   预期: AI 询问具体是什么花

2. 发送: "向日葵"
   预期: AI 展示风格选项

3. 发送: "童话绘本风"
   预期: AI 展示情感选项

4. 发送: "温暖快乐"
   预期: AI 展示汇总，请求确认

5. 发送: "确认"
   预期: 触发图片生成
```

**验证点**:
- [ ] AI 每一步都有友好的回复
- [ ] AI 正确识别用户输入
- [ ] metadata 正确传递（theme, style, emotion）
- [ ] trigger_generation = true
- [ ] generationData 包含完整信息

---

### 测试 2: 智能识别（一次性输入）

**目标**: 验证 AI 能够一次性识别多个信息

**步骤**:
```
1. 发送: "我想画一朵温暖的童话风格向日葵"
   预期: AI 识别所有信息，展示汇总

2. 发送: "可以"
   预期: 触发图片生成
```

**验证点**:
- [ ] AI 正确提取主题（向日葵）
- [ ] AI 正确提取风格（storybook）
- [ ] AI 正确提取情感（warm）
- [ ] 直接进入确认环节

---

### 测试 3: 提供灵感

**目标**: 验证 AI 能够在用户不确定时提供建议

**步骤**:
```
1. 发送: "我想画画，但不知道画什么"
   预期: AI 提供 3-4 个具体例子

2. 发送: "小猫"
   预期: AI 继续引导选择风格
```

**验证点**:
- [ ] AI 提供具体的灵感建议
- [ ] 建议多样化（动物、自然、幻想）
- [ ] 语气友好、鼓励性

---

### 测试 4: 修改选择

**目标**: 验证 AI 能够处理用户修改请求

**步骤**:
```
1. 完成前 4 步（收集主题、风格、情感）
2. AI 展示汇总
3. 发送: "我想改成科幻风格"
   预期: AI 更新风格，重新展示汇总

4. 发送: "确认"
   预期: 触发图片生成
```

**验证点**:
- [ ] AI 理解修改请求
- [ ] metadata 正确更新
- [ ] 重新展示汇总

---

### 测试 5: 边界情况

**目标**: 验证错误处理和边界情况

**场景 A: 无效输入**
```
发送: "asdfghjkl"
预期: AI 友好地请求澄清
```

**场景 B: 跳过步骤**
```
发送: "我想画画"
发送: "确认"（在未收集完信息时）
预期: AI 提示需要先完成信息收集
```

**场景 C: 多次确认**
```
发送: "确认"
发送: "确认"（重复）
预期: AI 提示已经开始生成
```

**验证点**:
- [ ] 错误处理友好
- [ ] 不会导致工作流中断
- [ ] 有明确的提示信息

---

## 🔍 调试检查点

### 1. 检查节点输出

**图片生成智能引导节点**:
```json
{
  "systemPrompt": "你是小鳄鱼助手🐊...",
  "userMessage": "我想画一朵花",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "context": {
      "theme": null,
      "style": null,
      "emotion": null
    }
  }
}
```

**图片生成对话 AI 节点**:
```json
{
  "output": "{\"response\":\"太好了！🌸 你想画什么花呢？...\",\"metadata\":{...}}"
}
```

**提取图片生成上下文节点**:
```json
{
  "response": "太好了！🌸 你想画什么花呢？...",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "花",
    "trigger_generation": false
  },
  "memories": []
}
```

### 2. 检查 metadata 传递

在"响应格式化"节点中，验证：
```javascript
console.log('metadata:', metadata);
// 应该包含: mode, intentType, image_theme, image_style, image_emotion
```

### 3. 检查 trigger_generation

在"检查是否触发图片生成" Switch 节点中：
```javascript
console.log('trigger_generation:', $json.metadata?.trigger_generation);
// 确认后应该为 true
```

---

## 📊 预期响应示例

### 第 1 轮（收集主题）

**用户**: "我想画一朵花"

**AI 响应**:
```json
{
  "response": "太好了！🌸 你想画什么花呢？比如向日葵、玫瑰、还是樱花？",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "花",
    "trigger_generation": false
  },
  "memories": []
}
```

### 第 2 轮（收集风格）

**用户**: "向日葵"

**AI 响应**:
```json
{
  "response": "向日葵真棒！☀️ 那你喜欢什么风格呢？\n\n童话绘本风 - 温暖柔和，像故事书\n像素游戏风 - 复古可爱，像经典游戏\n梦幻动漫风 - 色彩流动，像宫崎骏\n科幻电影风 - 酷炫逼真，像电影海报\n\n你更喜欢哪种？",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "trigger_generation": false
  },
  "memories": []
}
```

### 第 3 轮（收集情感）

**用户**: "童话绘本风"

**AI 响应**:
```json
{
  "response": "好的！最后一个问题，你希望这幅画给人什么感觉呢？\n\n温暖快乐 - 明亮的色彩，让人开心\n神秘梦幻 - 深邃的色调，充满想象\n活泼有趣 - 鲜艳的颜色，充满活力\n宁静深远 - 柔和的色彩，让人放松",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "image_style": "storybook",
    "trigger_generation": false
  },
  "memories": []
}
```

### 第 4 轮（确认）

**用户**: "温暖快乐"

**AI 响应**:
```json
{
  "response": "完美！让我确认一下：\n\n🎨 主题：向日葵\n🖌️ 风格：童话绘本风\n💛 情感：温暖快乐\n\n这样可以吗？如果没问题，我就开始画啦！",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "image_style": "storybook",
    "image_emotion": "warm",
    "trigger_generation": false
  },
  "memories": []
}
```

### 第 5 轮（触发生成）

**用户**: "可以"

**AI 响应**:
```json
{
  "response": "太好了！🎨 我开始为你创作了！这可能需要一点时间，你可以继续和我聊天，图片生成好后我会立刻通知你！",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "image_style": "storybook",
    "image_emotion": "warm",
    "trigger_generation": true,
    "generationData": {
      "prompt": "sunflower, children's book illustration, watercolor, soft colors, whimsical, warm lighting, cozy atmosphere, bright and cheerful, happy mood, high quality, detailed, professional, safe for children",
      "theme": "向日葵",
      "style": "storybook",
      "emotion": "warm",
      "userId": "...",
      "characterId": "...",
      "conversationId": "...",
      "userDescription": "向日葵"
    }
  },
  "memories": []
}
```

---

## ⚠️ 常见问题

### 问题 1: AI 不返回 JSON 格式

**症状**: 
```
[提取上下文] JSON 解析失败: SyntaxError: Unexpected token
```

**解决方案**:
1. 检查 System Prompt 是否完整
2. 在"图片生成智能引导"节点中强调 JSON 格式
3. 增加示例对话

### 问题 2: metadata 丢失

**症状**: 
```
metadata: undefined
```

**解决方案**:
1. 检查"提取图片生成上下文"节点
2. 验证 JSON 解析逻辑
3. 确保使用 `.first()` 而不是 `.item`

### 问题 3: trigger_generation 始终为 false

**症状**: 
图片生成不触发

**解决方案**:
1. 检查 AI 是否正确识别确认消息
2. 在 System Prompt 中明确确认关键词
3. 验证 generationData 是否构建

### 问题 4: 节点连接错误

**症状**: 
```
Error: Cannot find node '图片生成模式Prompt'
```

**解决方案**:
1. 确认旧节点已删除
2. 检查"响应格式化"节点中的节点名称
3. 更新为"提取图片生成上下文"

---

## 📝 测试检查清单

### 部署前
- [ ] 备份文件存在（n8n.json.backup）
- [ ] OpenAI API Key 已配置
- [ ] 数据库迁移已执行
- [ ] Edge Function 已部署

### 功能测试
- [ ] 测试 1: 基础流程通过
- [ ] 测试 2: 智能识别通过
- [ ] 测试 3: 提供灵感通过
- [ ] 测试 4: 修改选择通过
- [ ] 测试 5: 边界情况通过

### 性能测试
- [ ] 响应时间 < 3 秒
- [ ] API 调用成功率 > 95%
- [ ] 图片生成成功率 > 90%

### 用户体验
- [ ] 对话自然流畅
- [ ] 提示清晰友好
- [ ] 错误处理得当

---

## 🎯 成功标准

### 必须满足
1. ✅ AI 能够正确识别用户意图
2. ✅ 逐步收集主题、风格、情感
3. ✅ 用户确认后触发图片生成
4. ✅ metadata 正确传递
5. ✅ 无工作流错误

### 期望达到
1. ✅ 对话自然、友好
2. ✅ 能够一次性识别多个信息
3. ✅ 提供有用的灵感建议
4. ✅ 处理用户修改请求
5. ✅ 错误处理友好

---

## 📞 支持

如果遇到问题：
1. 查看 [故障排除文档](./REFACTOR_IMPLEMENTATION_SUMMARY.md#故障排除)
2. 检查 [N8N 常见问题](../../podcast-system/N8N_SUPABASE_COMMON_ISSUES.md)
3. 查看 N8N 执行日志
4. 联系开发团队

---

**文档版本**: 1.0  
**创建日期**: 2025-01-12  
**作者**: 开发团队
