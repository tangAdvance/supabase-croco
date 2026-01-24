# 图片生成 Realtime 推送完整指南

## 📋 概述

本文档描述如何为 `user_generated_images` 表配置 Supabase Realtime 推送，实现图片生成完成后的实时通知。

## 🏗️ 架构流程

```
用户发送消息 
  ↓
n8n 识别图片生成意图
  ↓
立即返回 "图片生成中..."
  ↓
异步调用图片生成 API
  ↓
保存到 user_generated_images 表
  ↓
Supabase Realtime 自动推送
  ↓
前端 Expo 接收通知并展示
```

---

## 🗄️ 数据库配置

### 1. 启用 Realtime

在 Supabase Dashboard 中启用 Realtime：

1. 进入 **Database** → **Replication**
2. 找到 `user_generated_images` 表
3. 勾选 **Enable Realtime**
4. 点击 **Save**

或者通过 SQL 启用：

```sql
-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_generated_images;
```

### 2. 配置 RLS 策略

创建 RLS 策略，确保用户只能接收自己的图片通知：

```sql
-- 启用 RLS
ALTER TABLE user_generated_images ENABLE ROW LEVEL SECURITY;

-- 策略 1: 用户只能查看自己的图片
CREATE POLICY "用户只能查看自己的图片"
ON user_generated_images
FOR SELECT
USING (
  auth.uid() = (
    SELECT auth_id 
    FROM users 
    WHERE id = user_generated_images.user_id
  )
);

-- 策略 2: 允许 service_role 插入（n8n 使用）
CREATE POLICY "允许服务端插入图片记录"
ON user_generated_images
FOR INSERT
WITH CHECK (true);

-- 策略 3: 用户可以更新自己的图片（收藏、删除）
CREATE POLICY "用户可以更新自己的图片"
ON user_generated_images
FOR UPDATE
USING (
  auth.uid() = (
    SELECT auth_id 
    FROM users 
    WHERE id = user_generated_images.user_id
  )
)
WITH CHECK (
  auth.uid() = (
    SELECT auth_id 
    FROM users 
    WHERE id = user_generated_images.user_id
  )
);
```

### 3. 创建迁移文件

```bash
# 创建迁移文件
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_enable_realtime_user_generated_images.sql << 'EOF'
-- 启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_generated_images;

-- 启用 RLS
ALTER TABLE user_generated_images ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "用户只能查看自己的图片"
ON user_generated_images
FOR SELECT
USING (
  auth.uid() = (
    SELECT auth_id 
    FROM users 
    WHERE id = user_generated_images.user_id
  )
);

CREATE POLICY "允许服务端插入图片记录"
ON user_generated_images
FOR INSERT
WITH CHECK (true);

CREATE POLICY "用户可以更新自己的图片"
ON user_generated_images
FOR UPDATE
USING (
  auth.uid() = (
    SELECT auth_id 
    FROM users 
    WHERE id = user_generated_images.user_id
  )
)
WITH CHECK (
  auth.uid() = (
    SELECT auth_id 
    FROM users 
    WHERE id = user_generated_images.user_id
  )
);

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_user_generated_images_user_id 
ON user_generated_images(user_id);

CREATE INDEX IF NOT EXISTS idx_user_generated_images_conversation_id 
ON user_generated_images(conversation_id);

CREATE INDEX IF NOT EXISTS idx_user_generated_images_created_at 
ON user_generated_images(created_at DESC);
EOF
```

---

## 📱 前端 Expo 集成

### 1. 安装依赖

```bash
npm install @supabase/supabase-js
# 或
yarn add @supabase/supabase-js
```

### 2. 初始化 Supabase 客户端

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 3. 创建 Realtime Hook

