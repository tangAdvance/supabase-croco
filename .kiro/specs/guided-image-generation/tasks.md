# Implementation Plan: Guided Image Generation

## Overview

本实施计划将引导式图片生成功能集成到小鳄鱼助手的聊天系统中。实施分为数据库准备、N8N 工作流开发、客户端集成三个阶段。核心原则是利用现有架构，Edge Function 无需修改，所有逻辑在 N8N 中实现。

## Tasks

- [x] 1. 数据库准备
  - [x] 1.1 创建 user_generated_images 表
    - 创建表结构（id, user_id, character_id, conversation_id, image_url, prompt, style, emotion 等）
    - 添加索引（user_id, conversation_id, created_at）
    - 设置默认值和约束
    - _Requirements: 6.3, 6.4, 10.1, 10.4_

  - [x] 1.2 启用 Supabase Realtime
    - 将 user_generated_images 表添加到 supabase_realtime publication
    - 测试 Realtime 推送功能
    - _Requirements: 6.2, 6.5_

  - [x] 1.3 配置 RLS 策略
    - 创建 SELECT 策略（用户只能查看自己的图片）
    - 创建 INSERT 策略（用户只能插入自己的图片）
    - 创建 UPDATE 策略（用户只能更新自己的图片）
    - _Requirements: 12.1, 12.2, 12.3_

  - [x]* 1.4 编写数据库迁移脚本
    - 创建可重复执行的迁移脚本
    - 测试迁移脚本
    - _Requirements: 所有_

- [x] 2. N8N Workflow - 意图识别与信息收集
  - [x] 2.1 创建意图识别节点
    - 使用 Code Node 或 AI Agent 识别图片生成意图
    - 检测关键词：画、图片、生成、创作等
    - 提取初始主题描述
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 编写意图识别测试用例
    - 测试各种表达方式
    - 测试边界情况
    - _Requirements: 1.1, 1.2_

  - [x] 2.3 实现信息提取函数
    - 从对话历史中提取 CreationContext
    - 解析 Message.metadata 中的 image_theme、image_style、image_emotion
    - 判断信息完整性
    - _Requirements: 2.4, 2.5, 8.1, 8.2, 8.3_

  - [x] 2.4 实现主题收集逻辑
    - 当识别到意图但缺少主题时，引导用户描述
    - 将主题存储到 Message.metadata.image_theme
    - _Requirements: 2.1, 2.4_

  - [x] 2.5 实现风格选择逻辑
    - 当主题已收集但缺少风格时，展示风格选项
    - 提供 4-6 种预设风格（童话绘本、像素游戏、动漫、科幻）
    - 将风格存储到 Message.metadata.image_style
    - _Requirements: 2.2, 2.4_

  - [x] 2.6 实现情感选择逻辑
    - 当风格已收集但缺少情感时，展示情感选项
    - 提供情感色盘（温暖、神秘、活泼、宁静）
    - 将情感存储到 Message.metadata.image_emotion
    - _Requirements: 2.3, 2.4_

- [x] 3. N8N Workflow - 确认与 Prompt 构建
  - [x] 3.1 实现信息汇总与确认
    - 当所有信息收集完整时，展示汇总
    - 请求用户确认或补充
    - 支持用户修改已收集的信息
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 实现 Prompt 构建函数
    - 定义 StylePreset 和 EmotionPreset 数据结构
    - 根据 CreationContext 构建完整 prompt
    - 结合角色风格（Character.personality）
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.2_

  - [ ]* 3.3 编写 Prompt 构建测试
    - 测试不同风格和情感组合
    - 测试角色风格融合
    - 验证 prompt 格式
    - _Requirements: 3.1, 7.2_

  - [x] 3.4 实现立即响应逻辑
    - 用户确认后，立即返回"生成中"响应
    - 不等待图片生成完成
    - _Requirements: 4.5, 5.1, 5.2_

