#!/usr/bin/env python3
"""
更新"响应格式化"节点，支持图片生成模式的输出
"""

import json

# 读取现有的 workflow
with open('n8n.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# 新的响应格式化代码
new_formatter_code = """// 获取 AI Agent (chat) 的响应
const chatResponse = $input.item.json;

// 提取前面节点的 metadata
let metadata = {};
const promptNodes = ['苏格拉底模式Prompt', '心理安全模式Prompt', '正常对话模式Prompt', '图片生成模式Prompt'];

for (const nodeName of promptNodes) {
  try {
    const node = $(nodeName);
    if (node && node.item && node.item.json && node.item.json.metadata) {
      metadata = node.item.json.metadata;
      break;
    }
  } catch (e) {
    // 节点不存在，继续
  }
}

// 提取 AI 回复文本
let aiOutput = '';
let directResponse = null;

// 检查是否有直接响应（图片生成模式）
try {
  const imageGenNode = $('图片生成模式Prompt');
  if (imageGenNode && imageGenNode.item && imageGenNode.item.json && imageGenNode.item.json.response) {
    directResponse = imageGenNode.item.json.response;
  }
} catch (e) {
  // 节点不存在或没有直接响应
}

if (directResponse) {
  // 使用直接响应（图片生成模式）
  aiOutput = directResponse;
} else if (chatResponse.output) {
  aiOutput = chatResponse.output;
} else if (chatResponse.text) {
  aiOutput = chatResponse.text;
} else if (typeof chatResponse === 'string') {
  aiOutput = chatResponse;
} else {
  aiOutput = JSON.stringify(chatResponse);
}

// 尝试解析 JSON 格式的回复
let parsedResponse;
try {
  // 尝试直接解析
  parsedResponse = JSON.parse(aiOutput);
} catch (e) {
  // 如果解析失败，尝试提取 JSON 部分（可能包含 markdown 代码块）
  const jsonMatch = aiOutput.match(/```json\\s*([\\s\\S]*?)\\s*```/) || aiOutput.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) {
    try {
      parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e2) {
      // 如果还是失败，按原格式处理
      parsedResponse = {
        response: aiOutput,
        memories: []
      };
    }
  } else {
    // 没有找到 JSON，按原格式处理
    parsedResponse = {
      response: aiOutput,
      memories: []
    };
  }
}

// 构建返回数据 - 返回 Edge Function 需要的字段
const result = {
  response: parsedResponse.response || aiOutput,
  intentType: metadata.intentType || 'chat',
  mode: metadata.mode || 'normal',
  memories: parsedResponse.memories || []
};

// 如果有 metadata，添加到结果中
if (metadata) {
  result.metadata = metadata;
}

// 如果有 generationData，添加到结果中
if (metadata.generationData) {
  result.generationData = metadata.generationData;
}

return {
  json: result
};"""

# 找到响应格式化节点并更新代码
for node in workflow['nodes']:
    if node['name'] == '响应格式化':
        node['parameters']['jsCode'] = new_formatter_code
        print("✅ 已更新'响应格式化'节点")
        break

# 保存更新后的 workflow
with open('n8n.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, ensure_ascii=False, indent=2)

print("\n更新内容：")
print("1. 添加了对'图片生成模式Prompt'节点的支持")
print("2. 支持直接响应（不需要通过 chat 节点）")
print("3. 传递 metadata 和 generationData 到下游节点")
print("\n现在'响应格式化'节点可以处理：")
print("- 苏格拉底模式Prompt")
print("- 心理安全模式Prompt")
print("- 正常对话模式Prompt")
print("- 图片生成模式Prompt ✨ (新增)")
