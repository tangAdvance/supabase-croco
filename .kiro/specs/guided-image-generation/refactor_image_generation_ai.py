#!/usr/bin/env python3
"""
重构图片生成流程 - 使用 AI Agent 替换硬编码逻辑

方案 1：集成到现有流程
- 删除旧的"图片生成模式Prompt" Code 节点
- 添加 3 个新节点：
  1. 图片生成智能引导 (Code) - 构建 System Prompt
  2. 图片生成对话 AI (AI Agent) - 智能对话
  3. 提取图片生成上下文 (Code) - 解析响应
"""

import json
import sys

def load_workflow(filepath='n8n.json'):
    """加载 N8N 工作流"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_workflow(workflow, filepath='n8n.json'):
    """保存 N8N 工作流"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(workflow, f, ensure_ascii=False, indent=2)

def find_node_by_name(workflow, name):
    """根据名称查找节点"""
    for node in workflow['nodes']:
        if node.get('name') == name:
            return node
    return None

def find_node_index_by_name(workflow, name):
    """根据名称查找节点索引"""
    for i, node in enumerate(workflow['nodes']):
        if node.get('name') == name:
            return i
    return -1

def create_image_gen_prompt_node():
    """创建图片生成智能引导节点 (Code)"""
    return {
        "parameters": {
            "jsCode": """// 获取 Edge Function 传递的完整上下文数据
const webhookData = $('Webhook').first().json.body;
const { message, userProfile, character, history } = webhookData;

// 从历史对话中提取已收集的信息
let context = {
  theme: null,
  style: null,
  emotion: null
};

// 分析最近的对话历史，提取已收集的信息
if (history && history.length > 0) {
  const recentMessages = history.slice(-10);
  
  // 从 metadata 中提取已收集的信息
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
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
    }
  }
}

// 构建对话历史文本
let conversationHistory = '';
if (history && history.length > 0) {
  conversationHistory = history.slice(-6).map(m => `${m.role}: ${m.content}`).join('\\n');
}

// 年龄判断
const age = userProfile?.age || 10;
let tone = '';
if (age <= 9) {
  tone = '用温暖的、像好朋友一样的语气';
} else if (age <= 12) {
  tone = '用理解和尊重的语气，像大哥哥大姐姐';
} else {
  tone = '用平等对话的语气，不居高临下';
}

// 使用 Edge Function 传递的 character 配置
const characterName = character?.name || '小鳄鱼助手';

// 构建 System Prompt
const systemPrompt = `你是${characterName}🐊，正在帮助孩子创作一幅图片。

**你的任务：**
通过自然对话，收集以下信息来生成图片：
1. **主题 (Theme)**：孩子想画什么？（如：向日葵、小猫、城堡、宇宙飞船）
2. **风格 (Style)**：什么画风？（从预设中选择）
3. **情感 (Emotion)**：希望画面传达什么感觉？（从预设中选择）

**当前收集进度：**
- 主题：${context.theme || '未收集'}
- 风格：${context.style || '未收集'}
- 情感：${context.emotion || '未收集'}

**对话历史：**
${conversationHistory || '（这是我们的第一次对话）'}

**对话规则：**
1. 🎨 **自然引导**：不要像填表格一样问问题，要像朋友聊天
2. 🧠 **智能识别**：如果用户一次性提供多个信息，要能识别并提取
3. 💡 **提供灵感**：如果用户不知道怎么选，给3-4个具体例子
4. ✅ **确认环节**：收集完所有信息后，总结并让用户确认
5. 🚀 **触发生成**：用户确认后，设置 trigger_generation = true
6. ${tone}

**风格预设（必须从这些选择）：**
- **storybook**（童话绘本风）：温暖柔和，像故事书里的插画
- **pixel**（像素游戏风）：复古可爱，像经典游戏
- **anime**（梦幻动漫风）：色彩流动，像宫崎骏的夏天
- **scifi**（科幻电影风）：酷炫逼真，像电影海报

**情感预设（必须从这些选择）：**
- **warm**（温暖快乐）：明亮的色彩，让人开心
- **mysterious**（神秘梦幻）：深邃的色调，充满想象
- **playful**（活泼有趣）：鲜艳的颜色，充满活力
- **calm**（宁静深远）：柔和的色彩，让人放松

**重要：你的回复必须是 JSON 格式：**
{
  "response": "你的对话回复（自然、友好、引导性的）",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "已识别的主题（如果有）",
    "image_style": "已识别的风格 ID（如果有，必须是 storybook/pixel/anime/scifi 之一）",
    "image_emotion": "已识别的情感 ID（如果有，必须是 warm/mysterious/playful/calm 之一）",
    "trigger_generation": false,
    "generationData": {
      // 只有 trigger_generation = true 时才包含
      "prompt": "完整的英文 prompt",
      "theme": "主题",
      "style": "风格 ID",
      "emotion": "情感 ID"
    }
  },
  "memories": []
}

**示例对话流程：**

**第1轮 - 收集主题：**
用户："我想画一朵花"
AI：{
  "response": "太好了！🌸 你想画什么花呢？比如向日葵、玫瑰、还是樱花？",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "花",
    "trigger_generation": false
  },
  "memories": []
}

**第2轮 - 收集风格：**
用户："向日葵"
AI：{
  "response": "向日葵真棒！☀️ 那你喜欢什么风格呢？\\n\\n童话绘本风 - 温暖柔和，像故事书\\n像素游戏风 - 复古可爱，像经典游戏\\n梦幻动漫风 - 色彩流动，像宫崎骏\\n科幻电影风 - 酷炫逼真，像电影海报\\n\\n你更喜欢哪种？",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "trigger_generation": false
  },
  "memories": []
}

**第3轮 - 收集情感：**
用户："童话绘本风"
AI：{
  "response": "好的！最后一个问题，你希望这幅画给人什么感觉呢？\\n\\n温暖快乐 - 明亮的色彩，让人开心\\n神秘梦幻 - 深邃的色调，充满想象\\n活泼有趣 - 鲜艳的颜色，充满活力\\n宁静深远 - 柔和的色彩，让人放松",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "image_style": "storybook",
    "trigger_generation": false
  },
  "memories": []
}

**第4轮 - 确认：**
用户："温暖快乐"
AI：{
  "response": "完美！让我确认一下：\\n\\n🎨 主题：向日葵\\n🖌️ 风格：童话绘本风\\n💛 情感：温暖快乐\\n\\n这样可以吗？如果没问题，我就开始画啦！",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "image_style": "storybook",
    "image_emotion": "warm",
    "trigger_generation": false
  },
  "memories": []
}

**第5轮 - 触发生成：**
用户："可以"
AI：{
  "response": "太好了！🎨 我开始为你创作了！这可能需要一点时间，你可以继续和我聊天，图片生成好后我会立刻通知你！",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "image_style": "storybook",
    "image_emotion": "warm",
    "trigger_generation": true,
    "generationData": {
      "prompt": "sunflower, children's book illustration, watercolor, soft colors, whimsical, warm lighting, cozy atmosphere, bright and cheerful, happy mood, high quality, detailed, professional, safe for children",
      "theme": "向日葵",
      "style": "storybook",
      "emotion": "warm"
    }
  },
  "memories": []
}

**智能识别示例（用户一次性提供多个信息）：**
用户："我想画一朵温暖的童话风格向日葵"
AI：{
  "response": "太棒了！我理解了：\\n\\n🎨 主题：向日葵\\n🖌️ 风格：童话绘本风\\n💛 情感：温暖快乐\\n\\n这样可以吗？如果没问题，我就开始画啦！",
  "metadata": {
    "mode": "creative",
    "intentType": "image_generation",
    "image_theme": "向日葵",
    "image_style": "storybook",
    "image_emotion": "warm",
    "trigger_generation": false
  },
  "memories": []
}

**当前用户消息：**
${message}

请根据当前收集进度，生成合适的回复。记住：
1. 如果信息不完整，继续收集
2. 如果信息完整但未确认，展示汇总并请求确认
3. 如果用户确认，设置 trigger_generation = true 并构建 generationData
4. 风格和情感必须使用预设的 ID（storybook/pixel/anime/scifi 和 warm/mysterious/playful/calm）
5. 回复要自然、友好、有引导性`;

return {
  json: {
    systemPrompt,
    userMessage: message,
    metadata: {
      mode: 'creative',
      intentType: 'image_generation',
      context: context
    }
  }
};"""
        },
        "id": "image-gen-smart-guide",
        "name": "图片生成智能引导",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [0, 600]
    }