```typescript
// hooks/useImageGenerationRealtime.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface GeneratedImage {
  id: string;
  user_id: string;
  character_id: string;
  conversation_id: string;
  image_url: string;
  thumbnail_url: string | null;
  prompt: string;
  style: string;
  emotion: string;
  user_description: string;
  metadata: any;
  is_favorite: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export function useImageGenerationRealtime(
  userId: string,
  conversationId?: string
) {
  const [newImage, setNewImage] = useState<GeneratedImage | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      console.log('[Realtime] 开始监听图片生成...');
      
      // 创建 Realtime 订阅
      channel = supabase
        .channel(`user_generated_images:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_generated_images',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            console.log('[Realtime] 收到新图片:', payload);
            
            const newImageData = payload.new as GeneratedImage;
            
            // 如果指定了 conversationId，只接收该对话的图片
            if (conversationId && newImageData.conversation_id !== conversationId) {
              console.log('[Realtime] 图片不属于当前对话，忽略');
              return;
            }
            
            setNewImage(newImageData);
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] 订阅状态:', status);
          setIsListening(status === 'SUBSCRIBED');
        });
    };

    setupRealtime();

    // 清理函数
    return () => {
      console.log('[Realtime] 取消订阅');
      if (channel) {
        supabase.removeChannel(channel);
      }
      setIsListening(false);
    };
  }, [userId, conversationId]);

  return { newImage, isListening, clearNewImage: () => setNewImage(null) };
}
```

### 4. 在聊天页面使用

```typescript
// screens/ChatScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useImageGenerationRealtime } from '@/hooks/useImageGenerationRealtime';
import { useAuth } from '@/hooks/useAuth';

export default function ChatScreen({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const { newImage, isListening, clearNewImage } = useImageGenerationRealtime(
    user?.id || '',
    conversationId
  );

  const [isGenerating, setIsGenerating] = React.useState(false);

  // 监听新图片
  useEffect(() => {
    if (newImage) {
      console.log('收到新生成的图片:', newImage);
      
      // 停止加载状态
      setIsGenerating(false);
      
      // 显示图片通知或直接展示
      showImageNotification(newImage);
      
      // 清除状态
      clearNewImage();
    }
  }, [newImage]);

  const showImageNotification = (image: GeneratedImage) => {
    // 方案 1: Toast 通知
    Toast.show({
      type: 'success',
      text1: '图片生成完成！🎨',
      text2: '点击查看你的作品',
      onPress: () => {
        // 跳转到图片详情页
        navigation.navigate('ImageDetail', { imageId: image.id });
      },
    });

    // 方案 2: 直接在聊天中展示
    addMessageToChat({
      role: 'assistant',
      content: '你的图片已经生成好了！',
      metadata: {
        type: 'image',
        imageUrl: image.image_url,
        imageId: image.id,
      },
    });
  };

  const handleSendMessage = async (message: string) => {
    // 发送消息到 n8n
    const response = await fetch('YOUR_N8N_WEBHOOK_URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId: user?.id,
        conversationId,
        // ... 其他参数
      }),
    });

    const data = await response.json();

    // 如果触发了图片生成
    if (data.metadata?.trigger_generation) {
      setIsGenerating(true);
      
      // 显示加载消息
      addMessageToChat({
        role: 'assistant',
        content: data.response, // "太好了！🎨 我开始为你创作了！..."
        metadata: { type: 'generating' },
      });
    }
  };

  return (
    <View>
      {/* 聊天界面 */}
      
      {/* 图片生成中指示器 */}
      {isGenerating && (
        <View style={styles.generatingIndicator}>
          <ActivityIndicator size="small" color="#00B894" />
          <Text>图片生成中...</Text>
        </View>
      )}

      {/* Realtime 连接状态 */}
      {__DEV__ && (
        <Text style={styles.debugText}>
          Realtime: {isListening ? '✅ 已连接' : '❌ 未连接'}
        </Text>
      )}
    </View>
  );
}
```

### 5. 图片画廊页面

```typescript
// screens/ImageGalleryScreen.tsx
import React, { useEffect, useState } from 'react';
import { FlatList, Image, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useImageGenerationRealtime } from '@/hooks/useImageGenerationRealtime';

