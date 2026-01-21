#!/usr/bin/env python3
"""
更新 N8N workflow，添加任务 5 的节点：
- 5.1: 配置 Supabase 插入节点
- 5.2: 实现图片记录构建
"""

import json

# 读取现有的 workflow
with open('n8n.json', 'r', encoding='utf-8') as f:
    workflow = json.load(f)

# 新增节点：构建图片记录（子任务 5.2）
build_image_record_node = {
    "parameters": {
        "jsCode": """// 子任务 5.2: 实现图片记录构建
// 从"处理 API 响应"节点获取数据
const responseData = $input.item.json;

// 检查是否成功
if (!responseData.success || !responseData.imageRecord) {
  console.error('[ImageGen] No image record to store');
  return {
    json: {
      error: 'No image record available',
      skip: true
    }
  };
}

// 获取完整的图片记录
const imageRecord = responseData.imageRecord;

// 确保所有必需字段都存在
const requiredFields = ['user_id', 'character_id', 'conversation_id', 'image_url', 'prompt', 'style', 'emotion', 'user_description'];
const missingFields = requiredFields.filter(field => !imageRecord[field]);

if (missingFields.length > 0) {
  console.error('[ImageGen] Missing required fields:', missingFields);
  return {
    json: {
      error: `Missing required fields: ${missingFields.join(', ')}`,
      skip: true
    }
  };
}

// 构建完整的图片记录对象（包含所有必需字段）
const completeImageRecord = {
  user_id: imageRecord.user_id,
  character_id: imageRecord.character_id,
  conversation_id: imageRecord.conversation_id,
  image_url: imageRecord.image_url,
  thumbnail_url: imageRecord.thumbnail_url || null,
  prompt: imageRecord.prompt,
  style: imageRecord.style,
  emotion: imageRecord.emotion,
  user_description: imageRecord.user_description,
  metadata: imageRecord.metadata || {
    model: 'dall-e-3',
    generation_time: responseData.generationTime || 0,
    api_provider: 'openai'
  },
  is_favorite: false,
  is_deleted: false
};

console.log('[ImageGen] Image record built successfully:', {
  user_id: completeImageRecord.user_id,
  conversation_id: completeImageRecord.conversation_id,
  image_url: completeImageRecord.image_url.substring(0, 50) + '...'
});

return {
  json: completeImageRecord
};"""
    },
    "id": "build-image-record",
    "name": "构建图片记录",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [1800, 380]
}

# 新增节点：插入到 Supabase（子任务 5.1）
insert_supabase_node = {
    "parameters": {
        "operation": "insert",
        "tableId": "user_generated_images",
        "options": {
            "queryName": "insert_generated_image"
        }
    },
    "id": "insert-to-supabase",
    "name": "插入到 Supabase",
    "type": "n8n-nodes-base.supabase",
    "typeVersion": 1,
    "position": [2000, 380],
    "credentials": {
        "supabaseApi": {
            "id": "supabase-credentials",
            "name": "Supabase API"
        }
    }
}

# 新增节点：记录插入成功日志
log_success_node = {
    "parameters": {
        "jsCode": """// 记录插入成功
const insertResult = $input.item.json;

console.log('[ImageGen] Image record inserted successfully:', {
  id: insertResult.id,
  user_id: insertResult.user_id,
  conversation_id: insertResult.conversation_id,
  image_url: insertResult.image_url ? insertResult.image_url.substring(0, 50) + '...' : 'N/A',
  created_at: insertResult.created_at
});

// Realtime 通知会自动触发，无需额外操作
console.log('[ImageGen] Realtime notification will be triggered automatically');

return {
  json: {
    success: true,
    message: 'Image record stored and notification sent',
    imageId: insertResult.id,
    userId: insertResult.user_id,
    conversationId: insertResult.conversation_id
  }
};"""
    },
    "id": "log-insert-success",
    "name": "记录插入成功",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [2200, 380]
}

# 新增节点：处理插入错误
handle_insert_error_node = {
    "parameters": {
        "jsCode": """// 处理 Supabase 插入错误
const errorData = $input.item.json;

// 记录详细错误日志
const errorLog = {
  type: 'image_storage_error',
  error: errorData.error || errorData,
  timestamp: new Date().toISOString()
};

console.error('[ImageGen] Supabase Insert Error:', JSON.stringify(errorLog, null, 2));

// 不阻塞流程，只记录错误
return {
  json: {
    success: false,
    error: 'Failed to store image record',
    errorLog: errorLog
  }
};"""
    },
    "id": "handle-insert-error",
    "name": "处理插入错误",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [2000, 580]
}

# 添加新节点到 workflow
workflow['nodes'].extend([
    build_image_record_node,
    insert_supabase_node,
    log_success_node,
    handle_insert_error_node
])

# 更新连接关系
# 1. "检查 API 是否成功" 的成功分支连接到"构建图片记录"
workflow['connections']['检查 API 是否成功']['main'][0] = [
    {
        "node": "构建图片记录",
        "type": "main",
        "index": 0
    }
]

# 2. "构建图片记录" 连接到 "插入到 Supabase"
workflow['connections']['构建图片记录'] = {
    "main": [
        [
            {
                "node": "插入到 Supabase",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# 3. "插入到 Supabase" 连接到 "记录插入成功"（成功）和 "处理插入错误"（失败）
# 注意：Supabase 节点需要配置 continueOnFail
workflow['connections']['插入到 Supabase'] = {
    "main": [
        [
            {
                "node": "记录插入成功",
                "type": "main",
                "index": 0
            }
        ]
    ]
}

# 保存更新后的 workflow
with open('n8n.json', 'w', encoding='utf-8') as f:
    json.dump(workflow, f, ensure_ascii=False, indent=2)

print("✅ N8N workflow 已更新，添加了任务 5 的节点")
print("\n新增节点：")
print("1. 构建图片记录 (build-image-record)")
print("2. 插入到 Supabase (insert-to-supabase)")
print("3. 记录插入成功 (log-insert-success)")
print("4. 处理插入错误 (handle-insert-error)")
print("\n连接关系已更新：")
print("检查 API 是否成功 → 构建图片记录 → 插入到 Supabase → 记录插入成功")
