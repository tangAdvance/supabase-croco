# N8N 和 Supabase 常见问题追踪

## 📋 文档说明

本文档用于记录在使用 N8N 和 Supabase 过程中遇到的常见错误和解决方案。

**更新方式**：每次遇到新问题时，请在对应分类下添加问题和解决方案。

---

## 🔧 N8N 常见问题

### 1. Code 节点数据访问

#### ❌ 错误写法
```javascript
// 访问前一个节点的数据
const previousData = $('节点名称').item.json;
```

#### ✅ 正确写法
```javascript
// 获取上一个节点的第一条数据
const previousData = $('节点名称').first().json;

// 获取所有数据
const allData = $('节点名称').all();

// 获取当前项
const currentItem = $input.item.json;
```

**原因**：N8N 的数据访问方法需要使用 `.first()` 或 `.all()` 来获取数据。

---

### 2. Loop Over Items 节点

#### ❌ 错误配置
```
Loop Over Items 节点直接连接到需要循环的节点
```

#### ✅ 正确配置
```
1. Loop Over Items 节点设置：
   - Batch Size: 1（每次处理一条）
   - 输入数据：上一个节点的数组

2. 在循环内的节点中访问当前项：
   const currentItem = $input.item.json;
```

**原因**：Loop Over Items 会将数组拆分成单个项，循环内的节点需要使用 `$input` 访问当前项。

---

### 3. HTTP Request 超时

#### ❌ 问题
```
HTTP Request 节点调用外部 API 时超时
```

#### ✅ 解决方案
```javascript
// 在 HTTP Request 节点中设置
{
  "timeout": 30000,  // 30 秒超时
  "retry": {
    "maxRetries": 3,
    "retryDelay": 1000
  }
}
```

**原因**：默认超时时间可能太短，需要根据 API 响应时间调整。

---

### 4. JSON 解析错误

#### ❌ 错误
```javascript
// 直接解析可能不是 JSON 的字符串
const data = JSON.parse($input.item.json.response);
```

#### ✅ 正确写法
```javascript
// 添加错误处理
let data;
try {
  data = JSON.parse($input.item.json.response);
} catch (e) {
  console.error('JSON 解析失败:', e);
  data = { response: $input.item.json.response };
}
return data;
```

**原因**：AI 返回的内容可能不是标准 JSON，需要容错处理。

---

### 5. 环境变量访问

#### ❌ 错误写法
```javascript
const apiKey = process.env.API_KEY;
```

#### ✅ 正确写法
```javascript
// 在 N8N Cloud 中使用
const apiKey = $env.API_KEY;

// 或者在节点配置中直接使用
// {{$env.API_KEY}}
```

**原因**：N8N 有自己的环境变量访问方式。

---

## 🗄️ Supabase 常见问题

### 1. Service Role Key vs Anon Key

#### ❌ 错误使用
```javascript
// 在 N8N 中使用 Anon Key 进行管理操作
const { data } = await supabase
  .from('users')
  .insert({ ... });  // 可能因为 RLS 策略失败
```

#### ✅ 正确使用
```javascript
// N8N 中应该使用 Service Role Key
// 在 N8N 凭证配置中使用 Service Role Secret

// Service Role Key 可以绕过 RLS 策略
```

**原因**：
- **Anon Key**：用于前端，受 RLS（Row Level Security）策略限制
- **Service Role Key**：用于后端，可以绕过 RLS 策略

---

### 2. Storage 上传权限

#### ❌ 错误
```
上传文件到 Storage 时返回 403 Forbidden
```

#### ✅ 解决方案
```sql
-- 创建正确的 Storage 策略
CREATE POLICY "Service Role Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'podcasts' );

-- 允许公开读取
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'podcasts' );
```

**检查清单**：
1. ✅ Bucket 是否已创建
2. ✅ Bucket 是否设置为 Public
3. ✅ 策略是否正确配置
4. ✅ 使用 Service Role Key

---

### 3. Realtime 订阅不生效

#### ❌ 问题
```javascript
// 前端订阅但收不到推送
const subscription = supabase
  .channel('podcast-feeds')
  .on('postgres_changes', { ... })
  .subscribe();
```

