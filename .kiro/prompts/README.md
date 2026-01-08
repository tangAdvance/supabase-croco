# 提示词管理系统

## 📖 概述

本目录包含小鳄鱼助手所有模态的年龄分层提示词模板。每个模态按照三个年龄阶段（启蒙期、探索期、深化期）提供不同的提示词。

---

## 📁 目录结构

```
.kiro/prompts/
├── README.md                  # 本文档
├── registry.json              # 提示词索引
├── chat/                      # 💬 对话模态
│   ├── beginner.md            # 启蒙期（6-9岁）
│   ├── explorer.md            # 探索期（10-12岁）
│   └── advanced.md            # 深化期（13-15岁）
├── podcast/                   # 🎙️ 播客模态
│   ├── beginner.md
│   ├── explorer.md
│   └── advanced.md
├── image/                     # 🖼️ 图片模态（未来）
│   ├── beginner.md
│   ├── explorer.md
│   └── advanced.md
├── article/                   # 📝 文章模态（未来）
│   ├── beginner.md
│   ├── explorer.md
│   └── advanced.md
└── music/                     # 🎵 音乐模态（未来）
    ├── beginner.md
    ├── explorer.md
    └── advanced.md
```

---

## 🎯 年龄阶段定义

### 启蒙期（6-9岁）- Beginner

**认知特点**：
- 具象思维为主
- 注意力集中时间短（10-15分钟）
- 喜欢故事和游戏
- 需要即时反馈

**内容特征**：
- 简单易懂，短句为主
- 多用比喻、拟人、故事
- 色彩鲜艳，画面简单
- 节奏明快，旋律简单

---

### 探索期（10-12岁）- Explorer

**认知特点**：
- 逻辑思维开始发展
- 好奇心强，喜欢探索
- 开始理解因果关系
- 注意力集中时间增加（20-30分钟）

**内容特征**：
- 逻辑清晰，有因果关系
- 引导思考，提出问题
- 细节丰富，信息量适中
- 多种风格，鼓励探索

---

### 深化期（13-15岁）- Advanced

**认知特点**：
- 抽象思维能力强
- 批判性思考开始形成
- 能理解复杂概念
- 注意力集中时间长（30-45分钟）

**内容特征**：
- 深度分析，跨学科关联
- 批判性思考，多角度
- 专业性强，信息密度高
- 复杂结构，多层次

---

## 🔧 使用方法

### 1. 在 Edge Function 中使用

```typescript
import { calculateAgeStage } from './age-stage-calculator.ts';
import { PromptRegistry } from './prompt-registry.ts';

// 1. 计算年龄阶段
const ageStage = calculateAgeStage(user.age);

// 2. 获取提示词
const promptRegistry = new PromptRegistry();
const template = promptRegistry.getPrompt('chat', ageStage.stage);

// 3. 构建最终提示词
const systemPrompt = buildPrompt(template, context);
```

### 2. 在 N8N 中使用

```javascript
// 在 Code 节点中
const age = $input.item.json.user.age;

// 计算年龄阶段
function getAgeStage(age) {
  if (age >= 6 && age <= 9) return 'beginner';
  if (age >= 10 && age <= 12) return 'explorer';
  if (age >= 13 && age <= 15) return 'advanced';
  return 'explorer';
}

const stage = getAgeStage(age);

// 加载对应的提示词（从环境变量或配置）
const prompt = $env[`PROMPT_CHAT_${stage.toUpperCase()}`];
```

---

## 📝 提示词模板格式

每个提示词文件包含以下部分：

```markdown
# [模态名称] - [年龄阶段]

## 元数据
- **版本**: 1.0.0
- **创建日期**: 2025-01-08
- **更新日期**: 2025-01-08
- **作者**: 产品团队

## 基础提示词

[提示词内容，支持动态参数 {{paramName}}]

## 风格指南

[详细的风格要求和注意事项]

## 示例

[好的示例和坏的示例对比]

## 动态参数

- `{{userName}}`: 用户姓名
- `{{userAge}}`: 用户年龄
- `{{userInterests}}`: 用户兴趣
- ...
```

---

## 🔄 更新流程

### 1. 修改提示词

1. 编辑对应的 `.md` 文件
2. 更新版本号和更新日期
3. 在 `registry.json` 中更新版本信息

### 2. 测试

1. 在测试环境验证新提示词
2. 收集用户反馈
3. 进行 A/B 测试（可选）

### 3. 部署

1. 提交代码到 Git
2. 部署到生产环境
3. 监控效果指标

---

## 📊 效果监控

### 关键指标

1. **用户满意度**: 用户对回复的评分
2. **对话轮次**: 平均对话轮数
3. **完成率**: 用户完成任务的比例
4. **错误率**: 不当回复的比例

### 查询示例

```sql
-- 查询不同年龄阶段的平均评分
SELECT 
  age_stage,
  AVG(user_rating) as avg_rating,
  COUNT(*) as usage_count
FROM messages
WHERE created_at > NOW() - INTERVAL '7 days'
  AND user_rating IS NOT NULL
GROUP BY age_stage;
```

---

## ⚠️ 注意事项

### 1. 参数安全

- 所有动态参数都会经过安全验证
- 避免在提示词中包含敏感信息
- 限制参数长度，防止注入攻击

### 2. 内容安全

所有提示词必须包含内容安全指令：
- 不生成暴力、色情、歧视性内容
- 不泄露用户隐私信息
- 不提供危险的建议

### 3. 版本管理

- 每次修改都要更新版本号
- 保留历史版本以便回滚
- 重大修改需要进行 A/B 测试

---

## 🚀 快速开始

### 添加新模态

1. 创建新文件夹：`.kiro/prompts/new-modality/`
2. 创建三个文件：`beginner.md`, `explorer.md`, `advanced.md`
3. 在 `registry.json` 中注册新模态
4. 更新代码以支持新模态

### 修改现有提示词

1. 找到对应文件：`.kiro/prompts/{modality}/{stage}.md`
2. 编辑内容
3. 更新版本号和日期
4. 测试并部署

---

## 📚 相关文档

- [需求文档](../.kiro/specs/multimodal-cognitive-adapter/requirements.md)
- [设计文档](../.kiro/specs/multimodal-cognitive-adapter/design.md)
- [产品策略](../../小鳄鱼助手 (CrocoAssistant) 产品策略.md)

---

**文档版本**: 1.0  
**创建日期**: 2025-01-08  
**维护者**: 开发团队
