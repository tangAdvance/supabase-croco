# 部署指南 (Deployment Guide)

本文档描述如何部署小鳄鱼助手聊天后端到生产环境。

## 前置要求

1. **Supabase CLI** - 用于部署边缘函数
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # 其他平台
   # 参考: https://supabase.com/docs/guides/cli
   ```

2. **Supabase 项目** - 已创建的 Supabase 项目
   - 项目 URL (SUPABASE_URL)
   - Service Role Key (SUPABASE_SERVICE_ROLE_KEY)

3. **N8N 实例** - 已部署的 N8N 工作流
   - Webhook URL (N8N_WEBHOOK_URL)

## 环境变量配置

### 步骤 1: 获取 Supabase 凭证

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **API**
4. 复制以下信息:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** (secret) → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **安全提示**: Service Role Key 拥有完全数据库访问权限，请妥善保管！

### 步骤 2: 获取 N8N Webhook URL

1. 登录你的 N8N 实例
2. 打开 "小鳄鱼助手 MVP" 工作流
3. 点击 **Webhook** 节点
4. 复制 **Production URL** → `N8N_WEBHOOK_URL`
   - 格式: `https://your-n8n-instance.com/webhook/croco-chat`

### 步骤 3: 配置环境变量

#### 方法 A: 通过 Supabase Dashboard (推荐)

1. 进入 **Edge Functions** > **chat-handler**
2. 点击 **Settings** 标签
3. 添加以下环境变量:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/croco-chat
ENVIRONMENT=production
```

#### 方法 B: 通过 Supabase CLI

```bash
# 设置环境变量
supabase secrets set SUPABASE_URL=https://your-project-ref.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
supabase secrets set N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/croco-chat
supabase secrets set ENVIRONMENT=production

# 查看已设置的环境变量
supabase secrets list
```

## 部署边缘函数

### 步骤 1: 登录 Supabase CLI

```bash
# 登录 Supabase
supabase login

# 链接到你的项目
supabase link --project-ref your-project-ref
```

### 步骤 2: 部署函数

```bash
# 部署 chat-handler 函数
supabase functions deploy chat-handler

# 或者部署所有函数
supabase functions deploy
```

### 步骤 3: 验证部署

```bash
# 查看函数状态
supabase functions list

# 查看函数日志
supabase functions logs chat-handler
```

## 测试部署

### 使用 curl 测试

```bash
# 替换为你的实际值
PROJECT_REF="your-project-ref"
ANON_KEY="your-anon-key"

curl -X POST \
  "https://${PROJECT_REF}.supabase.co/functions/v1/chat-handler" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "characterId": "test-character-id",
    "message": "你好"
  }'
```

### 预期响应

```json
{
  "response": "你好！我是小鳄鱼助手🐊...",
  "intentType": "chat",
  "mode": "normal",
  "timestamp": "2024-01-06T12:00:00.000Z",
  "conversationId": "uuid-here",
  "messageId": "uuid-here"
}
```

## 部署 N8N 工作流

### 步骤 1: 导入工作流

1. 登录 N8N
2. 点击 **Import from File**
3. 选择 `n8n.json` 文件
4. 工作流将被导入

### 步骤 2: 配置凭证

1. 打开导入的工作流
2. 配置 **DeepSeek Chat Model** 节点:
   - 添加 DeepSeek API 凭证
   - API Key 从 [DeepSeek Platform](https://platform.deepseek.com) 获取

### 步骤 3: 激活工作流

1. 点击右上角的 **Inactive** 开关
2. 确认工作流状态变为 **Active**
3. 复制 Webhook URL

### 步骤 4: 更新 Edge Function 环境变量

将 N8N Webhook URL 更新到 Supabase 环境变量中:

```bash
supabase secrets set N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/croco-chat
```

## 监控和日志

### 查看 Edge Function 日志

```bash
# 实时查看日志
supabase functions logs chat-handler --follow

# 查看最近的日志
supabase functions logs chat-handler --limit 100
```

### 查看 N8N 执行日志

1. 进入 N8N Dashboard
2. 点击 **Executions**
3. 查看工作流执行历史和错误

## 故障排查

### 问题 1: 环境变量未生效

**症状**: 函数返回 "N8N_WEBHOOK_URL environment variable is not set"

**解决方案**:
```bash
# 检查环境变量是否设置
supabase secrets list

# 重新设置环境变量
supabase secrets set N8N_WEBHOOK_URL=your-webhook-url

# 重新部署函数
supabase functions deploy chat-handler
```

### 问题 2: N8N 调用超时

**症状**: 函数返回 "N8N workflow timeout after 30 seconds"

**解决方案**:
1. 检查 N8N 实例是否正常运行
2. 检查 N8N Webhook URL 是否正确
3. 检查 N8N 工作流是否激活
4. 查看 N8N 执行日志排查问题

### 问题 3: 数据库连接失败

**症状**: 函数返回数据库相关错误

**解决方案**:
1. 检查 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 是否正确
2. 确认数据库表结构已创建 (运行 `db.sql`)
3. 确认数据库索引已创建 (运行 `db-indexes.sql`)

## 回滚部署

如果部署出现问题，可以回滚到之前的版本:

```bash
# 查看部署历史
supabase functions list --with-versions

# 回滚到指定版本
supabase functions deploy chat-handler --version <version-id>
```

## 性能优化建议

1. **数据库索引**: 确保已运行 `db-indexes.sql` 创建必要的索引
2. **连接池**: 边缘函数已实现连接池复用，无需额外配置
3. **N8N 优化**: 确保 N8N 实例有足够的资源 (CPU/内存)
4. **监控**: 定期查看日志，监控响应时间和错误率

## 安全检查清单

- [ ] Service Role Key 已妥善保管，未提交到版本控制
- [ ] 环境变量已在 Supabase Dashboard 中正确配置
- [ ] N8N Webhook URL 使用 HTTPS
- [ ] 数据库 RLS (Row Level Security) 策略已配置
- [ ] API 访问已限制 (如需要，配置 CORS)

## 下一步

部署完成后，建议:

1. 运行端到端测试 (Task 12)
2. 配置监控和告警
3. 准备生产环境文档
4. 培训团队成员使用新系统

## 参考资源

- [Supabase Edge Functions 文档](https://supabase.com/docs/guides/functions)
- [Supabase CLI 文档](https://supabase.com/docs/reference/cli)
- [N8N 文档](https://docs.n8n.io/)
- [DeepSeek API 文档](https://platform.deepseek.com/docs)
