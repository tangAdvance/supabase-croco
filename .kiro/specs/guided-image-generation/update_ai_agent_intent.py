#!/usr/bin/env python3
"""
更新 AI Agent 节点，添加 image_generation 意图识别
"""

import json

# 读取现有的 workflow
with open('n8n.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# 找到 AI Agent 节点并更新 system message
for node in workflow['nodes']:
    if node['name'] == 'AI Agent':
        # 更新 system message，添加 image_generation 意图
        node['parameters']['options']['systemMessage'] = """分析这条消息的意图，只返回以下之一：
- homework (作业辅导)
- knowledge (知识问答)
- emotional (情感求助)
- image_generation (图片生成 - 当用户说"画"、"图片"、"生成图片"、"创作"、"画画"等)
- chat (闲聊)

判断规则：
1. 如果消息包含"画"、"图片"、"生成"、"创作"、"画画"等关键词，返回 image_generation
2. 如果是作业相关问题，返回 homework
3. 如果是知识问答，返回 knowledge
4. 如果是情感求助，返回 emotional
5. 其他情况返回 chat

消息：{{$json.body.message}}"""
        print("✅ 已更新 AI Agent 的 system message")
        break

# 保存更新后的 workflow
with open('n8n.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, ensure_ascii=False, indent=2)

print("\n更新内容：")
print("- 添加了 image_generation 意图识别")
print("- 关键词：画、图片、生成、创作、画画")
print("\n意图列表：")
print("1. homework - 作业辅导")
print("2. knowledge - 知识问答")
print("3. emotional - 情感求助")
print("4. image_generation - 图片生成")
print("5. chat - 闲聊")
