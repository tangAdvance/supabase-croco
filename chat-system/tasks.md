# Implementation Plan: Chat Backend Architecture

## Overview

本实施计划将小鳄鱼助手的聊天后端重构为清晰的职责分离架构：Supabase 边缘函数负责数据层，n8n 专注于 AI 编排。实施将分为边缘函数重构、n8n 优化、集成测试三个阶段。

## Tasks

- [x] 1. 设置项目结构和类型定义
  - 创建 TypeScript 类型定义文件
  - 定义所有接口（ChatRequest, ChatResponse, UserContext 等）
  - 设置 Deno 配置文件
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 2. 实现数据查询函数
  - [x] 2.1 实现 getUserContext 函数
    - 查询 users 表和 user_profile 表
    - 聚合用户画像数据
    - 处理用户不存在的情况
    - _Requirements: 1.1, 10.1, 10.2_

  - [ ]* 2.2 编写 getUserContext 的单元测试
    - 测试正常用户数据返回
    - 测试用户不存在场景
    - 测试数据格式正确性
    - _Requirements: 1.1, 10.1_

  - [x] 2.3 实现 getCharacter 函数
    - 查询 characters 表
    - 验证角色是否激活（is_active）
    - 验证付费权限（is_premium）
    - _Requirements: 1.2, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 2.4 编写 getCharacter 的单元测试
    - 测试正常角色返回
    - 测试角色不存在场景
    - 测试未激活角色场景
    - _Requirements: 9.2, 9.3_

  - [x] 2.5 实现 getConversationHistory 函数
    - 查询 messages 表
    - 按时间倒序排序
    - 限制返回数量（默认 10 条）
    - _Requirements: 1.3_

  - [ ]* 2.6 编写 getConversationHistory 的单元测试
    - 测试消息排序正确性
    - 测试数量限制
    - 测试空历史场景
    - _Requirements: 1.3_

  - [x] 2.7 实现 getCharacterMemories 函数
    - 查询 character_user_memories 表
    - 按 importance 降序排序
    - 限制返回数量（默认 5 条）
    - _Requirements: 1.4_

  - [ ]* 2.8 编写 getCharacterMemories 的单元测试
    - 测试按重要性排序
    - 测试数量限制
    - 测试无记忆场景
    - _Requirements: 1.4_

- [x] 3. 实现数据写入函数
  - [x] 3.1 实现 saveMessage 函数
    - 插入 messages 表
    - 记录 intent_type、mode、metadata
    - 返回消息 ID
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 3.2 编写 saveMessage 的单元测试
    - 测试消息正确存储
    - 测试元数据完整性
    - 测试返回消息 ID
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.3 实现 saveMemory 函数
    - 检查记忆是否已存在（memory_key + character_id + user_id）
    - 存在则更新 updated_at
    - 不存在则插入新记录
    - _Requirements: 4.2, 4.3, 4.4_

  - [ ]* 3.4 编写 saveMemory 的单元测试
    - 测试新记忆插入
    - 测试已存在记忆更新
    - 测试去重逻辑
    - _Requirements: 4.2, 4.4_

- [x] 4. 实现会话管理逻辑
  - [x] 4.1 实现 getOrCreateConversation 函数
    - 检查 conversationId 是否存在
    - 不存在则创建新会话
    - 验证会话归属
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.2 编写 getOrCreateConversation 的单元测试
    - 测试新会话创建
    - 测试已存在会话返回
    - 测试会话归属验证
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 4.3 实现 updateConversationTimestamp 函数
    - 更新 conversations 表的 updated_at
    - _Requirements: 3.5, 6.5_

- [x] 5. 实现记忆提取逻辑
  - [x] 5.1 实现 extractMemories 函数
    - 分析对话内容
    - 提取关键信息点
    - 评估重要性（1-10）
    - 返回记忆列表
    - _Requirements: 4.1, 4.3_

  - [ ]* 5.2 编写 extractMemories 的单元测试
    - 测试记忆提取准确性
    - 测试重要性评分
    - 测试空内容场景
    - _Requirements: 4.1, 4.3_

- [x] 6. 实现错误处理和验证
  - [x] 6.1 实现参数验证函数
    - 验证必需参数存在
    - 验证参数格式（UUID 格式等）
    - 返回详细错误信息
    - _Requirements: 5.2, 5.3_

  - [ ]* 6.2 编写参数验证的单元测试
    - 测试各种无效参数组合
    - 测试错误信息格式
    - _Requirements: 5.2, 5.3_

  - [x] 6.3 实现统一错误处理函数
    - 分类错误类型（4xx, 5xx）
    - 记录错误日志
    - 返回友好错误信息
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ]* 6.4 编写错误处理的单元测试
    - 测试各种错误类型
    - 测试错误响应格式
    - 测试日志记录
    - _Requirements: 7.1, 7.2_

- [x] 7. 实现主 Edge Function (chat-handler)
  - [x] 7.1 实现请求处理主流程
    - 解析请求参数
    - 调用参数验证
    - 并行查询数据（用户、角色、历史、记忆）
    - 聚合上下文数据
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 7.2 实现 N8N 调用逻辑
    - 构建 N8N 请求体
    - 发送 POST 请求到 N8N webhook
    - 设置 30 秒超时
    - 解析 N8N 响应
    - _Requirements: 2.1, 2.6, 8.2_

  - [x] 7.3 实现响应处理逻辑
    - 异步存储用户消息
    - 异步存储 AI 响应
    - 异步提取和存储记忆
    - 异步更新会话时间戳
    - 构建并返回响应
    - _Requirements: 3.1, 3.2, 3.4, 4.5, 8.3, 8.4_

  - [ ]* 7.4 编写主流程的集成测试
    - 测试完整聊天流程
    - 测试异步操作不阻塞
    - 测试错误场景
    - _Requirements: 3.4, 8.3, 8.4_