#### ✅ 解决方案
```sql
-- 1. 在 Supabase Dashboard 启用 Realtime
-- Database → Replication → 启用对应表的 Realtime

-- 2. 检查订阅状态
subscription.on('subscribe', (status) => {
  console.log('订阅状态:', status);
});

-- 3. 确保 filter 正确
filter: `user_id=eq.${userId}`  // 注意格式
```

**检查清单**：
1. ✅ 表的 Realtime 是否启用
2. ✅ 订阅的 filter 是否正确
3. ✅ 网络连接是否正常
4. ✅ 使用正确的 Anon Key

---

### 4. 查询性能问题

#### ❌ 慢查询
```sql
-- 没有索引的查询
SELECT * FROM messages 
WHERE conversation_id = 'xxx' 
ORDER BY created_at DESC;
```

#### ✅ 优化方案
```sql
-- 创建索引
CREATE INDEX idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- 限制返回数量
SELECT * FROM messages 
WHERE conversation_id = 'xxx' 
ORDER BY created_at DESC 
LIMIT 10;
```

**原因**：大表查询需要索引支持。

---

### 5. RLS 策略调试

#### ❌ 问题
```
查询返回空数组，但数据确实存在
```

#### ✅ 调试方法
```sql
-- 1. 临时禁用 RLS 测试
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- 2. 检查策略
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- 3. 测试策略
SELECT * FROM your_table WHERE ...;  -- 使用 Anon Key

-- 4. 重新启用 RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

**常见原因**：
- RLS 策略过于严格
- 使用了错误的 Key（Anon vs Service Role）
- 策略中的条件不匹配

---

## 🔗 N8N + Supabase 集成问题

### 1. Supabase 节点配置

#### ✅ 正确配置
```
凭证配置：
- Host: your-project.supabase.co（不要加 https://）
- Service Role Secret: eyJ...（完整的 Service Role Key）

节点配置：
- Operation: Insert / Select / Update / Delete
- Table: 表名（不要加 public.）
- Return Fields: * 或指定字段
```

---

### 2. 数据类型转换

#### ❌ 错误
```javascript
// 直接传递字符串给数组字段
{
  tags: "科技,历史"  // 错误
}
```

#### ✅ 正确
```javascript
// 转换为数组
{
  tags: ["科技", "历史"]  // 正确
}

// 或者在 Code 节点中处理
const tags = $input.item.json.tags.split(',');
return { tags };
```

---

### 3. UUID 生成

#### ✅ 在 N8N 中生成 UUID
```javascript
// 使用 crypto 模块
const { randomUUID } = require('crypto');
const podcastId = randomUUID();

return { podcast_id: podcastId };
```

---

## 📝 问题报告模板

当遇到新问题时，请按以下格式添加：

```markdown
### X. 问题标题

#### ❌ 错误现象
描述错误现象和错误信息

#### ✅ 解决方案
提供解决方案和代码示例

**原因**：解释为什么会出现这个问题

**检查清单**（可选）：
1. ✅ 检查项 1
2. ✅ 检查项 2
```

---

## 🔍 调试技巧

### N8N 调试

1. **查看执行日志**：
   - N8N Cloud → Executions
   - 点击具体执行查看每个节点的输入输出

2. **使用 Console 节点**：
   ```javascript
   console.log('调试信息:', $input.item.json);
   return $input.item.json;
   ```

3. **测试单个节点**：
   - 点击节点的 "Execute Node" 按钮
   - 查看输出结果

### Supabase 调试

1. **查看 SQL 日志**：
   - Supabase Dashboard → Logs → Postgres Logs

2. **使用 SQL Editor 测试**：
   - 直接在 SQL Editor 中运行查询
   - 验证数据和策略

3. **检查 API 日志**：
   - Supabase Dashboard → Logs → API Logs
   - 查看请求和响应

---

**文档版本**：1.0  
**创建日期**：2025-01-08  
**维护者**：开发团队

**更新记录**：
- 2025-01-08：初始版本，添加基础问题
