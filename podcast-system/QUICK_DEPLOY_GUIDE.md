# 播客推送系统 - 快速部署指南

## 🚀 快速开始（15 分钟）

### 前置条件

- ✅ Supabase 项目已创建
- ✅ N8N Cloud 账号已注册
- ✅ 数据库表已创建（users, characters, podcasts, user_podcast_feeds, character_user_memories）

---

## 📋 部署步骤

### 步骤 1：准备 API Keys（5 分钟）

#### 1.1 Supabase
```bash
# 在 Supabase Dashboard 获取
# Settings → API → Project URL
SUPABASE_URL=https://your-project.supabase.co

# Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 1.2 Tavily（搜索 API）
```bash
# 注册：https://tavily.com
# 获取 API Key
TAVILY_API_KEY=your-tavily-api-key
```

#### 1.3 ElevenLabs（TTS）
```bash
# 注册：https://elevenlabs.io
# 获取 API Key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

#### 1.4 DeepSeek（AI 模型）
```bash
# 注册：https://platform.deepseek.com
# 获取 API Key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

---

### 步骤 2：配置 Supabase Storage（3 分钟）

#### 2.1 创建 Storage Bucket

1. 登录 Supabase Dashboard
2. 进入 Storage 页面
3. 点击 "New bucket"
4. 配置：
   ```
   Name: podcasts
   Public: true (允许公开访问)
   File size limit: 50 MB
   Allowed MIME types: audio/mpeg, audio/mp3
   ```
5. 点击 "Create bucket"

#### 2.2 设置 Bucket 策略

```sql
-- 在 Supabase SQL Editor 中执行

-- 允许所有人读取
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'podcasts' );

-- 允许服务角色上传
CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'podcasts' );
```

---

### 步骤 3：导入 N8N 工作流（5 分钟）

#### 3.1 登录 N8N Cloud

访问：https://app.n8n.cloud

#### 3.2 导入工作流

1. 点击右上角 "+" → "Import from File"
2. 选择 `podcast-push-workflow.json` 文件
3. 点击 "Import"

#### 3.3 配置凭证

**Supabase 凭证**：
1. 点击任意 Supabase 节点
2. 点击 "Credential to connect with"
3. 点击 "Create New"
4. 填写：
   ```
   Name: Supabase Production
   Host: your-project.supabase.co
   Service Role Secret: your-service-role-key
   ```
5. 点击 "Save"

**DeepSeek 凭证**：
1. 点击 "DeepSeek Model" 节点
2. 点击 "Credential to connect with"
3. 点击 "Create New"
4. 填写：
   ```
   Name: DeepSeek API
   API Key: your-deepseek-api-key
   ```
5. 点击 "Save"

#### 3.4 配置环境变量

1. 点击工作流设置（右上角齿轮图标）
2. 进入 "Settings" → "Environment Variables"
3. 添加：
   ```
   TAVILY_API_KEY=your-tavily-api-key
   ELEVENLABS_API_KEY=your-elevenlabs-api-key
   ```
4. 点击 "Save"

---

### 步骤 4：测试工作流（2 分钟）

#### 4.1 手动测试

1. 点击 "Execute Workflow" 按钮
2. 观察每个节点的执行情况
3. 检查是否有错误

#### 4.2 检查数据库

```sql
-- 检查是否生成了播客
SELECT * FROM podcasts 
ORDER BY created_at DESC 
LIMIT 5;

-- 检查是否生成了推送记录
SELECT * FROM user_podcast_feeds 
ORDER BY pushed_at DESC 
LIMIT 10;
```

#### 4.3 检查 Storage

1. 进入 Supabase Dashboard → Storage → podcasts
2. 查看是否有音频文件上传

---

### 步骤 5：激活定时器（1 分钟）

1. 在 N8N 工作流页面
2. 点击右上角的开关，激活工作流
3. 确认状态显示为 "Active"

✅ **完成！** 系统将在每天早上 7:00 自动推送播客。

---

## 🧪 测试场景

### 场景 1：单用户测试

**目的**：验证完整流程

**步骤**：
1. 确保数据库中至少有 1 个用户和 1 个角色
2. 手动执行工作流
3. 检查数据库和 Storage

**预期结果**：
- ✅ podcasts 表有新记录
- ✅ user_podcast_feeds 表有新记录
- ✅ Storage 中有音频文件
- ✅ 音频可以播放

### 场景 2：多用户测试

**目的**：验证循环逻辑

**步骤**：
1. 创建 3 个测试用户（不同年龄）
2. 手动执行工作流
3. 检查每个用户是否都收到了播客

**预期结果**：
- ✅ 每个用户都有推送记录
- ✅ 不同年龄用户的文章风格不同
- ✅ 内容个性化（提到用户名字和兴趣）

### 场景 3：前端订阅测试

**目的**：验证 Realtime 推送

**前端代码**：
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// 订阅推送
const subscription = supabase
  .channel('podcast-feeds')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'user_podcast_feeds',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('新播客推送！', payload)
      alert('新播客已送达！')
    }
  )
  .subscribe()
```

