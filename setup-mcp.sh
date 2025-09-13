#!/bin/bash

# MCP Servers Setup Script
# This script helps configure your MCP servers with API keys

set -e

echo "🔧 MCP Servers Setup Script"
echo "============================"

# Check if .env file exists
if [[ ! -f .env ]]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your API keys."
else
    echo "✅ .env file already exists."
fi

# Load environment variables
if [[ -f .env ]]; then
    echo "📖 Loading environment variables..."
    source .env
fi

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js ≥ v18.0.0"
    exit 1
else
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    echo "✅ Node.js found: $NODE_VERSION"
fi

# Check npm/npx
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not installed."
    exit 1
else
    echo "✅ npx found"
fi

# Check uv (for Serena)
if ! command -v uv &> /dev/null; then
    echo "⚠️  uv is not installed. Installing uv for Serena MCP..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source ~/.cargo/env 2>/dev/null || true
    if ! command -v uv &> /dev/null; then
        echo "❌ Failed to install uv. Please install manually: https://docs.astral.sh/uv/getting-started/installation/"
    else
        echo "✅ uv installed successfully"
    fi
else
    echo "✅ uv found"
fi

# Check uvx (alternative for uv)
if ! command -v uvx &> /dev/null; then
    echo "⚠️  uvx not found. Checking if we can use uv..."
    if command -v uv &> /dev/null; then
        echo "✅ Will use 'uv run' instead of uvx"
    fi
fi

# Update .mcp.json with environment variables
echo "🔄 Updating .mcp.json with API keys..."

if [[ -n "$CONTEXT7_API_KEY" && "$CONTEXT7_API_KEY" != "your_context7_api_key_here" ]]; then
    sed -i.bak "s/YOUR_CONTEXT7_API_KEY/$CONTEXT7_API_KEY/g" .mcp.json
    echo "✅ Context7 API key configured"
else
    echo "⚠️  Context7 API key not set in .env"
fi

if [[ -n "$SUPABASE_PROJECT_REF" && "$SUPABASE_PROJECT_REF" != "your_supabase_project_ref_here" ]]; then
    sed -i.bak "s/YOUR_SUPABASE_PROJECT_REF/$SUPABASE_PROJECT_REF/g" .mcp.json
    echo "✅ Supabase project reference configured"
else
    echo "⚠️  Supabase project reference not set in .env"
fi

if [[ -n "$SUPABASE_ACCESS_TOKEN" && "$SUPABASE_ACCESS_TOKEN" != "your_supabase_access_token_here" ]]; then
    sed -i.bak "s/YOUR_SUPABASE_ACCESS_TOKEN/$SUPABASE_ACCESS_TOKEN/g" .mcp.json
    echo "✅ Supabase access token configured"
else
    echo "⚠️  Supabase access token not set in .env"
fi

if [[ -n "$FIRECRAWL_API_KEY" && "$FIRECRAWL_API_KEY" != "your_firecrawl_api_key_here" ]]; then
    sed -i.bak "s/YOUR_FIRECRAWL_API_KEY/$FIRECRAWL_API_KEY/g" .mcp.json
    echo "✅ Firecrawl API key configured"
else
    echo "⚠️  Firecrawl API key not set in .env"
fi

# Clean up backup file
rm -f .mcp.json.bak

echo ""
echo "🎉 MCP setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Make sure all API keys are set in .env file"
echo "2. Run: source .env"
echo "3. Test the configuration with: ./test-mcp.sh"
echo ""
echo "📚 For detailed setup instructions, see MCP_SETUP.md"