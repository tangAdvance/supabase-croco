#!/bin/bash

# Deployment Script for Chat Handler Edge Function
# This script automates the deployment process to Supabase

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "小鳄鱼助手 - Edge Function 部署脚本"
echo "Chat Handler Deployment Script"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "${RED}错误: Supabase CLI 未安装${NC}"
    echo ""
    echo "请先安装 Supabase CLI:"
    echo "  macOS: brew install supabase/tap/supabase"
    echo "  其他平台: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "${GREEN}✓ Supabase CLI 已安装${NC}"
echo ""

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "${YELLOW}需要登录 Supabase...${NC}"
    supabase login
fi

echo "${GREEN}✓ 已登录 Supabase${NC}"
echo ""

# List available projects
echo "${BLUE}可用的项目:${NC}"
supabase projects list
echo ""

# Prompt for project selection
read -p "请输入项目 ID (Project ID): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "${RED}错误: 项目 ID 不能为空${NC}"
    exit 1
fi

# Link to project
echo ""
echo "${YELLOW}链接到项目 $PROJECT_ID...${NC}"
supabase link --project-ref "$PROJECT_ID" || {
    echo "${RED}错误: 链接项目失败${NC}"
    exit 1
}

echo "${GREEN}✓ 已链接到项目${NC}"
echo ""

# Check environment variables
echo "${YELLOW}检查环境变量...${NC}"
echo ""

REQUIRED_VARS=("SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY" "N8N_WEBHOOK_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! supabase secrets list | grep -q "$var"; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "${RED}警告: 以下环境变量未设置:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    read -p "是否现在设置环境变量? (y/n): " setup_env
    
    if [ "$setup_env" = "y" ] || [ "$setup_env" = "Y" ]; then
        echo ""
        echo "${YELLOW}运行环境配置脚本...${NC}"
        ./setup-env.sh
    else
        echo "${YELLOW}跳过环境变量设置。请确保在部署后手动设置。${NC}"
    fi
else
    echo "${GREEN}✓ 所有必需的环境变量已设置${NC}"
fi

echo ""

# Run tests before deployment
echo "${YELLOW}运行测试...${NC}"
echo ""

if deno test --allow-all --allow-env; then
    echo ""
    echo "${GREEN}✓ 所有测试通过${NC}"
else
    echo ""
    echo "${RED}警告: 部分测试失败${NC}"
    read -p "是否继续部署? (y/n): " continue_deploy
    
    if [ "$continue_deploy" != "y" ] && [ "$continue_deploy" != "Y" ]; then
        echo "${RED}部署已取消${NC}"
        exit 1
    fi
fi

echo ""

# Deploy function
echo "${YELLOW}部署 chat-handler 函数...${NC}"
echo ""

supabase functions deploy chat-handler --no-verify-jwt || {
    echo ""
    echo "${RED}错误: 部署失败${NC}"
    exit 1
}

echo ""
echo "${GREEN}✓ 函数部署成功${NC}"
echo ""

# Verify deployment
echo "${YELLOW}验证部署...${NC}"
echo ""

if supabase functions list | grep -q "chat-handler"; then
    echo "${GREEN}✓ 函数已成功部署并可用${NC}"
else
    echo "${RED}警告: 无法验证函数状态${NC}"
fi

echo ""

# Get function URL
FUNCTION_URL=$(supabase functions list | grep "chat-handler" | awk '{print $3}')

if [ -n "$FUNCTION_URL" ]; then
    echo "${BLUE}函数 URL:${NC}"
    echo "  $FUNCTION_URL"
    echo ""
fi

# Offer to view logs
echo "${YELLOW}提示:${NC}"
echo "- 查看实时日志: supabase functions logs chat-handler --follow"
echo "- 查看最近日志: supabase functions logs chat-handler --limit 100"
echo "- 测试函数: 使用 Postman 或 curl 发送请求"
echo ""

read -p "是否查看实时日志? (y/n): " view_logs

if [ "$view_logs" = "y" ] || [ "$view_logs" = "Y" ]; then
    echo ""
    echo "${BLUE}显示实时日志 (按 Ctrl+C 退出)...${NC}"
    echo ""
    supabase functions logs chat-handler --follow
fi

echo ""
echo "=========================================="
echo "${GREEN}部署完成!${NC}"
echo "=========================================="
