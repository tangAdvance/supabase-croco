# 播客推送系统 MVP 设计文档

## 📋 需求概述

### 核心功能
每天早上 7 点，系统自动为所有用户推送个性化播客音频。

### MVP 范围
1. ✅ 每个 AI 角色给每个用户都推送
2. ✅ 固定时间：每天 7:00
3. ✅ 不做内容去重
4. ✅ 同步生成音频（不异步）
5. ✅ 根据用户年龄阶段调整文字风格
6. ✅ 使用现有数据库表（不新增表）
7. ❌ 不做内容审核
8. ❌ 不做用户反馈（使用现有 rating 字段）

---

## 🎯 用户年龄阶段划分

根据产品策略文档，用户分为 3 个阶段：

### 阶段 1：6-9 岁（启蒙期）
**文字风格**：
- 简单易懂，短句为主
- 使用童话故事、动物比喻
- 生动的画面感
- 多用拟声词和感叹词
- 避免复杂概念

**示例**：
```
"小朋友们，你们知道吗？恐龙是很久很久以前的动物哦！它们有的很大很大，像一座房子那么高！有的很小很小，只有小狗那么大。今天我们来听听霸王龙的故事吧！"
```

### 阶段 2：10-12 岁（探索期）
**文字风格**：
- 逻辑清晰，有因果关系
- 使用生活案例和实验思维
- 引导思考，提出问题
- 适当使用科学术语（但要解释）
- 鼓励探索和发现

**示例**：
```
"你有没有想过，为什么恐龙会灭绝呢？科学家们发现，大约 6500 万年前，一颗巨大的陨石撞击了地球。这次撞击引发了什么变化？让我们一起来探索这个谜团。"
```

### 阶段 3：13-15 岁（深化期）
**文字风格**：
- 跨学科关联，深度分析
- 抽象思维和深度类比
- 批判性思考
- 使用专业术语
- 引导独立思考和判断

**示例**：
```
"恐龙灭绝事件不仅是生物学问题，更涉及地质学、气候学和生态学。这次大灭绝事件如何影响了地球生态系统的演化？我们能从中学到什么关于物种适应性的启示？"
```

---

## 🔄 完整流程设计

### 流程图

```
N8N 定时器（每天 7:00）
    ↓
查询所有活跃的 AI 角色
    ↓
循环每个角色
    ↓
    查询所有用户
        ↓
        循环每个用户
            ↓
            获取用户信息（年龄、兴趣）
            ↓
            获取用户记忆（character_user_memories）
            ↓
            确定用户年龄阶段（6-9 / 10-12 / 13-15）
            ↓
            根据角色专长（expertise）确定主题
            ↓
            Tavily 搜索相关内容
            ↓
            AI 生成播客文章
            - 结合用户记忆
            - 结合角色风格
            - 适配年龄阶段文字风格
            ↓
            文章转音频（TTS）
            ↓
            保存到 podcasts 表
            ↓
            保存到 user_podcast_feeds 表
            ↓
            前端 Realtime 订阅收到推送
```

---

## 📊 数据流程

### 1. 查询 AI 角色

```sql
SELECT id, name, slug, personality, expertise, target_age_group
FROM characters
WHERE is_active = true;
```

### 2. 查询所有用户

```sql
SELECT id, name, age, interests, grade
FROM users;
```

### 3. 查询用户记忆

```sql
SELECT memory_key, memory_value, importance
FROM character_user_memories
WHERE character_id = ? AND user_id = ?
ORDER BY importance DESC
LIMIT 5;
```

### 4. 保存播客

```sql
INSERT INTO podcasts (
  title,
  content,
  audio_url,
  summary,
  tags,
  target_grades,
  duration_seconds,
  is_published
) VALUES (?, ?, ?, ?, ?, ?, ?, true)
RETURNING id;
```

### 5. 保存用户推送记录

```sql
INSERT INTO user_podcast_feeds (
  user_id,
  podcast_id,
  is_read,
  pushed_at
) VALUES (?, ?, false, NOW());
```

---

## 🎨 Prompt 设计

### 年龄阶段判断逻辑

```javascript
function getAgeStage(age) {
  if (age >= 6 && age <= 9) {
    return {
      stage: 'beginner',
      name: '启蒙期',
      style: '简单易懂，童话故事，动物比喻，生动画面感'
    };
  } else if (age >= 10 && age <= 12) {
    return {
      stage: 'explorer',
      name: '探索期',
      style: '逻辑推理，生活案例，实验思维，引导思考'
    };
  } else if (age >= 13 && age <= 15) {
    return {
      stage: 'advanced',
      name: '深化期',
      style: '跨学科关联，抽象思维，深度类比，批判性思考'
    };
  } else {
    // 默认使用探索期
    return {
      stage: 'explorer',
      name: '探索期',
      style: '逻辑推理，生活案例，实验思维，引导思考'
    };
  }
}
```

### AI 生成播客文章 Prompt

```
你是 {角色名称}，一个专注于 {角色专长} 的 AI 助手。

**用户信息：**
- 姓名：{用户姓名}
- 年龄：{用户年龄} 岁
- 年龄阶段：{年龄阶段名称}
- 兴趣：{用户兴趣}
- 年级：{用户年级}

**我对用户的了解：**
{用户记忆列表}

**今日主题：**
{从 Tavily 搜索的内容}

**任务：**
请根据以上信息，为这位用户创作一篇个性化的播客文章。

**文字风格要求（{年龄阶段}）：**
{年龄阶段文字风格描述}

**内容要求：**
1. 结合用户的兴趣和记忆，让内容更个性化
2. 使用 {角色名称} 的语气和风格
3. 文章长度：500-800 字
4. 适合转换为 3-5 分钟的音频
5. 开头要吸引人，结尾要有启发
6. 适当提及用户的名字，增加亲切感

**输出格式：**
只输出播客文章内容，不要包含任何其他说明或标记。
```

