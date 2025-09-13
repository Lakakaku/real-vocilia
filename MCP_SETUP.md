# MCP Servers Setup Guide

This project is configured with 7 MCP (Model Context Protocol) servers. Follow the instructions below to complete the setup.

## Prerequisites

Before setting up the MCP servers, ensure you have:
- Node.js ≥ v18.0.0
- Docker (for GitHub MCP server if using local installation)
- Python with `uv` package manager (for Serena MCP)
- Git

## API Keys Required

You'll need to obtain the following API keys:

1. **Context7 API Key** - Get from [context7.com/dashboard](https://context7.com/dashboard)
2. **Supabase Access Token** - Create in Supabase settings
3. **Supabase Project Reference** - Found in your Supabase project URL
4. **Firecrawl API Key** - Get from [firecrawl.dev](https://firecrawl.dev)
5. **GitHub Personal Access Token** - Create in GitHub settings (only if using local Docker installation)

## Environment Setup

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Edit the `.env` file and add your API keys:
```bash
CONTEXT7_API_KEY=your_context7_api_key_here
SUPABASE_ACCESS_TOKEN=your_supabase_access_token_here
SUPABASE_PROJECT_REF=your_supabase_project_ref_here
FIRECRAWL_API_KEY=your_firecrawl_api_key_here
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here
```

## Configuration Update

After obtaining your API keys, update the `.mcp.json` file:

1. Replace `YOUR_CONTEXT7_API_KEY` with your actual Context7 API key
2. Replace `YOUR_SUPABASE_PROJECT_REF` with your Supabase project reference
3. Replace `YOUR_SUPABASE_ACCESS_TOKEN` with your Supabase access token
4. Replace `YOUR_FIRECRAWL_API_KEY` with your Firecrawl API key

## MCP Servers Overview

### 1. Context7 MCP
- **Purpose**: Vector search and RAG capabilities
- **Installation**: NPX-based
- **Requires**: Context7 API key

### 2. Playwright MCP
- **Purpose**: Browser automation and web testing
- **Installation**: NPX-based
- **Requires**: No API keys

### 3. Vercel MCP
- **Purpose**: Deployment and hosting operations
- **Installation**: Remote URL-based
- **Requires**: Vercel OAuth authentication

### 4. Supabase MCP
- **Purpose**: Database operations
- **Installation**: NPX-based
- **Requires**: Supabase access token and project reference

### 5. GitHub MCP
- **Purpose**: Repository operations and code management
- **Installation**: Remote URL-based with OAuth
- **Requires**: GitHub authentication (OAuth or PAT for local installation)

### 6. Serena MCP
- **Purpose**: Semantic code analysis and editing
- **Installation**: Git-based with uvx
- **Requires**: Python with uv package manager

### 7. Firecrawl MCP
- **Purpose**: Web scraping and content extraction
- **Installation**: Remote URL-based
- **Requires**: Firecrawl API key

## Testing the Setup

After configuration, test each MCP server:

1. **Context7**: Test vector search capabilities
2. **Playwright**: Test browser automation
3. **Vercel**: Test deployment queries
4. **Supabase**: Test database queries (read-only)
5. **GitHub**: Test repository operations
6. **Serena**: Test code analysis on this project
7. **Firecrawl**: Test web scraping functionality

## Troubleshooting

### Common Issues:

1. **Missing Dependencies**:
   - Install uv for Serena: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Update Node.js if version is too old

2. **Permission Issues**:
   - Ensure API keys have correct scopes
   - Check environment variable loading

3. **Network Issues**:
   - Verify internet connectivity for remote servers
   - Check firewall settings

### Platform-Specific Notes:

- **macOS**: Serena should work out of the box
- **Windows**: May need WSL for Serena MCP
- **Linux**: Ensure all dependencies are installed

## Support

For issues with specific MCP servers:
- Context7: [GitHub Issues](https://github.com/upstash/context7/issues)
- Playwright: [GitHub Issues](https://github.com/microsoft/playwright-mcp/issues)
- Vercel: [Vercel Support](https://vercel.com/help)
- Supabase: [Supabase Support](https://supabase.com/docs)
- GitHub: [GitHub Support](https://support.github.com/)
- Serena: [GitHub Issues](https://github.com/oraios/serena/issues)
- Firecrawl: [Firecrawl Support](https://docs.firecrawl.dev/)