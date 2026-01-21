#!/bin/bash

# 部署图片生成功能的所有修复
# 包括：数据库约束更新、Edge Function 更新

set -e  # 遇到错误立即退出

echo "========================================="
echo "部署图片生成功能修复"
echo "========================================="
echo ""

# 检查是否在项目根目录
if [ ! -f "supabase/functions/chat-handler/index.ts" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 1. 运行数据库迁移
echo "📊 步骤 1/2: 运行数据库迁移..."
echo "----------------------------------------"
echo "更新 messages 表的 CHECK 约束："
echo "  - 添加 intent_type: 'image_generation'"
echo "  - 添加 mode: 'creative', 'emotional'"
echo ""

# 检查是否安装了 Supabase CLI
if command -v supabase &> /dev/null; then
    echo "使用 Supabase CLI 运行迁移..."
    supabase db push
    echo "✅ 数据库迁移完成"
else
    echo "⚠️  未检测到 Supabase CLI"
    echo "请手动在 Supabase Dashboard 中执行以下 SQL："
    echo ""
    cat supabase/migrations/20250112_add_image_generation_constraints.sql
    echo ""
    read -p "按 Enter 继续..."
fi

echo ""

# 2. 重新部署 Edge Function
echo "🚀 步骤 2/2: 重新部署 Edge Function..."
echo "----------------------------------------"
echo "更新内容："
echo "  - types.ts: 添加 metadata 字段到 N8NResponse"
echo "  - index.ts: 传递 metadata 到 saveMessage"
echo ""

if command -v supabase &> /dev/null; then
    echo "使用 Supabase CLI 部署 Edge Function..."
    supabase functions deploy chat-handler
    echo "✅ Edge Function 部署完成"
else
    echo "⚠️  未检测到 Supabase CLI"
    echo "请手动部署 Edge Function："
    echo "  1. 登录 Supabase Dashboard"
    echo "  2. 进入 Edge Functions"
    echo "  3. 更新 chat-handler 函数"
    echo ""
    read -p "按 Enter 继续..."
fi

echo ""
echo "========================================="
echo "✅ 所有修复已部署完成！"
echo "========================================="
echo ""
echo "📝 修复内容总结："
echo "  1. ✅ 数据库约束已更新"
echo "     - intent_type 支持: image_generation"
echo "     - mode 支持: creative, emotional"
echo ""
echo "  2. ✅ Edge Function 已更新"
echo "     - N8NResponse 支持 metadata 字段"
echo "     - saveMessage 传递 metadata"
echo ""
echo "🧪 测试建议："
echo "  1. 发送消息: '我想画一朵花'"
echo "  2. 验证响应包含 intentType: 'image_generation'"
echo "  3. 验证消息成功保存到数据库"
echo "  4. 验证 metadata 字段正确存储"
echo ""
echo "📚 相关文档："
echo "  - FIX_DATABASE_CONSTRAINTS.md"
echo "  - FIX_TRIGGER_GENERATION.md"
echo ""
