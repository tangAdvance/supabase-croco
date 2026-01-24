# Requirements Document

## Introduction

本文档定义了小鳄鱼助手聊天后端架构的改进需求。当前系统使用 Supabase（边缘函数 + 数据库）+ n8n（AI 编排）的架构，但职责划分不清晰，需要重构以实现更好的可维护性和扩展性。

## Glossary

- **Edge_Function**: Supabase 边缘函数，运行在 Deno 环境的无服务器函数
- **N8N_Workflow**: n8n 工作流，负责 AI 编排和对话生成
- **Chat_Handler**: 主聊天处理边缘函数
- **User_Context**: 用户上下文，包括用户画像、兴趣、年龄等信息
- **Character**: AI 角色，定义了性格、专长、系统提示词等
- **Conversation**: 对话会话，包含多条消息的完整对话
- **Message**: 单条消息，可以是用户消息或 AI 回复
- **Intent**: 用户意图，包括 homework（作业）、knowledge（知识问答）、emotional（情感求助）、chat（闲聊）
- **Mode**: 对话模式，包括 socratic（苏格拉底式）、emotional（情感支持）、normal（正常对话）
- **Memory**: 角色记忆，存储角色对特定用户的记忆点

## Requirements

### Requirement 1: 边缘函数数据聚合

**User Story:** 作为系统架构师，我希望边缘函数负责所有数据库交互和数据聚合，以便 n8n 专注于 AI 编排逻辑。

#### Acceptance Criteria

1. WHEN Edge_Function 接收到聊天请求 THEN THE Edge_Function SHALL 从数据库获取 User_Context
2. WHEN Edge_Function 接收到聊天请求 THEN THE Edge_Function SHALL 从数据库获取 Character 配置信息
3. WHEN Edge_Function 接收到聊天请求 THEN THE Edge_Function SHALL 从数据库获取最近 10 条 Conversation 历史消息
4. WHEN Edge_Function 接收到聊天请求 THEN THE Edge_Function SHALL 从数据库获取 Character 对该用户的 Memory（按重要性排序，最多 5 条）
5. WHEN Edge_Function 完成数据聚合 THEN THE Edge_Function SHALL 将完整上下文传递给 N8N_Workflow

### Requirement 2: N8N 工作流简化

**User Story:** 作为开发者，我希望 n8n 工作流只负责 AI 相关的编排逻辑，不涉及数据库操作，以便提高可维护性。

#### Acceptance Criteria

1. WHEN N8N_Workflow 接收到请求 THEN THE N8N_Workflow SHALL 接收完整的 User_Context 和 Character 配置
2. WHEN N8N_Workflow 处理消息 THEN THE N8N_Workflow SHALL 执行 Intent 识别
3. WHEN N8N_Workflow 识别出 Intent THEN THE N8N_Workflow SHALL 根据 Intent 选择对应的 Mode
4. WHEN N8N_Workflow 选择 Mode THEN THE N8N_Workflow SHALL 构建对应的 System Prompt
5. WHEN N8N_Workflow 构建完 Prompt THEN THE N8N_Workflow SHALL 调用 LLM 生成回复
6. WHEN N8N_Workflow 生成回复 THEN THE N8N_Workflow SHALL 返回 AI 响应、Intent 和 Mode 信息

### Requirement 3: 消息持久化

**User Story:** 作为产品经理，我希望所有对话消息都被持久化存储，以便后续分析和改进产品。

#### Acceptance Criteria

1. WHEN Edge_Function 收到 N8N_Workflow 响应 THEN THE Edge_Function SHALL 存储用户 Message 到数据库
2. WHEN Edge_Function 收到 N8N_Workflow 响应 THEN THE Edge_Function SHALL 存储 AI Message 到数据库
3. WHEN 存储 Message THEN THE Edge_Function SHALL 记录 Intent、Mode、tokens_used 等元数据
4. WHEN 存储失败 THEN THE Edge_Function SHALL 记录错误日志但不阻塞响应返回
5. WHEN 消息存储成功 THEN THE Edge_Function SHALL 异步更新 Conversation 的 updated_at 时间戳

### Requirement 4: 角色记忆提取

**User Story:** 作为 AI 产品设计师，我希望系统能自动提取和存储重要的对话记忆点，以便角色能记住用户的重要信息。

#### Acceptance Criteria

1. WHEN Edge_Function 收到 AI 响应 THEN THE Edge_Function SHALL 分析对话内容提取潜在记忆点
2. WHEN 提取到新记忆点 THEN THE Edge_Function SHALL 存储到 character_user_memories 表
3. WHEN 存储记忆点 THEN THE Edge_Function SHALL 设置合理的 importance 值（1-10）
4. WHEN 记忆点已存在 THEN THE Edge_Function SHALL 更新 updated_at 时间戳
5. WHEN 记忆提取失败 THEN THE Edge_Function SHALL 记录错误但不影响主流程

