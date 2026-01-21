# Requirements Document

## Introduction

本文档定义了小鳄鱼助手的引导式图片生成功能需求。该功能将图片生成能力无缝集成到现有的聊天对话中，通过多轮对话引导孩子完成创作要素的收集，最终生成符合其想象的图片。核心理念是"过程重于结果"，培养孩子的审美决策力和创造性思维。

## Glossary

- **Guided_Image_Generation**: 引导式图片生成，通过多轮对话收集创作要素的图片生成流程
- **Image_Generation_Intent**: 图片生成意图，用户表达想要创作图片的意图
- **Creation_Context**: 创作上下文，包括主题、风格、情感等创作要素
- **Theme**: 主题，用户想要画的内容（如"一只在太空飞的猫"）
- **Style**: 风格，图片的艺术风格（如童话绘本风、像素游戏风、动漫风、科幻风）
- **Emotion**: 情感，图片想要传达的情绪（如温暖、神秘、活泼、宁静）
- **Image_Prompt**: 图片提示词，用于调用图片生成 API 的完整描述
- **User_Generated_Image**: 用户生成的图片，存储在数据库中的图片记录
- **Realtime_Notification**: 实时通知，通过 Supabase Realtime 推送的图片生成完成通知

## Requirements

### Requirement 1: 图片生成意图识别

**User Story:** 作为用户，我希望在与 AI 角色对话时，能够自然地表达想要生成图片的意图，系统能够识别并启动引导流程。

#### Acceptance Criteria

1. WHEN 用户发送包含图片生成意图的消息（如"帮我画一张图"、"我想生成一幅画"、"能不能把我的故事画出来"）THEN THE N8N_Workflow SHALL 识别为 Image_Generation_Intent
2. WHEN 用户描述具体场景（如"我想看看一只会飞的猫"）THEN THE N8N_Workflow SHALL 识别为 Image_Generation_Intent 并提取 Theme
3. WHEN N8N_Workflow 识别到 Image_Generation_Intent THEN THE N8N_Workflow SHALL 返回引导式问候语并开始收集 Creation_Context
4. WHEN 用户在对话中提到"画"、"图片"、"生成"等关键词 THEN THE N8N_Workflow SHALL 判断是否为 Image_Generation_Intent
5. WHEN Image_Generation_Intent 被识别 THEN THE N8N_Workflow SHALL 在响应的 metadata 中标记 intent_type 为 'image_generation'

### Requirement 2: 创作要素收集

**User Story:** 作为产品设计师，我希望系统通过多轮对话逐步收集创作要素，而不是一次性要求用户填写所有信息，以提供更自然的体验。

#### Acceptance Criteria

1. WHEN N8N_Workflow 开始收集 Creation_Context THEN THE N8N_Workflow SHALL 首先收集 Theme（主题）
2. WHEN Theme 已收集 THEN THE N8N_Workflow SHALL 收集 Style（风格）并提供 4-6 种预设选项
3. WHEN Style 已收集 THEN THE N8N_Workflow SHALL 收集 Emotion（情感）并提供情感色盘选项
4. WHEN N8N_Workflow 收集每个要素 THEN THE N8N_Workflow SHALL 将信息存储在 Message 的 metadata 字段中
5. WHEN N8N_Workflow 分析对话历史 THEN THE N8N_Workflow SHALL 能够从 metadata 中提取已收集的 Creation_Context

### Requirement 3: 角色风格融合

**User Story:** 作为 AI 产品设计师，我希望生成的图片能够结合当前 AI 角色的性格和风格，提供个性化的创作体验。

#### Acceptance Criteria

1. WHEN N8N_Workflow 构建 Image_Prompt THEN THE N8N_Workflow SHALL 结合 Character 的 personality 和 tone
2. WHEN Character 有特定的艺术偏好 THEN THE N8N_Workflow SHALL 在 Style 推荐中优先展示该风格
3. WHEN N8N_Workflow 生成引导语 THEN THE N8N_Workflow SHALL 使用符合 Character 语气的表达方式
4. WHEN 不同 Character 处理相同 Theme THEN THE N8N_Workflow SHALL 生成具有不同风格倾向的 Image_Prompt
5. WHEN Character 的 target_age_group 为小学生 THEN THE N8N_Workflow SHALL 使用童话比喻和简单语言引导

