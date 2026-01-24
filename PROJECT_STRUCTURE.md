# 项目文件组织说明

## 📁 项目结构

```
项目根目录/
├── .kiro/                              # Kiro 配置和规范
│   └── specs/
│       └── chat-backend-architecture/  # 聊天后端架构规范
│           ├── requirements.md         # 需求文档
│           └── design.md              # 设计文档
│
├── supabase/                          # Supabase 相关代码
│   └── functions/
│       └── chat-handler/              # 聊天处理 Edge Function
│           ├── index.ts               # 主入口
│           ├── db.ts                  # 数据库操作
│           ├── types.ts               # 类型定义
│           ├── validation.ts          # 参数验证
│           ├── error-handler.ts       # 错误处理
│           ├── connection-pool.ts     # 连接池
│           ├── health-check.ts        # 健康检查
│           ├── *.test.ts              # 测试文件
│           ├── deploy.sh              # 部署脚本
│           ├── setup-env.sh           # 环境配置脚本
│           ├── verify-deployment.sh   # 部署验证脚本
│           ├── DEPLOYMENT.md          # 部署文档
│           ├── QUICK_DEPLOY.md        # 快速部署指南
│           ├── ENV_VARIABLES.md       # 环境变量说明
│           └── db-indexes.sql         # 数据库索引
│
├── podcast-system/                    # 播客推送系统
│   ├── README.md                      # 导航文档（入口）
│   ├── PODCAST_MVP_DESIGN.md          # 设计文档
│   ├── QUICK_DEPLOY_GUIDE.md          # 部署指南
│   ├── N8N_SUPABASE_COMMON_ISSUES.md  # 常见问题追踪
│   └── podcast-push-workflow.json     # N8N 工作流配置
│
├── db.sql                             # 数据库 schema
├── n8n.json                           # 聊天系统 N8N 工作流
├── README_MEMORY_SYSTEM.md            # 记忆系统文档
├── ISSUES.md                          # 问题追踪（临时）
│
├── 小鳄鱼助手 (CrocoAssistant) 产品策略.docx  # 产品策略文档
└── 数据库设计文档 v1.0.docx            # 数据库设计文档
```

---

## 🎯 文件分类说明

### 1. 核心代码（不可删除）

**Supabase Edge Functions**
- `supabase/functions/chat-handler/` - 聊天处理核心逻辑
  - 负责数据聚合、消息存储、记忆提取
  - 包含完整的测试和部署脚本

**N8N 工作流**
- `n8n.json` - 聊天系统 AI 编排工作流
- `podcast-system/podcast-push-workflow.json` - 播客推送工作流

**数据库**
- `db.sql` - 完整的数据库 schema

---

### 2. 文档（按功能分类）

#### 聊天系统文档
- `chat-system/README.md` - **入口文档**（导航）
- `chat-system/API_DOCUMENTATION.md` - API 接口文档
- `chat-system/requirements.md` - 需求文档
- `chat-system/design.md` - 设计文档
- `chat-system/tasks.md` - 任务列表
- `chat-system/chat-workflow.json` - N8N 工作流
- `supabase/functions/chat-handler/` - Edge Function 代码

#### 播客系统文档
- `podcast-system/README.md` - **入口文档**（导航）
- `podcast-system/PODCAST_MVP_DESIGN.md` - 设计文档
- `podcast-system/QUICK_DEPLOY_GUIDE.md` - 部署指南
- `podcast-system/N8N_SUPABASE_COMMON_ISSUES.md` - 问题追踪

#### 产品文档
- `小鳄鱼助手 (CrocoAssistant) 产品策略.docx` - 产品策略
- `数据库设计文档 v1.0.docx` - 数据库设计

---

### 3. 可以删除的临时文档

以下文档是开发过程中的临时总结，内容已整合到正式文档中：

```bash
# 聊天系统部署相关
CLOUD_DEPLOYMENT_GUIDE.md
QUICK_START.md
README_DEPLOYMENT.md
DEPLOYMENT_SUMMARY.md
DEPLOYMENT_CHECKLIST_MEMORY_SYSTEM.md

# 记忆系统相关
AI_MEMORY_IMPLEMENTATION_SUMMARY.md
DATA_FLOW_DOCUMENTATION.md
MEMORY_SYSTEM_TEST_GUIDE.md
QUICK_REFERENCE_MEMORY_SYSTEM.md
IMPLEMENTATION_COMPLETE.md

# N8N 测试相关
N8N_DEPLOYMENT_CHECKLIST.md
N8N_DEPLOYMENT_GUIDE.md
N8N_TEST_SUMMARY.md
N8N_WORKFLOW_TEST_GUIDE.md

# 其他临时文档
PODCAST_PUSH_MVP_DESIGN.md  # 已移动到 podcast-system/
TEST_README.md
edeg function.md
test-memory-extraction.ts
test-n8n-workflow.ts
verify-n8n-workflow.sh
```

---

## 🔄 新功能开发流程

### 步骤 1：创建或更新 Spec

**如果是新功能**：
```bash
# 在 .kiro/specs/ 下创建新文件夹
.kiro/specs/new-feature/
├── requirements.md  # 需求文档
└── design.md       # 设计文档
```

**如果是现有功能改进**：
- 更新对应的 `requirements.md` 或 `design.md`

### 步骤 2：实现代码

**Edge Function**：
- 在 `supabase/functions/` 下创建新函数
- 或修改现有函数

**N8N 工作流**：
- 创建新的 `.json` 工作流文件
- 或修改现有工作流

