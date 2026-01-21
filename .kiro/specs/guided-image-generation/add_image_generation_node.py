#!/usr/bin/env python3
"""
添加"图片生成模式Prompt"节点到 N8N workflow
这个节点负责：
1. 识别图片生成意图
2. 收集创作要素（Theme、Style、Emotion）
3. 用户确认后设置 trigger_generation = true
"""

import json

# 读取现有的 workflow
with open('n8n.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# 图片生成模式Prompt节点的完整代码
image_gen_prompt_code = """// 获取 Edge Function 传递的完整上下文数据
const webhookData = $('Webhook').item.json.body;
const intentData = $('AI Agent').item.json.output;

const { message, userProfile, character, history } = webhookData;

// 风格预设
const STYLE_PRESETS = [
  {
    id: 'storybook',
    name: '童话绘本风',
    description: '温暖柔和，像故事书里的插画',
    prompt_suffix: "children's book illustration, watercolor, soft colors, whimsical"
  },
  {
    id: 'pixel',
    name: '像素游戏风',
    description: '复古可爱，像经典游戏',
    prompt_suffix: '8-bit pixel art, retro game style, vibrant colors'
  },
  {
    id: 'anime',
    name: '梦幻动漫风',
    description: '色彩流动，像宫崎骏的夏天',
    prompt_suffix: 'anime style, Studio Ghibli inspired, dreamy atmosphere, soft lighting'
  },
  {
    id: 'scifi',
    name: '科幻电影风',
    description: '酷炫逼真，像电影海报',
    prompt_suffix: 'sci-fi concept art, cinematic, detailed, futuristic, dramatic lighting'
  }
];

// 情感预设
const EMOTION_PRESETS = [
  {
    id: 'warm',
    name: '温暖快乐',
    description: '明亮的色彩，让人开心',
    prompt_suffix: 'warm lighting, cozy atmosphere, bright and cheerful, happy mood'
  },
  {
    id: 'mysterious',
    name: '神秘梦幻',
    description: '深邃的色调，充满想象',
    prompt_suffix: 'mysterious mood, deep colors, ethereal lighting, magical atmosphere'
  },
  {
    id: 'playful',
    name: '活泼有趣',
    description: '鲜艳的颜色，充满活力',
    prompt_suffix: 'playful and fun, vibrant colors, dynamic composition, energetic'
  },
  {
    id: 'calm',
    name: '宁静深远',
    description: '柔和的色彩，让人放松',
    prompt_suffix: 'peaceful and serene, soft colors, gentle lighting, tranquil mood'
  }
];

// 从对话历史中提取创作上下文
function extractCreationContext(history) {
  const context = {
    theme: null,
    style: null,
    emotion: null,
    details: []
  };
  
  if (!history || history.length === 0) {
    return context;
  }
  
  // 从最近的消息中提取（倒序查找）
  for (let i = history.length - 1; i >= Math.max(0, history.length - 10); i--) {
    const msg = history[i];
    if (msg.metadata) {
      if (msg.metadata.image_theme && !context.theme) {
        context.theme = msg.metadata.image_theme;
      }
      if (msg.metadata.image_style && !context.style) {
        context.style = msg.metadata.image_style;
      }
      if (msg.metadata.image_emotion && !context.emotion) {
        context.emotion = msg.metadata.image_emotion;
      }
      if (msg.metadata.image_details) {
        context.details.push(...msg.metadata.image_details);
      }
    }
  }
  
  return context;
}

// 检查是否为确认消息
function isConfirmation(message) {
  const confirmKeywords = ['确认', '确定', '好的', '开始生成', '生成', '可以', 'ok', 'yes'];
  const lowerMsg = message.toLowerCase().trim();
  return confirmKeywords.some(keyword => lowerMsg.includes(keyword));
}

// 构建图片生成 Prompt
function buildImagePrompt(context, character) {
  const { theme, style, emotion } = context;
  
  const stylePreset = STYLE_PRESETS.find(s => s.id === style);
  const emotionPreset = EMOTION_PRESETS.find(e => e.id === emotion);
  
  const stylePrompt = stylePreset ? stylePreset.prompt_suffix : '';
  const emotionPrompt = emotionPreset ? emotionPreset.prompt_suffix : '';
  
  const characterStyle = character?.personality || '';
  
  const prompt = `${theme}, ${stylePrompt}, ${emotionPrompt}, inspired by ${characterStyle}, high quality, detailed, professional, safe for children, appropriate for all ages`;
  
  return prompt;
}

// 主逻辑
const context = extractCreationContext(history);
const characterName = character?.name || '小鳄鱼助手';

let response = '';
let metadata = {
  mode: 'creative',
  intentType: 'image_generation',
  trigger_generation: false
};

// 检查信息收集进度
if (!context.theme) {
  // 收集主题
  response = `太好了！首先告诉我，你想画什么？🎨`;
} else if (!context.style) {
  // 收集风格
  response = `很棒的主题！现在选择画风吧！你喜欢哪种风格？\\n\\n`;
  STYLE_PRESETS.forEach(style => {
    response += `${style.name} - ${style.description}\\n`;
  });
  metadata.image_theme = context.theme;
} else if (!context.emotion) {
  // 收集情感
  response = `好的！最后选择情感色彩吧！你希望画面给人什么感觉？\\n\\n`;
  EMOTION_PRESETS.forEach(emotion => {
    response += `${emotion.name} - ${emotion.description}\\n`;
  });
  metadata.image_theme = context.theme;
  metadata.image_style = context.style;
} else {
  // 信息收集完整，等待确认
  const userConfirmed = isConfirmation(message);
  
  if (userConfirmed) {
    // 用户确认，构建 prompt 并触发生成
    const imagePrompt = buildImagePrompt(context, character);
    
    response = `太好了！🎨 我开始为你创作了！\\n\\n这可能需要一点时间，你可以继续和我聊天，图片生成好后我会立刻通知你！`;
    
    metadata.image_theme = context.theme;
    metadata.image_style = context.style;
    metadata.image_emotion = context.emotion;
    metadata.image_prompt = imagePrompt;
    metadata.confirmed = true;
    metadata.trigger_generation = true; // 关键：触发异步生成
    
    // 传递生成数据
    metadata.generationData = {
      userId: webhookData.userId,
      characterId: webhookData.characterId,
      conversationId: webhookData.conversationId,
      prompt: imagePrompt,
      theme: context.theme,
      style: context.style,
      emotion: context.emotion,
      userDescription: context.theme
    };
  } else {
    // 展示汇总，请求确认
    const stylePreset = STYLE_PRESETS.find(s => s.id === context.style);
    const emotionPreset = EMOTION_PRESETS.find(e => e.id === context.emotion);
    
    response = `太棒了！让我确认一下：\\n\\n`;
    response += `📝 主题：${context.theme}\\n`;
    response += `🎨 风格：${stylePreset ? stylePreset.name : context.style}\\n`;
    response += `💫 情感：${emotionPreset ? emotionPreset.name : context.emotion}\\n\\n`;
    response += `确认开始创作吗？（回复"确认"或"开始生成"）\\n`;
    response += `如果想修改，直接告诉我哪里要改！`;
    
    metadata.image_theme = context.theme;
    metadata.image_style = context.style;
    metadata.image_emotion = context.emotion;
  }
}

return {
  json: {
    systemPrompt: '', // 不需要 system prompt，直接返回响应
    userMessage: message,
    metadata: metadata,
    response: response
  }
};"""

# 创建图片生成模式Prompt节点
image_gen_prompt_node = {
    "parameters": {
        "jsCode": image_gen_prompt_code
    },
    "id": "image-gen-prompt",
    "name": "图片生成模式Prompt",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [0, 600]
}

# 添加节点到 workflow
workflow['nodes'].append(image_gen_prompt_node)

# 更新 Switch 节点的连接，添加第5个分支用于图片生成
# 找到 Switch 节点
switch_node = None
for node in workflow['nodes']:
    if node['name'] == 'Switch':
        switch_node = node
        break

if switch_node:
    # 添加第5个条件：image_generation
    switch_node['parameters']['rules']['values'].append({
        "conditions": {
            "options": {
                "caseSensitive": True,
                "leftValue": "",
                "typeValidation": "strict",
                "version": 3
            },
            "conditions": [
                {
                    "id": "image-generation-intent",
                    "leftValue": "={{ $json.output }}",
                    "rightValue": "image_generation",
                    "operator": {
                        "type": "string",
                        "operation": "equals"
                    }
                }
            ],
            "combinator": "and"
        }
    })

# 更新 Switch 节点的连接关系
if 'Switch' in workflow['connections']:
    workflow['connections']['Switch']['main'].append([
        {
            "node": "图片生成模式Prompt",
            "type": "main",
            "index": 0
        }
    ])

# 添加"图片生成模式Prompt"到"chat"的连接
workflow['connections']['图片生成模式Prompt'] = {
    "main": [
        [
            {
                "node": "chat",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# 保存更新后的 workflow
with open('n8n.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, ensure_ascii=False, indent=2)

print("✅ 已添加'图片生成模式Prompt'节点")
print("\n节点功能：")
print("1. 识别图片生成意图")
print("2. 收集创作要素（Theme、Style、Emotion）")
print("3. 用户确认后设置 trigger_generation = true")
print("\n连接关系：")
print("Switch → 图片生成模式Prompt → chat → 响应格式化 → 检查是否触发图片生成")