### Requirement 4: 确认与生成

**User Story:** 作为用户，我希望在生成图片前能够确认所有信息，并有机会补充或修改，确保生成的图片符合我的期望。

#### Acceptance Criteria

1. WHEN Creation_Context 收集完整（Theme、Style、Emotion 都已收集）THEN THE N8N_Workflow SHALL 展示汇总信息并请求用户确认
2. WHEN 用户确认（发送"确认"、"开始生成"、"好的"等）THEN THE N8N_Workflow SHALL 构建完整的 Image_Prompt
3. WHEN 用户提出修改（如"改成科幻风格"）THEN THE N8N_Workflow SHALL 更新对应的 Creation_Context 并重新确认
4. WHEN 用户补充细节（如"猫要戴宇航帽"）THEN THE N8N_Workflow SHALL 将细节添加到 Theme 中
5. WHEN 用户确认后 THEN THE N8N_Workflow SHALL 立即返回"生成中"响应，不等待图片生成完成

### Requirement 5: 异步图片生成

**User Story:** 作为系统架构师，我希望图片生成过程不阻塞用户的对话体验，用户可以在等待期间继续与 AI 对话。

#### Acceptance Criteria

1. WHEN N8N_Workflow 确认用户生成请求 THEN THE N8N_Workflow SHALL 立即返回响应给 Edge_Function
2. WHEN N8N_Workflow 返回响应后 THEN THE N8N_Workflow SHALL 在异步分支中调用图片生成 API
3. WHEN 图片生成 API 调用中 THEN THE 用户 SHALL 能够继续发送消息和对话
4. WHEN 图片生成失败 THEN THE N8N_Workflow SHALL 记录错误日志但不影响对话流程
5. WHEN 图片生成超时（超过 60 秒）THEN THE N8N_Workflow SHALL 终止生成并记录超时错误

### Requirement 6: 图片存储与通知

**User Story:** 作为用户，我希望图片生成完成后能够立即收到通知，并能够查看、保存和分享生成的图片。

#### Acceptance Criteria

1. WHEN 图片生成成功 THEN THE N8N_Workflow SHALL 将图片信息插入 user_generated_images 表
2. WHEN 插入 user_generated_images 表 THEN THE Supabase_Realtime SHALL 自动推送通知给订阅的客户端
3. WHEN 存储图片记录 THEN THE N8N_Workflow SHALL 包含 user_id、character_id、conversation_id、image_url、prompt、style、emotion
4. WHEN 图片记录创建 THEN THE 系统 SHALL 设置 is_favorite 为 false，is_deleted 为 false
5. WHEN 客户端收到 Realtime 通知 THEN THE 客户端 SHALL 显示生成的图片和操作选项（保存、重新生成、收藏）

### Requirement 7: 图片生成 API 集成

**User Story:** 作为开发者，我希望系统能够灵活集成不同的图片生成 API，支持多种生成模型。

#### Acceptance Criteria

1. WHEN N8N_Workflow 调用图片生成 API THEN THE N8N_Workflow SHALL 支持 DALL-E、Midjourney、Stable Diffusion 等主流 API
2. WHEN 调用图片生成 API THEN THE N8N_Workflow SHALL 传递完整的 Image_Prompt 和生成参数
3. WHEN 图片生成 API 返回结果 THEN THE N8N_Workflow SHALL 提取 image_url 和相关 metadata
4. WHEN 图片生成 API 返回错误 THEN THE N8N_Workflow SHALL 记录详细错误信息并尝试重试（最多 2 次）
5. WHEN 使用不同的图片生成 API THEN THE N8N_Workflow SHALL 在 metadata 中记录使用的 model 名称

### Requirement 8: 对话历史作为状态

**User Story:** 作为系统架构师，我希望利用现有的对话历史作为状态管理，避免引入额外的状态表，保持架构简洁。

#### Acceptance Criteria

