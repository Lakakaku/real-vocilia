#!/bin/bash

# Post-tool-use hook for vocilia project
# Logs tool usage and validates outputs

TOOL_NAME="$1"
EXIT_CODE="$2"

case "$TOOL_NAME" in
    "mcp__playwright__browser_take_screenshot")
        if [[ $EXIT_CODE -eq 0 ]]; then
            echo "📸 Screenshot captured successfully"
        else
            echo "❌ Screenshot failed - check browser state"
        fi
        ;;
    "mcp__playwright__browser_navigate")
        if [[ $EXIT_CODE -eq 0 ]]; then
            echo "🌐 Navigation completed successfully"
        else
            echo "❌ Navigation failed - check URL and network connectivity"
        fi
        ;;
    "mcp__serena"*)
        if [[ $EXIT_CODE -ne 0 ]]; then
            echo "⚠️  Serena tool failed - check project activation and file paths"
        fi
        ;;
    "Bash")
        # Log when test scripts are run
        if [[ "$3" =~ "test-mcp.sh" ]]; then
            echo "🧪 MCP test script executed"
        fi
        ;;
esac

exit 0