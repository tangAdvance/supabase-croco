# 小鳄鱼助手 (CrocoAssistant) - 后端系统

## 📋 项目概述

小鳄鱼助手是一个面向 6-15 岁儿童的 AI 教育助手，提供个性化对话和播客推送功能。

**技术栈**：
- **Supabase**: 数据库 + Edge Functions + Storage + Realtime
- **N8N Cloud**: AI 工作流编排
- **DeepSeek**: AI 对话模型
- **ElevenLabs**: 文字转语音

---

## 🚀 快速导航

### 核心功能

1. **聊天系统** - AI 对话和记忆系统
   - 📂 代码: `supabase/functions/chat-handler/`
   - 📄 工作流: `n8n.json`
   - 📖 文档: `README_MEMORY_SYSTEM.md`
   - 📖 架构: `.kiro/specs/chat-backend-architecture/`

2. **播客推送系统** - 每日个性化播客
   - 📂 文档: `podcast-system/`
   - 📄 工作流: `podcast-system/podcast-push-workflow.json`
   - 📖 入口: `podcast-system/README.md`

3. **多模态认知适配器** - 年龄分层系统
   - 📂 提示词: `.kiro/prompts/`
   - 📖 规范: `.kiro/specs/multimodal-cognitive-adapter/`
   - 📖 入口: `.kiro/prompts/README.md`

### 数据库

- 📄 Schema: `db.sql`
- 📄 设计文档: `数据库设计文档 v1.0.docx`

### 产品文档

- 📄 产品策略: `小鳄鱼助手 (CrocoAssistant) 产品策略.docx`

---

## 📁 项目结构

```
项目根目录/
├── .kiro/specs/                       # 项目规范和设计文档
│   └── chat-backend-architecture/     # 聊天后端架构
├── supabase/functions/                # Supabase Edge Functions
│   └── chat-handler/                  # 聊天处理函数
├── podcast-system/                    # 播客推送系统文档
├── db.sql                            # 数据库 schema
├── n8n.json                          # 聊天系统 N8N 工作流
├── README_MEMORY_SYSTEM.md           # 记忆系统文档
├── PROJECT_STRUCTURE.md              # 详细的项目组织说明
└── ISSUES.md                         # 问题追踪
```

详细的项目组织说明请查看 `PROJECT_STRUCTURE.md`。

---

## 🎯 功能特性

### 聊天系统

- ✅ **多角色支持**: 小狐狸（科技）、小乌龟（历史）等
- ✅ **意图识别**: 作业、知识问答、情感支持、闲聊
- ✅ **对话模式**: 苏格拉底式、情感支持、正常对话
- ✅ **AI 记忆**: 自动提取和存储用户信息
- ✅ **用户画像**: 年龄、兴趣、学习目标等
- ✅ **年龄分层**: 根据年龄自动调整对话风格（6-9岁/10-12岁/13-15岁）

### 播客推送系统

- ✅ **定时推送**: 每天早上 7:00 自动推送
- ✅ **个性化内容**: 结合用户年龄、兴趣和记忆
- ✅ **年龄适配**: 6-9岁、10-12岁、13-15岁三个阶段
- ✅ **实时通知**: Supabase Realtime 推送
- ✅ **音频生成**: 文章自动转语音

### 多模态认知适配器

- ✅ **年龄分层**: 三个认知发展阶段（启蒙期、探索期、深化期）
- ✅ **提示词管理**: 集中管理所有模态的提示词模板
- ✅ **对话适配**: 已实现对话模态的年龄分层
- ✅ **播客适配**: 已实现播客模态的年龄分层
- 🚧 **多模态扩展**: 预留图片、文章、音乐等模态接口

---

## 🛠️ 开发指南

### 环境要求

- Node.js 18+
- Deno 1.37+（用于 Edge Functions）
- Supabase CLI
- N8N Cloud 账号

### 部署指南

**聊天系统**：
```bash
cd supabase/functions/chat-handler
./deploy.sh
```
详细步骤查看 `supabase/functions/chat-handler/QUICK_DEPLOY.md`

**播客系统**：
1. 导入 N8N 工作流: `podcast-system/podcast-push-workflow.json`
2. 配置环境变量和凭证
3. 激活定时器

详细步骤查看 `podcast-system/QUICK_DEPLOY_GUIDE.md`

---

## 📊 数据库表

### 核心表

- `users` - 用户信息
- `characters` - AI 角色配置
- `conversations` - 对话会话
- `messages` - 消息记录
- `user_profile` - 用户画像
- `character_user_memories` - 角色记忆
- `podcasts` - 播客内容
- `user_podcast_feeds` - 用户播客推送记录

完整 schema 查看 `db.sql`

---

## 🧪 测试

### 聊天系统测试

```bash
cd supabase/functions/chat-handler
deno test --allow-all
```

### 播客系统测试

在 N8N Cloud 中手动执行工作流，查看执行日志。

---

## 📖 文档索引

### 入门文档

- `README.md` - 本文档（项目概览）
- `PROJECT_STRUCTURE.md` - 项目组织详细说明
- `README_MEMORY_SYSTEM.md` - 记忆系统说明

### 功能文档

- `podcast-system/README.md` - 播客系统导航
- `podcast-system/PODCAST_MVP_DESIGN.md` - 播客系统设计
- `podcast-system/QUICK_DEPLOY_GUIDE.md` - 播客系统部署

### 技术文档

- `.kiro/specs/chat-backend-architecture/requirements.md` - 需求文档
- `.kiro/specs/chat-backend-architecture/design.md` - 设计文档
- `supabase/functions/chat-handler/DEPLOYMENT.md` - 部署文档

### 问题追踪

- `ISSUES.md` - 临时问题记录
- `podcast-system/N8N_SUPABASE_COMMON_ISSUES.md` - N8N/Supabase 常见问题

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

### Q2: 如何修改播客推送时间？

在 N8N 工作流中，修改 "定时器" 节点的 cron 表达式。

### Q3: 如何查看错误日志？

- **Edge Functions**: Supabase Dashboard → Logs → Edge Functions
- **N8N**: N8N Cloud → Executions
- **Database**: Supabase Dashboard → Logs → Postgres Logs

---

## 🎯 开发路线图

### 已完成 ✅

- [x] 聊天系统基础功能
- [x] AI 记忆提取和存储
- [x] 播客推送 MVP
- [x] 年龄阶段适配

### 进行中 🚧

- [ ] 播客系统测试和优化
- [ ] 前端 Realtime 集成

### 计划中 📋

- [ ] 用户订阅管理
- [ ] 内容质量评分
- [ ] 智能推荐算法
- [ ] 用户反馈分析

---

## 📞 支持

### 获取帮助

1. **查看文档**: 先查看对应功能的文档
2. **检查日志**: 查看 Supabase 和 N8N 的执行日志
3. **问题追踪**: 查看 `ISSUES.md` 和 `N8N_SUPABASE_COMMON_ISSUES.md`

### 报告问题

在 `ISSUES.md` 或对应功能的 `COMMON_ISSUES.md` 中添加问题描述和解决方案。

---

## 📄 许可证

[待添加]

---

**项目版本**: 1.0  
**最后更新**: 2025-01-08  
**维护者**: 开发团队
