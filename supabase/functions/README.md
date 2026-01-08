# Chat Backend Architecture - Supabase Edge Functions

## 项目概述

小鳄鱼助手聊天后端的 Supabase Edge Functions，负责数据聚合、N8N 工作流调用和消息持久化。

## 快速开始

### 🚀 5 分钟快速部署

查看 [快速部署指南](./chat-handler/QUICK_DEPLOY.md) 快速部署到生产环境。

### 💻 本地开发

```bash
# 1. 配置环境变量
cd chat-handler
cp .env.local.example .env.local
# 编辑 .env.local 填入实际值

# 2. 启动本地服务器
supabase functions serve chat-handler

# 3. 测试函数
curl -X POST http://localhost:54321/functions/v1/chat-handler \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","characterId":"test","message":"你好"}'
```

## 项目结构

```
supabase/functions/
├── deno.json                    # Deno 配置文件
├── README.md                    # 本文件
└── chat-handler/                # 聊天处理边缘函数
    ├── index.ts                 # 主入口文件
    ├── types.ts                 # TypeScript 类型定义
    ├── validation.ts            # 参数验证
    ├── error-handler.ts         # 错误处理
    ├── db.ts                    # 数据库操作
    ├── connection-pool.ts       # 连接池管理
    ├── health-check.ts          # 健康检查
    ├── *.test.ts                # 单元测试
    ├── deploy.sh                # 部署脚本 🔧
    ├── setup-env.sh             # 环境配置脚本 🔧
    ├── verify-deployment.sh     # 部署验证脚本 🔧
    ├── QUICK_DEPLOY.md          # 快速部署指南 📖
    ├── DEPLOYMENT.md            # 完整部署文档 📖
    ├── ENV_VARIABLES.md         # 环境变量说明 📖
    └── PERFORMANCE_OPTIMIZATION.md # 性能优化 📖
```

## 功能特性

### chat-handler 函数

主聊天处理函数，实现以下功能：

✅ **数据聚合** (Requirements 1.1-1.5)
- 并行查询用户上下文、角色配置、对话历史、记忆
- 聚合完整上下文数据

✅ **N8N 工作流调用** (Requirements 2.1, 2.6)
- 调用 N8N 进行 AI 编排
- 30 秒超时控制

✅ **消息持久化** (Requirements 3.1-3.5)
- 异步存储用户消息和 AI 响应
- 记录元数据（intent、mode、tokens）

✅ **记忆管理** (Requirements 4.1-4.5)
- 自动提取对话记忆
- 记忆去重和更新

✅ **错误处理** (Requirements 7.1-7.4)
- 统一错误处理
- 详细错误日志

✅ **性能优化** (Requirements 8.1-8.5)
- 连接池复用
- 并行查询
- 异步写入

## 类型定义

所有接口和类型定义都在 `chat-handler/types.ts` 中：

### 请求/响应接口
- `ChatRequest` - 客户端请求接口
- `ChatResponse` - 成功响应接口
- `ErrorResponse` - 错误响应接口

### N8N 工作流接口
- `N8NRequest` - 发送给 N8N 的请求
- `N8NResponse` - N8N 返回的响应

### 数据模型
- `UserContext` - 用户上下文
- `Character` - AI 角色配置
- `Message` - 消息记录
- `Memory` - 角色记忆
- `Conversation` - 对话会话

### 自定义错误类
- `ValidationError` - 参数验证错误
- `AuthorizationError` - 权限错误
- `NotFoundError` - 资源不存在错误

## 部署指南

### 方法 1: 使用自动化脚本 (推荐)

```bash
cd chat-handler

# 配置环境变量
./setup-env.sh

# 部署函数
./deploy.sh

# 验证部署
./verify-deployment.sh
```

### 方法 2: 手动部署

```bash
# 登录并链接项目
supabase login
supabase link --project-ref your-project-ref

# 设置环境变量
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
supabase secrets set N8N_WEBHOOK_URL=https://n8n.example.com/webhook/croco-chat

# 部署函数
supabase functions deploy chat-handler
```

详细说明请查看：
- 📖 [快速部署指南](./chat-handler/QUICK_DEPLOY.md) - 5 分钟快速部署
- 📖 [完整部署文档](./chat-handler/DEPLOYMENT.md) - 详细部署说明
- 📖 [环境变量说明](./chat-handler/ENV_VARIABLES.md) - 环境变量配置

