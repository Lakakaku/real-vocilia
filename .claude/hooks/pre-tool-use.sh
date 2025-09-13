#!/bin/bash

# Pre-tool-use hook for vocilia project
# Validates MCP server health before running tools that depend on them

TOOL_NAME="$1"

# Only run validation for MCP-dependent tools
case "$TOOL_NAME" in
    "mcp__"*)
        echo "🔍 Validating MCP server health..."

        # Quick health check
        if [[ ! -f .mcp.json ]]; then
            echo "❌ .mcp.json not found. Run ./setup-mcp.sh first."
            exit 1
        fi

        # Check if environment is configured for tools that need it
        case "$TOOL_NAME" in
            "mcp__context7"*|"mcp__firecrawl"*)
                if [[ ! -f .env ]]; then
                    echo "⚠️  .env file not found. Some MCP servers may not work properly."
                fi
                ;;
        esac
        ;;
    "mcp__playwright__browser_"*)
        echo "🎭 Preparing browser automation..."
        # Playwright tools are generally reliable, just log usage
        ;;
esac

exit 0