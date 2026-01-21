# 引导式图片生成功能

## 📋 项目概述

为小鳄鱼助手添加引导式图片生成功能，通过 AI 智能对话收集用户需求（主题、风格、情感），然后调用 DALL-E 3 API 生成图片。

**状态**: ✅ 重构完成，待测试

---

## 🎯 核心功能

1. **智能意图识别**: AI 自动识别用户想要画画的意图
2. **引导式对话**: 通过自然对话收集主题、风格、情感
3. **智能识别**: 能够一次性识别多个信息
4. **图片生成**: 调用 DALL-E 3 API 生成图片
5. **实时通知**: 通过 Supabase Realtime 推送生成结果

---

## 📚 文档导航

### 🌟 重构文档（最新）
- **[重构完成总结](./REFACTOR_COMPLETE.md)** - **从这里开始！**
- [重构方案](./REFACTOR_IMAGE_GENERATION_PROPOSAL.md) - 详细设计方案
- [实施总结](./REFACTOR_IMPLEMENTATION_SUMMARY.md) - 变更对比和分析
- [快速测试指南](./QUICK_TEST_GUIDE.md) - 完整测试用例

### 核心文档
- [需求文档](./requirements.md) - 完整的功能需求和验收标准
- [设计文档](./design.md) - 技术架构和实现细节
- [任务列表](./tasks.md) - 实施任务和进度跟踪

### 实施文档
- [架构文档](./ARCHITECTURE.md) - 系统架构图
- [Task 3 实施](./TASK_3_IMPLEMENTATION.md) - AI 意图识别
- [Task 4 实施](./TASK_4_IMPLEMENTATION.md) - N8N 对话流程
- [Task 5 总结](./TASK_5_SUMMARY.md) - 数据存储和通知

### 问题修复
- [修复 trigger_generation](./FIX_TRIGGER_GENERATION.md) - 图片生成触发
- [修复数据库约束](./FIX_DATABASE_CONSTRAINTS.md) - 约束错误修复
- [数据库迁移指南](./apply_db_migration.md) - 手动迁移步骤

---

## 🚀 快速开始

### 1. 查看重构完成总结
```bash
# 阅读最新的重构文档
cat .kiro/specs/guided-image-generation/REFACTOR_COMPLETE.md
```

### 2. 部署更新的工作流
```bash
# 1. 备份已存在
ls -lh n8n.json.backup

# 2. 在 N8N 中导入 n8n.json
# 3. 配置 OpenAI API Key
# 4. 测试工作流
```

### 3. 执行数据库迁移
```sql
-- 在 Supabase Dashboard SQL Editor 中执行
-- 参考: apply_db_migration.md
```

### 4. 运行测试
```bash
# 参考测试指南
cat .kiro/specs/guided-image-generation/QUICK_TEST_GUIDE.md
```

---

## 🎨 核心改进

### 从硬编码到智能对话

**旧方式（硬编码）**:
```javascript
if (!context.theme) {
  response = "太好了！首先告诉我，你想画什么？🎨";
} else if (!context.style) {
  response = "很棒的主题！现在选择画风吧！...";
}
```

**新方式（AI 智能）**:
```
用户: "我想画一朵温暖的童话风格向日葵"
AI: 智能识别 → 提取所有信息 → 展示汇总 → 请求确认
```

### 提升的能力

| 能力 | 旧方式 | 新方式 |
|------|--------|--------|
| **智能识别** | ❌ 无 | ✅ 一次性识别多个信息 |
| **自然对话** | ❌ 僵硬 | ✅ 流畅友好 |
| **提供灵感** | ❌ 无 | ✅ 主动建议 |
| **处理修改** | ❌ 困难 | ✅ 灵活处理 |
| **可维护性** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 📊 技术架构

### 新增节点

```
AI Agent (意图识别)
  ↓
Switch
  ↓ [image_generation 路由]
图片生成智能引导 (Code)
  ↓
图片生成对话 AI (AI Agent)
  ↓
提取图片生成上下文 (Code)
  ↓
响应格式化
  ↓
Switch (检查 trigger_generation)
  ├─ true → 调用 DALL-E 3 API
  └─ false → 返回响应
```

---

## 🧪 测试用例

### 测试 1: 基础流程
```
1. "我想画一朵花"
2. "向日葵"
3. "童话绘本风"
4. "温暖快乐"
5. "确认"
```

### 测试 2: 智能识别
```
1. "我想画一朵温暖的童话风格向日葵"
2. "可以"
```

### 测试 3: 提供灵感
```
1. "我想画画，但不知道画什么"
```

**完整测试**: 参考 [快速测试指南](./QUICK_TEST_GUIDE.md)

---

## 📝 部署清单

### 前置条件
- [x] 备份原始工作流
- [x] 重构脚本执行成功
- [x] 文档完整
- [ ] OpenAI API Key 已配置
- [ ] 数据库迁移已执行

### 部署步骤
1. [ ] 在 N8N 中导入工作流
2. [ ] 配置 OpenAI API Key
3. [ ] 执行数据库迁移
4. [ ] 运行测试用例
5. [ ] 验证图片生成

---

## 📊 实现进度

### ✅ 已完成
- [x] Task 1: 数据库表设计
- [x] Task 2: Replicate API 集成
- [x] Task 3: AI 意图识别
- [x] Task 4: N8N 对话流程
- [x] Task 5: 数据存储与通知
- [x] **重构**: 从硬编码到 AI 智能对话

### 🚧 待完成
- [ ] Task 6: 测试和优化
- [ ] 部署到生产环境
- [ ] 收集用户反馈

---

## 🔧 故障排除

### 常见问题
1. **AI 不返回 JSON**: 检查 System Prompt
2. **metadata 丢失**: 验证节点连接
3. **trigger_generation 为 false**: 检查确认逻辑
4. **节点连接错误**: 确认节点名称

**详细解决方案**: 参考 [实施总结](./REFACTOR_IMPLEMENTATION_SUMMARY.md#故障排除)

---

## 📞 支持

- [问题追踪](../../ISSUES.md)
- [N8N 常见问题](../../podcast-system/N8N_SUPABASE_COMMON_ISSUES.md)
- [设计文档](./design.md)
- [需求文档](./requirements.md)

---

**文档版本**: 2.0  
**最后更新**: 2025-01-12  
**状态**: ✅ 重构完成，待测试
