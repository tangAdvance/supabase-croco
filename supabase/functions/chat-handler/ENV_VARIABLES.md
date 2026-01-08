# 环境变量说明 (Environment Variables Documentation)

本文档详细说明 Chat Handler Edge Function 所需的所有环境变量。

## 必需环境变量 (Required)

### SUPABASE_URL

**描述**: Supabase 项目的 API URL

**格式**: `https://<project-ref>.supabase.co`

**获取方式**:
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **API**
4. 复制 **Project URL**

**示例**:
```
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

**用途**:
- 连接到 Supabase 数据库
- 执行数据查询和写入操作

---

### SUPABASE_SERVICE_ROLE_KEY

**描述**: Supabase Service Role 密钥，拥有完全数据库访问权限

**格式**: 长字符串 (JWT token)

**获取方式**:
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **Settings** > **API**
4. 复制 **Service Role Key** (secret)

**示例**:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**安全警告** ⚠️:
- **绝对不要**将此密钥提交到版本控制
- **绝对不要**在客户端代码中使用此密钥
- 此密钥绕过所有 Row Level Security (RLS) 策略
- 仅在服务端代码中使用

**用途**:
- 以管理员权限访问数据库
- 绕过 RLS 策略执行操作

---

### N8N_WEBHOOK_URL

**描述**: N8N 工作流的 Webhook URL

**格式**: `https://<n8n-instance>/webhook/<webhook-path>`

**获取方式**:
1. 登录你的 N8N 实例
2. 打开 "小鳄鱼助手 MVP" 工作流
3. 点击 **Webhook** 节点
4. 复制 **Production URL**

**示例**:
```
# 生产环境
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/croco-chat

# 本地开发
N8N_WEBHOOK_URL=http://localhost:5678/webhook/croco-chat
```

**用途**:
- 调用 N8N 工作流进行 AI 编排
- 传递聊天上下文给 N8N
- 接收 AI 生成的响应

**超时设置**:
- 默认超时: 30 秒
- 如果 N8N 响应超过 30 秒，请求将失败

---

## 可选环境变量 (Optional)

### ENVIRONMENT

**描述**: 当前运行环境标识

**格式**: 字符串

**可选值**:
- `development` - 本地开发环境
- `staging` - 预发布环境
- `production` - 生产环境

**默认值**: `production`

**示例**:
```
ENVIRONMENT=production
```

**用途**:
- 日志级别控制
- 错误信息详细程度
- 调试功能开关

---

## 环境变量配置方法

### 方法 1: 本地开发 (.env.local)

1. 复制示例文件:
   ```bash
   cp supabase/functions/chat-handler/.env.local.example \
      supabase/functions/chat-handler/.env.local
   ```

2. 编辑 `.env.local` 文件，填入实际值

3. 启动本地开发服务器:
   ```bash
   supabase functions serve chat-handler
   ```

### 方法 2: 使用配置脚本

```bash
# 运行交互式配置脚本
./supabase/functions/chat-handler/setup-env.sh
```

### 方法 3: Supabase CLI (生产环境)

```bash
# 设置单个环境变量
supabase secrets set SUPABASE_URL=https://your-project.supabase.co

# 批量设置
supabase secrets set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-key \
  N8N_WEBHOOK_URL=https://n8n.example.com/webhook/croco-chat \
  ENVIRONMENT=production

# 查看已设置的环境变量
supabase secrets list

# 删除环境变量
supabase secrets unset VARIABLE_NAME
```

### 方法 4: Supabase Dashboard (生产环境)

1. 进入 **Edge Functions** > **chat-handler**
2. 点击 **Settings** 标签
3. 在 **Environment Variables** 部分添加变量
4. 点击 **Save**

---

## 环境变量验证

### 启动时验证

Edge Function 在启动时会验证必需的环境变量:

```typescript
// 在 index.ts 中
const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

if (!n8nWebhookUrl) {
  throw new Error('N8N_WEBHOOK_URL environment variable is not set');
}
```

### 手动验证

```bash
# 查看所有环境变量
supabase secrets list

# 测试函数是否能正常访问环境变量
supabase functions invoke chat-handler --method POST \
  --body '{"userId":"test","characterId":"test","message":"test"}'
```

---

## 常见问题

### Q1: 环境变量设置后不生效？

**A**: 需要重新部署函数:
```bash
supabase functions deploy chat-handler
```

### Q2: 如何在本地开发中使用不同的环境变量？

**A**: 创建 `.env.local` 文件，Supabase CLI 会自动加载:
```bash
# .env.local
SUPABASE_URL=http://localhost:54321
N8N_WEBHOOK_URL=http://localhost:5678/webhook/croco-chat
```

### Q3: 如何保护敏感的环境变量？

**A**: 
1. 永远不要提交 `.env.local` 到版本控制
2. 使用 `.gitignore` 排除敏感文件
3. 在 CI/CD 中使用加密的 secrets
4. 定期轮换 Service Role Key

### Q4: 生产环境和开发环境可以使用相同的环境变量吗？

**A**: 不建议。应该:
- 开发环境: 使用测试数据库和本地 N8N
- 生产环境: 使用生产数据库和生产 N8N
- 使用不同的 Service Role Key

---

## 安全最佳实践

1. ✅ **使用环境变量管理敏感信息**
   - 不要在代码中硬编码密钥

2. ✅ **限制 Service Role Key 的使用**
   - 仅在必要时使用
   - 考虑使用更细粒度的权限

3. ✅ **定期轮换密钥**
   - 至少每 90 天轮换一次
   - 发生安全事件时立即轮换

4. ✅ **使用 HTTPS**
   - 生产环境必须使用 HTTPS
   - N8N Webhook URL 必须使用 HTTPS

5. ✅ **监控和日志**
   - 记录环境变量访问
   - 监控异常的 API 调用

---

## 相关文档

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 完整部署指南
- [Supabase Environment Variables](https://supabase.com/docs/guides/functions/secrets)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
