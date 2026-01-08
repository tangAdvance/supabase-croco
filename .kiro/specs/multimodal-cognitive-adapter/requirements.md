# 多模态认知适配器 - 需求文档

## Introduction

本文档定义了小鳄鱼助手的多模态认知适配器需求。该系统根据用户年龄阶段（6-9岁、10-12岁、13-15岁）自动调整 AI 的输出风格，包括对话方式、图片生成、文章生成、音乐生成等多种模态。

## Glossary

- **Age_Stage**: 年龄阶段，分为三个阶段：启蒙期（6-9岁）、探索期（10-12岁）、深化期（13-15岁）
- **Cognitive_Adapter**: 认知适配器，根据年龄阶段调整 AI 输出的系统
- **Modality**: 模态，指不同的输出形式（文本、图片、音频、音乐等）
- **Prompt_Template**: 提示词模板，针对不同年龄阶段和模态的系统提示词
- **Style_Config**: 风格配置，定义每个年龄阶段的输出风格特征
- **Prompt_Registry**: 提示词注册表，集中管理所有提示词模板的系统

## Requirements

### Requirement 1: 年龄阶段识别

**User Story:** 作为系统，我需要根据用户年龄自动识别其所属的认知发展阶段，以便提供适龄的内容。

#### Acceptance Criteria

1. WHEN 系统获取用户信息 THEN THE 系统 SHALL 根据用户年龄计算 Age_Stage
2. WHEN 用户年龄在 6-9 岁 THEN THE Age_Stage SHALL 为 "beginner"（启蒙期）
3. WHEN 用户年龄在 10-12 岁 THEN THE Age_Stage SHALL 为 "explorer"（探索期）
4. WHEN 用户年龄在 13-15 岁 THEN THE Age_Stage SHALL 为 "advanced"（深化期）
5. WHEN 用户年龄不在 6-15 岁范围 THEN THE 系统 SHALL 使用默认阶段（explorer）

### Requirement 2: 提示词模板管理

**User Story:** 作为开发者，我希望有一个集中的提示词管理系统，方便维护和扩展不同模态的提示词。

#### Acceptance Criteria

1. WHEN 系统初始化 THEN THE 系统 SHALL 加载 Prompt_Registry
2. WHEN 添加新模态 THEN THE 开发者 SHALL 在 Prompt_Registry 中注册对应的提示词模板
3. WHEN 提示词模板更新 THEN THE 系统 SHALL 无需重启即可使用新模板
4. WHEN 查询提示词 THEN THE Prompt_Registry SHALL 根据 Age_Stage 和 Modality 返回对应模板
5. WHEN 提示词不存在 THEN THE Prompt_Registry SHALL 返回默认模板或错误

### Requirement 3: 对话模态适配

**User Story:** 作为用户，我希望 AI 的对话方式符合我的年龄特点，让我更容易理解和接受。

#### Acceptance Criteria

1. WHEN 生成对话回复 THEN THE 系统 SHALL 使用对应 Age_Stage 的对话提示词模板
2. WHEN Age_Stage 为 "beginner" THEN THE 对话风格 SHALL 简单易懂、短句为主、多用比喻
3. WHEN Age_Stage 为 "explorer" THEN THE 对话风格 SHALL 逻辑清晰、引导思考、适当使用术语
4. WHEN Age_Stage 为 "advanced" THEN THE 对话风格 SHALL 深度分析、跨学科关联、批判性思考
5. WHEN 对话包含专业术语 THEN THE 系统 SHALL 根据 Age_Stage 决定是否解释

### Requirement 4: 图片生成模态适配

**User Story:** 作为用户，我希望 AI 生成的图片风格符合我的年龄审美和认知水平。

#### Acceptance Criteria

1. WHEN 生成图片 THEN THE 系统 SHALL 使用对应 Age_Stage 的图片生成提示词
2. WHEN Age_Stage 为 "beginner" THEN THE 图片风格 SHALL 卡通、色彩鲜艳、简单明了
3. WHEN Age_Stage 为 "explorer" THEN THE 图片风格 SHALL 写实与卡通结合、细节丰富
4. WHEN Age_Stage 为 "advanced" THEN THE 图片风格 SHALL 写实、专业、信息密度高
5. WHEN 图片包含文字 THEN THE 文字复杂度 SHALL 匹配 Age_Stage

### Requirement 5: 文章生成模态适配

**User Story:** 作为用户，我希望 AI 生成的文章长度、复杂度和深度符合我的阅读能力。

#### Acceptance Criteria

1. WHEN 生成文章 THEN THE 系统 SHALL 使用对应 Age_Stage 的文章生成提示词
2. WHEN Age_Stage 为 "beginner" THEN THE 文章 SHALL 300-500字、简单句式、多用故事
3. WHEN Age_Stage 为 "explorer" THEN THE 文章 SHALL 500-800字、逻辑结构、引导思考
4. WHEN Age_Stage 为 "advanced" THEN THE 文章 SHALL 800-1200字、深度分析、跨学科
5. WHEN 文章包含引用 THEN THE 引用方式 SHALL 匹配 Age_Stage 的理解能力

### Requirement 6: 音乐生成模态适配

**User Story:** 作为用户，我希望 AI 生成的音乐风格和复杂度符合我的年龄特点。

#### Acceptance Criteria

1. WHEN 生成音乐 THEN THE 系统 SHALL 使用对应 Age_Stage 的音乐生成提示词
2. WHEN Age_Stage 为 "beginner" THEN THE 音乐 SHALL 简单旋律、明快节奏、儿歌风格
3. WHEN Age_Stage 为 "explorer" THEN THE 音乐 SHALL 丰富编曲、多种乐器、流行风格
4. WHEN Age_Stage 为 "advanced" THEN THE 音乐 SHALL 复杂和声、多层次、多种风格
5. WHEN 音乐包含歌词 THEN THE 歌词复杂度 SHALL 匹配 Age_Stage