### Requirement 5: API 接口规范

**User Story:** 作为前端开发者，我希望有清晰的 API 接口规范，以便正确调用聊天服务。

#### Acceptance Criteria

1. WHEN 客户端调用 Chat_Handler THEN THE 客户端 SHALL 提供 userId、characterId、conversationId、message 参数
2. WHEN Chat_Handler 接收请求 THEN THE Chat_Handler SHALL 验证所有必需参数存在
3. WHEN 参数验证失败 THEN THE Chat_Handler SHALL 返回 400 错误和详细错误信息
4. WHEN Chat_Handler 处理成功 THEN THE Chat_Handler SHALL 返回包含 response、intentType、mode、timestamp 的 JSON 响应
5. WHEN Chat_Handler 处理失败 THEN THE Chat_Handler SHALL 返回 500 错误和错误描述

### Requirement 6: 会话管理

**User Story:** 作为用户，我希望系统能自动管理我的对话会话，包括创建新会话和更新会话状态。

#### Acceptance Criteria

1. WHEN conversationId 为空或不存在 THEN THE Edge_Function SHALL 创建新的 Conversation 记录
2. WHEN 创建新 Conversation THEN THE Edge_Function SHALL 设置 user_id、character_id、is_active 为 true
3. WHEN Conversation 存在 THEN THE Edge_Function SHALL 验证该会话属于当前用户
4. WHEN 会话验证失败 THEN THE Edge_Function SHALL 返回 403 错误
5. WHEN 对话进行中 THEN THE Edge_Function SHALL 更新 Conversation 的 updated_at 时间戳

### Requirement 7: 错误处理和日志

**User Story:** 作为运维人员，我希望系统有完善的错误处理和日志记录，以便快速定位和解决问题。

#### Acceptance Criteria

1. WHEN 任何步骤发生错误 THEN THE Edge_Function SHALL 记录详细的错误日志
2. WHEN 数据库查询失败 THEN THE Edge_Function SHALL 返回友好的错误信息
3. WHEN N8N_Workflow 调用超时 THEN THE Edge_Function SHALL 返回超时错误
4. WHEN 错误发生 THEN THE Edge_Function SHALL 记录请求上下文（userId、conversationId 等）
5. WHEN 关键错误发生 THEN THE Edge_Function SHALL 发送告警通知

### Requirement 8: 性能优化

**User Story:** 作为系统架构师，我希望系统响应快速，提供良好的用户体验。

#### Acceptance Criteria

1. WHEN Edge_Function 查询数据库 THEN THE Edge_Function SHALL 使用索引优化查询性能
2. WHEN Edge_Function 调用 N8N_Workflow THEN THE Edge_Function SHALL 设置合理的超时时间（30 秒）
3. WHEN 消息存储 THEN THE Edge_Function SHALL 使用异步方式不阻塞响应
4. WHEN 记忆提取 THEN THE Edge_Function SHALL 使用异步方式不阻塞响应
5. WHEN 并发请求到达 THEN THE Edge_Function SHALL 正确处理并发场景

### Requirement 9: 角色配置支持

**User Story:** 作为产品运营，我希望能灵活配置不同的 AI 角色，满足不同场景需求。

#### Acceptance Criteria

1. WHEN Edge_Function 获取 Character THEN THE Edge_Function SHALL 读取 system_prompt、personality、tone 等配置
2. WHEN Character 不存在 THEN THE Edge_Function SHALL 返回 404 错误
3. WHEN Character 未激活（is_active=false）THEN THE Edge_Function SHALL 返回 403 错误
4. WHEN Character 是付费角色（is_premium=true）THEN THE Edge_Function SHALL 验证用户权限
5. WHEN Character 配置传递给 N8N_Workflow THEN THE Edge_Function SHALL 包含所有必要的角色属性

### Requirement 10: 用户画像集成

**User Story:** 作为 AI 产品设计师，我希望系统能利用用户画像信息，提供个性化的对话体验。

#### Acceptance Criteria

1. WHEN Edge_Function 获取 User_Context THEN THE Edge_Function SHALL 读取 age、interests、grade 等用户信息
2. WHEN Edge_Function 获取 User_Context THEN THE Edge_Function SHALL 读取 user_profile 表中的关键信息
3. WHEN 用户画像传递给 N8N_Workflow THEN THE Edge_Function SHALL 格式化为易于使用的结构
4. WHEN 用户信息不完整 THEN THE Edge_Function SHALL 使用合理的默认值
5. WHEN 用户画像更新 THEN THE Edge_Function SHALL 在后续对话中使用最新信息