**测试步骤**：
1. 打开前端页面
2. 手动执行 N8N 工作流
3. 观察是否收到推送通知

**预期结果**：
- ✅ 前端收到 Realtime 推送
- ✅ 显示通知
- ✅ 播客列表自动更新

---

## 🔍 故障排查

### 问题 1：工作流执行失败

**症状**：某个节点显示红色错误

**排查步骤**：
1. 点击错误节点查看错误信息
2. 检查凭证是否正确配置
3. 检查环境变量是否设置
4. 检查 API Key 是否有效

**常见错误**：
- `Unauthorized`: API Key 错误
- `Table not found`: 数据库表不存在
- `Bucket not found`: Storage bucket 未创建

### 问题 2：音频生成失败

**症状**：TTS 节点失败

**排查步骤**：
1. 检查 ElevenLabs API Key
2. 检查账户余额
3. 检查文章长度（不要超过 5000 字）

**解决方案**：
- 充值 ElevenLabs 账户
- 缩短文章长度
- 使用其他 TTS 服务（如 Azure TTS）

### 问题 3：音频上传失败

**症状**：Supabase Storage 节点失败

**排查步骤**：
1. 检查 bucket 是否存在
2. 检查 bucket 策略
3. 检查文件大小限制

**解决方案**：
```sql
-- 重新创建 bucket 策略
DROP POLICY IF EXISTS "Service Role Upload" ON storage.objects;

CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'podcasts' );
```

### 问题 4：前端没有收到推送

**症状**：Realtime 订阅无反应

**排查步骤**：
1. 检查 Supabase Realtime 是否启用
2. 检查订阅代码是否正确
3. 检查 user_id 是否匹配

**解决方案**：
```javascript
// 启用 Realtime
// 在 Supabase Dashboard → Database → Replication
// 启用 user_podcast_feeds 表的 Realtime

// 检查订阅状态
subscription.on('subscribe', (status) => {
  console.log('订阅状态:', status)
})
```

---

## 📊 性能监控

### N8N 执行日志

1. 进入 N8N Cloud → Executions
2. 查看每次执行的详细日志
3. 检查执行时间和错误

### Supabase 监控

1. 进入 Supabase Dashboard → Reports
2. 查看：
   - API 请求数
   - Storage 使用量
   - Database 查询性能

### 成本估算

**假设**：
- 3 个角色
- 100 个用户
- 每天生成 300 个播客

**每月成本**：
- Tavily: ~$10（3000 次搜索）
- ElevenLabs: ~$30（90,000 字符）
- DeepSeek: ~$5（300 次调用）
- Supabase Storage: ~$5（15 GB）
- **总计**: ~$50/月

---

## 🎯 优化建议

### 短期优化（1 周内）

1. **添加错误重试**：
   - 在关键节点添加 Error Trigger
   - 失败时自动重试 3 次

2. **添加日志记录**：
   - 记录每次生成的详细信息
   - 方便排查问题

3. **优化 Prompt**：
   - 根据实际效果调整 Prompt
   - 提高内容质量

### 中期优化（1 个月内）

1. **批量处理**：
   - 使用 N8N 的批量节点
   - 提高执行效率

2. **缓存机制**：
   - 缓存 Tavily 搜索结果
   - 减少重复搜索

3. **内容质量检查**：
   - 添加文章长度检查
   - 添加敏感词过滤

---

## 📞 支持

### 文档索引

- **设计文档**: `PODCAST_MVP_DESIGN.md`
- **工作流 JSON**: `podcast-push-workflow.json`
- **部署指南**: `QUICK_DEPLOY_GUIDE.md`（本文档）

### 常见问题

**Q1: 如何修改推送时间？**
A1: 在 N8N 工作流中，修改 "定时器 - 每天7点" 节点的 cron 表达式。

**Q2: 如何添加新的 AI 角色？**
A2: 在 Supabase 的 characters 表中插入新记录，确保 `is_active = true`。

**Q3: 如何调整文章长度？**
A3: 修改 "构建 AI Prompt" 节点中的 Prompt，调整字数要求。

**Q4: 如何更换 TTS 服务？**
A4: 修改 "文字转语音" 节点的 HTTP Request 配置，使用其他 TTS API。

---

**文档版本**：1.0  
**创建日期**：2025-01-06  
**维护者**：开发团队