- [x] 4. N8N Workflow - 异步图片生成
  - [x] 4.1 配置异步分支节点
    - 使用 Split In Batches 或类似节点实现异步
    - 主分支立即返回响应
    - 异步分支执行图片生成
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 配置图片生成 API 节点
    - 创建 HTTP Request 节点
    - 配置 DALL-E 3 API 调用
    - 设置超时时间（60 秒）
    - 传递完整 prompt 和生成参数
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 4.3 实现 API 响应处理
    - 提取 image_url 从 API 响应
    - 提取 metadata（model, generation_time）
    - _Requirements: 7.3_

  - [x] 4.4 实现错误处理逻辑
    - 捕获 API 调用错误
    - 记录详细错误日志
    - 实现重试机制（最多 2 次）
    - 不阻塞主流程
    - _Requirements: 7.4, 9.1, 9.2, 9.3, 9.4_

- [x] 5. N8N Workflow - 数据存储与通知
  - [x] 5.1 配置 Supabase 插入节点
    - 创建 Supabase 节点
    - 配置 INSERT 操作到 user_generated_images 表
    - 映射所有必需字段
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 5.2 实现图片记录构建
    - 构建完整的图片记录对象
    - 包含 user_id, character_id, conversation_id
    - 包含 image_url, prompt, style, emotion, user_description
    - 包含 metadata (model, generation_time, api_provider)
    - _Requirements: 6.3, 6.4_

  - [x] 5.3 测试 Realtime 通知
    - 插入测试记录
    - 验证 Realtime 推送触发
    - 测试通知延迟
    - _Requirements: 6.2, 6.5_

  - [ ]* 5.4 实现失败通知（可选）
    - 当生成失败时，可选地通知用户
    - 通过 Realtime 或下次对话
    - _Requirements: 9.3_

- [ ] 6. N8N Workflow - 集成与测试
  - [ ] 6.1 连接所有节点
    - 将意图识别、信息收集、确认、生成、存储节点连接
    - 配置条件分支（IF 节点）
    - 确保数据流正确传递
    - _Requirements: 所有_

  - [ ] 6.2 配置环境变量
    - 设置 OPENAI_API_KEY 或其他图片生成 API 密钥
    - 设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY
    - _Requirements: 7.1_

  - [ ]* 6.3 端到端测试
    - 测试完整流程（意图识别 → 收集 → 确认 → 生成 → 通知）
    - 测试多轮对话
    - 测试用户修改信息
    - 测试并发请求
    - _Requirements: 所有_

  - [ ]* 6.4 性能测试
    - 测试响应时间（应 < 5 秒）
    - 测试并发处理能力
    - 测试图片生成时间
    - _Requirements: 5.1, 11.1, 11.2, 11.3, 11.4_

- [ ] 7. 客户端集成 (Flutter)
  - [ ] 7.1 实现 Realtime 订阅
    - 订阅 user_generated_images 表的 INSERT 事件
    - 过滤当前用户的记录
    - 处理通知回调
    - _Requirements: 6.2, 6.5_

  - [ ] 7.2 实现生成中 UI
    - 显示"AI 正在创作中..."加载动画
    - 允许用户继续对话
    - _Requirements: 5.3_

  - [ ] 7.3 实现图片显示 UI
    - 收到通知后显示生成的图片
    - 提供操作按钮（保存、重新生成、收藏）
    - _Requirements: 6.5, 10.2_

  - [ ] 7.4 实现图片管理功能
    - 查询用户的图片历史
    - 实现收藏功能
    - 实现删除功能（软删除）
    - 按对话查询图片
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 7.5 实现图片保存到相册
    - 下载图片到本地
    - 保存到设备相册
    - 显示保存成功提示
    - _Requirements: 6.5_

- [ ] 8. 角色风格配置（可选）
  - [ ] 8.1 为角色添加图片生成偏好
    - 在 characters 表中添加 image_generation_config 字段（jsonb）
    - 定义默认风格、情感倾向
    - _Requirements: 3.2_

  - [ ] 8.2 在 Prompt 构建中使用角色配置
    - 读取角色的图片生成配置
    - 优先推荐角色偏好的风格
    - 在 prompt 中融入角色特点
    - _Requirements: 3.1, 3.3, 3.4_