1. WHEN N8N_Workflow 需要判断收集进度 THEN THE N8N_Workflow SHALL 分析最近的对话历史（最近 5-10 条消息）
2. WHEN Message 包含 Creation_Context 信息 THEN THE Message SHALL 在 metadata 字段中存储结构化数据
3. WHEN N8N_Workflow 提取 Creation_Context THEN THE N8N_Workflow SHALL 从 Message.metadata 中读取 image_theme、image_style、image_emotion
4. WHEN 用户修改已收集的信息 THEN THE N8N_Workflow SHALL 更新最新 Message 的 metadata
5. WHEN 对话历史中没有 Creation_Context THEN THE N8N_Workflow SHALL 从头开始收集

### Requirement 9: 错误处理与降级

**User Story:** 作为运维人员，我希望系统在图片生成失败时有完善的错误处理和降级策略，不影响用户的对话体验。

#### Acceptance Criteria

1. WHEN 图片生成 API 调用失败 THEN THE N8N_Workflow SHALL 记录详细错误日志（API 响应、错误代码、时间戳）
2. WHEN 图片生成失败 THEN THE N8N_Workflow SHALL 不阻塞对话流程，用户可以继续对话
3. WHEN 图片生成失败 THEN THE N8N_Workflow SHALL 可选地向用户发送失败通知（通过 Realtime 或下次对话）
4. WHEN 图片生成 API 不可用 THEN THE N8N_Workflow SHALL 返回友好的错误提示
5. WHEN 连续 3 次生成失败 THEN THE 系统 SHALL 发送告警通知给运维人员

### Requirement 10: 图片管理功能

**User Story:** 作为用户，我希望能够管理我生成的图片，包括查看历史、收藏、删除等操作。

#### Acceptance Criteria

1. WHEN 用户查询生成历史 THEN THE 系统 SHALL 返回该用户的所有 User_Generated_Image（按时间倒序）
2. WHEN 用户收藏图片 THEN THE 系统 SHALL 更新 user_generated_images 表的 is_favorite 字段为 true
3. WHEN 用户删除图片 THEN THE 系统 SHALL 更新 user_generated_images 表的 is_deleted 字段为 true（软删除）
4. WHEN 用户查询图片 THEN THE 系统 SHALL 过滤掉 is_deleted 为 true 的记录
5. WHEN 用户按 Conversation 查询图片 THEN THE 系统 SHALL 返回该对话中生成的所有图片

### Requirement 11: 性能与并发

**User Story:** 作为系统架构师，我希望系统能够处理并发的图片生成请求，保证性能和稳定性。

#### Acceptance Criteria

1. WHEN 多个用户同时请求生成图片 THEN THE N8N_Workflow SHALL 正确处理并发请求，不会互相干扰
2. WHEN 单个用户连续发起多个生成请求 THEN THE N8N_Workflow SHALL 为每个请求创建独立的异步任务
3. WHEN N8N_Workflow 处理图片生成 THEN THE N8N_Workflow SHALL 不阻塞其他用户的对话请求
4. WHEN 图片生成 API 响应慢 THEN THE 系统 SHALL 设置合理的超时时间（60 秒）
5. WHEN 系统负载高 THEN THE N8N_Workflow SHALL 优先保证对话响应速度，图片生成可以排队

### Requirement 12: 数据安全与隐私

**User Story:** 作为产品经理，我希望保护用户的创作内容和生成的图片，确保数据安全和隐私。

#### Acceptance Criteria

1. WHEN 存储 User_Generated_Image THEN THE 系统 SHALL 关联正确的 user_id，确保权限隔离
2. WHEN 用户查询图片 THEN THE 系统 SHALL 只返回该用户自己的图片
3. WHEN 图片上传到 Supabase_Storage THEN THE 系统 SHALL 使用用户隔离的存储路径
4. WHEN 图片 URL 生成 THEN THE 系统 SHALL 使用带签名的 URL 或权限控制
5. WHEN 用户删除图片 THEN THE 系统 SHALL 同时删除 Supabase_Storage 中的文件（可选，或定期清理）
