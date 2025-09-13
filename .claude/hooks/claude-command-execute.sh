#!/bin/bash

# Claude command execute hook for vocilia project
# Provides context and suggestions for command execution

COMMAND_NAME="$1"

case "$COMMAND_NAME" in
    "ui-healer")
        echo "🔧 Preparing UI analysis environment..."

        # Ensure style guides are accessible
        if [[ ! -f "style-guide/style-guide.md" ]]; then
            echo "⚠️  Main style guide not found at style-guide/style-guide.md"
        fi

        if [[ ! -f "style-guide/ux-rules.md" ]]; then
            echo "⚠️  UX rules file is empty at style-guide/ux-rules.md"
        fi

        # Check Playwright availability
        echo "🎭 Checking Playwright MCP availability..."
        ;;

    "mcp")
        echo "🔗 MCP command detected. Available operations:"
        echo "   • Test servers: ./test-mcp.sh"
        echo "   • Setup: ./setup-mcp.sh"
        echo "   • Configuration: .mcp.json"
        ;;
esac

exit 0