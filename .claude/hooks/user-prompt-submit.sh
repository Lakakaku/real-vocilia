#!/bin/bash

# User prompt submit hook for vocilia project
# Auto-triggers UI analysis when URLs are detected in user input

USER_INPUT="$1"

# Check if user input contains a URL that could benefit from UI analysis
if echo "$USER_INPUT" | grep -q "http[s]*://"; then
    # Extract URL from input
    URL=$(echo "$USER_INPUT" | grep -oE 'http[s]*://[^[:space:]]+' | head -1)

    # Check if this looks like a UI-related request
    if echo "$USER_INPUT" | grep -iE "(ui|design|style|interface|analyze|check|validate)" > /dev/null; then
        echo "🎯 Detected UI analysis request for: $URL"
        echo "💡 Consider using the ui-healer command for comprehensive UI analysis:"
        echo "   /ui-healer $URL"
    fi
fi

# Check for MCP-related requests and suggest testing
if echo "$USER_INPUT" | grep -iE "(mcp|server|test)" > /dev/null; then
    echo "🔧 MCP-related request detected. You can test servers with:"
    echo "   ./test-mcp.sh"
fi

# Check for style guide mentions
if echo "$USER_INPUT" | grep -iE "(style.?guide|design.?system)" > /dev/null; then
    echo "📚 Style guide reference detected. Available guides:"
    echo "   • /style-guide/style-guide.md"
    echo "   • /style-guide/ux-rules.md"
fi

exit 0