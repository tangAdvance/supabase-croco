# 快速部署指南 (Quick Deployment Guide)

本指南提供最快速的部署步骤，适合已经熟悉 Supabase 的开发者。

## 前置条件

- ✅ Supabase CLI 已安装
- ✅ 已有 Supabase 项目
- ✅ 已有 N8N 工作流并获取 Webhook URL

## 5 分钟快速部署

### 1. 登录并链接项目 (30 秒)

```bash
# 登录 Supabase
supabase login

# 链接到你的项目
supabase link --project-ref your-project-ref
```

### 2. 设置环境变量 (1 分钟)

```bash
# 方法 A: 使用交互式脚本 (推荐)
cd supabase/functions/chat-handler
./setup-env.sh

# 方法 B: 手动设置
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set N8N_WEBHOOK_URL=https://n8n.example.com/webhook/croco-chat
supabase secrets set ENVIRONMENT=production
```

### 3. 部署函数 (2 分钟)

```bash
# 方法 A: 使用部署脚本 (推荐)
./deploy.sh

# 方法 B: 直接部署
supabase functions deploy chat-handler --no-verify-jwt
```

### 4. 验证部署 (1 分钟)

```bash
# 方法 A: 使用验证脚本
./verify-deployment.sh

# 方法 B: 手动验证
supabase functions list
supabase secrets list
```

### 5. 测试函数 (30 秒)

```bash
# 使用 curl 测试
curl -X POST \
  "https://your-project.supabase.co/functions/v1/chat-handler" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-uuid",
    "characterId": "test-character-uuid",
    "message": "你好"
  }'
```

## 完成！🎉

你的 Edge Function 现在已经部署并运行。

## 常用命令

```bash
# 查看实时日志
supabase functions logs chat-handler --follow

# 查看最近 100 条日志
supabase functions logs chat-handler --limit 100

# 重新部署
supabase functions deploy chat-handler

# 查看环境变量
supabase secrets list

# 更新环境变量
supabase secrets set VARIABLE_NAME=new-value
```

## 故障排查

### 问题: 部署失败

```bash
# 检查 CLI 版本
supabase --version

# 更新 CLI
brew upgrade supabase

# 重新登录
supabase logout
supabase login
```

### 问题: 环境变量未生效

```bash
# 验证环境变量
supabase secrets list

# 重新部署
supabase functions deploy chat-handler
```

### 问题: 函数返回错误

```bash
# 查看详细日志
supabase functions logs chat-handler --limit 50

# 检查 N8N 是否正常
curl -X POST YOUR_N8N_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

## 下一步

- 📖 阅读完整部署文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🔧 配置环境变量: [ENV_VARIABLES.md](./ENV_VARIABLES.md)
- 🧪 运行端到端测试: Task 12
- 📊 配置监控和告警

## 需要帮助？

- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细说明
- 查看 Supabase 日志排查问题
- 检查 N8N 工作流是否正常运行