- [x] 8. Checkpoint - 边缘函数基础功能完成
  - 确保所有单元测试通过
  - 确保边缘函数可以本地运行
  - 询问用户是否有问题

- [x] 9. 优化 N8N 工作流
  - [x] 9.1 更新 Webhook 节点
    - 接收完整的上下文数据
    - 移除数据库查询逻辑
    - _Requirements: 2.1_

  - [x] 9.2 更新意图识别节点 (AI Agent)
    - 保持现有意图识别逻辑
    - 确保输出格式一致
    - _Requirements: 2.2_

  - [x] 9.3 更新 Switch 节点
    - 保持现有路由逻辑
    - 确保四种意图正确分发
    - _Requirements: 2.3_

  - [x] 9.4 更新 Prompt 构建节点
    - 使用 Edge Function 传递的 userProfile
    - 使用 Edge Function 传递的 character 配置
    - 使用 Edge Function 传递的 history
    - 使用 Edge Function 传递的 memories
    - _Requirements: 2.4_

  - [x] 9.5 更新响应格式化节点
    - 确保返回 response、intentType、mode
    - 移除不必要的字段
    - _Requirements: 2.6_

  - [x] 9.6 测试 N8N 工作流
    - 使用 Postman 测试 webhook
    - 验证各个节点输出
    - 确保响应格式正确
    - _Requirements: 2.1, 2.6_

- [x] 10. 实现性能优化
  - [x] 10.1 优化数据库查询
    - 使用 Promise.all 并行查询
    - 添加必要的数据库索引
    - _Requirements: 8.1, 8.5_

  - [ ]* 10.2 编写性能测试
    - 测试并发请求处理
    - 测试响应时间
    - _Requirements: 8.5_

  - [x] 10.3 实现连接池复用
    - 复用 Supabase 客户端
    - 优化连接管理
    - _Requirements: 8.1_

- [x] 11. 部署和环境配置
  - [x] 11.1 配置环境变量
    - SUPABASE_URL
    - SUPABASE_SERVICE_ROLE_KEY
    - N8N_WEBHOOK_URL
    - _Requirements: 所有_

  - [x] 11.2 部署 Edge Function 到 Supabase
    - 使用 Supabase CLI 部署
    - 验证部署成功
    - _Requirements: 所有_

  - [x] 11.3 部署 N8N 工作流
    - 导入更新后的工作流
    - 激活工作流
    - 获取 webhook URL
    - _Requirements: 2.1, 2.6_

- [ ] 12. 端到端测试
  - [ ]* 12.1 测试完整聊天流程
    - 测试新用户首次对话
    - 测试已有会话继续对话
    - 测试不同意图类型
    - _Requirements: 所有_

  - [ ]* 12.2 测试错误场景
    - 测试无效参数
    - 测试不存在的角色
    - 测试会话归属错误
    - _Requirements: 5.3, 6.4, 9.2, 9.3_

  - [ ]* 12.3 测试性能和并发
    - 测试多用户并发请求
    - 测试响应时间
    - _Requirements: 8.5_

- [ ] 13. 编写属性测试
  - [ ]* 13.1 编写 Property 1 测试（消息存储完整性）
    - **Property 1: 数据完整性 - 消息存储**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 13.2 编写 Property 2 测试（上下文一致性）
    - **Property 2: 上下文一致性**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [ ]* 13.3 编写 Property 3 测试（会话归属验证）
    - **Property 3: 会话归属验证**
    - **Validates: Requirements 6.3, 6.4**

  - [ ]* 13.4 编写 Property 4 测试（参数验证）
    - **Property 4: 参数验证**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 13.5 编写 Property 5 测试（角色状态验证）
    - **Property 5: 角色状态验证**
    - **Validates: Requirements 9.2, 9.3**

  - [ ]* 13.6 编写 Property 6 测试（异步操作不阻塞）
    - **Property 6: 异步操作不阻塞**
    - **Validates: Requirements 3.4, 4.5, 8.3, 8.4**

  - [ ]* 13.7 编写 Property 7 测试（记忆去重）
    - **Property 7: 记忆去重**
    - **Validates: Requirements 4.4**

  - [ ]* 13.8 编写 Property 8 测试（响应格式一致性）
    - **Property 8: 响应格式一致性**
    - **Validates: Requirements 5.4**

- [ ] 14. Final Checkpoint - 完整系统验证
  - 确保所有测试通过（单元测试、集成测试、属性测试）
  - 确保系统在生产环境正常运行
  - 询问用户是否有问题或需要调整

## Notes

- 任务标记 `*` 的为可选测试任务，可以根据项目进度决定是否实施
- 每个任务都引用了具体的需求编号，确保可追溯性
- Checkpoint 任务用于阶段性验证，确保增量开发的质量
- 属性测试每个至少运行 100 次迭代
- 优先实现核心功能，测试任务可以并行或后续补充