def create_image_gen_ai_node():
    """创建图片生成对话 AI 节点 (AI Agent)"""
    return {
        "parameters": {
            "model": "gpt-4o-mini",
            "options": {
                "temperature": 0.7,
                "maxTokens": 800
            },
            "text": "={{ $json.systemPrompt }}",
            "prompt": {
                "messages": [
                    {
                        "role": "user",
                        "content": "={{ $json.userMessage }}"
                    }
                ]
            }
        },
        "id": "image-gen-ai-chat",
        "name": "图片生成对话 AI",
        "type": "@n8n/n8n-nodes-langchain.agent",
        "typeVersion": 1.6,
        "position": [200, 600]
    }

def create_extract_context_node():
    """创建提取图片生成上下文节点 (Code)"""
    return {
        "parameters": {
            "jsCode": """// 获取 AI 响应
const aiResponse = $input.first().json;

// 解析 JSON
let parsedResponse;
try {
  // 尝试直接解析
  const output = aiResponse.output || aiResponse.text || JSON.stringify(aiResponse);
  parsedResponse = JSON.parse(output);
} catch (e) {
  // 如果解析失败，尝试提取 JSON 部分
  const output = aiResponse.output || aiResponse.text || JSON.stringify(aiResponse);
  const jsonMatch = output.match(/```json\\s*([\\s\\S]*?)\\s*```/) || 
                    output.match(/\\{[\\s\\S]*\\}/);
  if (jsonMatch) {
    try {
      parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e2) {
      console.error('[提取上下文] JSON 解析失败:', e2);
      // 默认响应
      parsedResponse = {
        response: output,
        metadata: {
          mode: 'creative',
          intentType: 'image_generation',
          trigger_generation: false
        },
        memories: []
      };
    }
  } else {
    console.error('[提取上下文] 未找到 JSON:', output);
    // 默认响应
    parsedResponse = {
      response: output,
      metadata: {
        mode: 'creative',
        intentType: 'image_generation',
        trigger_generation: false
      },
      memories: []
    };
  }
}

// 确保 metadata 存在
if (!parsedResponse.metadata) {
  parsedResponse.metadata = {
    mode: 'creative',
    intentType: 'image_generation',
    trigger_generation: false
  };
}

// 如果有 generationData，添加必要的字段
if (parsedResponse.metadata.trigger_generation && parsedResponse.metadata.generationData) {
  const webhookData = $('Webhook').first().json.body;
  parsedResponse.metadata.generationData.userId = webhookData.userId;
  parsedResponse.metadata.generationData.characterId = webhookData.characterId;
  parsedResponse.metadata.generationData.conversationId = webhookData.conversationId;
  parsedResponse.metadata.generationData.userDescription = parsedResponse.metadata.generationData.theme;
}

console.log('[提取上下文] 解析结果:', JSON.stringify(parsedResponse, null, 2));

return {
  json: parsedResponse
};"""
        },
        "id": "extract-image-context",
        "name": "提取图片生成上下文",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [400, 600]
    }

