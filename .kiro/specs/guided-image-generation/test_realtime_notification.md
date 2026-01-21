# 子任务 5.3: 测试 Realtime 通知

## 测试目标

验证当图片记录插入到 `user_generated_images` 表时，Supabase Realtime 能够自动推送通知给订阅的客户端。

## 前置条件

1. ✅ 数据库表 `user_generated_images` 已创建
2. ✅ Realtime 已启用（通过 `ALTER PUBLICATION supabase_realtime ADD TABLE user_generated_images`）
3. ✅ RLS 策略已配置
4. ✅ N8N workflow 已配置 Supabase 插入节点

## 测试方法

### 方法 1: 使用 Supabase Dashboard 测试

1. **打开 Supabase Dashboard**
   - 登录到 Supabase 项目
   - 进入 Table Editor
   - 选择 `user_generated_images` 表

2. **手动插入测试记录**
   ```sql
   INSERT INTO user_generated_images (
     user_id,
     character_id,
     conversation_id,
     image_url,
     prompt,
     style,
     emotion,
     user_description,
     metadata
   ) VALUES (
     '<test_user_id>',
     '<test_character_id>',
     '<test_conversation_id>',
     'https://example.com/test-image.png',
     'A cute cat flying in space, children''s book illustration',
     'storybook',
     'warm',
     '一只在太空飞的猫',
     '{"model": "dall-e-3", "generation_time": 15, "api_provider": "openai"}'::jsonb
   );
   ```

3. **验证 Realtime 推送**
   - 在客户端订阅 Realtime 事件
   - 检查是否收到 INSERT 事件通知
   - 验证通知数据完整性

### 方法 2: 使用 SQL 脚本测试

创建测试脚本 `test_realtime_insert.sql`:

```sql
-- 测试 Realtime 通知
-- 注意：需要替换实际的 user_id, character_id, conversation_id

DO $$
DECLARE
  test_user_id uuid;
  test_character_id uuid;
  test_conversation_id uuid;
  inserted_id uuid;
BEGIN
  -- 获取测试用的 ID（从现有数据中选择）
  SELECT id INTO test_user_id FROM users LIMIT 1;
  SELECT id INTO test_character_id FROM characters LIMIT 1;
  SELECT id INTO test_conversation_id FROM conversations WHERE user_id = test_user_id LIMIT 1;
  
  -- 插入测试记录
  INSERT INTO user_generated_images (
    user_id,
    character_id,
    conversation_id,
    image_url,
    prompt,
    style,
    emotion,
    user_description,
    metadata
  ) VALUES (
    test_user_id,
    test_character_id,
    test_conversation_id,
    'https://oaidalleapiprodscus.blob.core.windows.net/test/test-image.png',
    'A cute cat flying in space, children''s book illustration, watercolor, soft colors, whimsical, warm lighting, cozy atmosphere',
    'storybook',
    'warm',
    '一只在太空飞的猫',
    jsonb_build_object(
      'model', 'dall-e-3',
      'generation_time', 15,
      'api_provider', 'openai',
      'test', true
    )
  ) RETURNING id INTO inserted_id;
  
  RAISE NOTICE 'Test image record inserted with ID: %', inserted_id;
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Realtime notification should be triggered now';
  
  -- 等待 2 秒后删除测试记录
  PERFORM pg_sleep(2);
  
  UPDATE user_generated_images 
  SET is_deleted = true 
  WHERE id = inserted_id;
  
  RAISE NOTICE 'Test record marked as deleted';
END $$;
```

### 方法 3: 使用客户端代码测试（Flutter 示例）

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

class RealtimeNotificationTest {
  final SupabaseClient supabase;
  RealtimeChannel? _channel;
  
  RealtimeNotificationTest(this.supabase);
  
  /// 订阅 Realtime 通知
  Future<void> subscribeToImageGeneration(String userId) async {
    print('[Test] Subscribing to image generation notifications for user: $userId');
    
    _channel = supabase
      .channel('test-image-generation-$userId')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'user_generated_images',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'user_id',
          value: userId,
        ),
        callback: (payload) {
          print('[Test] ✅ Realtime notification received!');
          print('[Test] Event type: ${payload.eventType}');
          print('[Test] New record: ${payload.newRecord}');
          
          final imageData = payload.newRecord as Map<String, dynamic>;
          print('[Test] Image ID: ${imageData['id']}');
          print('[Test] Image URL: ${imageData['image_url']}');
          print('[Test] Style: ${imageData['style']}');
          print('[Test] Emotion: ${imageData['emotion']}');
          print('[Test] Created at: ${imageData['created_at']}');
          
          // 验证通知延迟
          final createdAt = DateTime.parse(imageData['created_at']);
          final now = DateTime.now();
          final delay = now.difference(createdAt).inMilliseconds;
          print('[Test] Notification delay: ${delay}ms');
          
          if (delay < 1000) {
            print('[Test] ✅ Notification delay is acceptable (< 1s)');
          } else {
            print('[Test] ⚠️ Notification delay is high (${delay}ms)');
          }
        },
      )
      .subscribe();
    
    print('[Test] Subscription active, waiting for notifications...');
  }
  
  /// 取消订阅
  Future<void> unsubscribe() async {
    if (_channel != null) {
      await supabase.removeChannel(_channel!);
      print('[Test] Unsubscribed from notifications');
    }
  }
  
  /// 插入测试记录
  Future<void> insertTestRecord(String userId, String characterId, String conversationId) async {
    print('[Test] Inserting test record...');
    
    final response = await supabase
      .from('user_generated_images')
      .insert({
        'user_id': userId,
        'character_id': characterId,
        'conversation_id': conversationId,
        'image_url': 'https://example.com/test-image-${DateTime.now().millisecondsSinceEpoch}.png',
        'prompt': 'Test prompt for Realtime notification',
        'style': 'storybook',
        'emotion': 'warm',
        'user_description': '测试图片',
        'metadata': {
          'model': 'dall-e-3',
          'generation_time': 10,
          'api_provider': 'openai',
          'test': true,
        },
      })
      .select()
      .single();
    
    print('[Test] Test record inserted: ${response['id']}');
  }
}