- [ ] 9. 监控与日志
  - [ ] 9.1 实现错误日志记录
    - 记录 API 调用失败
    - 记录数据库操作失败
    - 记录超时错误
    - _Requirements: 9.1, 9.2_

  - [ ] 9.2 实现性能监控
    - 记录图片生成时间
    - 记录 API 响应时间
    - 记录成功率
    - _Requirements: 11.4_

  - [ ]* 9.3 配置告警通知
    - 连续失败告警
    - API 配额告警
    - 性能降级告警
    - _Requirements: 9.5_

- [ ] 10. 文档与部署
  - [ ] 10.1 编写 API 文档
    - 文档化 Message.metadata 结构
    - 文档化 user_generated_images 表结构
    - 文档化 N8N workflow 节点配置
    - _Requirements: 所有_

  - [ ] 10.2 部署 N8N Workflow
    - 导出 workflow JSON
    - 部署到生产环境
    - 激活 workflow
    - 获取 webhook URL
    - _Requirements: 所有_

  - [ ] 10.3 数据库迁移
    - 在生产环境执行迁移脚本
    - 验证表创建成功
    - 验证 Realtime 启用
    - 验证 RLS 策略生效
    - _Requirements: 所有_

  - [ ]* 10.4 用户文档
    - 编写用户使用指南
    - 创建示例对话流程
    - 说明风格和情感选项
    - _Requirements: 所有_

- [ ] 11. 编写属性测试
  - [ ]* 11.1 编写 Property 1 测试（意图识别准确性）
    - **Property 1: 意图识别准确性**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

  - [ ]* 11.2 编写 Property 2 测试（信息收集完整性）
    - **Property 2: 信息收集完整性**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [ ]* 11.3 编写 Property 3 测试（对话历史状态一致性）
    - **Property 3: 对话历史状态一致性**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

  - [ ]* 11.4 编写 Property 4 测试（异步生成不阻塞）
    - **Property 4: 异步生成不阻塞**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [ ]* 11.5 编写 Property 5 测试（图片记录存储完整性）
    - **Property 5: 图片记录存储完整性**
    - **Validates: Requirements 6.1, 6.3, 6.4**

  - [ ]* 11.6 编写 Property 6 测试（Realtime 通知触发）
    - **Property 6: Realtime 通知触发**
    - **Validates: Requirements 6.2, 6.5**

  - [ ]* 11.7 编写 Property 7 测试（角色风格融合）
    - **Property 7: 角色风格融合**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [ ]* 11.8 编写 Property 9 测试（生成失败不影响对话）
    - **Property 9: 生成失败不影响对话**
    - **Validates: Requirements 5.4, 9.1, 9.2, 9.3**

  - [ ]* 11.9 编写 Property 10 测试（用户数据隔离）
    - **Property 10: 用户数据隔离**
    - **Validates: Requirements 12.1, 12.2, 12.3**

  - [ ]* 11.10 编写 Property 11 测试（并发请求隔离）
    - **Property 11: 并发请求隔离**
    - **Validates: Requirements 11.1, 11.2, 11.3**

- [ ] 12. Final Checkpoint - 完整系统验证
  - 确保所有核心功能正常工作
  - 确保 Realtime 通知正常推送
  - 确保图片生成不阻塞对话
  - 询问用户是否有问题或需要调整

## Notes

- 任务标记 `*` 的为可选测试任务，可以根据项目进度决定是否实施
- Edge Function 无需修改，所有逻辑在 N8N 中实现
- 每个任务都引用了具体的需求编号，确保可追溯性
- 优先实现核心功能（意图识别、信息收集、图片生成、通知）
- 属性测试每个至少运行 100 次迭代
- 图片生成 API 可以先使用 DALL-E 3，后续可扩展支持其他 API
