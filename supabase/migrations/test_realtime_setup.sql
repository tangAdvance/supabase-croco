-- 测试脚本：验证 Realtime 通知配置
-- 子任务 5.3: 测试 Realtime 通知

-- ============================================================================
-- 1. 验证 Realtime Publication 配置
-- ============================================================================

-- 检查 user_generated_images 表是否已添加到 Realtime publication
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'user_generated_images';

-- 预期结果：应该返回一行记录
-- | schemaname | tablename              | pubname            |
-- |------------|------------------------|--------------------|
-- | public     | user_generated_images  | supabase_realtime  |

-- ============================================================================
-- 2. 验证 RLS 策略配置
-- ============================================================================

-- 检查所有 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END AS using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END AS with_check_clause
FROM pg_policies
WHERE tablename = 'user_generated_images'
ORDER BY policyname;

-- 预期结果：应该返回 4 条策略记录
-- 1. Service role has full access (ALL)
-- 2. Users can insert their own images (INSERT)
-- 3. Users can update their own images (UPDATE)
-- 4. Users can view their own images (SELECT)

-- ============================================================================
-- 3. 验证表结构
-- ============================================================================

-- 检查表是否存在及其列
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_generated_images'
ORDER BY ordinal_position;

-- 预期结果：应该包含所有必需的列
-- id, user_id, character_id, conversation_id, image_url, thumbnail_url,
-- prompt, style, emotion, user_description, metadata, is_favorite, 
-- is_deleted, created_at, updated_at

-- ============================================================================
-- 4. 验证索引
-- ============================================================================

-- 检查所有索引
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'user_generated_images'
ORDER BY indexname;

-- 预期结果：应该包含以下索引
-- 1. user_generated_images_pkey (PRIMARY KEY)
-- 2. idx_user_images_user_id
-- 3. idx_user_images_conversation
-- 4. idx_user_images_created_at
-- 5. idx_user_images_not_deleted
-- 6. idx_user_images_favorites

-- ============================================================================
-- 5. 验证外键约束
-- ============================================================================

-- 检查外键约束
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'user_generated_images';

-- 预期结果：应该包含 3 个外键约束
-- 1. user_generated_images_user_id_fkey -> users(id)
-- 2. user_generated_images_character_id_fkey -> characters(id)
-- 3. user_generated_images_conversation_id_fkey -> conversations(id)

-- ============================================================================
-- 6. 测试插入记录（需要实际的 ID）
-- ============================================================================

-- 注意：以下测试需要替换实际的 user_id, character_id, conversation_id
-- 这个测试会插入一条记录，然后立即标记为删除

-- 取消注释以下代码来运行测试：

/*
DO $$
DECLARE
  test_user_id uuid;
  test_character_id uuid;
  test_conversation_id uuid;
  inserted_id uuid;
  insert_time timestamp;
BEGIN
  -- 获取测试用的 ID（从现有数据中选择第一条）
  SELECT id INTO test_user_id FROM users LIMIT 1;
  SELECT id INTO test_character_id FROM characters LIMIT 1;
  SELECT id INTO test_conversation_id FROM conversations WHERE user_id = test_user_id LIMIT 1;
  
  -- 检查是否获取到有效的 ID
  IF test_user_id IS NULL OR test_character_id IS NULL OR test_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find test data. Please ensure users, characters, and conversations tables have data.';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting Realtime notification test';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test User ID: %', test_user_id;
  RAISE NOTICE 'Test Character ID: %', test_character_id;
  RAISE NOTICE 'Test Conversation ID: %', test_conversation_id;
  
  -- 记录插入时间
  insert_time := clock_timestamp();
  
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
    'https://oaidalleapiprodscus.blob.core.windows.net/test/realtime-test-' || extract(epoch from now())::text || '.png',
    'A cute cat flying in space, children''s book illustration, watercolor, soft colors, whimsical, warm lighting, cozy atmosphere, bright and cheerful, happy mood',
    'storybook',
    'warm',
    '一只在太空飞的猫（Realtime 测试）',
    jsonb_build_object(
      'model', 'dall-e-3',
      'generation_time', 15,
      'api_provider', 'openai',
      'test', true,
      'test_type', 'realtime_notification',
      'insert_time', insert_time
    )
  ) RETURNING id INTO inserted_id;
  
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '✅ Test record inserted successfully!';
  RAISE NOTICE 'Record ID: %', inserted_id;
  RAISE NOTICE 'Insert time: %', insert_time;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Realtime notification should be triggered now.';
  RAISE NOTICE 'Check your client application to verify the notification was received.';
  RAISE NOTICE '----------------------------------------';
  
  -- 等待 3 秒让 Realtime 通知有时间传递
  RAISE NOTICE 'Waiting 3 seconds for notification delivery...';
  PERFORM pg_sleep(3);
  
  -- 标记为删除（软删除）
  UPDATE user_generated_images 
  SET is_deleted = true,
      updated_at = now()
  WHERE id = inserted_id;
  
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '✅ Test record marked as deleted (soft delete)';
  RAISE NOTICE 'Test completed successfully!';
  RAISE NOTICE '========================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Test failed with error: %', SQLERRM;
    RAISE;
END $$;
*/

-- ============================================================================
-- 7. 查询测试记录（验证插入）
-- ============================================================================

-- 查询最近插入的测试记录
SELECT 
  id,
  user_id,
  conversation_id,
  image_url,
  style,
  emotion,
  metadata->>'test' as is_test,
  metadata->>'test_type' as test_type,
  is_deleted,
  created_at
FROM user_generated_images
WHERE metadata->>'test' = 'true'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 8. 清理测试数据（可选）
-- ============================================================================

-- 取消注释以下代码来清理所有测试记录：

/*
DELETE FROM user_generated_images
WHERE metadata->>'test' = 'true';

RAISE NOTICE 'All test records have been deleted.';
*/

-- ============================================================================
-- 测试总结
-- ============================================================================

-- 运行此脚本后，应该验证以下内容：
-- 
-- ✅ 1. Realtime publication 已正确配置
-- ✅ 2. RLS 策略已正确创建（4 条策略）
-- ✅ 3. 表结构完整（15 个列）
-- ✅ 4. 索引已创建（6 个索引）
-- ✅ 5. 外键约束已创建（3 个外键）
-- ✅ 6. 测试记录可以成功插入
-- ✅ 7. Realtime 通知能够触发（需要客户端验证）
--
-- 如果所有检查都通过，子任务 5.3 完成。
