---
description: Analyze UI screens against style guide and fix design issues with iterative improvement
argument-hint: "[URL or screen-path]"
allowed-tools: ["mcp__playwright__browser_navigate", "mcp__playwright__browser_take_screenshot", "mcp__playwright__browser_snapshot", "Read", "WebFetch"]
---

Analyze the UI at $ARGUMENTS against the project style guides and fix any design issues found.

**Process**:

1. **Initial Analysis**:
   - Navigate to the specified URL/path using Playwright MCP
   - Capture full-page screenshot for visual analysis
   - Take accessibility snapshot for structural evaluation
   - Document current state and identify all UI elements

2. **Style Guide Evaluation**:
   - Reference project style guides:
     - `/style-guide/style-guide.md` - Visual design standards
     - `/ux-rules.md` - User experience guidelines
     - `/style-guide/ux-rules.md` - Additional UX standards
   - Grade each screen component against established criteria:
     - Typography and text hierarchy (1-10)
     - Color scheme and contrast compliance (1-10)
     - Layout spacing and alignment (1-10)
     - Component consistency and patterns (1-10)
     - Accessibility standards compliance (1-10)
     - Overall user experience flow (1-10)

3. **Issue Identification**:
   - Document specific violations with precise locations
   - Categorize issues by severity (Critical, High, Medium, Low)
   - Create actionable improvement recommendations
   - Reference specific style guide sections for each issue

4. **Iterative Improvement**:
   - Implement necessary code changes for scores below 8/10
   - Re-capture screenshots after each change cycle
   - Re-evaluate against style guide standards
   - Continue iterations until all components achieve 8+ scores
   - Generate before/after comparison documentation

**Quality Gates**: All screens must achieve 8+ score in all evaluation categories, zero critical accessibility violations, full compliance with project style guide, and consistent user experience patterns.