### Requirement 7: 提示词版本管理

**User Story:** 作为产品经理，我希望能追踪提示词的版本变化，方便 A/B 测试和回滚。

#### Acceptance Criteria

1. WHEN 提示词更新 THEN THE 系统 SHALL 记录版本号和更新时间
2. WHEN 需要回滚 THEN THE 系统 SHALL 能恢复到指定版本的提示词
3. WHEN 进行 A/B 测试 THEN THE 系统 SHALL 支持同时使用多个版本的提示词
4. WHEN 查看历史 THEN THE 系统 SHALL 提供提示词变更历史记录
5. WHEN 提示词失效 THEN THE 系统 SHALL 自动降级到稳定版本

### Requirement 8: 提示词动态参数

**User Story:** 作为开发者，我希望提示词支持动态参数，可以根据用户画像和上下文灵活调整。

#### Acceptance Criteria

1. WHEN 构建提示词 THEN THE 系统 SHALL 支持插入动态参数（用户名、兴趣、记忆等）
2. WHEN 参数缺失 THEN THE 系统 SHALL 使用默认值或跳过该参数
3. WHEN 参数包含敏感信息 THEN THE 系统 SHALL 进行脱敏处理
4. WHEN 参数过长 THEN THE 系统 SHALL 自动截断或摘要
5. WHEN 参数格式错误 THEN THE 系统 SHALL 记录错误并使用默认值

### Requirement 9: 跨模态一致性

**User Story:** 作为用户，我希望不同模态的输出风格保持一致，提供统一的体验。

#### Acceptance Criteria

1. WHEN 同一会话中使用多种模态 THEN THE 各模态风格 SHALL 保持一致的 Age_Stage 适配
2. WHEN 生成图文内容 THEN THE 图片和文字风格 SHALL 相互匹配
3. WHEN 生成音频内容 THEN THE 音频风格 SHALL 与文字内容风格一致
4. WHEN 切换模态 THEN THE 系统 SHALL 保持相同的认知复杂度
5. WHEN 用户年龄更新 THEN THE 所有模态 SHALL 同步更新 Age_Stage

### Requirement 10: 提示词效果监控

**User Story:** 作为产品经理，我希望能监控不同提示词的效果，持续优化用户体验。

#### Acceptance Criteria

1. WHEN 使用提示词生成内容 THEN THE 系统 SHALL 记录提示词版本和使用次数
2. WHEN 用户对内容评分 THEN THE 系统 SHALL 关联到对应的提示词版本
3. WHEN 分析效果 THEN THE 系统 SHALL 提供按 Age_Stage 和 Modality 分组的统计
4. WHEN 发现低分提示词 THEN THE 系统 SHALL 发送告警通知
5. WHEN 对比版本 THEN THE 系统 SHALL 提供 A/B 测试结果分析

### Requirement 11: 提示词国际化

**User Story:** 作为产品经理，我希望系统支持多语言提示词，方便未来国际化扩展。

#### Acceptance Criteria

1. WHEN 系统初始化 THEN THE Prompt_Registry SHALL 支持多语言提示词
2. WHEN 用户语言设置为中文 THEN THE 系统 SHALL 使用中文提示词
3. WHEN 用户语言设置为英文 THEN THE 系统 SHALL 使用英文提示词
4. WHEN 提示词翻译缺失 THEN THE 系统 SHALL 使用默认语言（中文）
5. WHEN 添加新语言 THEN THE 系统 SHALL 支持热更新语言包

### Requirement 12: 提示词安全性

**User Story:** 作为安全工程师，我希望提示词系统能防止注入攻击和不当内容生成。

#### Acceptance Criteria

1. WHEN 构建提示词 THEN THE 系统 SHALL 验证所有动态参数
2. WHEN 检测到注入攻击 THEN THE 系统 SHALL 拒绝请求并记录日志
3. WHEN 生成内容 THEN THE 系统 SHALL 包含内容安全指令
4. WHEN 检测到不当内容 THEN THE 系统 SHALL 过滤或拒绝输出
5. WHEN 提示词更新 THEN THE 系统 SHALL 进行安全审核

---

## 年龄阶段特征定义

### 启蒙期（6-9岁）- Beginner

**认知特点**：
- 具象思维为主
- 注意力集中时间短（10-15分钟）
- 喜欢故事和游戏
- 需要即时反馈

**内容特征**：
- 简单易懂，短句为主
- 多用比喻、拟人、故事
- 色彩鲜艳，画面简单
- 节奏明快，旋律简单

### 探索期（10-12岁）- Explorer

**认知特点**：
- 逻辑思维开始发展
- 好奇心强，喜欢探索
- 开始理解因果关系
- 注意力集中时间增加（20-30分钟）

**内容特征**：
- 逻辑清晰，有因果关系
- 引导思考，提出问题
- 细节丰富，信息量适中
- 多种风格，鼓励探索

### 深化期（13-15岁）- Advanced

**认知特点**：
- 抽象思维能力强
- 批判性思考开始形成
- 能理解复杂概念
- 注意力集中时间长（30-45分钟）

**内容特征**：
- 深度分析，跨学科关联
- 批判性思考，多角度
- 专业性强，信息密度高
- 复杂结构，多层次

---

**文档版本**: 1.0  
**创建日期**: 2025-01-08  
**维护者**: 开发团队