// 使用示例
void main() async {
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  final supabase = Supabase.instance.client;
  final test = RealtimeNotificationTest(supabase);
  
  // 1. 订阅通知
  await test.subscribeToImageGeneration('test-user-id');
  
  // 2. 等待 2 秒确保订阅生效
  await Future.delayed(Duration(seconds: 2));
  
  // 3. 插入测试记录
  await test.insertTestRecord(
    'test-user-id',
    'test-character-id',
    'test-conversation-id',
  );
  
  // 4. 等待通知
  await Future.delayed(Duration(seconds: 5));
  
  // 5. 取消订阅
  await test.unsubscribe();
}
```

## 验证检查清单

### ✅ 基本功能验证

- [ ] 插入记录后，Realtime 通知能够触发
- [ ] 通知包含完整的图片记录数据
- [ ] 通知只推送给对应的 user_id（RLS 策略生效）
- [ ] 通知延迟在可接受范围内（< 1 秒）

### ✅ 数据完整性验证

- [ ] 通知中包含 `id` 字段
- [ ] 通知中包含 `user_id` 字段
- [ ] 通知中包含 `character_id` 字段
- [ ] 通知中包含 `conversation_id` 字段
- [ ] 通知中包含 `image_url` 字段
- [ ] 通知中包含 `prompt` 字段
- [ ] 通知中包含 `style` 字段
- [ ] 通知中包含 `emotion` 字段
- [ ] 通知中包含 `user_description` 字段
- [ ] 通知中包含 `metadata` 字段（JSONB）
- [ ] 通知中包含 `created_at` 字段

### ✅ 安全性验证

- [ ] 用户 A 无法收到用户 B 的图片通知
- [ ] 未认证用户无法订阅通知
- [ ] RLS 策略正确过滤数据

### ✅ 性能验证

- [ ] 通知延迟 < 1 秒
- [ ] 并发插入时，每个通知都能正确触发
- [ ] 大量插入时，Realtime 不会丢失通知

## 测试结果记录

### 测试环境
- Supabase 项目: [项目名称]
- 测试时间: [YYYY-MM-DD HH:MM:SS]
- 测试人员: [姓名]

### 测试结果

| 测试项 | 结果 | 备注 |
|--------|------|------|
| Realtime 通知触发 | ✅/❌ | |
| 数据完整性 | ✅/❌ | |
| 通知延迟 | ✅/❌ | 实际延迟: ___ ms |
| RLS 策略 | ✅/❌ | |
| 并发测试 | ✅/❌ | |

### 问题记录

如果测试中发现问题，记录在此：

1. **问题描述**: 
   - 现象: 
   - 重现步骤: 
   - 预期结果: 
   - 实际结果: 

2. **解决方案**: 

## 验证 Realtime 配置

### 检查 Realtime 是否启用

```sql
-- 查询 Realtime publication 配置
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'user_generated_images';
```

预期结果：应该返回一行记录，表示 `user_generated_images` 表已添加到 Realtime publication。

### 检查 RLS 策略

```sql
-- 查询 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_generated_images';
```

预期结果：应该返回 4 条策略记录：
1. Users can view their own images (SELECT)
2. Users can insert their own images (INSERT)
3. Users can update their own images (UPDATE)
4. Service role has full access (ALL)

## 总结

完成以上测试后，确认：

1. ✅ Realtime 通知功能正常工作
2. ✅ 通知延迟在可接受范围内
3. ✅ 数据完整性得到保证
4. ✅ 安全策略正确实施

如果所有测试通过，子任务 5.3 完成。

## 下一步

完成测试后，可以继续：
- 子任务 5.4: 实现失败通知（可选）
- 任务 6: N8N Workflow - 集成与测试
- 任务 7: 客户端集成 (Flutter)
