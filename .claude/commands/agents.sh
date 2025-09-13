#!/bin/bash

# Vocilia Project - Available AI Agents
# This command displays all available agents for the Vocilia project

cat << 'EOF'
╔════════════════════════════════════════════════════════════════════════════════╗
║                        VOCILIA PROJECT - AI AGENTS                                 ║
╚════════════════════════════════════════════════════════════════════════════════╝

## CORE AGENTS (Available via Task tool)

### General Purpose
✅ general-purpose          - Complex multi-step tasks, research, code execution

### Platform-Specific Agents
✅ ai-integration           - GPT-4o-mini integration, voice processing, feedback analysis
✅ frontend-specialist      - Next.js/React for all three platforms (customer/business/admin)
✅ supabase-architect       - Database schema, RLS policies, real-time features
✅ admin-dashboard          - Weekly batch processing, admin operations
✅ business-onboarding      - 6-step onboarding flow, context management
✅ payment-verification     - Swish payments, CSV verification workflows

### System Configuration
✅ statusline-setup         - Configure Claude Code status line settings
✅ output-style-setup       - Create custom Claude Code output styles

## SPECIALIZED AGENTS (Use via general-purpose or specific agents above)

📦 qr-store-management      → Use: frontend-specialist
   - 6-digit store codes, QR generation, multi-location management

📊 analytics-reporting      → Use: supabase-architect + frontend-specialist
   - Weekly analytics, quality scores, trend analysis, reports

📄 csv-data-processor       → Use: payment-verification
   - Bulk CSV operations, verification uploads, data validation

📱 mobile-responsive        → Use: frontend-specialist
   - Mobile-first design, PWA features, touch optimization

🔒 security-authentication  → Use: general-purpose + supabase-architect
   - Auth flows, RBAC, JWT, GDPR compliance, security audits

🧪 testing-quality          → Use: general-purpose
   - E2E testing, production testing, load testing, monitoring

## USAGE EXAMPLES

# For complex research or multi-step tasks:
Task: "Research best practices for Swish integration" → general-purpose

# For QR code implementation:
Task: "Implement QR code generation for stores" → frontend-specialist

# For database schema design:
Task: "Design RLS policies for feedback table" → supabase-architect

# For analytics dashboard:
Task: "Build weekly analytics view" → frontend-specialist (UI) + supabase-architect (queries)

# For CSV verification:
Task: "Implement CSV upload and validation" → payment-verification

# For security implementation:
Task: "Implement RBAC for admin users" → general-purpose or supabase-architect

# For configuration:
Task: "Configure status line" → statusline-setup
Task: "Create output style" → output-style-setup

## COLLABORATION MATRIX

Primary Agent          | Collaborates With        | Purpose
----------------------|-------------------------|---------------------------
general-purpose       | All agents              | Research, planning, coordination
ai-integration        | business-onboarding     | Context assistant & scoring
frontend-specialist   | All agents              | UI for all features
supabase-architect    | All agents              | Database operations
admin-dashboard       | payment-verification    | Weekly batch processing
payment-verification  | admin-dashboard         | Verification workflows
business-onboarding   | ai-integration          | Context management
statusline-setup      | None                    | Configuration only
output-style-setup    | None                    | Configuration only

╔════════════════════════════════════════════════════════════════════════════════╗
║ TIP: Use Task tool with the appropriate agent for your specific task          ║
║ Example: "Use Task tool with frontend-specialist agent to build QR feature"   ║
╚════════════════════════════════════════════════════════════════════════════════╝
EOF