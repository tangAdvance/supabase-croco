#!/bin/bash

# Deployment Verification Script
# This script verifies that the Edge Function is deployed correctly

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "部署验证脚本"
echo "Deployment Verification"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "${RED}错误: Supabase CLI 未安装${NC}"
    exit 1
fi

# Check if jq is installed (for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo "${YELLOW}警告: jq 未安装，部分验证功能将不可用${NC}"
    echo "安装 jq: brew install jq"
    echo ""
fi

# 1. Check function deployment status
echo "${BLUE}1. 检查函数部署状态...${NC}"
if supabase functions list | grep -q "chat-handler"; then
    echo "${GREEN}✓ chat-handler 函数已部署${NC}"
else
    echo "${RED}✗ chat-handler 函数未找到${NC}"
    exit 1
fi
echo ""

# 2. Check environment variables
echo "${BLUE}2. 检查环境变量...${NC}"
REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "N8N_WEBHOOK_URL")
ALL_VARS_SET=true

for var in "${REQUIRED_VARS[@]}"; do
    if supabase secrets list | grep -q "$var"; then
        echo "${GREEN}✓ $var 已设置${NC}"
    else
        echo "${RED}✗ $var 未设置${NC}"
        ALL_VARS_SET=false
    fi
done

if [ "$ALL_VARS_SET" = false ]; then
    echo ""
    echo "${RED}错误: 部分环境变量未设置${NC}"
    echo "运行 './setup-env.sh' 设置环境变量"
    exit 1
fi
echo ""

# 3. Get function URL
echo "${BLUE}3. 获取函数 URL...${NC}"
FUNCTION_INFO=$(supabase functions list | grep "chat-handler")
if [ -n "$FUNCTION_INFO" ]; then
    echo "${GREEN}✓ 函数信息:${NC}"
    echo "$FUNCTION_INFO"
else
    echo "${RED}✗ 无法获取函数信息${NC}"
fi
echo ""

# 4. Test function health check (if available)
echo "${BLUE}4. 测试函数健康检查...${NC}"
read -p "请输入项目 URL (例: https://xxx.supabase.co): " PROJECT_URL
read -p "请输入 Anon Key: " ANON_KEY

if [ -n "$PROJECT_URL" ] && [ -n "$ANON_KEY" ]; then
    HEALTH_URL="${PROJECT_URL}/functions/v1/chat-handler/health"
    
    echo "测试 URL: $HEALTH_URL"
    
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $ANON_KEY" \
        "$HEALTH_URL" 2>/dev/null || echo "000")
    
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "${GREEN}✓ 健康检查通过 (HTTP $HTTP_CODE)${NC}"
        if command -v jq &> /dev/null && [ -n "$RESPONSE_BODY" ]; then
            echo "响应: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
        fi
    else
        echo "${YELLOW}⚠ 健康检查失败或不可用 (HTTP $HTTP_CODE)${NC}"
        echo "这可能是正常的，如果函数没有健康检查端点"
    fi
else
    echo "${YELLOW}⚠ 跳过健康检查测试${NC}"
fi
echo ""

# 5. Test basic function call
echo "${BLUE}5. 测试基本函数调用...${NC}"
read -p "是否测试函数调用? (y/n): " test_call

if [ "$test_call" = "y" ] || [ "$test_call" = "Y" ]; then
    if [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ]; then
        read -p "请输入项目 URL (例: https://xxx.supabase.co): " PROJECT_URL
        read -p "请输入 Anon Key: " ANON_KEY
    fi
    
    read -p "请输入测试用户 ID (UUID): " TEST_USER_ID
    read -p "请输入测试角色 ID (UUID): " TEST_CHARACTER_ID
    
    if [ -n "$TEST_USER_ID" ] && [ -n "$TEST_CHARACTER_ID" ]; then
        FUNCTION_URL="${PROJECT_URL}/functions/v1/chat-handler"
        
        echo ""
        echo "发送测试请求..."
        
        TEST_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Authorization: Bearer $ANON_KEY" \
            -H "Content-Type: application/json" \
            -d "{
                \"userId\": \"$TEST_USER_ID\",
                \"characterId\": \"$TEST_CHARACTER_ID\",
                \"message\": \"你好，这是一个测试消息\"
            }" \
            "$FUNCTION_URL" 2>/dev/null || echo "000")
        
        HTTP_CODE=$(echo "$TEST_RESPONSE" | tail -n1)
        RESPONSE_BODY=$(echo "$TEST_RESPONSE" | head -n-1)
        
        echo ""
        echo "HTTP 状态码: $HTTP_CODE"
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "${GREEN}✓ 函数调用成功${NC}"
            if command -v jq &> /dev/null && [ -n "$RESPONSE_BODY" ]; then
                echo ""
                echo "响应内容:"
                echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
            fi
        elif [ "$HTTP_CODE" = "400" ]; then
            echo "${YELLOW}⚠ 参数验证失败 (这可能是正常的，如果测试数据无效)${NC}"
            echo "响应: $RESPONSE_BODY"
        elif [ "$HTTP_CODE" = "404" ]; then
            echo "${YELLOW}⚠ 资源未找到 (用户或角色不存在)${NC}"
            echo "响应: $RESPONSE_BODY"
        else
            echo "${RED}✗ 函数调用失败 (HTTP $HTTP_CODE)${NC}"
            echo "响应: $RESPONSE_BODY"
        fi
    else
        echo "${YELLOW}⚠ 跳过函数调用测试${NC}"
    fi
else
    echo "${YELLOW}⚠ 跳过函数调用测试${NC}"
fi
echo ""

# 6. Check recent logs
echo "${BLUE}6. 检查最近的日志...${NC}"
read -p "是否查看最近的日志? (y/n): " view_logs

if [ "$view_logs" = "y" ] || [ "$view_logs" = "Y" ]; then
    echo ""
    supabase functions logs chat-handler --limit 20
else
    echo "${YELLOW}⚠ 跳过日志查看${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "${GREEN}验证完成!${NC}"
echo "=========================================="
echo ""
echo "${YELLOW}下一步建议:${NC}"
echo "1. 运行端到端测试验证完整流程"
echo "2. 配置监控和告警"
echo "3. 查看实时日志: supabase functions logs chat-handler --follow"
echo "4. 更新客户端配置使用新的函数 URL"
echo ""