---

## 🎙️ TTS（文字转语音）

### 推荐服务

1. **ElevenLabs**（推荐）
   - 音质好
   - 支持中文
   - 有免费额度
   - API 简单

2. **Azure TTS**
   - 稳定
   - 支持多种中文声音
   - 按字符计费

3. **Google Cloud TTS**
   - 音质不错
   - 支持 SSML
   - 价格合理

### N8N 集成

使用 N8N 的 HTTP Request 节点调用 TTS API。

**ElevenLabs 示例**：
```javascript
// N8N HTTP Request 节点配置
{
  "method": "POST",
  "url": "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
  "headers": {
    "xi-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  "body": {
    "text": "{{$json.article}}",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }
}
```

---

## 📦 Supabase Storage 配置

### 存储结构

```
supabase-storage/
  podcasts/
    {date}/
      {podcast_id}.mp3
```

### 上传流程

1. TTS 生成音频（二进制数据）
2. 上传到 Supabase Storage
3. 获取公开 URL
4. 保存 URL 到 podcasts 表

### N8N Supabase Storage 节点

```javascript
// 上传文件
{
  "operation": "upload",
  "bucket": "podcasts",
  "fileName": "{{$json.date}}/{{$json.podcast_id}}.mp3",
  "fileData": "{{$binary.audio}}",
  "options": {
    "contentType": "audio/mpeg",
    "cacheControl": "3600",
    "upsert": false
  }
}
```

---

## 🔔 前端 Realtime 订阅

### 订阅配置

```javascript
// 前端代码示例
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 订阅 user_podcast_feeds 表的变化
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
      // 显示通知
      showNotification('新播客已送达！')
      // 刷新播客列表
      refreshPodcastList()
    }
  )
  .subscribe()
```

---

## ⚙️ N8N 工作流配置

### 节点列表

1. **Schedule Trigger** - 定时器（每天 7:00）
2. **Supabase - Get Characters** - 查询所有活跃角色
3. **Loop Over Items (Characters)** - 循环角色
4. **Supabase - Get Users** - 查询所有用户
5. **Loop Over Items (Users)** - 循环用户
6. **Supabase - Get User Memories** - 查询用户记忆
7. **Code - Determine Age Stage** - 判断年龄阶段
8. **Code - Build Tavily Query** - 构建搜索查询
9. **HTTP Request - Tavily Search** - 搜索内容
10. **Code - Build AI Prompt** - 构建 AI Prompt
11. **AI Agent - Generate Article** - 生成播客文章
12. **HTTP Request - TTS** - 文字转语音
13. **Supabase Storage - Upload Audio** - 上传音频
14. **Supabase - Insert Podcast** - 保存播客记录
15. **Supabase - Insert Feed** - 保存用户推送记录

---

## 📈 性能考虑

### 预估数据量

假设：
- 3 个 AI 角色
- 100 个用户
- 每天生成：3 × 100 = 300 个播客

### 执行时间

- Tavily 搜索：~2 秒/次
- AI 生成文章：~5 秒/次
- TTS 生成音频：~10 秒/次
- 上传和保存：~2 秒/次

**单个播客总时间**：~19 秒
**300 个播客总时间**：~95 分钟（1.5 小时）

### 优化建议

1. **并行处理**：N8N 可以配置并行执行
2. **批量操作**：Supabase 批量插入
3. **错误处理**：单个失败不影响其他

---

## 🧪 测试计划

### 测试场景

1. **单用户单角色测试**
   - 验证完整流程
   - 检查数据保存
   - 验证音频生成

2. **多用户测试**
   - 验证循环逻辑
   - 检查个性化内容
   - 验证年龄阶段适配

3. **前端订阅测试**
   - 验证 Realtime 推送
   - 检查通知显示
   - 验证音频播放

### 测试数据

```sql
-- 创建测试用户
INSERT INTO users (id, name, age, interests, grade)
VALUES 
  ('test-user-1', '小明', 8, ARRAY['恐龙', '科学'], '二年级'),
  ('test-user-2', '小红', 11, ARRAY['历史', '阅读'], '五年级'),
  ('test-user-3', '小刚', 14, ARRAY['科技', '编程'], '初二');

-- 创建测试记忆
INSERT INTO character_user_memories (character_id, user_id, memory_key, memory_value, importance)
VALUES 
  ('character-1', 'test-user-1', 'favorite_dinosaur', '霸王龙', 8),
  ('character-1', 'test-user-2', 'favorite_period', '唐朝', 7),
  ('character-1', 'test-user-3', 'learning_goal', '学习 Python', 9);
```

---

## 📝 后续优化方向

### 短期优化（1-2 周）
1. 添加错误重试机制
2. 添加生成日志
3. 优化 Prompt 质量

### 中期优化（1-2 月）
1. 用户订阅管理
2. 推送时间个性化
3. 内容质量评分

### 长期优化（3-6 月）
1. 智能推荐算法
2. 用户反馈分析
3. 内容缓存优化

---

## 🚀 部署清单

### 环境变量

```bash
# N8N 环境变量
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TAVILY_API_KEY=your-tavily-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

### 部署步骤

1. ✅ 导入 N8N 工作流 JSON
2. ✅ 配置环境变量
3. ✅ 测试单个用户流程
4. ✅ 激活定时器
5. ✅ 监控执行日志

---

**文档版本**：1.0  
**创建日期**：2025-01-06  
**维护者**：开发团队
