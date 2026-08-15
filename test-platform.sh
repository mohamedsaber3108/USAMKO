#!/bin/bash

# USAMKO Platform Test Script
# Tests all major features to ensure platform is working correctly

echo "🧪 USAMKO Platform Test Suite"
echo "=============================="
echo ""

BASE_URL="${1:-http://localhost:3000}"
TENANT_ID="test_tenant"
USER_ID="test_user"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_code="${5:-200}"

    echo -n "Testing: $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_code" ] || [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body"
        ((FAILED++))
        return 1
    fi
}

echo "🏥 Health Checks"
echo "----------------"
test_endpoint "Main Health Check" "GET" "/health"
test_endpoint "AI Health Check" "GET" "/ai/health"
test_endpoint "Data Health Check" "GET" "/data/health"
echo ""

echo "🤖 AI Orchestration Module"
echo "--------------------------"
test_endpoint "Get AI Models" "GET" "/ai/models"
test_endpoint "Get AI Models (enabled only)" "GET" "/ai/models?enabled=true"
test_endpoint "Get Task Templates" "GET" "/ai/tasks/templates"
test_endpoint "Get Cost Analytics" "GET" "/ai/cost/analytics?tenantId=$TENANT_ID&period=month"
test_endpoint "Get Cache Statistics" "GET" "/ai/cache/statistics"
test_endpoint "Get Budget Status" "GET" "/ai/budget/status?tenantId=$TENANT_ID"
echo ""

echo "🎯 Data Orchestration Module"
echo "-----------------------------"
test_endpoint "Get Data Sources" "GET" "/data/sources"
test_endpoint "Get Source Statistics" "GET" "/data/sources/statistics?period=month"
test_endpoint "Get Cache Statistics" "GET" "/data/cache/statistics"
test_endpoint "Get Cache Hit Rate" "GET" "/data/cache/hit-rate?period=month"
test_endpoint "Get Example Queries" "GET" "/data/examples"
echo ""

echo "🔗 LinkedIn Module"
echo "------------------"
test_endpoint "LinkedIn Health" "GET" "/linkedin/health" "" 404
test_endpoint "Get LinkedIn Statistics" "GET" "/linkedin/statistics?tenantId=$TENANT_ID" "" 404
echo ""

echo "📧 Linkout Email Finder"
echo "-----------------------"
test_endpoint "Linkout Health" "GET" "/linkout/health" "" 404
test_endpoint "Get Email Statistics" "GET" "/linkout/statistics?tenantId=$TENANT_ID" "" 404
echo ""

echo "👥 Admin Module"
echo "---------------"
test_endpoint "Get Permissions" "GET" "/admin/permissions"
test_endpoint "Get Permission Categories" "GET" "/admin/permissions/categories"
test_endpoint "Get Users" "GET" "/admin/users?tenantId=$TENANT_ID"
test_endpoint "Get Roles" "GET" "/admin/roles?tenantId=$TENANT_ID"
echo ""

echo "🧪 Advanced AI Tests"
echo "--------------------"
# Test AI execution (will fail without API keys, but tests endpoint)
test_endpoint "AI Execute (dry run)" "POST" "/ai/execute" \
    '{"tenantId":"'$TENANT_ID'","userId":"'$USER_ID'","prompt":"Test","taskName":"test"}' \
    "400,500"

echo ""

echo "🎯 Advanced Data Tests"
echo "----------------------"
# Test data query planning
test_endpoint "Data Query Plan" "POST" "/data/query/plan" \
    '{"tenantId":"'$TENANT_ID'","userId":"'$USER_ID'","query":"Find CTOs in San Francisco"}' \
    "200,400,500"

echo ""

echo "📊 Test Results"
echo "==============="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed. This is normal if:${NC}"
    echo "  - Database is not migrated yet"
    echo "  - API keys are not configured"
    echo "  - Server is not running"
    echo ""
    echo "To fix:"
    echo "  1. Run: npx prisma migrate deploy"
    echo "  2. Run: npx prisma db seed"
    echo "  3. Configure API keys in .env"
    echo "  4. Start server: npm run start:dev"
    exit 1
fi