### 步骤 3：创建文档

**功能文档结构**：
```
feature-name/
├── README.md              # 导航文档（必需）
├── DESIGN.md             # 设计文档（必需）
├── QUICK_DEPLOY_GUIDE.md # 部署指南（必需）
├── COMMON_ISSUES.md      # 问题追踪（推荐）
└── workflow.json         # N8N 工作流（如果有）
```

**文档模板**：参考 `podcast-system/` 文件夹的结构

### 步骤 4：测试和部署

1. 编写测试（`.test.ts` 文件）
2. 创建部署脚本（`deploy.sh`）
3. 创建验证脚本（`verify-deployment.sh`）
4. 更新 `COMMON_ISSUES.md` 记录遇到的问题

---

## 📝 文档编写规范

### README.md（导航文档）

**用途**：作为功能的入口文档，提供导航

**必需内容**：
1. 功能概述
2. 文档列表（每个文档的用途和阅读时间）
3. 快速开始指南
4. 常见问题

**参考**：`podcast-system/README.md`

---

### DESIGN.md（设计文档）

**用途**：详细的技术设计

**必需内容**：
1. 需求概述
2. 架构设计
3. 数据流程
4. API 接口
5. 数据模型
6. 性能考虑

**参考**：`podcast-system/PODCAST_MVP_DESIGN.md`

---

### QUICK_DEPLOY_GUIDE.md（部署指南）

**用途**：快速部署步骤

**必需内容**：
1. 前置条件
2. 部署步骤（分步骤，标注时间）
3. 测试场景
4. 故障排查
5. 性能监控

**参考**：`podcast-system/QUICK_DEPLOY_GUIDE.md`

---

### COMMON_ISSUES.md（问题追踪）

**用途**：记录常见错误和解决方案

**必需内容**：
1. 问题分类（N8N、Supabase、集成等）
2. 每个问题的错误现象和解决方案
3. 调试技巧
4. 问题报告模板

**参考**：`podcast-system/N8N_SUPABASE_COMMON_ISSUES.md`

---

## 🤖 AI Agent 工作流程

### 接到新功能需求时

1. **阅读相关文档**：
   - 产品策略文档
   - 数据库设计文档
   - 相关功能的 Spec 文档

2. **创建或更新 Spec**：
   - 在 `.kiro/specs/` 下创建需求和设计文档
   - 或更新现有 Spec

3. **实现代码**：
   - 参考现有代码结构
   - 遵循项目规范

4. **创建文档**：
   - 按照文档规范创建功能文档
   - 放在独立文件夹中

5. **测试和部署**：
   - 编写测试
   - 创建部署脚本
   - 更新问题追踪文档

### 参考现有功能时

**聊天系统**：
- Spec: `chat-system/`
- 代码: `supabase/functions/chat-handler/`
- 工作流: `chat-system/chat-workflow.json`
- 文档: `chat-system/README.md`

**播客系统**：
- 文档: `podcast-system/`（完整示例）
- 工作流: `podcast-system/podcast-push-workflow.json`

---

## 🧹 文件清理策略

### 定期清理（每个功能完成后）

1. **识别临时文档**：
   - 包含 "SUMMARY"、"CHECKPOINT" 的文档
   - 测试脚本（如果已整合到正式测试）
   - 重复的部署指南

2. **归档或删除**：
   ```bash
   # 创建归档文件夹
   mkdir -p archive/2025-01/
   
   # 移动临时文档
   mv *_SUMMARY.md archive/2025-01/
   mv *_CHECKPOINT.md archive/2025-01/
   ```

3. **保留核心文档**：
   - 每个功能只保留一套完整文档
   - 放在独立文件夹中（如 `podcast-system/`）

### 文档整合原则

- **一个功能 = 一个文件夹**
- **一个入口 = README.md**
- **避免重复** = 内容整合到正式文档

---

## 📊 当前项目状态

### 已完成功能

1. ✅ **聊天系统**
   - Edge Function 部署完成
   - N8N 工作流配置完成
   - AI 记忆提取功能完成
   - 文档完整

2. ✅ **播客推送系统**
   - MVP 设计完成
   - N8N 工作流创建完成
   - 文档完整
   - 待测试

### 待清理文件

根目录下有 **15+ 个临时文档**可以删除或归档。

### 建议操作

```bash
# 1. 创建归档文件夹
mkdir -p archive/2025-01-completed-features/

# 2. 移动临时文档
mv *_SUMMARY.md archive/2025-01-completed-features/
mv *_CHECKPOINT.md archive/2025-01-completed-features/
mv CLOUD_DEPLOYMENT_GUIDE.md archive/2025-01-completed-features/
# ... 其他临时文档

# 3. 保持项目根目录整洁
# 只保留核心代码、工作流和必要文档
```

---

## 🎯 最佳实践

### 文档组织

1. **功能独立**：每个功能一个文件夹
2. **入口明确**：README.md 作为导航
3. **避免重复**：不要创建多个相似文档
4. **及时清理**：功能完成后归档临时文档

### 代码组织

1. **模块化**：功能拆分成独立模块
2. **测试完整**：每个模块都有测试
3. **文档同步**：代码和文档保持一致

### 工作流程

1. **先设计后实现**：先写 Spec，再写代码
2. **边开发边文档**：不要等到最后才写文档
3. **持续优化**：根据实际使用情况更新文档

---

**文档版本**：1.0  
**创建日期**：2025-01-08  
**维护者**：开发团队
