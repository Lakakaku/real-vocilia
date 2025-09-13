#!/bin/bash

# Workspace change hook for vocilia project
# Validates workspace state and suggests actions

CHANGE_TYPE="$1"
FILE_PATH="$2"

case "$CHANGE_TYPE" in
    "file_created"|"file_modified")
        case "$FILE_PATH" in
            ".mcp.json")
                echo "🔗 MCP configuration updated. Run ./test-mcp.sh to validate."
                ;;
            ".env")
                echo "🔑 Environment variables updated. MCP servers may need restart."
                ;;
            "style-guide/"*)
                echo "🎨 Style guide updated. UI analyses will use new criteria."
                ;;
            "*.sh")
                if [[ -f "$FILE_PATH" ]]; then
                    echo "🔧 Shell script updated. Checking executable permissions..."
                    if [[ ! -x "$FILE_PATH" ]]; then
                        echo "   💡 Consider making executable: chmod +x $FILE_PATH"
                    fi
                fi
                ;;
        esac
        ;;
    "file_deleted")
        case "$FILE_PATH" in
            ".mcp.json")
                echo "❌ MCP configuration deleted. Run ./setup-mcp.sh to recreate."
                ;;
            ".env")
                echo "❌ Environment file deleted. Some MCP servers won't work."
                ;;
        esac
        ;;
esac

exit 0