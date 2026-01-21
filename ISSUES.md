# 问题追踪文档

## 📋 说明

本文档用于临时记录开发过程中遇到的问题和解决方案。

**注意**: 对于 N8N 和 Supabase 的常见问题，请查看 `podcast-system/N8N_SUPABASE_COMMON_ISSUES.md`

---

## 🔧 已解决的问题

### 1. N8N Code 节点数据访问

**问题**: 访问前一个节点的数据时出错

**错误写法**:
```javascript
const previousData = $('节点名称').item.json;
```

**正确写法**:
注意不是 .item 是 .first()
```javascript
const previousData = $('节点名称').first().json;
```

**解决时间**: 2025-01-07

---

## 🚧 待解决的问题

（暂无）

---

### 2. N8N 硬编码逻辑 vs AI 智能对话

**问题**: 使用硬编码的 Code 节点判断对话进度，缺乏灵活性

**错误写法**:
```javascript
// 硬编码判断对话进度
if (!context.theme) {
  response = `太好了！首先告诉我，你想画什么？🎨`;
} else if (!context.style) {
  response = `很棒的主题！现在选择画风吧！...`;
}
```

**正确写法**:
使用 AI Agent 节点进行智能对话
```javascript
// 1. Code 节点：构建 System Prompt
const systemPrompt = `你是小鳄鱼助手🐊，正在帮助孩子创作一幅图片。
通过自然对话，收集以下信息：主题、风格、情感...`;

// 2. AI Agent 节点：智能对话
// 配置: gpt-4o-mini, temperature: 0.7

// 3. Code 节点：解析 AI 响应
const parsedResponse = JSON.parse(aiResponse.output);
```

**优点**:
- ✅ 智能识别用户意图
- ✅ 自然流畅的对话
- ✅ 能够一次性识别多个信息
- ✅ 易于调整（修改 Prompt 即可）

**解决时间**: 2025-01-12

**相关文档**: 
- [重构方案](/.kiro/specs/guided-image-generation/REFACTOR_IMAGE_GENERATION_PROPOSAL.md)
- [实施总结](/.kiro/specs/guided-image-generation/REFACTOR_IMPLEMENTATION_SUMMARY.md)

---

## 📝 问题报告模板

当遇到新问题时，请按以下格式添加：

```markdown
### X. 问题标题

**问题描述**: 
详细描述问题现象

**错误信息**:
```
粘贴错误日志
```

**环境信息**:
- 系统: Supabase / N8N / Edge Function
- 时间: YYYY-MM-DD

**解决方案**:
（待解决 / 已解决的方案）

**解决时间**: YYYY-MM-DD
```

---

**文档版本**: 1.0  
**创建日期**: 2025-01-08  
**维护者**: 开发团队