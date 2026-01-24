# 聊天系统 (Chat System)

## 📋 项目概述

小鳄鱼助手的核心聊天系统，提供 AI 对话、记忆管理和个性化交互功能。

**状态**: ✅ 已完成并部署

---

## 🎯 核心功能

- ✅ **多角色支持**: 小狐狸（科技）、小乌龟（历史）等多个 AI 角色
- ✅ **意图识别**: 自动识别作业、知识问答、情感支持、闲聊等意图
- ✅ **对话模式**: 苏格拉底式引导、情感支持、正常对话
- ✅ **AI 记忆系统**: 自动提取和存储用户信息
- ✅ **用户画像**: 记录年龄、兴趣、学习目标等
- ✅ **年龄分层**: 根据认知发展阶段（6-9岁/10-12岁/13-15岁）自动调整对话风格

---

## 📚 文档导航

### 🌟 核心文档

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| **[README.md](./README.md)** | 本文档（导航） | 3 分钟 |
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | API 接口文档 | 10 分钟 |
| **[requirements.md](./requirements.md)** | 需求文档 | 15 分钟 |
| **[design.md](./design.md)** | 设计文档 | 20 分钟 |
| **[tasks.md](./tasks.md)** | 任务列表 | 5 分钟 |

### 📄 工作流

- **[chat-workflow.json](./chat-workflow.json)** - N8N 工作流配置（主工作流）

---

## 🏗️ 技术架构

### 系统组成

```
┌─────────────────────────────────────────────────────┐
│                    前端应用                          │
│              (Web/Mobile/小程序)                     │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/WebSocket
                     ↓
┌─────────────────────────────────────────────────────┐
│              Supabase Edge Function                  │
│           (supabase/functions/chat-handler)          │
│  - 数据聚合                                          │
│  - 参数验证                                          │
│  - 错误处理                                          │
└────────────────────┬────────────────────────────────┘
                     │ Webhook
                     ↓
┌─────────────────────────────────────────────────────┐
│                  N8N 工作流                          │
│  - AI 意图识别                                       │
│  - 对话模式选择                                      │
│  - DeepSeek AI 对话                                  │
│  - 记忆提取                                          │
│  - 响应格式化                                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│              Supabase Database                       │
│  - users (用户信息)                                  │
│  - conversations (对话会话)                          │
│  - messages (消息记录)                               │
│  - user_profile (用户画像)                           │
│  - character_user_memories (角色记忆)                │
└─────────────────────────────────────────────────────┘
```

### 数据流

```
用户消息 
  → Edge Function (数据聚合)
  → N8N (AI 意图识别)
  → N8N (选择对话模式)
  → DeepSeek AI (生成回复)
  → N8N (提取记忆)
  → Edge Function (保存到数据库)
  → 返回给用户
```

---

## 🚀 快速开始

### 1. 部署 Edge Function

```bash
cd supabase/functions/chat-handler
./deploy.sh
```

详细步骤: `supabase/functions/chat-handler/QUICK_DEPLOY.md`

### 2. 导入 N8N 工作流

1. 登录 N8N Cloud
2. 导入 `chat-workflow.json`
3. 配置环境变量（见下方）
4. 激活工作流

### 3. 配置环境变量

**Supabase Edge Function**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**N8N 工作流**:
```bash
DEEPSEEK_API_KEY=your-deepseek-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 📊 数据库表

### 核心表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户基本信息 | id, name, age, interests, grade |
| `characters` | AI 角色配置 | id, name, slug, system_prompt |
| `conversations` | 对话会话 | id, user_id, character_id, is_active |
| `messages` | 消息记录 | id, conversation_id, role, content, intent_type, mode |
| `user_profile` | 用户画像 | id, user_id, key, value, importance |
| `character_user_memories` | 角色记忆 | id, character_id, user_id, memory_key, memory_value |

完整 Schema: 查看根目录 `db.sql`

---

## 🧪 测试

### 单元测试

```bash
cd supabase/functions/chat-handler
deno test --allow-all
```

### API 测试

```bash
# 发送消息
curl -X POST https://your-project.supabase.co/functions/v1/chat-handler \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "character_id": "char-456",
    "message": "你好，小鳄鱼！",
    "conversation_id": "conv-789"
  }'
```

详细 API 文档: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🎨 对话模式

### 1. 苏格拉底式 (Socratic)

**触发条件**: 用户提问作业或知识性问题

**特点**:
- 不直接给答案
- 通过提问引导思考
- 拆解问题为小步骤

**示例**:
```
用户: "1/2 加 1/3 等于多少？"
AI: "我们来切蛋糕吧。如果你有一半蛋糕（1/2），又拿来了三分之一块（1/3），
     这两块大小不一样，能直接数数吗？我们需要把它们切成一样大的小块，
     你觉得切成几份合适？"
