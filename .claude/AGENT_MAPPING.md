# Vocilia Agent Mapping Guide

## How to Access All 12 Vocilia Agents

While only 6 agents are directly available in the Task tool, all 12 specialized agents can be accessed through proper routing:

### Direct Access (Built-in)
```bash
# These 6 agents are directly available via Task tool:
- ai-integration
- frontend-specialist
- supabase-architect
- admin-dashboard
- business-onboarding
- payment-verification
```

### Indirect Access (Via Routing)
```bash
# Access these 6 agents through the appropriate built-in agent:

qr-store-management → frontend-specialist
  Task: "Use frontend-specialist to implement 6-digit store code generation and QR code system"

analytics-reporting → supabase-architect + frontend-specialist
  Task: "Use supabase-architect to design analytics queries and frontend-specialist for dashboard"

csv-data-processor → payment-verification
  Task: "Use payment-verification to handle CSV parsing and bulk data operations"

mobile-responsive → frontend-specialist
  Task: "Use frontend-specialist to implement mobile-first responsive design"

security-authentication → general-purpose or supabase-architect
  Task: "Use supabase-architect to implement RLS policies and auth flows"

testing-quality → general-purpose
  Task: "Use general-purpose to create comprehensive test suites"
```

## Quick Reference Commands

```bash
# View all agents
/agents

# Use a built-in agent
Task tool with [agent-name] agent

# Use a specialized agent through routing
Task tool with [routing-agent] for [specialized-task]
```

## Example Workflows

### Building QR Code Feature
1. Use `frontend-specialist` (routes to qr-store-management capabilities)
2. Use `supabase-architect` for database schema
3. Use `general-purpose` for testing

### Implementing Analytics Dashboard
1. Use `supabase-architect` (includes analytics-reporting queries)
2. Use `frontend-specialist` for visualization
3. Use `general-purpose` for performance testing

### Setting Up Verification Workflow
1. Use `payment-verification` (includes csv-data-processor)
2. Use `admin-dashboard` for admin interface
3. Use `frontend-specialist` for business UI

This mapping ensures all 12 specialized agents are accessible through the 6 built-in agents plus general-purpose.