# Resend MCP Setup Guide

## Configuration Added
The Resend MCP server has been added to `.mcp.json` with the following configuration:

```json
"resend": {
  "command": "npx",
  "args": ["-y", "@resend/mcp-server"],
  "env": {
    "RESEND_API_KEY": "your_resend_api_key",
    "SENDER_EMAIL_ADDRESS": "noreply@vocilia.com"
  },
  "description": "Resend MCP for email sending and management"
}
```

## Setup Steps

1. **Get Your Resend API Key**
   - Sign up or log in at https://resend.com
   - Navigate to API Keys section
   - Create a new API key or use existing one

2. **Configure Environment Variables**
   Replace the placeholder values in `.mcp.json`:
   - `RESEND_API_KEY`: Your actual Resend API key
   - `SENDER_EMAIL_ADDRESS`: Verified sending email address (default: noreply@vocilia.com)

3. **Verify Domain (if using custom domain)**
   - Add vocilia.com domain in Resend dashboard
   - Configure DNS records as instructed
   - Verify domain ownership

4. **Restart Claude**
   After updating the configuration, restart Claude to load the new MCP server.

## Available MCP Tools
Once configured, the Resend MCP provides tools for:
- Sending emails
- Managing email templates
- Tracking email delivery status
- Managing contacts and audiences

## Usage in Vocilia
The Resend MCP will be used for:
- Business registration confirmation emails
- Password reset emails
- Weekly feedback report notifications
- Payment verification reminders
- System notifications to businesses

## Testing
To test the configuration:
1. Update the API key in `.mcp.json`
2. Restart Claude
3. Use the Resend MCP tools to send a test email

## Documentation
- Resend MCP Docs: https://resend.com/docs/knowledge-base/mcp-server
- Resend API Docs: https://resend.com/docs/api-reference