def refactor_workflow():
    """重构工作流"""
    print("🔄 开始重构图片生成流程...")
    
    # 1. 加载工作流
    print("📖 加载 N8N 工作流...")
    workflow = load_workflow()
    
    # 2. 备份原始工作流
    print("💾 备份原始工作流...")
    save_workflow(workflow, 'n8n.json.backup')
    print("✅ 备份完成: n8n.json.backup")
    
    # 3. 找到并删除旧的"图片生成模式Prompt"节点
    print("\n🗑️  删除旧的图片生成节点...")
    old_node_index = find_node_index_by_name(workflow, "图片生成模式Prompt")
    if old_node_index >= 0:
        old_node = workflow['nodes'][old_node_index]
        old_node_id = old_node['id']
        workflow['nodes'].pop(old_node_index)
        print(f"✅ 已删除节点: 图片生成模式Prompt (ID: {old_node_id})")
        
        # 删除相关连接
        if old_node_id in workflow.get('connections', {}):
            del workflow['connections'][old_node_id]
            print(f"✅ 已删除连接: {old_node_id}")
    else:
        print("⚠️  未找到旧节点，跳过删除")
    
    # 4. 添加新节点
    print("\n➕ 添加新节点...")
    
    # 4.1 添加"图片生成智能引导"节点
    smart_guide_node = create_image_gen_prompt_node()
    workflow['nodes'].append(smart_guide_node)
    print(f"✅ 已添加: 图片生成智能引导 (ID: {smart_guide_node['id']})")
    
    # 4.2 添加"图片生成对话 AI"节点
    ai_chat_node = create_image_gen_ai_node()
    workflow['nodes'].append(ai_chat_node)
    print(f"✅ 已添加: 图片生成对话 AI (ID: {ai_chat_node['id']})")
    
    # 4.3 添加"提取图片生成上下文"节点
    extract_node = create_extract_context_node()
    workflow['nodes'].append(extract_node)
    print(f"✅ 已添加: 提取图片生成上下文 (ID: {extract_node['id']})")
    
    # 5. 更新连接
    print("\n🔗 更新节点连接...")
    
    # 5.1 更新 Switch 节点的连接（image_generation 路由）
    # 找到 Switch 节点
    switch_node = find_node_by_name(workflow, "Switch")
    if switch_node:
        # 更新 connections
        if 'Switch' not in workflow['connections']:
            workflow['connections']['Switch'] = {'main': [[], [], [], []]}
        
        # image_generation 路由指向"图片生成智能引导"
        workflow['connections']['Switch']['main'][3] = [
            {
                "node": "图片生成智能引导",
                "type": "main",
                "index": 0
            }
        ]
        print("✅ 已更新 Switch → 图片生成智能引导")
    
    # 5.2 连接新节点
    workflow['connections']['图片生成智能引导'] = {
        'main': [[
            {
                "node": "图片生成对话 AI",
                "type": "main",
                "index": 0
            }
        ]]
    }
    print("✅ 已连接: 图片生成智能引导 → 图片生成对话 AI")
    
    workflow['connections']['图片生成对话 AI'] = {
        'main': [[
            {
                "node": "提取图片生成上下文",
                "type": "main",
                "index": 0
            }
        ]]
    }
    print("✅ 已连接: 图片生成对话 AI → 提取图片生成上下文")
    
    workflow['connections']['提取图片生成上下文'] = {
        'main': [[
            {
                "node": "响应格式化",
                "type": "main",
                "index": 0
            }
        ]]
    }
    print("✅ 已连接: 提取图片生成上下文 → 响应格式化")
    
    # 6. 更新"响应格式化"节点
    print("\n🔧 更新响应格式化节点...")
    response_formatter = find_node_by_name(workflow, "响应格式化")
    if response_formatter:
        # 更新 promptNodes 列表
        old_code = response_formatter['parameters']['jsCode']
        new_code = old_code.replace(
            "const promptNodes = ['苏格拉底模式Prompt', '心理安全模式Prompt', '正常对话模式Prompt', '图片生成模式Prompt'];",
            "const promptNodes = ['苏格拉底模式Prompt', '心理安全模式Prompt', '正常对话模式Prompt', '提取图片生成上下文'];"
        )
        
        # 添加对"提取图片生成上下文"节点的支持
        new_code = new_code.replace(
            "// 检查是否有直接响应（图片生成模式）\ntry {\n  const imageGenNode = $('图片生成模式Prompt');",
            "// 检查是否有直接响应（图片生成模式）\ntry {\n  const imageGenNode = $('提取图片生成上下文');"
        )
        
        response_formatter['parameters']['jsCode'] = new_code
        print("✅ 已更新响应格式化节点")
    
    # 7. 保存工作流
    print("\n💾 保存更新后的工作流...")
    save_workflow(workflow)
    print("✅ 保存完成: n8n.json")
    
    print("\n" + "="*60)
    print("🎉 重构完成！")
    print("="*60)
    print("\n📋 变更总结：")
    print("  ✅ 删除: 图片生成模式Prompt (硬编码 Code 节点)")
    print("  ✅ 添加: 图片生成智能引导 (构建 System Prompt)")
    print("  ✅ 添加: 图片生成对话 AI (AI Agent 智能对话)")
    print("  ✅ 添加: 提取图片生成上下文 (解析 AI 响应)")
    print("  ✅ 更新: Switch 路由连接")
    print("  ✅ 更新: 响应格式化节点")
    print("\n📝 下一步：")
    print("  1. 在 N8N 中导入更新后的工作流")
    print("  2. 测试图片生成流程")
    print("  3. 验证 AI 能够智能识别用户输入")
    print("\n⚠️  注意：")
    print("  - 原始工作流已备份到 n8n.json.backup")
    print("  - 如果出现问题，可以恢复备份")
    print("  - 确保 OpenAI API Key 已配置")

if __name__ == '__main__':
    try:
        refactor_workflow()
    except Exception as e:
        print(f"\n❌ 错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
