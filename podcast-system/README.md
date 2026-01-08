# 播客推送系统文档

## 📚 文档导航

### 🚀 快速开始

如果你是第一次部署，建议按以下顺序阅读：

1. **`PODCAST_MVP_DESIGN.md`** - 了解系统设计（10 分钟）
2. **`QUICK_DEPLOY_GUIDE.md`** - 快速部署指南（15 分钟）
3. **`podcast-push-workflow.json`** - N8N 工作流文件（导入使用）

---

## 📖 文档列表

### 1. 📋 `PODCAST_MVP_DESIGN.md`
**用途**：系统设计文档  
**内容**：
- 需求概述
- 用户年龄阶段划分（6-9岁 / 10-12岁 / 13-15岁）
- 完整流程设计
- 数据流程
- Prompt 设计
- TTS 配置
- Supabase Storage 配置
- 前端 Realtime 订阅
- 性能考虑
- 测试计划

**适用场景**：
- ✅ 了解系统架构
- ✅ 理解业务逻辑
- ✅ 查看技术细节

**阅读时间**：10 分钟

---

### 2. 🚀 `QUICK_DEPLOY_GUIDE.md`
**用途**：快速部署指南  
**内容**：
- 前置条件
- 5 步部署流程（15 分钟）
- 测试场景
- 故障排查
- 性能监控
- 成本估算
- 优化建议

**适用场景**：
- ✅ 首次部署系统
- ✅ 排查部署问题
- ✅ 测试功能

**阅读时间**：15 分钟（部署时间另计）

---

### 3. 📄 `podcast-push-workflow.json`
**用途**：N8N 工作流配置文件  
**内容**：
- 完整的 N8N 工作流定义
- 包含所有节点和连接
- 可直接导入 N8N Cloud

**使用方法**：
1. 登录 N8N Cloud
2. 点击 "Import from File"
3. 选择此文件
4. 配置凭证和环境变量
5. 激活工作流

---

## 🎯 系统概述

### 核心功能

每天早上 7:00，系统自动为所有用户推送个性化播客音频。

### 流程图

```
定时器（每天 7:00）
    ↓
查询所有活跃 AI 角色
    ↓
循环每个角色
    ↓
    查询所有用户
        ↓
        循环每个用户
            ↓
            获取用户信息和记忆
            ↓
            判断年龄阶段（6-9 / 10-12 / 13-15）
            ↓
            Tavily 搜索内容
            ↓
            AI 生成个性化文章
            ↓
            文章转音频（TTS）
            ↓
            上传到 Supabase Storage
            ↓
            保存到 podcasts 表
            ↓
            保存到 user_podcast_feeds 表
            ↓
            前端 Realtime 收到推送
```

### 技术栈

- **N8N Cloud**: 工作流自动化
- **Supabase**: 数据库 + Storage + Realtime
- **Tavily**: 内容搜索
- **DeepSeek**: AI 文章生成
- **ElevenLabs**: 文字转语音

---

## 🔧 关键特性

### 1. 个性化内容

- ✅ 结合用户年龄、兴趣、记忆
- ✅ 适配 3 个年龄阶段的文字风格
- ✅ 使用角色专长和个性

### 2. 自动化流程

- ✅ 定时触发（每天 7:00）
- ✅ 自动循环处理所有用户
- ✅ 同步生成音频

### 3. 实时推送

- ✅ Supabase Realtime 订阅
- ✅ 前端自动更新
- ✅ 即时通知

---

## 📊 数据表结构

### 使用的表

1. **users** - 用户信息
   - id, name, age, interests, grade

2. **characters** - AI 角色
   - id, name, slug, personality, expertise, is_active

3. **character_user_memories** - 用户记忆
   - character_id, user_id, memory_key, memory_value, importance

4. **podcasts** - 播客内容
   - id, title, content, audio_url, summary, tags, target_grades

5. **user_podcast_feeds** - 用户推送记录
   - id, user_id, podcast_id, is_read, rating, pushed_at

---

## 🎨 年龄阶段文字风格

### 阶段 1：6-9 岁（启蒙期）
- 简单易懂，短句为主
- 童话故事、动物比喻
- 生动的画面感

### 阶段 2：10-12 岁（探索期）
- 逻辑推理，因果关系
- 生活案例、实验思维
- 引导思考

### 阶段 3：13-15 岁（深化期）
- 跨学科关联
- 抽象思维、深度类比
- 批判性思考

---

## 🧪 测试清单