export default function ImageGalleryScreen() {
  const { user } = useAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const { newImage, clearNewImage } = useImageGenerationRealtime(user?.id || '');

  // 加载历史图片
  useEffect(() => {
    loadImages();
  }, []);

  // 监听新图片
  useEffect(() => {
    if (newImage) {
      // 添加到列表顶部
      setImages((prev) => [newImage, ...prev]);
      clearNewImage();
    }
  }, [newImage]);

  const loadImages = async () => {
    const { data, error } = await supabase
      .from('user_generated_images')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (data) {
      setImages(data);
    }
  };

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      numColumns={2}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => viewImage(item)}>
          <Image
            source={{ uri: item.thumbnail_url || item.image_url }}
            style={{ width: 150, height: 150, margin: 5 }}
          />
        </TouchableOpacity>
      )}
    />
  );
}
```

---

## 🧪 测试步骤

### 1. 测试 Realtime 配置

```sql
-- 在 Supabase SQL Editor 中执行
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'user_generated_images';

-- 应该返回一行记录
```

### 2. 测试 RLS 策略

```sql
-- 切换到用户角色测试
SET ROLE authenticated;
SET request.jwt.claims.sub = 'YOUR_USER_AUTH_ID';

-- 应该只能看到自己的图片
SELECT * FROM user_generated_images;

-- 重置角色
RESET ROLE;
```

### 3. 测试前端连接

在 Expo 应用中添加调试日志：

```typescript
// 在组件中添加
useEffect(() => {
  console.log('Realtime 监听状态:', isListening);
  console.log('用户 ID:', userId);
  console.log('对话 ID:', conversationId);
}, [isListening, userId, conversationId]);
```

### 4. 端到端测试

1. 在聊天中发送："帮我画一朵向日葵"
2. 确认收到："太好了！🎨 我开始为你创作了！..."
3. 等待 10-30 秒
4. 应该收到 Realtime 推送并显示图片

---

## 🐛 常见问题

### 问题 1: Realtime 没有推送

**检查清单：**
- ✅ 表是否启用了 Realtime？
- ✅ RLS 策略是否正确？
- ✅ 前端是否使用了正确的 `user_id`？
- ✅ n8n 是否成功插入了记录？

**调试方法：**
```typescript
// 在 useEffect 中添加
console.log('[Realtime] Channel:', channel);
console.log('[Realtime] Subscription status:', status);
```

### 问题 2: RLS 阻止了查询

**解决方案：**
```sql
-- 检查当前用户
SELECT auth.uid();

-- 检查 users 表关联
SELECT u.id, u.auth_id 
FROM users u 
WHERE u.auth_id = auth.uid();
```

### 问题 3: 图片 URL 无法访问

**检查 Storage 权限：**
```sql
-- 确保 audios_test bucket 是公开的
UPDATE storage.buckets 
SET public = true 
WHERE name = 'audios_test';
```

---

## 📊 性能优化

### 1. 使用索引

```sql
-- 已在迁移文件中包含
CREATE INDEX idx_user_generated_images_user_id ON user_generated_images(user_id);
CREATE INDEX idx_user_generated_images_conversation_id ON user_generated_images(conversation_id);
CREATE INDEX idx_user_generated_images_created_at ON user_generated_images(created_at DESC);
```

### 2. 限制 Realtime 负载

```typescript
// 只在需要时订阅
useEffect(() => {
  if (!isActive) return; // 页面不活跃时不订阅
  
  // ... 订阅逻辑
}, [isActive]);
```

### 3. 使用缩略图

```typescript
// 列表中使用缩略图
<Image source={{ uri: item.thumbnail_url || item.image_url }} />

// 详情页使用原图
<Image source={{ uri: item.image_url }} />
```

---

## 🚀 部署检查清单

- [ ] 数据库迁移已应用
- [ ] Realtime 已启用
- [ ] RLS 策略已配置
- [ ] 前端代码已更新
- [ ] 环境变量已配置
- [ ] 端到端测试通过
- [ ] 错误处理已完善
- [ ] 日志监控已配置

---

## 📚 相关文档

- [Supabase Realtime 文档](https://supabase.com/docs/guides/realtime)
- [RLS 策略指南](https://supabase.com/docs/guides/auth/row-level-security)
- [n8n 工作流配置](./n8n.json)
- [数据库设计文档](./数据库设计文档%20v1.0.md)