## 开发指南

### 运行测试

```bash
# 运行所有测试
deno test --allow-all --allow-env

# 运行特定测试文件
deno test --allow-all --allow-env chat-handler/db.test.ts

# 查看测试覆盖率
deno test --allow-all --allow-env --coverage=coverage
```

### 代码格式化

```bash
# 格式化代码
deno fmt

# 检查格式
deno fmt --check
```

### 代码检查

```bash
# 运行 linter
deno lint
```

## 环境变量

所有函数需要以下环境变量：

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 项目 URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role 密钥 | ✅ |
| `N8N_WEBHOOK_URL` | N8N Webhook URL | ✅ |
| `ENVIRONMENT` | 运行环境 | ⚪ |

详细说明请查看 [ENV_VARIABLES.md](./chat-handler/ENV_VARIABLES.md)

## 监控和日志

```bash
# 查看实时日志
supabase functions logs chat-handler --follow

# 查看最近日志
supabase functions logs chat-handler --limit 100

# 查看特定时间范围的日志
supabase functions logs chat-handler --since 1h
```

## API 文档

### POST /chat-handler

**请求体**:
```json
{
  "userId": "uuid",
  "characterId": "uuid",
  "conversationId": "uuid (optional)",
  "message": "string"
}
```

**成功响应** (200):
```json
{
  "response": "AI 回复内容",
  "intentType": "chat|homework|knowledge|emotional",
  "mode": "normal|socratic|emotional",
  "timestamp": "2024-01-06T12:00:00.000Z",
  "conversationId": "uuid",
  "messageId": "uuid"
}
```

**错误响应** (4xx/5xx):
```json
{
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

## 性能指标

- ⚡ 平均响应时间: < 2 秒
- 🔄 并发支持: 高并发
- 💾 连接池: 自动管理
- 📊 数据库查询: 并行优化

详细优化建议请查看 [PERFORMANCE_OPTIMIZATION.md](./chat-handler/PERFORMANCE_OPTIMIZATION.md)

## 故障排查

### 常见问题

1. **环境变量未生效**
   ```bash
   supabase secrets list
   supabase functions deploy chat-handler
   ```

2. **N8N 调用超时**
   - 检查 N8N 实例状态
   - 验证 Webhook URL
   - 查看 N8N 执行日志

3. **数据库连接失败**
   - 验证 SUPABASE_URL 和 SERVICE_ROLE_KEY
   - 检查数据库表结构
   - 确认索引已创建

详细故障排查请查看 [DEPLOYMENT.md](./chat-handler/DEPLOYMENT.md#故障排查)

## 需求映射

本项目实现了以下需求：

- ✅ Requirements 1.1-1.5: 边缘函数数据聚合
- ✅ Requirements 2.1, 2.6: N8N 工作流简化
- ✅ Requirements 3.1-3.5: 消息持久化
- ✅ Requirements 4.1-4.5: 角色记忆提取
- ✅ Requirements 5.1-5.4: API 接口规范
- ✅ Requirements 6.1-6.5: 会话管理
- ✅ Requirements 7.1-7.4: 错误处理和日志
- ✅ Requirements 8.1-8.5: 性能优化
- ✅ Requirements 9.1-9.5: 角色配置支持
- ✅ Requirements 10.1-10.4: 用户画像集成

## 相关资源

- 📖 [项目设计文档](../../.kiro/specs/chat-backend-architecture/design.md)
- 📖 [项目需求文档](../../.kiro/specs/chat-backend-architecture/requirements.md)
- 📖 [实施任务列表](../../.kiro/specs/chat-backend-architecture/tasks.md)
- 🔗 [Supabase Edge Functions 文档](https://supabase.com/docs/guides/functions)
- 🔗 [Deno 文档](https://deno.land/manual)

## 下一步

1. ✅ 完成环境配置 (Task 11.1)
2. ✅ 部署 Edge Function (Task 11.2)
3. 🔄 部署 N8N 工作流 (Task 11.3)
4. ⏭️ 运行端到端测试 (Task 12)
5. ⏭️ 配置监控和告警