### 部署前测试
- [ ] API Keys 配置正确
- [ ] Supabase Storage bucket 已创建
- [ ] 数据库表存在且有测试数据
- [ ] N8N 凭证配置完成

### 功能测试
- [ ] 单用户测试通过
- [ ] 多用户测试通过
- [ ] 不同年龄阶段文字风格正确
- [ ] 音频生成成功
- [ ] 音频上传成功
- [ ] 数据保存正确

### 前端测试
- [ ] Realtime 订阅正常
- [ ] 收到推送通知
- [ ] 播客列表更新
- [ ] 音频可以播放

---

## 📈 性能指标

### 预估数据量
- 3 个 AI 角色
- 100 个用户
- 每天生成 300 个播客

### 执行时间
- 单个播客：~19 秒
- 300 个播客：~95 分钟

### 成本估算
- 每月约 $50
  - Tavily: $10
  - ElevenLabs: $30
  - DeepSeek: $5
  - Supabase Storage: $5

---

## 🔍 常见问题

### Q1: 如何修改推送时间？
**A**: 在 N8N 工作流中，修改 "定时器 - 每天7点" 节点的 cron 表达式。

例如改为每天 8:00：
```
0 8 * * *
```

### Q2: 如何添加新的 AI 角色？
**A**: 在 Supabase 的 characters 表中插入新记录：

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

### Q3: 如何调整文章长度？
**A**: 修改 "构建 AI Prompt" 节点中的 Prompt：

```javascript
// 找到这一行
文章长度：500-800 字

// 修改为
文章长度：300-500 字  // 更短
// 或
文章长度：800-1200 字  // 更长
```

### Q4: 如何更换 TTS 服务？
**A**: 修改 "文字转语音" 节点的 HTTP Request 配置。

例如使用 Azure TTS：
```javascript
{
  "url": "https://YOUR_REGION.tts.speech.microsoft.com/cognitiveservices/v1",
  "headers": {
    "Ocp-Apim-Subscription-Key": "YOUR_AZURE_KEY",
    "Content-Type": "application/ssml+xml"
  },
  "body": "<speak>...</speak>"
}
```

### Q5: 如何查看执行日志？
**A**: 
1. 登录 N8N Cloud
2. 进入 Executions 页面
3. 查看每次执行的详细日志

### Q6: 如何暂停推送？
**A**: 
1. 在 N8N 工作流页面
2. 点击右上角的开关
3. 将状态改为 "Inactive"

---

## 🚨 故障排查

### 工作流执行失败
1. 检查 API Keys 是否正确
2. 检查凭证是否配置
3. 查看节点错误信息
4. 检查数据库表是否存在

### 音频生成失败
1. 检查 ElevenLabs API Key
2. 检查账户余额
3. 检查文章长度（不要超过 5000 字）

### 音频上传失败
1. 检查 Storage bucket 是否存在
2. 检查 bucket 策略
3. 检查文件大小限制

### 前端没有收到推送
1. 检查 Supabase Realtime 是否启用
2. 检查订阅代码是否正确
3. 检查 user_id 是否匹配

详细排查步骤请查看 `QUICK_DEPLOY_GUIDE.md`。

---

## 🎯 优化建议

### 短期优化（1 周内）
1. 添加错误重试机制
2. 添加日志记录
3. 优化 Prompt 质量

### 中期优化（1 个月内）
1. 批量处理提高效率
2. 缓存搜索结果
3. 内容质量检查

### 长期优化（3-6 个月）
1. 用户订阅管理
2. 智能推荐算法
3. 用户反馈分析

---

## 📞 支持

### 获取帮助

如果遇到问题：

1. **查看文档**：
   - `PODCAST_MVP_DESIGN.md` - 设计文档
   - `QUICK_DEPLOY_GUIDE.md` - 部署指南

2. **检查日志**：
   - N8N Cloud → Executions
   - Supabase Dashboard → Logs

3. **联系开发团队**：
   - 提供错误日志
   - 提供测试数据
   - 描述预期结果 vs 实际结果

---

## 🎉 开始使用

### 第一步：了解系统
阅读 `PODCAST_MVP_DESIGN.md`（10 分钟）

### 第二步：部署系统
按照 `QUICK_DEPLOY_GUIDE.md` 部署（15 分钟）

### 第三步：测试功能
运行测试场景，验证功能

### 第四步：激活定时器
设置为每天 7:00 自动推送

---

**文档版本**：1.0  
**创建日期**：2025-01-06  
**维护者**：开发团队

祝你使用愉快！🎉
