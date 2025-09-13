#!/bin/bash

# MCP Servers Test Script
# This script validates the MCP server configurations

set -e

echo "🧪 MCP Servers Test Script"
echo "=========================="

# Load environment variables
if [[ -f .env ]]; then
    echo "📖 Loading environment variables..."
    source .env
else
    echo "❌ .env file not found. Please run ./setup-mcp.sh first."
    exit 1
fi

# Check if .mcp.json exists
if [[ ! -f .mcp.json ]]; then
    echo "❌ .mcp.json not found. Please run ./setup-mcp.sh first."
    exit 1
fi

echo "✅ Configuration files found"
echo ""

# Test individual MCP servers
echo "🔍 Testing MCP Server Configurations..."
echo ""

# Test Context7
echo "1. Testing Context7 MCP..."
if [[ -n "$CONTEXT7_API_KEY" && "$CONTEXT7_API_KEY" != "your_context7_api_key_here" ]]; then
    echo "   ✅ API key configured"
    # Test if npx can resolve the package
    if npx --yes @upstash/context7-mcp --help &>/dev/null; then
        echo "   ✅ Package accessible"
    else
        echo "   ⚠️  Package test failed (may still work in MCP environment)"
    fi
else
    echo "   ❌ API key not configured"
fi
echo ""

# Test Playwright
echo "2. Testing Playwright MCP..."
if npx @playwright/mcp@latest --help &>/dev/null; then
    echo "   ✅ Package accessible"
else
    echo "   ⚠️  Package test failed (will install on first use)"
fi
echo ""

# Test Vercel
echo "3. Testing Vercel MCP..."
echo "   ✅ Uses remote URL (https://mcp.vercel.com)"
echo "   ℹ️  Authentication will be handled by client"
echo ""

# Test Supabase
echo "4. Testing Supabase MCP..."
if [[ -n "$SUPABASE_ACCESS_TOKEN" && "$SUPABASE_ACCESS_TOKEN" != "your_supabase_access_token_here" ]]; then
    echo "   ✅ Access token configured"
else
    echo "   ❌ Access token not configured"
fi
if [[ -n "$SUPABASE_PROJECT_REF" && "$SUPABASE_PROJECT_REF" != "your_supabase_project_ref_here" ]]; then
    echo "   ✅ Project reference configured"
else
    echo "   ❌ Project reference not configured"
fi
if npx --yes @supabase/mcp-server-supabase --help &>/dev/null; then
    echo "   ✅ Package accessible"
else
    echo "   ⚠️  Package test failed (may still work in MCP environment)"
fi
echo ""

# Test GitHub
echo "5. Testing GitHub MCP..."
echo "   ✅ Uses remote URL (https://api.githubcopilot.com/mcp/)"
echo "   ℹ️  Authentication will be handled by client"
echo ""

# Test Serena
echo "6. Testing Serena MCP..."
if command -v uvx &> /dev/null; then
    echo "   ✅ uvx found"
    # Test if we can reach the repository
    if git ls-remote https://github.com/oraios/serena.git &>/dev/null; then
        echo "   ✅ Repository accessible"
    else
        echo "   ❌ Cannot access Serena repository"
    fi
elif command -v uv &> /dev/null; then
    echo "   ✅ uv found (can use as alternative to uvx)"
    if git ls-remote https://github.com/oraios/serena.git &>/dev/null; then
        echo "   ✅ Repository accessible"
    else
        echo "   ❌ Cannot access Serena repository"
    fi
else
    echo "   ❌ Neither uvx nor uv found"
fi
echo ""

# Test Firecrawl
echo "7. Testing Firecrawl MCP..."
if [[ -n "$FIRECRAWL_API_KEY" && "$FIRECRAWL_API_KEY" != "your_firecrawl_api_key_here" ]]; then
    echo "   ✅ API key configured"
    # Test if the URL is reachable
    FIRECRAWL_URL="https://mcp.firecrawl.dev/$FIRECRAWL_API_KEY/v2/sse"
    if curl -s --head "$FIRECRAWL_URL" &>/dev/null; then
        echo "   ✅ Service URL accessible"
    else
        echo "   ⚠️  Service URL test failed (may still work in MCP environment)"
    fi
else
    echo "   ❌ API key not configured"
fi
echo ""

# Validate JSON syntax
echo "🔍 Validating .mcp.json syntax..."
if python3 -m json.tool .mcp.json &>/dev/null; then
    echo "✅ .mcp.json has valid JSON syntax"
elif node -e "JSON.parse(require('fs').readFileSync('.mcp.json', 'utf8'))" &>/dev/null; then
    echo "✅ .mcp.json has valid JSON syntax"
else
    echo "❌ .mcp.json has invalid JSON syntax"
    exit 1
fi

echo ""
echo "📊 Test Summary:"
echo "==============="

# Count configured servers
CONFIGURED=0
TOTAL=7

[[ -n "$CONTEXT7_API_KEY" && "$CONTEXT7_API_KEY" != "your_context7_api_key_here" ]] && ((CONFIGURED++))
((CONFIGURED++))  # Playwright (no API key needed)
((CONFIGURED++))  # Vercel (OAuth)
[[ -n "$SUPABASE_ACCESS_TOKEN" && "$SUPABASE_ACCESS_TOKEN" != "your_supabase_access_token_here" && -n "$SUPABASE_PROJECT_REF" && "$SUPABASE_PROJECT_REF" != "your_supabase_project_ref_here" ]] && ((CONFIGURED++))
((CONFIGURED++))  # GitHub (OAuth)
[[ -x "$(command -v uvx)" || -x "$(command -v uv)" ]] && ((CONFIGURED++))
[[ -n "$FIRECRAWL_API_KEY" && "$FIRECRAWL_API_KEY" != "your_firecrawl_api_key_here" ]] && ((CONFIGURED++))

echo "✅ $CONFIGURED out of $TOTAL MCP servers are properly configured"

if [[ $CONFIGURED -eq $TOTAL ]]; then
    echo "🎉 All MCP servers are ready to use!"
else
    echo "⚠️  Some servers need additional configuration. Check MCP_SETUP.md for details."
fi

echo ""
echo "🚀 To use with Claude Code:"
echo "   claude mcp add-json-file .mcp.json"
echo ""
echo "📚 See MCP_SETUP.md for client-specific setup instructions."