```

### 2. 情感支持 (Emotional Support)

**触发条件**: 用户表达负面情绪或寻求安慰

**特点**:
- 情感共鸣
- 心理抱持
- 价值观引导

**示例**:
```
用户: "我太笨了，这次考试全班倒数。"
AI: "听到你这么说，我很难过，我想抱抱你。我知道你现在一定很挫败，
     感觉像掉进洞里了一样。能告诉我，这次考试里哪一道题让你觉得
     最委屈吗？我们不谈分数，只谈那道题。"
```

### 3. 正常对话 (Normal)

**触发条件**: 闲聊、日常交流

**特点**:
- 轻松友好
- 适当幽默
- 建立关系

---

## 🧠 记忆系统

### 记忆类型

1. **用户画像** (`user_profile`)
   - 长期记忆
   - 关键信息（兴趣、学习目标、困难点）
   - 重要性评分 1-10

2. **角色记忆** (`character_user_memories`)
   - 特定角色对特定用户的记忆
   - 个性化交互
   - 上次对话内容

### 记忆提取

AI 自动从对话中提取：
- 用户兴趣
- 学习困难
- 情感状态
- 学习目标
- 重要事件

---

## 🎯 年龄分层

### 启蒙期（6-9岁）

**特点**:
- 简单易懂，短句为主
- 多用比喻、拟人、故事
- 色彩鲜艳，画面简单

**提示词**: `.kiro/prompts/chat/beginner.md`

### 探索期（10-12岁）

**特点**:
- 逻辑清晰，有因果关系
- 引导思考，提出问题
- 细节丰富，信息量适中

**提示词**: `.kiro/prompts/chat/explorer.md`

### 深化期（13-15岁）

**特点**:
- 深度分析，跨学科关联
- 批判性思考，多角度
- 专业性强，信息密度高

**提示词**: `.kiro/prompts/chat/advanced.md`

---

## 🔧 常见问题

### Q1: 如何添加新的 AI 角色？

在 Supabase 的 `characters` 表中插入新记录：

```sql
INSERT INTO characters (name, slug, personality, expertise, is_active)
VALUES (
  '小狐狸',
  'fox-assistant',
  '聪明活泼，充满好奇心',
  ARRAY['科技', '编程'],
  true
);
```

### Q2: 如何修改对话模式？

1. 编辑 N8N 工作流中的 "AI 意图识别" 节点
2. 修改 System Prompt
3. 调整模式判断逻辑

### Q3: 如何查看错误日志？

- **Edge Functions**: Supabase Dashboard → Logs → Edge Functions
- **N8N**: N8N Cloud → Executions
- **Database**: Supabase Dashboard → Logs → Postgres Logs

### Q4: 如何调整年龄分层？

编辑 `.kiro/prompts/chat/` 下的提示词文件：
- `beginner.md` - 6-9岁
- `explorer.md` - 10-12岁
- `advanced.md` - 13-15岁

---

## 📈 监控指标

### 关键指标

```sql
-- 对话统计
SELECT 
  COUNT(*) as total_conversations,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(message_count) as avg_messages_per_conversation
FROM conversations
WHERE created_at > NOW() - INTERVAL '7 days';

-- 意图分布
SELECT 
  intent_type,
  COUNT(*) as count
FROM messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY intent_type;

-- 对话模式分布
SELECT 
  mode,
  COUNT(*) as count
FROM messages
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY mode;
```

---

## 🚀 未来优化

### 短期（1-2 周）
- [ ] 优化 AI 提示词
- [ ] 添加更多对话示例
- [ ] 提升响应速度

### 中期（1-2 月）
- [ ] 添加更多 AI 角色
- [ ] 支持多轮对话上下文
- [ ] 实现对话摘要功能

### 长期（3-6 月）
- [ ] 多语言支持
- [ ] 语音对话
- [ ] 情感分析
- [ ] 个性化推荐

---

## 📞 支持

### 获取帮助

1. **查看文档**: 先查看本文件夹的文档
2. **检查日志**: 查看 Supabase 和 N8N 的执行日志
3. **问题追踪**: 查看根目录 `ISSUES.md`

### 相关资源

- **产品策略**: `小鳄鱼助手 (CrocoAssistant) 产品策略.md`
- **数据库设计**: `数据库设计文档 v1.0.md`
- **项目总览**: `README.md`
- **交付总结**: `交付总结.md`

---

**文档版本**: 1.0  
**创建日期**: 2025-01-23  
**最后更新**: 2025-01-23  
**维护者**: 开发团队
