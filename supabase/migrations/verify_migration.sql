-- 验证 user_generated_images 表迁移是否成功
-- 此脚本用于检查表结构、索引、Realtime 和 RLS 策略

-- ============================================================================
-- 1. 检查表是否存在
-- ============================================================================
SELECT 
  'user_generated_images 表' AS 检查项,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_generated_images'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在'
  END AS 状态;

-- ============================================================================
-- 2. 检查表结构
-- ============================================================================
SELECT 
  '表字段数量' AS 检查项,
  COUNT(*)::text || ' 个字段' AS 状态
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_generated_images';

-- 列出所有字段
SELECT 
  column_name AS 字段名,
  data_type AS 数据类型,
  is_nullable AS 可为空,
  column_default AS 默认值
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_generated_images'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. 检查索引
-- ============================================================================
SELECT 
  '索引数量' AS 检查项,
  COUNT(*)::text || ' 个索引' AS 状态
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'user_generated_images';

-- 列出所有索引
SELECT 
  indexname AS 索引名,
  indexdef AS 索引定义
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'user_generated_images'
ORDER BY indexname;

-- ============================================================================
-- 4. 检查外键约束
-- ============================================================================
SELECT 
  '外键约束数量' AS 检查项,
  COUNT(*)::text || ' 个外键' AS 状态
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'user_generated_images'
AND constraint_type = 'FOREIGN KEY';

-- 列出所有外键
SELECT 
  constraint_name AS 约束名,
  constraint_type AS 约束类型
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'user_generated_images'
ORDER BY constraint_name;

-- ============================================================================
-- 5. 检查 RLS 是否启用
-- ============================================================================
SELECT 
  'RLS 状态' AS 检查项,
  CASE 
    WHEN relrowsecurity THEN '✅ 已启用'
    ELSE '❌ 未启用'
  END AS 状态
FROM pg_class
WHERE relname = 'user_generated_images'
AND relnamespace = 'public'::regnamespace;

-- ============================================================================
-- 6. 检查 RLS 策略
-- ============================================================================
SELECT 
  'RLS 策略数量' AS 检查项,
  COUNT(*)::text || ' 个策略' AS 状态
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'user_generated_images';

-- 列出所有策略
SELECT 
  policyname AS 策略名,
  cmd AS 操作类型,
  qual AS 使用条件,
  with_check AS 检查条件
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'user_generated_images'
ORDER BY policyname;

-- ============================================================================
-- 7. 检查 Realtime 是否启用
-- ============================================================================
SELECT 
  'Realtime 状态' AS 检查项,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public'
      AND tablename = 'user_generated_images'
    ) THEN '✅ 已启用'
    ELSE '❌ 未启用'
  END AS 状态;

-- ============================================================================
-- 总结
-- ============================================================================
SELECT 
  '=== 迁移验证总结 ===' AS 信息,
  '' AS 详情
UNION ALL
SELECT 
  '表创建',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_generated_images')
    THEN '✅'
    ELSE '❌'
  END
UNION ALL
SELECT 
  '索引创建',
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user_generated_images') >= 5
    THEN '✅'
    ELSE '❌'
  END
UNION ALL
SELECT 
  'RLS 启用',
  CASE 
    WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_generated_images' AND relnamespace = 'public'::regnamespace)
    THEN '✅'
    ELSE '❌'
  END
UNION ALL
SELECT 
  'RLS 策略',
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_generated_images') >= 3
    THEN '✅'
    ELSE '❌'
  END
UNION ALL
SELECT 
  'Realtime 启用',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_generated_images')
    THEN '✅'
    ELSE '❌'
  END;
