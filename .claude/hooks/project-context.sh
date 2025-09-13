#!/bin/bash

# Project context hook for vocilia project
# Provides dynamic context about project state

echo "🏗️  Vocilia Project Context:"
echo "   • MCP Servers: 7 configured (Context7, Playwright, Vercel, Supabase, GitHub, Serena, Firecrawl)"
echo "   • UI Analysis: UI Healer command available"
echo "   • Style Guides: Available in /style-guide/"

# Check MCP configuration status
if [[ -f .mcp.json && -f .env ]]; then
    echo "   • MCP Status: ✅ Configured"
else
    echo "   • MCP Status: ⚠️  Needs setup (run ./setup-mcp.sh)"
fi

# Check test script
if [[ -x test-mcp.sh ]]; then
    echo "   • Testing: ✅ test-mcp.sh available"
fi

echo ""

exit 0