
# Business Accounts Vision - Comprehensive Planning Document

## CRITICAL DEVELOPMENT NOTICE

### ⚠️ PRODUCTION-FIRST DEVELOPMENT APPROACH ⚠️

**This platform will be built directly in production with REAL accounts from day one.**

There will be NO demo environment, NO test accounts, and NO sample data. Every account created during development will be a legitimate, production-ready business account. This means:

1. **Real Accounts Only**: All business accounts created during development are actual production accounts
2. **Clean State**: Each new account starts completely empty with no pre-populated data
3. **No Test Data**: No fake feedback, no demo transactions, no sample businesses
4. **Production Database**: Using the live production database from the start
5. **Real Money**: When testing payment flows, using actual (small) transactions
6. **Permanent Records**: Everything created during development remains in the system

### Development Testing Strategy:
- Create real business accounts for testing (can be deleted later if needed)
- Use actual small transactions when testing payment flows
- Test with real phone numbers and genuine Swish accounts
- Generate real feedback through actual voice calls
- Process real (minimal) payments to verify the complete flow

### Why This Approach:
- Ensures all features work with real-world constraints from day one
- Prevents demo-to-production migration issues
- Forces proper security and data handling immediately
- Creates a system that's production-ready at every stage
- Eliminates the "it worked in demo" problem

---

## Platform URL Structure

### Customer-Facing Platform: vocilia.com

**Primary Purpose**: Entry point for customers scanning QR codes in stores

**Landing Page Design**:
The vocilia.com homepage is intentionally minimal and focused:

```
VOCILIA
Få tillbaka pengar för din feedback

[Ange butikskod]
____________________
     [FORTSÄTT]

Skannade du en QR-kod? Ange den 6-siffriga 
koden som står under QR-koden i butiken.
```

**Customer Flow**:
1. Customer scans QR code in store → Arrives at vocilia.com
2. Types in 6-character store code printed below QR code
3. Redirected to vocilia.com/feedback/{store_code}
4. Enters transaction details (time, amount, phone)
5. Proceeds to AI voice interview
6. Sees reward amount on screen
7. Receives Swish payment within a week

**Note**: No customer accounts needed - completely frictionless experience

### Business Platform: business.vocilia.com

**Primary Purpose**: Complete business dashboard for feedback management

**Entry Pages**:

#### Login Page (business.vocilia.com/login):
```
VOCILIA BUSINESS

Logga in på ditt företagskonto

E-post: ____________________
Lösenord: ____________________

[Logga in]

[Glömt lösenord?] | Ny användare? [Skapa konto]
```

#### Signup Page (business.vocilia.com/signup):
```
VOCILIA BUSINESS

Skapa företagskonto

Företagsnamn: ____________________
E-post: ____________________
Lösenord: ____________________

[Skapa konto]

Har du redan ett konto? [Logga in]
```

**After Login - Dashboard Routes**:
- business.vocilia.com/dashboard - Main overview
- business.vocilia.com/context - AI-powered context management
- business.vocilia.com/feedback - Weekly feedback analytics
- business.vocilia.com/verification - Upload verified databases
- business.vocilia.com/stores - Manage store locations & QR codes
- business.vocilia.com/settings - Account and billing settings

### Admin Platform: admin.vocilia.com

**Primary Purpose**: Administrative control panel (manually created accounts only)

**No public signup** - Admin accounts created manually in database

---

## Executive Summary

This document outlines the complete vision for transforming https://vocilia.com/business/dashboard into a comprehensive business accounts platform. The system will serve as the primary interface for businesses to manage their AI-powered customer feedback collection, verification, and analysis operations.

## Core Philosophy

The business accounts platform operates on the principle of **intelligent, AI-assisted feedback management** where:
- Businesses provide context to enhance AI analysis accuracy
- Manual verification ensures legitimacy while maintaining scalability  
- Advanced analytics help businesses track improvement over time
- The platform grows with businesses from single locations to multi-store operations
- Customers are incentivized with cashback rewards based on feedback quality

## Platform Architecture Overview

### User Journey Flow
1. **Business Registration** → **Setup & Onboarding** → **Context Configuration** → **Store Code Generation** → **Weekly Operations** → **Feedback Analysis** → **Progress Tracking**

### Customer Journey Flow (NEW)
1. **QR Code Scan** → **Store Code Entry** → **Transaction Verification** → **Phone Number Entry** → **AI Voice Interview** → **Quality Assessment** → **Weekly Payment via Swish**

### Core System Components
- **Setup System**: Guided onboarding for new businesses
- **Context Management**: AI-assisted business context optimization  
- **Store Code System**: QR code generation and management
- **Customer Verification**: Transaction time/amount validation
- **AI Voice Interview**: Swedish language feedback collection
- **Quality Scoring**: Algorithm-based feedback evaluation (3-15% cashback)
- **Verification Workflow**: Weekly feedback legitimacy validation
- **Payment Processing**: Swish integration for customer rewards
- **Feedback Analytics**: Advanced search and progress tracking
- **Settings Management**: Ongoing configuration updates

---

## Customer Feedback Collection Flow (NEW SECTION)

### Customer Experience Journey

#### Step 1: QR Code Discovery
- Customer sees QR code displayed in store (counter, wall, receipt)
- QR code directs to: **vocilia.com**
- Store code is printed clearly below QR code on physical materials

#### Step 2: Store Code Entry at vocilia.com
- Landing page at vocilia.com prompts: "Ange butikskod" (Enter store code)
- 6-digit alphanumeric code entry field
- Validation confirms legitimate store participation
- Redirects to vocilia.com/feedback/{store_code}

#### Step 3: Transaction Verification
- Customer provides:
  - **Transaction Time**: When purchase occurred (hour/minute selection)
  - **Transaction Amount**: Total purchase amount in SEK
  - **Phone Number**: Swedish mobile number for Swish payment
- These details enable business verification against POS systems

#### Step 4: AI Voice Interview
- **Language**: Swedish (primary)
- **Duration**: 2-5 minutes typical
- **Topics Covered**:
  - General store experience
  - Product quality and availability
  - Staff interaction
  - Store cleanliness and organization
  - Improvement suggestions
  - Business-specific custom questions (from context system)

#### Step 5: Quality Assessment & Reward Calculation
- **Automated Scoring Algorithm** evaluates:
  - **Depth**: Detailed vs. superficial responses
  - **Legitimacy**: Consistency with business context
  - **Constructiveness**: Actionable insights vs. vague complaints
  - **Specificity**: Concrete examples vs. generalizations
- **Reward Calculation**: 3-15% of transaction amount
  - Minimum 3%: Basic legitimate feedback
  - 5-8%: Good quality, useful feedback
  - 10-12%: Excellent, detailed feedback
  - 15%: Exceptional insights with specific improvements
- **Platform Fee**: 20% of customer reward retained by Vocilia

---

## Payment & Verification Cycle (ENHANCED)

### Weekly Operational Cycle

### Weekly Operational Cycle:
- **Week begins**: Customers provide feedback throughout the week
- **Week ends**: Admin collects all feedback for processing
- **Admin verification**: Admin reviews and verifies feedback batch
- **Business verification**: Businesses verify transactions against POS
- **Admin release**: Admin releases verified feedback to business /feedback routes
- **Payment processing**: Customer payments via Swish after verification
- **New cycle begins**: Fresh week for new feedback collection

#### Feedback Collection & Admin Release
- System compiles previous week's feedback data
- **Admin reviews and triggers release when ready**
- **Upon admin release: Analyzed feedback populates in business /feedback routes**
- **Businesses receive notification: "Your weekly insights are ready!"**
- Database for verification includes:
  - Customer phone numbers (partially masked for privacy)
  - Transaction times
  - Transaction amounts
  - Store codes
  - Quality scores
  - Calculated rewards

#### Tuesday-Thursday - Business Verification Window
- Businesses receive verification batch via dashboard
- CSV/Excel export for POS system comparison
- Businesses verify against their transaction records:
  - Match transaction time (±2 minute tolerance)
  - Match transaction amount (±0.5 SEK tolerance)
- Flag or remove fraudulent entries
- Approve legitimate feedback

#### Friday - Verification Deadline
- 17:00 Stockholm time cutoff
- Unverified batches auto-approve (with business consent)
- Final verification database returned to Vocilia

#### Saturday-Sunday - Payment Processing
- Vocilia invoices businesses for:
  - Total customer rewards
  - 20% platform fee on top of rewards
  - Monthly subscription fee (if applicable)
- Payment reconciliation and preparation

#### Following Monday - Customer Payments
- Swish API processes batch payments
- Customers receive cashback directly to phone numbers
- Payment confirmations logged in system
- Failed payments flagged for manual review

### Financial Flow Example
- Customer makes 500 SEK purchase
- Provides high-quality feedback (10% reward tier)
- Customer receives: 50 SEK via Swish
- Business is invoiced: 60 SEK (50 SEK + 20% platform fee)
- Vocilia retains: 10 SEK platform fee

**Important**: If a customer provides feedback at multiple stores in one week, they receive ONE consolidated Swish payment with the total amount, reducing transaction costs.

---

## 1. Business Setup & Onboarding System

### 1.0 Account Creation at business.vocilia.com (PRODUCTION ACCOUNTS)

**IMPORTANT**: Every account created is a REAL production account. No demo data exists.

Businesses navigate to **business.vocilia.com/signup** to create their account.

The initial account creation is intentionally minimal to reduce friction:

#### Basic Registration Fields:
- **Company Name**: Real business name (even if testing)
- **Email**: Valid email address that will receive real notifications
- **Password**: Secure password meeting production standards

After successful registration, businesses are redirected to **business.vocilia.com/dashboard** where the comprehensive onboarding flow begins.

This simple 3-field registration creates a **real, permanent account** in the production database. The comprehensive onboarding begins immediately after account creation.

**Developer Note**: When testing, create accounts like "Test Business 1" - these are real accounts that can be deleted later if needed, but they function exactly like any other business account.

### 1.1 Post-Registration Onboarding Flow

Once the basic account is created, businesses enter an engaging, multi-step onboarding process designed to educate, motivate, and configure their account for success.

#### Setup Process Components:

**Step 1: Welcome & Value Proposition**
- **The Feedback Revolution Introduction**:
  - "Welcome to the future of customer feedback"
  - Interactive presentation showing why traditional feedback fails:
    - Survey fatigue (2% response rates)
    - Biased reviews (only extremely happy/angry customers)
    - No incentive for constructive feedback
    - Delayed insights (monthly/quarterly reports)
  
- **The Vocilia Difference**:
  - **For Your Customers**: "Turn every purchase into potential cashback"
    - 3-15% rewards motivate quality feedback
    - Voice conversations feel natural, not like surveys
    - Instant rewards via Swish create positive associations
  
  - **For Your Business**: "Real insights from real customers"
    - 10-20x higher response rates than traditional methods
    - Balanced feedback from average customers, not just extremes
    - Weekly actionable insights, not quarterly reports
    - AI-powered analysis identifies patterns humans miss
  
  - **ROI Calculator**: Interactive tool showing:
    - Expected feedback volume based on customer traffic
    - Estimated monthly insights generated
    - Projected improvement areas identified
    - Cost comparison vs. traditional market research

- **Success Stories Carousel**:
  - "Stockholm Grocery increased customer satisfaction 23% in 3 months"
  - "Café Nordic identified and fixed their #1 customer complaint in week 2"
  - "Fashion Boutique discovered untapped product demand worth 50K SEK/month"

- **Timeline Visualization**: 
  - Today: Complete setup (15 minutes)
  - Tomorrow: Display QR codes in store
  - Week 1: First customer feedback arrives
  - Week 2: First insights report and customer payments
  - Month 1: Measurable improvements from acted-upon feedback
  - Month 3: Transformed customer understanding

**Step 2: Why Feedback Matters (Educational Moment)**
- **The Hidden Cost of Not Knowing**:
  - "90% of dissatisfied customers never complain - they just don't return"
  - "It costs 5x more to acquire a new customer than retain an existing one"
  - "Businesses typically only hear from 4% of unhappy customers"
  
- **Interactive Demo**: Sample AI conversation showing depth of insights:
  - Play actual (anonymized) feedback examples
  - Show how AI identifies specific, actionable improvements
  - Demonstrate sentiment analysis and pattern recognition
  - Preview the analytics dashboard they'll soon access

- **Industry-Specific Benefits**:
  - Restaurants: "Discover menu items customers want but you don't offer"
  - Retail: "Understand why customers browse but don't buy"
  - Services: "Find out what makes customers choose competitors"

**Step 3: Business Profile Setup**
- **Motivational Header**: "Let's customize Vocilia for your success"
- Number of store locations (1-100+)
- Business type selection:
  - Restaurant/Café
  - Retail Store  
  - Barbershop/Salon
  - Grocery Store
  - Pharmacy
  - Electronics Store
  - Clothing Store
  - Other (custom field)
- Geographic coverage (single city, region, national)
- Average transaction values and customer volume
- Expected feedback budget per month
- **Progress Indicator**: "Step 3 of 6 - You're doing great!"

**Step 4: Technical Integration (Simplified)**
- **Reassuring Message**: "Don't worry - this is easier than you think!"
- POS system identification with visual logos:
  - Square, Shopify, Zettle, Other, None
  - "Not sure? We'll help you figure it out!"
- Verification preference:
  - "Simple mode (recommended): Review a weekly list - 5 minutes/week"
  - "Advanced mode: Automated matching with your POS"
- **Video Tutorial Teaser**: "We have step-by-step guides for your exact setup"

**Step 5: Your Success Goals**
- **Framing**: "What would make Vocilia a huge win for your business?"
- Primary improvement areas (select top 3):
  - Increase customer satisfaction
  - Reduce complaints
  - Discover new opportunities
  - Improve staff performance
  - Optimize operations
  - Understand customer preferences
- Expected feedback volume:
  - Conservative: 5-10% of customers
  - Realistic: 10-20% of customers
  - Ambitious: 20%+ of customers
- **Motivation**: "Most businesses hit 'Realistic' within month 2!"

**Step 6: Quick Context Starter**
- **Encouraging Header**: "Last step! Help our AI understand your business"
- "In 2-3 sentences, describe what makes your business special"
- "What's one thing customers often compliment?"
- "What's one thing you'd like to improve?"
- **AI Response**: Immediate personalized message:
  - "Based on what you've told me, I'm excited to help you [specific goal]"
  - "I'll guide you through building a complete context after setup"

### 1.2 Onboarding Completion & Activation

#### Celebration & Next Steps:
- **Success Animation**: Confetti effect with "You're ready to revolutionize your customer feedback!"
- **Immediate Actions Checklist**:
  - ✅ Account created
  - ✅ Business profile complete
  - ⏳ Download your QR codes (one click)
  - ⏳ Print and display in store
  - ⏳ Complete context setup (AI assistant ready)
  - ⏳ Brief your staff (2-minute explanation guide provided)

#### First Week Support:
- **Day 1 Email**: "Your QR codes and setup checklist"
- **Day 3 Check-in**: "Any questions? We're here to help!"
- **Day 7 Celebration**: "Your first feedback is arriving!"
- **Dedicated Support**: "Your success manager: [Name] is available"

### 1.3 Motivational Messaging Throughout Onboarding

#### Key Messages Reinforced:
- **"You're joining the feedback revolution"**: Position as innovation leaders
- **"Your customers will love this"**: Win-win relationship building
- **"Insights you've been missing"**: Discovery and opportunity framing
- **"Simple, powerful, profitable"**: Ease of use with high ROI
- **"We're with you every step"**: Support and partnership emphasis

#### Progress Gamification:
- Visual progress bar with encouraging messages
- Completion badges for each section
- Estimated time remaining (always underestimated for positive surprise)
- Skip options for advanced users with "Complete later" for non-critical steps

### 1.4 Onboarding-to-Context Integration (NEW)

#### Automatic Context Pre-Population:
All information collected during onboarding automatically populates the business's context system, giving them a head start on fraud detection and AI accuracy.

#### Information Transfer Mapping:

**From Onboarding → To Context System:**

1. **Business Type Selection** → **Context Category: Business Operations**
   - Restaurant/Café → Pre-fills: dining areas, kitchen, menu categories, table service
   - Retail Store → Pre-fills: product sections, checkout areas, fitting rooms
   - Grocery Store → Pre-fills: produce, dairy, meat, bakery sections
   - Pharmacy → Pre-fills: prescription counter, OTC sections, consultation area
   - Each type triggers industry-specific context templates

2. **Store Locations & Count** → **Context Category: Physical Layout**
   - Single location → Simplified context focused on one store
   - Multi-location → Store comparison framework, location-specific contexts
   - Geographic spread → Regional variations, local competition factors

3. **Average Transaction Values** → **Context Category: Transaction Patterns**
   - Pre-fills typical purchase ranges for fraud detection
   - Sets baseline for unusual transaction flagging
   - Helps AI understand if "expensive" feedback makes sense

4. **Expected Customer Volume** → **Context Category: Operational Details**
   - Pre-fills peak times and capacity
   - Sets expectations for feedback volume
   - Helps identify suspicious off-hours feedback

5. **POS System Type** → **Context Category: Technical Systems**
   - Pre-fills transaction verification methods
   - Suggests integration possibilities
   - Sets up verification tolerance defaults

6. **Primary Goals (Step 5)** → **Context Category: Custom Questions**
   - "Increase satisfaction" → Generates questions about service experience
   - "Discover opportunities" → Generates questions about desired products/services
   - "Improve operations" → Generates questions about wait times, efficiency
   - Each goal auto-creates 2-3 relevant custom questions

7. **Quick Context Starter (Step 6)** → **Context Category: Unique Characteristics**
   - "What makes you special" → Unique selling points for legitimacy verification
   - "Common compliments" → Positive pattern recognition
   - "Areas to improve" → Focus areas for AI attention

#### Context System Welcome After Onboarding:

When businesses first visit /context after onboarding, they see:

```
"Great news! Based on your onboarding information, we've already started building your context. Here's what we know so far:"

✅ Business Type: [Grocery Store]
✅ Locations: [2 stores in Stockholm]
✅ Typical Transactions: [200-800 SEK]
✅ Key Departments: [Produce, Meat, Dairy, Bakery]
✅ Verification Method: [Simple weekly review]
✅ Focus Areas: [Product quality, Customer service]

"Now let's add more specific details to make your fraud detection and insights even better..."

[Continue to AI Context Assistant]
```

#### AI Context Assistant Opening (Personalized):

The AI assistant begins with onboarding knowledge:

```
AI: "Hi! I can see you run a grocery store with 2 locations in Stockholm. You mentioned wanting to improve product quality and customer service. Let's make sure I understand your business perfectly so I can identify legitimate feedback and provide the best insights.

First, you have the standard sections like produce, meat, dairy, and bakery. Do you also have any specialty sections like organic foods, international products, or a deli counter?"
```

### 1.5 Context Pre-Fill Templates by Business Type (NEW)

#### Restaurant/Café Template:
- **Sections**: Dining area, bar, kitchen, restroom, outdoor seating
- **Staff Roles**: Servers, bartenders, hosts, chefs
- **Common Issues**: Wait times, food temperature, menu variety
- **Fraud Indicators**: Claims about dishes not on menu, wrong hours

#### Retail Store Template:
- **Sections**: Entrance, aisles, checkout, fitting rooms, customer service
- **Staff Roles**: Cashiers, floor staff, managers
- **Common Issues**: Product availability, sizing, pricing clarity
- **Fraud Indicators**: Products you don't carry, impossible department claims

#### Grocery Store Template:
- **Sections**: Produce, meat, dairy, bakery, frozen, checkout
- **Staff Roles**: Cashiers, department specialists, stockers
- **Common Issues**: Freshness, stock levels, queue times
- **Fraud Indicators**: Seasonal items out of season, wrong price ranges

#### Service Business Template:
- **Sections**: Reception, waiting area, service areas
- **Staff Roles**: Receptionists, service providers, managers
- **Common Issues**: Wait times, service quality, booking system
- **Fraud Indicators**: Services not offered, impossible time slots

---

## 2. Context Management System (/context) - ENHANCED

### 2.1 Purpose & Strategic Importance

The context system is the **intelligence backbone** of the platform. It enables the AI analyzer to:
- Distinguish between legitimate and fraudulent feedback
- Provide business-specific analysis and insights
- Generate contextually relevant follow-up questions
- **Ensure quality scoring accuracy for fair customer rewards**
- **Validate customer claims against business reality**
- **NEW: Leverage onboarding data for immediate context intelligence**

### 2.2 Context Initialization from Onboarding (NEW)

When a business first accesses the /context route after completing onboarding, their context is already partially populated:

#### Pre-Populated Context Fields:
- Business type and industry-specific departments
- Store locations and operational scale
- Transaction patterns and typical amounts
- Primary improvement goals and focus areas
- Initial staff structure and roles
- Basic operational hours and patterns

#### Smart Context Suggestions:
Based on business type selected during onboarding, the AI suggests relevant context additions:
- Common problem areas for their industry
- Typical customer journey touchpoints
- Industry-specific fraud patterns to watch for
- Recommended custom questions for their goals

### 2.3 AI-Powered Context Optimization with GPT-4o-mini

#### The AI Context Assistant: Your Intelligent Business Partner

The context system features a sophisticated AI assistant powered by GPT-4o-mini that serves as an intelligent partner in building and maintaining comprehensive business context. This isn't just a chatbot - it's a context optimization specialist that learns, suggests, and validates.

#### Core AI Assistant Capabilities:

**1. Active Context Discovery**
The AI doesn't wait for information - it actively identifies gaps and prompts for specific details:
- Analyzes existing context to find missing elements
- Asks targeted questions based on business type and goals
- Prioritizes information requests by fraud prevention importance
- Suggests context additions the business might not have considered

**2. Pattern Recognition & Intelligent Suggestions**
GPT-4o-mini analyzes patterns across three data sources:
- **Onboarding Data**: Uses initial setup to predict needed context
- **Industry Templates**: Leverages knowledge of similar businesses
- **Feedback Patterns**: Learns from actual customer feedback to suggest updates

Example AI Proposal:
```
AI: "I've noticed customers frequently mention your 'express checkout' in feedback, but this isn't in your context. This seems to be a positive differentiator. Should I add this as a service feature? It will help me validate legitimate feedback and identify when customers specifically appreciate this option."
```

**3. Continuous Learning & Adaptation**
The AI assistant evolves with your business:
- **Weekly Analysis**: Reviews feedback patterns after each verification cycle
- **Context Recommendations**: Proposes updates based on emerging themes
- **Fraud Pattern Learning**: Identifies new fraud indicators specific to your business
- **Seasonal Adjustments**: Suggests temporary context updates for holidays/events

Learning Example:
```
AI: "Last week, 15% of feedback mentioned 'Oliver' positively, but this name isn't in your staff list. Is Oliver a new team member? Adding him will improve legitimacy verification."
```

**4. Context Validation & Completeness Scoring**
The AI continuously evaluates context quality:
- **Completeness Score**: 0-100% rating of context coverage
- **Gap Analysis**: Identifies critical missing information
- **Redundancy Check**: Flags duplicate or outdated information
- **Consistency Validation**: Ensures context elements don't contradict

Validation Example:
```
AI: "Your context is 75% complete. Critical gaps: 
- No weekend hours specified (affects time-based fraud detection)
- Missing price ranges for main products (limits transaction verification)
- No seasonal variations noted (may flag legitimate holiday feedback as suspicious)"
```

**5. Intelligent Prompt Engineering**
GPT-4o-mini uses sophisticated prompting to extract valuable context:
- **Scaffolded Questions**: Builds from general to specific
- **Example-Based Prompts**: Shows what good context looks like
- **Clarification Loops**: Ensures understanding before saving
- **Multi-Angle Exploration**: Approaches topics from different perspectives

#### GPT-4o-mini Specific Features Utilized:

**1. Conversational Memory**
- Maintains conversation history across sessions
- References previous discussions for continuity
- Builds context knowledge incrementally
- Never asks for the same information twice

**2. Multi-Turn Reasoning**
- Follows complex conversation threads
- Understands context dependencies
- Makes logical inferences from partial information
- Connects disparate pieces of information

**3. Industry Knowledge Base**
- Pre-trained on business operations across industries
- Understands common customer service patterns
- Knows typical fraud indicators by business type
- Familiar with Swedish business practices and terminology

**4. Natural Language Understanding**
- Processes both Swedish and English inputs
- Understands colloquialisms and business jargon
- Interprets vague descriptions into specific context
- Handles mixed-language conversations smoothly

#### AI-Driven Context Building Workflow:

**Phase 1: Initial Context Creation (Post-Onboarding)**
```
AI: "Welcome! I've pre-filled your context with grocery store basics from your onboarding. Let's make it exceptional. I'll guide you through 5-7 key areas, taking about 10 minutes total."
```

**Phase 2: Guided Information Gathering**
```
AI: "Let's start with your unique features. What makes customers choose your store over competitors? This helps me identify authentic feedback that mentions these differentiators."

Business: "We have the only organic bakery in the area."

AI: "Excellent! That's a strong legitimacy indicator. Do you bake on-site? The smell and visible baking area would be things real customers mention."
```

**Phase 3: Validation & Gap Filling**
```
AI: "I've identified that we're missing information about your return policy. This is important because customers often mention this in feedback. Can you briefly describe it?"
```

**Phase 4: Optimization Suggestions**
```
AI: "Based on 50 feedback sessions analyzed, I recommend adding these to your context:
1. Your coffee corner (mentioned by 20% of customers)
2. The children's play area (frequent positive mentions)
3. Your Monday senior discount (helps validate timing)
Would you like to add these?"
```

**Phase 5: Continuous Improvement**
```
AI: "Weekly Context Update: I've noticed 3 patterns in last week's feedback:
- New staff member 'Sandra' mentioned positively 8 times
- Complaints about parking (consider adding parking situation to context)
- Questions about gluten-free options (add to product categories?)
[Click to review and update]"
```

#### AI Assistant Interaction Modes:

**1. Conversational Mode** (Primary)
- Natural dialogue for context building
- Friendly, professional tone
- Asks one question at a time
- Provides reasoning for each request

**2. Quick Update Mode**
- Rapid-fire questions for experienced users
- Bulk context updates
- Yes/no confirmations
- Minimal explanation

**3. Review Mode**
- Weekly context audit
- Feedback-driven suggestions
- Completeness assessment
- Priority-ordered improvements

**4. Emergency Mode**
- Urgent fraud pattern detection
- Immediate context updates needed
- Real-time assistance during verification
- Quick validation of suspicious patterns

#### Success Metrics for AI Context Assistant:

- **Context Completeness**: Average 85% within first week
- **Fraud Detection Accuracy**: 95% with complete context
- **Time to Complete Context**: 10-15 minutes initial, 2-3 minutes weekly
- **Business Satisfaction**: Reduced false positives by 60%
- **Context Relevance**: 90% of context elements referenced in feedback analysis

### 2.4 Context Categories & Content Types

#### Essential Context Information:
1. **Physical Layout & Departments**
   - Store sections and departments (pre-filled from business type)
   - Checkout configuration (self-checkout, staff-only, etc.)
   - Special areas (pharmacy, deli, electronics, etc.)
   - **NEW**: Unique store features that legitimate customers would notice

2. **Staff Information**
   - Employee names (first names only for privacy)
   - Roles and departments (partially pre-filled from business type)
   - Shift patterns (helps validate timing authenticity)
   - **NEW**: Staff language capabilities (for multi-language customers)

3. **Products & Services**
   - Main product categories (pre-filled based on business type)
   - Seasonal offerings
   - Special services (delivery, installation, etc.)
   - Products/services NOT offered (for fraud detection)
   - **NEW**: Price ranges for legitimacy verification (from onboarding averages)

4. **Operational Details**
   - Opening hours and peak times
   - Known busy/quiet periods (suggested based on business type)
   - Common operational challenges (pre-filled from goals)
   - Ongoing improvements or changes
   - **NEW**: Typical transaction patterns and amounts (from onboarding)

5. **Customer Interaction Patterns**
   - Typical customer questions
   - Common complaints or praise areas (influenced by improvement goals)
   - Seasonal patterns
   - Special events or promotions
   - **NEW**: Average customer demographics and behavior

### 2.5 Custom Question Integration (ENHANCED)

Businesses can configure recurring questions for customer feedback, with smart suggestions based on their onboarding goals:

#### Question Configuration System:
- **Question Text**: Auto-suggested based on improvement goals from onboarding
- **Frequency Setting**: Every 20th customer (customizable)
- **Store Targeting**: All stores vs. specific locations
- **Seasonal Activation**: Active during specific months
- **Priority Level**: High (always ask) vs. Medium (ask when conversation allows)
- **NEW: Goal Alignment**: Questions tagged with onboarding goals they address

#### Auto-Generated Questions from Onboarding Goals:
- **Goal: "Increase satisfaction"** → "What would make your experience even better?"
- **Goal: "Reduce complaints"** → "Was there anything frustrating about your visit?"
- **Goal: "Discover opportunities"** → "What products or services do you wish we offered?"
- **Goal: "Improve staff performance"** → "How was your interaction with our staff today?"
- **Goal: "Optimize operations"** → "How was the wait time during your visit?"

---

## 3. Store Code & QR System (ENHANCED)

### 3.1 Store Code Generation & Management

#### Individual Store Operations:
- **Single Store Business**: One primary store code displayed prominently
- **Multi-Store Business**: Separate codes for each location with clear labeling
- **Code Format**: 6-digit alphanumeric codes (easy to remember, type, and communicate)
- **NEW**: Code clearly printed below QR code on all materials

#### QR Code Features:
- **Destination URL**: vocilia.com (simplified landing page)
- **Store Code Display**: 6-character code printed prominently below QR
- **Print-Ready Formats**: PDF, PNG, SVG for various display needs
- **Size Variants**: Small (counter), Medium (wall), Large (window display)
- **Branding Options**: Vocilia branding + business customization
- **Multi-Language Support**: Swedish primary, English secondary
- **Instructions in Swedish**: "Skanna QR-koden och ange butikskoden nedan: ABC123"

### 3.2 QR Code Deployment Strategy

#### Physical Placement Options:
- **Counter Cards**: Small, standing cards for checkout areas
- **Wall Posters**: Medium-sized for customer waiting areas
- **Window Clings**: External visibility for walk-by customers  
- **Receipt Integration**: QR code printed on receipts
- **Digital Displays**: For businesses with digital signage
- **NEW**: Table tents for restaurants/cafés

#### Code Validation & Security:
- Store codes linked directly to specific business locations
- Fraud prevention: Geographic validation, usage pattern analysis
- Code rotation capability for security (optional quarterly updates)
- **NEW**: Rate limiting per phone number (prevent abuse)

---

## 4. Weekly Verification Workflow (ENHANCED)

### 4.1 Verification Process Overview

The weekly verification system ensures feedback legitimacy while maintaining the simple verification model's accessibility.

#### Weekly Cycle Timeline:
- **Admin sends batch**: Payment batch database sent to business dashboard
- **7-day verification window**: Businesses have exactly 7 days to verify
- **Deadline enforcement**: Must upload verified database back to admin
- **Admin processing**: Reviews returned databases and processes payments
- **Customer payments**: Processed via Swish after verification complete

### 4.2 Business Verification Interface

#### Verification Dashboard Section:

When businesses receive their payment batch from admin, a dedicated section appears in their dashboard:

```
⚠️ VERIFICATION REQUIRED - WEEK 37

Time Remaining: 5 days, 14 hours, 32 minutes
Deadline: October 23, 2024 at 17:00

📥 Payment Batch Received: October 16, 2024
Items to Verify: 28 transactions
Total Value: 1,450 SEK

[Download Payment Batch] [Verification Guide] [Upload Verified Database]

⏰ COUNTDOWN: 5d 14h 32m remaining
```

#### Verification Workflow:

**Step 1: Download Payment Batch**
Business clicks to download the database sent by admin:
```
week37_ica_sodermalm_payment_batch.csv

Transaction_ID | Date_Time      | Amount_SEK | Phone_Last4
--------------|----------------|------------|-------------
#4837         | Oct-14 14:30   | 500        | **43
#4839         | Oct-14 09:20   | 780        | **89
#4841         | Oct-15 10:15   | 340        | **55
```

**Step 2: POS System Verification**
Business compares against their POS records:
- Match transaction times (±2 minutes tolerance)
- Match transaction amounts (±0.5 SEK tolerance)
- Flag any unmatched transactions

**Step 3: Mark Verification Status**
Business updates the database with verification results:
```
Transaction_ID | Date_Time    | Amount_SEK | Phone_Last4 | Verified
--------------|--------------|------------|-------------|----------
#4837         | Oct-14 14:30 | 500        | **43        | YES
#4839         | Oct-14 09:20 | 780        | **89        | YES
#4841         | Oct-15 10:15 | 340        | **55        | NO-NOT_FOUND
```

**Step 4: Upload Verified Database**
Business uploads the verified CSV back through their dashboard:

```
📤 UPLOAD VERIFIED DATABASE

Select your verified CSV file:
[Choose File: week37_verified.csv]

✓ File selected: week37_verified.csv
✓ Format validated
✓ 27 approved, 1 rejected

[Submit Verification] [Save Draft]

Note: You have 5 days, 14 hours remaining
```

#### Verification Status Tracking:

The dashboard shows real-time status:

```
VERIFICATION STATUS

Stage 1: Batch Received ✓ (Oct 16)
Stage 2: Downloaded ✓ (Oct 16)
Stage 3: In Progress ⏳ (Started Oct 17)
Stage 4: Upload Pending ⏰ (Due Oct 23)

Progress: ████████░░ 75% complete

[Continue Verification] [Need Help?]
```

### 4.3 Deadline Management

#### Countdown Timer Display:
A prominent countdown timer shows on the business dashboard:

```
⏰ VERIFICATION DEADLINE APPROACHING

2 DAYS, 4 HOURS, 15 MINUTES

Your verified database must be uploaded by:
October 23, 2024 at 17:00

[Upload Now] [Set Reminder]
```

#### Automatic Reminders:
- **Day 1**: "New payment batch ready for verification"
- **Day 3**: "4 days remaining to verify your payment batch"
- **Day 5**: "48 hours left - verification deadline approaching"
- **Day 6**: "URGENT: 24 hours to submit verification"
- **Day 7 morning**: "FINAL NOTICE: Verify today by 17:00"

#### Consequences of Missing Deadline:
If businesses don't upload verified database within 7 days:
- Batch auto-approves (all feedback marked as legitimate)
- Business notified of auto-approval
- May affect future verification privileges
- Admin notified for follow-up

### 4.4 Verification Upload Portal

The upload section in the business dashboard:

```
VERIFICATION UPLOAD CENTER

Current Batch: Week 37
Status: Awaiting Your Verification
Deadline: Oct 23, 17:00 (2 days remaining)

Requirements:
✓ CSV format matching original structure
✓ Include verification column (YES/NO-REASON)
✓ All rows must be accounted for
✓ Upload before deadline

[Upload Verified CSV] [Download Template] [View Tutorial]

Previous Submissions:
Week 36: Submitted on time ✓
Week 35: Submitted on time ✓
Week 34: Auto-approved (missed deadline) ⚠️
```

### 4.5 Admin-Business Data Exchange

#### Data Flow:
1. **Admin → Business**: Payment batch CSV sent to dashboard
2. **Business Dashboard**: Dedicated verification section activated
3. **7-Day Window**: Countdown begins upon receipt
4. **Business → Admin**: Verified CSV uploaded through dashboard
5. **Admin Confirmation**: Receipt confirmed, payments processed

#### Business Upload Confirmation:
```
✅ VERIFICATION SUBMITTED SUCCESSFULLY

Uploaded: week37_verified.csv
Time: October 21, 2024 at 14:32
Status: Under Admin Review

You verified:
- 27 transactions as legitimate
- 1 transaction as fraudulent

Total approved for payment: 1,380 SEK
Platform fee (20%): 276 SEK
Your invoice total: 1,656 SEK

[Download Confirmation] [View Submitted File]
```

### 4.3 Fraud Detection Assistance (ENHANCED)

#### Automated Flags:
- **Time Anomalies**: Feedback outside business hours
- **Amount Patterns**: Suspiciously round numbers or duplicates
- **Phone Abuse**: Same number multiple times per week
- **Geographic Mismatches**: Feedback location vs. store location
- **Quality Inconsistencies**: Generic feedback claiming specific knowledge
- **NEW**: Transaction patterns outside typical business ranges
- **NEW**: Multiple high-value transactions from same number

#### Business Decision Support:
- **Risk Scoring**: Each feedback item gets a fraud risk score (0-100)
- **Pattern Alerts**: Notifications about suspicious trends
- **Verification Recommendations**: AI suggestions for approve/reject decisions
- **Appeal Process**: System for reviewing disputed rejections
- **NEW**: Historical fraud pattern learning per business

---

### 4.6 Future Automation Options (Planned Features)

While manual verification is the primary method at launch, the platform is designed to support automated verification in future updates:

#### Planned Automation Features:

**1. POS API Integration**
- Direct integration with major POS systems:
  - Square API for automatic transaction matching
  - Shopify POS API for real-time verification
  - Zettle API for transaction history access
  - Toast, Clover, and other popular systems
- One-time setup, then fully automatic weekly verification
- Transactions matched automatically using ±4 min/±4 SEK tolerances

**2. CSV Auto-Import System**
- Businesses upload their POS export once per week
- System automatically matches against payment batch
- Visual review interface shows matches/mismatches
- One-click approval after automatic matching

**3. Real-Time Webhook Verification**
- POS systems send transaction data as they happen
- Feedback is pre-verified when it arrives
- Eliminates need for weekly verification entirely
- Instant fraud detection capabilities

**4. Desktop Verification Tool**
- Simple application businesses can install
- Connects to local POS database
- Automatically processes payment batch
- Uploads verified results with one click

#### Why Manual Verification First:

**Universal Compatibility**
- Works with ANY POS system immediately
- No integration required to get started
- Businesses can begin using platform right away

**Trust Building**
- Businesses maintain full control initially
- Can verify the system works before automating
- Builds confidence in the platform's accuracy

**Gradual Adoption**
- Start simple, add complexity over time
- Learn from manual process to improve automation
- Prioritize integrations based on customer demand

**Lower Barrier to Entry**
- No technical setup required
- No API keys or complex configuration
- Any business can start in minutes

#### Automation Rollout Timeline:
- **Month 1-3**: Manual verification only (current system)
- **Month 4-6**: Beta test Square and Shopify integrations
- **Month 7-9**: Add Zettle, CSV auto-import
- **Month 10-12**: Full automation suite available

Businesses can choose their preferred verification method:
- Continue with manual verification (always available)
- Semi-automated with CSV import
- Fully automated with API integration

This flexible approach ensures every business can use Vocilia regardless of their technical capabilities or POS system.

---

## 5. Advanced Feedback Analytics (/feedback) - ENHANCED

### 5.0 Weekly Feedback Release System (NEW)

#### The Weekly Feedback Release

Once per week, when the admin completes the verification cycle and approves the feedback batch, businesses receive their new collection of analyzed feedback in their /feedback route. This is a significant weekly event that transforms raw customer conversations into organized, actionable business intelligence.

#### Feedback Release Process:

**Admin Verification Completion**: 
- Admin finalizes verification results
- AI completes final analysis and categorization
- Admin triggers feedback release to businesses

**Upon Admin Release**:
- New feedback immediately populates in each business's /feedback dashboard
- Notification sent to business owners: "Your weekly insights are ready!"
- Previous week's feedback moves to historical view
- Fresh analytics and trends calculated

#### What Businesses See After Admin Release:

**Dashboard Header Alert:**
```
🔔 NEW FEEDBACK AVAILABLE
23 new customer insights from last week
Average quality: 7.8/10 | Top issue: Checkout wait times
[View Summary] [Dive into Details]
```

**Weekly Feedback Summary (Auto-Generated):**
```
WEEK 37 FEEDBACK SUMMARY - Released by Admin

📊 Overview:
• Total feedback received: 23
• Verified & approved: 21
• Average quality score: 78/100
• Total rewards paid: 1,250 SEK

😊 General Opinion:
POSITIVE (65% positive sentiment)
Customers appreciate your fresh produce and helpful staff. 
Strong praise for the new organic section.

🔧 Constructive Critique:
1. Checkout delays during lunch (mentioned 8x)
2. Parking difficulties on weekends (mentioned 5x)
3. Need for more gluten-free options (mentioned 3x)

💡 Top Opportunities:
• Add express checkout for <10 items
• Extend Saturday opening hours
• Better signage for specialty products

[Explore All Feedback] [Generate Report] [Track Progress]
```

#### How Feedback is Organized Upon Release:

When businesses access their /feedback route after the admin release, they see:

**1. This Week's Fresh Feedback Tab (DEFAULT VIEW)**
- Only shows feedback from the latest admin release
- Sorted by quality score (highest first)
- Unread indicators for new insights
- Quick action buttons: "Mark as Addressed", "Flag for Team", "Add to Improvements List"

**2. Automated Categorization**
Each piece of feedback is automatically tagged and sorted:
```
Feedback #4837 - Released This Week ⭐ NEW
Quality: 85/100 (10% tier)
Categories: #Checkout #StaffPraise #ProductRequest

"Anna in bakery was extremely helpful... [truncated]"

Key Insights:
• Praised: Staff knowledge, product freshness
• Issue: 15-minute checkout wait
• Request: Gluten-free bakery items

[View Full] [Mark Addressed] [Share with Team]
```

**3. Intelligent Grouping**
The AI automatically groups similar feedback:
```
CHECKOUT DELAYS - 8 mentions this week ⚠️
Customer 1: "Too slow during lunch..."
Customer 2: "Only two registers open..."
Customer 3: "Waited 20 minutes..."
[View All 8] [Create Action Plan]
```

### 5.1 Search & Filtering System (ENHANCED)

With the weekly admin release model, the search system includes release-based filtering:

#### Release-Based Filtering:
- **"This Week's Release"**: Only the latest admin-released feedback
- **"Last 4 Releases"**: Past month of releases
- **"All 2024 Releases"**: Year-to-date view
- **"Pending Release"**: Preview for next release (if available)

#### Quick Filters for New Releases:
- 🆕 **Unread Only**: Haven't viewed yet
- ⭐ **High Quality Only**: 10-15% tier feedback
- 🚨 **Issues Only**: Negative sentiment requiring attention
- 💡 **Opportunities Only**: Suggestions and requests
- ✅ **Addressed**: Feedback already acted upon

The feedback analytics system provides sophisticated search capabilities to help businesses extract maximum value from customer insights, with special emphasis on the fresh weekly releases from admin.

#### Core Search Categories:

**5.1.1 Sentiment-Based Search**
- **General Opinion**: Overall positive/negative sentiment analysis
- **Specific Praise**: Highlighted positive aspects and compliments
- **Constructive Criticism**: Improvement suggestions and mild complaints
- **Serious Concerns**: Significant issues requiring immediate attention
- **Neutral Observations**: Factual feedback without strong sentiment
- **NEW**: Reward-tier correlation (sentiment vs. reward percentage)

**5.1.2 Problem Classification**
- **Large Problems**: Issues requiring significant resources/changes
  - Store layout problems
  - Major service failures
  - System/process breakdowns
- **Medium Problems**: Moderate effort required
  - Staff training needs
  - Product availability issues
  - Customer service improvements
- **Easy Fixes**: Quick wins and simple solutions
  - Signage improvements
  - Minor cleanliness issues
  - Simple process adjustments
- **NEW**: Cost-benefit analysis (problem fix cost vs. feedback volume)

**5.1.3 Operational Categories**
- **Product Quality**: Specific product feedback and quality issues
- **Staff Performance**: Individual and team performance insights
- **Store Environment**: Cleanliness, organization, atmosphere
- **Customer Service**: Interaction quality, helpfulness, friendliness
- **Checkout Experience**: Wait times, process efficiency, technology issues
- **Pricing Concerns**: Value perception, competitive pricing feedback
- **NEW**: Transaction Experience**: Payment methods, receipt clarity

**5.1.4 Temporal Analysis**
- **Time-Based Trends**: Peak hours feedback patterns
- **Seasonal Variations**: Holiday, weather, or event-related changes
- **Day-of-Week Analysis**: Monday vs. weekend feedback differences
- **Progress Tracking**: Week-over-week, month-over-month improvements
- **NEW**: Reward distribution patterns over time

### 5.2 Multi-Store Analytics (For Multi-Location Businesses)

#### Store Comparison Features:
- **Performance Benchmarking**: Compare quality scores across locations
- **Problem Distribution**: Which issues are location-specific vs. chain-wide
- **Best Practice Identification**: Learn from top-performing locations
- **Resource Allocation**: Prioritize improvement efforts based on data
- **NEW**: Reward cost comparison across locations

#### Location-Specific Filtering:
- **Individual Store View**: Drill down to specific location analysis
- **Regional Grouping**: Analyze stores by geographic region
- **Store Type Comparison**: Compare similar store formats or sizes
- **Manager Performance**: Track improvements under different management
- **NEW**: Fraud rate comparison by location

### 5.3 Quality Score Analytics (ENHANCED)

#### Customer Feedback Quality Metrics:
- **Average Quality Score**: Overall feedback quality for the business
- **Quality Distribution**: 
  - 3% tier: Basic feedback count
  - 5-8% tier: Good feedback count
  - 10-12% tier: Excellent feedback count
  - 15% tier: Exceptional feedback count
- **Quality Trends**: Improvement or decline in feedback quality over time
- **Reward Impact**: Total rewards paid by quality tier
- **NEW**: ROI Analysis**: Feedback value vs. reward costs

#### Quality Improvement Tools:
- **Score Breakdown Analysis**: 
  - Depth score (detail level)
  - Legitimacy score (authenticity indicators)
  - Constructiveness score (actionability)
  - Specificity score (concrete examples)
- **Customer Education Impact**: How AI coaching improves repeat feedback
- **Seasonal Quality Patterns**: When customers provide best feedback
- **NEW**: Cost optimization**: Balancing quality incentives with budget

---

## 6. Progress Tracking & Historical Analysis

### 6.1 Improvement Tracking System

#### Comparative Analysis Features:
- **Week-Over-Week Comparison**: Recent performance trends
- **Month-Over-Month Growth**: Longer-term improvement patterns
- **Quarter-Over-Quarter**: Seasonal and strategic initiative impact
- **Year-Over-Year**: Annual performance and growth tracking
- **NEW**: Reward cost trends over time

#### Improvement Metrics:
- **Issue Resolution Tracking**: How quickly identified problems are addressed
- **Customer Satisfaction Trends**: Overall satisfaction score improvements
- **Repeat Issue Analysis**: Problems that persist despite attention
- **Success Story Identification**: Major improvements and wins
- **NEW**: Feedback-to-action conversion rate

### 6.2 Business Intelligence Dashboard (ENHANCED)

#### Key Performance Indicators (KPIs):
- **Feedback Volume**: Number of feedbacks per week/month
- **Quality Score Average**: Mean quality of feedback received
- **Issue Resolution Rate**: Percentage of problems addressed
- **Customer Engagement**: Repeat feedback participation rates
- **Revenue Impact**: Correlation between feedback and business performance
- **NEW**: Total Reward Costs**: Weekly/monthly cashback expenses
- **NEW**: Cost Per Insight**: Average cost for actionable feedback
- **NEW**: Fraud Detection Rate**: Percentage caught in verification

#### Predictive Analytics:
- **Seasonal Forecasting**: Anticipate busy periods and common issues
- **Problem Prediction**: Early warning system for developing issues
- **Improvement ROI**: Expected return on investment for addressing specific problems
- **Customer Retention Impact**: How feedback improvements affect loyalty
- **NEW**: Budget Forecasting**: Expected monthly feedback costs

---

## 7. Settings & Configuration Management (ENHANCED)

### 7.1 Profile Settings

#### Business Information Updates:
- **Company Details**: Name, address, contact information changes
- **Store Information**: Location additions, modifications, closures
- **Business Type**: Category changes as business evolves
- **Contact Preferences**: Notification settings, communication channels
- **NEW**: Billing Information**: Invoice recipient, payment terms

### 7.2 Operational Settings

#### Verification Settings:
- **Tolerance Levels**: 
  - Time matching: ±2 minutes default (adjustable)
  - Amount matching: ±0.5 SEK default (adjustable)
- **Review Deadlines**: Custom verification windows within weekly cycle
- **Fraud Thresholds**: Risk tolerance configuration (0-100 scale)
- **Approval Preferences**: Auto-approve threshold settings
- **NEW**: Reward Limits**: Maximum daily/weekly reward payouts

#### Context Settings:
- **Information Updates**: Regular context information refreshes
- **Question Management**: Add, modify, or remove custom questions
- **Staff Updates**: Add/remove staff names and roles
- **Seasonal Adjustments**: Temporary context modifications
- **NEW**: Question Frequency**: Set custom question intervals (e.g., every 20th customer)

### 7.3 Notification & Alert Management

#### Communication Preferences:
- **Verification Reminders**: Weekly deadline notifications
- **Quality Alerts**: Unusual feedback pattern notifications
- **System Updates**: Platform improvement and feature announcements
- **Performance Reports**: Automated weekly/monthly summaries
- **NEW**: Budget Alerts**: Approaching monthly reward limits
- **NEW**: Fraud Alerts**: Suspicious activity requiring attention

---

## 8. Admin Integration Requirements (ENHANCED)

### 8.1 Admin-Business Interface Points

Several features require future admin system integration:

#### Data Upload from Admin:
- **Weekly Feedback Batches**: Admin uploads processed feedback with quality scores
- **Payment Confirmations**: Admin uploads Swish payment completion confirmations
- **Quality Score Adjustments**: Admin can override or adjust AI quality evaluations
- **Fraud Investigation Results**: Admin uploads fraud investigation outcomes
- **NEW**: Invoice Generation**: Weekly business invoices with full breakdown

#### Data Export to Admin:
- **Verification Results**: Business uploads weekly verification approvals/rejections
- **Billing Information**: Monthly billing data for invoice generation
- **Business Performance Data**: Aggregated data for admin analytics
- **Support Requests**: Business support needs and technical issues
- **NEW**: Approved Payment List**: Verified customer payments for Swish processing

### 8.2 Future Admin System Preparation

#### Database Design Considerations:
- **Admin User Roles**: Separate admin authentication and permission system
- **Cross-System Data Flow**: APIs for data exchange between business and admin systems
- **Audit Trails**: Complete logging of admin actions affecting business accounts
- **Escalation Workflows**: Business issues that require admin intervention
- **NEW**: Payment Reconciliation**: Tracking invoice payments and Swish disbursements

---

## 9. Technical Implementation Considerations

### 9.0 Production-First Development Requirements (CRITICAL)

#### No Demo Environment Policy:
**The entire platform must be built directly in production.** This means:

- **Database**: Production database from day one - no test/dev databases
- **APIs**: All endpoints hitting real production services immediately
- **Authentication**: Real login system with actual security from the start
- **Payment Integration**: Connected to real Swish API (use minimal amounts for testing)
- **AI Integration**: Real GPT-4o-mini API calls with production keys
- **Email/SMS**: Actual notifications sent (to developer phones/emails during testing)

#### Clean Account Testing:
When developers need to test features:
1. Create a REAL business account (e.g., "Test Store Stockholm")
2. Account starts completely empty - no pre-filled data
3. Go through actual onboarding process
4. Generate real feedback through actual voice calls
5. Process real micro-payments (1-5 SEK) to verify flows
6. Keep or delete test accounts after development

#### Development Best Practices:
- **Feature Flags**: Use feature flags to hide incomplete features from real users
- **Careful Testing**: Test with small amounts and own phone numbers
- **Immediate Security**: Implement authentication and encryption from the start
- **Real Validations**: All input validation and security measures active immediately
- **Audit Logging**: Track all actions from day one for compliance

### 9.1 Technical Stack & Infrastructure

#### Project Structure:
**Three separate projects have been created, one for each service:**
1. **Supabase Project**: Database, Auth, Storage, and Realtime
2. **Vercel Project**: Frontend hosting for all domains
3. **Railway Project**: Background services and heavy processing

#### Frontend Technologies:
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript for type safety across the platform
- **Styling**: Tailwind CSS for rapid UI development
- **UI Components**: Shadcn/ui for business dashboard components
- **Forms**: React Hook Form for complex form handling (verification uploads, context)
- **Data Fetching**: React Query/SWR for efficient data management
- **Charts**: Recharts/Tremor for analytics visualizations
- **Validation**: Zod for schema validation

#### Backend Infrastructure:

**Supabase (Primary Database & Auth)**:
- **Project**: ervnxnbxsaaeakbvwieh
- **Dashboard URL**: https://supabase.com/dashboard/project/ervnxnbxsaaeakbvwieh
- **PostgreSQL Database**: All business data, feedback, transactions
- **Supabase Auth**: Business account authentication
- **Realtime**: Live updates for feedback releases, verification countdowns
- **Storage**: CSV uploads, QR code PDFs, verified databases
- **Row Level Security**: Isolate business data per account
- **Edge Functions**: Serverless functions for API endpoints

**Vercel (Frontend Hosting)**:
- **Project**: real-vocilia
- **Dashboard URL**: https://vercel.com/lakakas-projects-b9fec40c/real-vocilia
- **Domains**: 
  - vocilia.com (customer entry)
  - business.vocilia.com (business dashboard)
  - admin.vocilia.com (admin panel)
- **Edge Network**: Global CDN for fast loading
- **Environment Variables Required**:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=[get-from-supabase-settings]
  SUPABASE_SERVICE_ROLE_KEY=[get-from-supabase-settings]
  OPENAI_API_KEY=[your-openai-api-key]
  NEXT_PUBLIC_APP_URL=https://vocilia.com
  NEXT_PUBLIC_BUSINESS_URL=https://business.vocilia.com
  NEXT_PUBLIC_ADMIN_URL=https://admin.vocilia.com
  RAILWAY_SERVICE_URL=https://[your-railway-public-domain]
  ```

**Railway (Background Services)**:
- **Project ID**: e8cca9a7-9604-4202-a44b-8266aed13561
- **Service ID**: 80545867-88f8-409a-a75e-4087224e5be1
- **Dashboard URL**: https://railway.com/project/e8cca9a7-9604-4202-a44b-8266aed13561/service/80545867-88f8-409a-a75e-4087224e5be1
- **Services Hosted**:
  - Voice AI processing service (Node.js)
  - Swish payment batch processor
  - Weekly cron jobs for auto-approvals
  - Heavy data processing and analytics
  - Feedback quality scoring engine
- **Environment Variables Required**:
  ```
  NODE_ENV=production
  PORT=3000
  SUPABASE_URL=https://ervnxnbxsaaeakbvwieh.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=[get-from-supabase-settings]
  OPENAI_API_KEY=[your-openai-api-key]
  ```
- **Job Queues**: Bull/BullMQ for batch processing (optional)
- **Scheduled Tasks**: Node-cron for weekly cycles

#### Future Environment Variables (When Implementing):
```
# Swish Payment Integration (add when ready):
SWISH_CERTIFICATE=[base64-encoded-certificate]
SWISH_MERCHANT_ID=[your-merchant-id]
SWISH_CALLBACK_URL=https://vocilia.com/api/swish/callback

# SMS Gateway (if implementing):
SMS_API_KEY=[your-sms-provider-key]
SMS_FROM_NUMBER=[your-sender-number]

# Email Service (if implementing):
EMAIL_API_KEY=[your-email-service-key]
EMAIL_FROM_ADDRESS=noreply@vocilia.com
```

#### AI & Voice Integration:
- **GPT-4o-mini**: Context assistant, feedback analysis
- **OpenAI Whisper**: Voice-to-text transcription
- **Text-to-Speech**: Swedish voice synthesis for AI interviewer
- **WebRTC**: Real-time voice communication infrastructure
- **Processing**: Railway service handles voice processing pipeline

#### Payment & External APIs:
- **Swish Business API**: Swedish payment processing
- **SMS Gateway**: Customer notifications (Twilio/46elks)
- **Email Service**: Transactional emails (SendGrid/Resend)

### 9.2 Database Schema Design (Supabase)

#### Core Tables:
- **businesses**: Account info, subscription status
- **business_contexts**: AI-managed context data
- **stores**: Individual store locations and codes
- **feedbacks**: All customer feedback records
- **quality_scores**: AI scoring results
- **verifications**: Weekly verification batches
- **payments**: Swish payment records
- **invoices**: Business billing records
- **admin_logs**: Audit trail for admin actions

#### Security Policies:
- Row Level Security enabled on all tables
- Business isolation via user_id foreign keys
- Admin-only tables protected by role checks
- Sensitive data encrypted at rest

### 9.3 Frontend Architecture

#### Component Structure:
- **Modular Design**: Reusable components for different business sizes
- **Responsive Layout**: Mobile-first design for business owners on the go
- **Progressive Web App**: Offline capability for essential functions
- **Multi-Language Support**: Swedish primary, English secondary
- **NEW**: Real-time updates during verification windows

#### User Experience Principles:
- **Guided Workflows**: Step-by-step processes for complex tasks
- **Contextual Help**: In-app assistance and explanations
- **Visual Data Presentation**: Charts, graphs, and infographics
- **Accessibility**: WCAG compliance for all business users
- **NEW**: Verification urgency indicators (time remaining)

### 9.4 Development & Deployment Workflow

#### Version Control & CI/CD:
- **Git Flow**: Main branch = production (always live)
- **Vercel Integration**: Auto-deploy on push to main
- **Railway Integration**: Auto-deploy services on push
- **Database Migrations**: Supabase migrations tracked in repo
- **Environment Sync**: All services share production environment

#### Monitoring & Analytics:
- **Vercel Analytics**: Page performance and user metrics
- **Supabase Dashboard**: Database performance monitoring
- **Railway Metrics**: Service health and job processing
- **Error Tracking**: Sentry for production error monitoring
- **Uptime Monitoring**: Critical endpoints and services

#### Security Considerations:
- **API Rate Limiting**: Prevent abuse on all endpoints
- **CORS Configuration**: Strict origin policies
- **Input Sanitization**: XSS and SQL injection prevention
- **File Upload Validation**: CSV format and size limits
- **Authentication Tokens**: JWT with short expiration
- **Audit Logging**: All critical actions logged

#### AI Integration Across Platform:

**1. Context System Integration**
- **Primary Role**: Intelligent context building assistant
- **Conversation API**: Real-time bidirectional communication
- **Memory Management**: Persistent conversation history per business
- **Learning Pipeline**: Feedback analysis → Context suggestions
- **Response Optimization**: Tailored responses for business context
- **Quality Assurance**: AI response validation and fallback systems

**2. Feedback Analysis Integration**
- **Quality Scoring**: GPT-4o-mini evaluates feedback depth and legitimacy
- **Pattern Recognition**: Identifies trends across multiple feedback sessions
- **Insight Generation**: Transforms raw feedback into actionable insights
- **Fraud Detection**: Compares feedback against context for authenticity
- **Summary Creation**: Weekly AI-generated insight reports

**3. Voice AI Coordination**
- **Context Sharing**: Business context informs voice AI conversations
- **Question Integration**: Custom questions seamlessly woven into voice calls
- **Quality Calibration**: GPT-4o-mini sets quality scoring parameters
- **Language Processing**: Swedish language understanding and generation

**4. Administrative AI Functions**
- **Verification Assistance**: AI helps businesses during weekly verification
- **Anomaly Detection**: Identifies unusual patterns requiring attention
- **Report Generation**: Automated insights and recommendations
- **Escalation Identification**: Flags issues needing human intervention

#### AI Performance Requirements:

**Response Times:**
- Context conversations: <2 seconds per response
- Feedback analysis: <5 seconds per feedback item
- Pattern recognition: <10 seconds for weekly batch
- Report generation: <30 seconds for comprehensive reports

**Accuracy Targets:**
- Context relevance: 95% of suggestions accepted or considered useful
- Fraud detection: 90% accuracy with complete context
- Insight quality: 85% of insights rated actionable by businesses
- Language understanding: 98% accuracy for Swedish business terminology

**Scalability Considerations:**
- Concurrent conversations: Support 100+ simultaneous context sessions
- Batch processing: Handle 10,000+ feedback items per hour
- Memory management: Maintain context for 50,000+ businesses
- Learning efficiency: Update patterns daily without service interruption

---

## Feedback Call Analysis System (NEW SECTION)

### AI-Powered Voice Feedback Analysis Pipeline

#### How the AI Analyzes Voice Calls

The feedback analysis system employs a sophisticated multi-stage pipeline powered by GPT-4o-mini:

**Stage 1: Voice to Text Conversion**
- Real-time transcription of Swedish voice conversation
- Timestamps for each statement (helps verify shopping time claims)
- Speaker separation (customer vs. AI interviewer)
- Emotion markers (excitement, frustration, hesitation)

**Stage 2: Context Validation & Legitimacy Check**
- **Staff Name Verification**: Checks if mentioned employees exist in context
- **Department Validation**: Confirms mentioned areas match store layout
- **Product Verification**: Validates discussed products against inventory
- **Timeline Consistency**: Ensures claimed visit time matches store hours
- **Transaction Alignment**: Correlates purchase claims with typical amounts
- **Detail Authenticity**: Verifies specific details only real visitors would know

Example:
```
Customer: "Anna in the bakery recommended the cardamom buns"
AI Check: ✓ Anna exists in staff context (bakery department)
         ✓ Bakery department confirmed
         ✓ Cardamom buns are a bakery item
         → High legitimacy score
```

**Stage 3: Content Analysis**
- **Sentiment Extraction**: Positive, negative, and neutral segments
- **Topic Categorization**: Product, service, environment, staff, etc.
- **Problem Identification**: Issues raised with severity classification
- **Suggestion Mining**: Specific improvements or requests
- **Emotional Intensity**: Strength of feelings about experiences

**Stage 4: Keyword & Pattern Extraction**
- Business-specific terminology usage
- Competitor mentions and comparisons
- Repeated themes or concerns
- Unique insights or observations
- Actionable vs. vague statements

#### Specific Scoring Criteria & Weights

The quality score (determining 3-15% cashback) uses a weighted algorithm:

**1. Legitimacy Score (40% weight)**
- Context match rate (staff, departments, products mentioned)
- Transaction verification accuracy
- Temporal consistency (claimed time vs. actual)
- Geographic plausibility
- Conversation authenticity markers

Scoring:
- Clear, implementable suggestions: Full points
- Problems identified with context: 75% points
- General observations: 50% points
- Pure venting without substance: 25% points

**4. Specificity Score (15% weight)**
- Named products, staff, or locations
- Exact situations described
- Quantifiable claims (wait times, prices)
- Comparative statements with details
- Unique observations

Scoring:
- Highly specific with names/numbers: Full points
- Moderate specificity: 75% points
- Some specific elements: 50% points
- Entirely generic: 25% points

#### Quality Tier Definitions

**15% Tier - Exceptional Feedback**
- Legitimacy: 95-100% context match
- Multiple specific improvement suggestions
- Detailed examples with staff/product names
- Balanced praise and constructive criticism
- Insights the business hadn't considered
- Engagement with custom questions

Example: "Maria in bakery was helpful when I asked about gluten-free options. You don't have any currently, but she said you're considering it. I'd specifically want gluten-free kanelbullar and bread. The regular bread section could use better labeling - I spent 5 minutes looking for whole grain. Maybe organize by type rather than brand? Your produce is always fresh though, especially compared to ICA nearby."

**10-12% Tier - Excellent Feedback**
- Legitimacy: 90-95% context match
- Clear, actionable suggestions
- Good specificity with some names/details
- Addresses multiple aspects
- Answers custom questions thoughtfully

Example: "The checkout was really slow today, about 15 minutes wait. Maybe open more registers during lunch? The new organic section is great, good prices. Staff was friendly even though busy."

**5-8% Tier - Good Feedback**
- Legitimacy: 85-90% context match
- At least one useful observation
- Some specific details
- Basic engagement with questions
- Either positive or constructive

Example: "Store was clean, found everything I needed. Vegetables looked fresh. Checkout was okay, not too long wait."

**3-4% Tier - Basic Feedback**
- Legitimacy: 80-85% context match
- Minimal but legitimate response
- Generic observations
- Limited engagement
- No specific suggestions

Example: "Everything was fine. No problems."

**0% Tier - Rejected Feedback**
- Legitimacy below 80% OR
- Clear fraud indicators OR
- Abusive/inappropriate content OR
- No actual feedback provided

#### How AI Explains Scoring to Customers

**Immediate On-Screen Display:**

After the voice call ends, customers immediately see their reward on their device screen:

**High Score Display (10-15%):**
```
🌟 UTMÄRKT FEEDBACK! 🌟

Du får: 60 SEK
(12% av ditt köp på 500 SEK)

Din feedback var:
✓ Detaljerad och specifik
✓ Konstruktiv med förslag
✓ Verifierad som äkta

Betalning via Swish: inom 7 dagar
Till nummer: 070-XXX-XX-43

[Fortsätt]
```

**Medium Score Display (5-8%):**
```
👍 BRA FEEDBACK!

Du får: 30 SEK
(6% av ditt köp på 500 SEK)

Din feedback var:
✓ Användbar för butiken
✓ Innehöll några detaljer

För högre belöning nästa gång:
• Nämn personalens namn när de hjälpt dig
• Ge mer specifika förbättringsförslag
• Beskriv situationer mer detaljerat

Betalning via Swish: inom 7 dagar

[Fortsätt]
```

**Low Score Display (3-4%):**
```
TACK FÖR DIN FEEDBACK

Du får: 15 SEK
(3% av ditt köp på 500 SEK)

För högre belöning nästa gång behöver du:
• Ge mer detaljerade beskrivningar
• Nämna specifika produkter eller personal
• Föreslå konkreta förbättringar
• Dela både positiva och negativa upplevelser

Betalning via Swish: inom 7 dagar

[Fortsätt]
```

**Interactive Elements on Screen:**
- **Reward Amount**: Large, clear display of exact SEK amount
- **Percentage Earned**: Shows which tier they reached (3-15%)
- **What Was Missing**: Specific, actionable feedback on improvements needed
- **Payment Timeline**: Clear expectation of when payment arrives

#### Business Dashboard Analysis View

Businesses see comprehensive analysis breakdowns in their dashboard:

**Individual Feedback Analysis:**
```
Customer #4837 - September 10, 14:30
Quality Score: 85/100 (10% tier)
- Legitimacy: 95/100 ✓ (Mentioned Anna, bakery, correct products)
- Depth: 80/100 (2 min conversation, 3 examples)
- Constructiveness: 85/100 (Suggested checkout improvement)
- Specificity: 75/100 (Named 2 staff, 3 products)

Key Insights Extracted:
🔍 Checkout wait time issue during lunch
💡 Customer wants gluten-free bakery items
✅ Positive: Staff friendliness, product freshness
⚠️ Improvement: Signage in bread section

Context Matches: Anna ✓, Bakery ✓, Lunch rush ✓
Fraud Indicators: None
Reward: 50 SEK (10% of 500 SEK purchase)
```

**Aggregate Analysis View:**
```
This Week's Feedback Analysis (47 conversations)
Average Quality Score: 72/100
- High Quality (10-15%): 8 feedbacks
- Good Quality (5-8%): 23 feedbacks  
- Basic Quality (3-4%): 14 feedbacks
- Rejected: 2 feedbacks

Top Mentioned:
- Staff: Anna (12x positive), Erik (3x negative)
- Issues: Checkout wait (18x), Parking (7x)
- Requests: Gluten-free (5x), Self-checkout (4x)
- Praise: Fresh produce (21x), Helpful staff (15x)
```

#### The Feedback Loop - Continuous Improvement

**Weekly Learning Cycle:**

1. **Pattern Recognition Week 1-4:**
   - AI identifies commonly mentioned items not in context
   - Flags potential new staff members
   - Notices seasonal patterns

2. **Context Suggestion Week 5:**
   ```
   AI: "Based on last month's feedback:
   - Add 'Oliver' to staff (mentioned 8x positively)
   - Add 'express checkout' to services (mentioned 12x)
   - Add 'construction outside' to temporary context (affecting parking)
   Should I update these?"
   ```

3. **Scoring Calibration Week 8:**
   - AI adjusts scoring based on business feedback
   - Learns business-specific quality indicators
   - Refines fraud detection patterns

4. **Custom Question Optimization Week 12:**
   ```
   AI: "Your question about fruit freshness generated valuable insights. 
   Based on responses, I suggest rewording to: 'How would you rate 
   our fruit and vegetables compared to other stores?' This encourages 
   comparative feedback. Shall I update?"
   ```

**Long-term Evolution:**
- Month 1: Learning business specifics, baseline establishment
- Month 3: Refined scoring, reduced false positives
- Month 6: Predictive insights, trend forecasting
- Year 1: Full optimization, industry-leading accuracy

**Continuous Validation Improvements:**
- Each verified fraud case teaches the AI new patterns
- Each approved legitimate feedback reinforces positive indicators
- Weekly business input refines context understanding
- Monthly reviews adjust scoring weights based on value delivered

This comprehensive analysis system ensures that businesses receive maximum value from every customer conversation while customers are fairly rewarded for the quality and legitimacy of their feedback.

---

## 10. Success Metrics & KPIs (ENHANCED)

### 10.1 Business Success Metrics

#### Platform Adoption:
- **Setup Completion Rate**: Percentage of new businesses completing onboarding
- **Context Quality**: Completeness and accuracy of business context information
- **Verification Participation**: Weekly verification completion rates
- **Feature Utilization**: Usage of advanced search and analytics features
- **NEW**: Customer participation rate (QR scans to completed feedback)

#### Business Value Creation:
- **Problem Resolution**: How quickly businesses address identified issues
- **Customer Satisfaction**: Improvement in customer feedback quality and sentiment
- **Business Growth**: Correlation between platform use and business performance
- **User Retention**: Long-term platform engagement and subscription renewal
- **NEW**: ROI on feedback investment (improvements vs. reward costs)

### 10.2 Technical Performance Metrics

#### System Performance:
- **Response Times**: API response speed and user interface performance
- **Uptime**: System availability and reliability
- **Error Rates**: System errors and their resolution times
- **Scalability**: Performance under increasing user loads
- **NEW**: Payment processing success rate

### 10.3 Financial Metrics (NEW)

#### Revenue & Cost Tracking:
- **Average Reward Percentage**: Mean cashback percentage across all feedback
- **Platform Fee Revenue**: 20% commission on all rewards
- **Fraud Prevention Savings**: Value of fraudulent feedback prevented
- **Customer Lifetime Value**: Repeat feedback participants
- **Business Customer Acquisition Cost**: Cost to onboard new businesses

---

## 11. Admin Dashboard System (NEW SECTION)

### 11.1 Admin Account Structure

**PRODUCTION NOTICE**: Admin accounts are REAL production accounts with actual administrative privileges. No demo admin exists.

Admin accounts are created manually (not through the standard registration flow) and have access to a specialized dashboard at admin.vocilia.com for managing all business accounts and feedback operations. These accounts have full production access from creation - handle with extreme care during development.

### 11.2 Admin Dashboard Overview

The admin dashboard provides a simple, efficient interface for managing the weekly feedback cycle:

#### Main Dashboard View:
```
VOCILIA ADMIN DASHBOARD
Week 37 - 2024

Total Active Businesses: 47
Total Feedback This Week: 1,247
Total Rewards to Process: 45,670 SEK

[Business List] [This Week's Batch] [Payment Queue] [Reports]
```

### 11.3 Business Account List

The primary view shows all registered businesses with essential weekly operations:

```
BUSINESS ACCOUNTS

🏪 ICA Södermalm
   Feedback this week: 34 | For payment: 28 | Status: Awaiting Verification
   [View All Feedback] [View Payment Batch] [Send for Verification]

🏪 Café Nordic
   Feedback this week: 12 | For payment: 12 | Status: Verified ✓
   [View All Feedback] [View Payment Batch] [Generate Invoice]

🏪 Stockholm Electronics
   Feedback this week: 8 | For payment: 6 | Status: In Verification
   [View All Feedback] [View Payment Batch] [Check Status]

[Load More...]
```

### 11.4 Dual Database System

For each business, the admin maintains two separate databases:

#### 1. Complete Feedback Database
Contains ALL feedback received for that business:
```
ICA Södermalm - All Feedback (Week 37)

ID    | Time      | Phone    | Amount | Quality | Status
------|-----------|----------|--------|---------|----------
#4837 | Mon 14:30 | 070***43 | 500    | 85/100  | Approved
#4838 | Mon 15:15 | 073***21 | 230    | 45/100  | Pending
#4839 | Tue 09:20 | 076***89 | 780    | 92/100  | Approved
#4840 | Tue 11:00 | 070***12 | 150    | 0/100   | Rejected-Fraud

[Export CSV] [View Details] [Analytics]
```

#### 2. Payment Batch Database
Contains ONLY verified feedback for current week's payment:
```
ICA Södermalm - Payment Batch (Week 37)

ID    | Time      | Phone    | Amount | Reward | To Pay
------|-----------|----------|--------|--------|--------
#4837 | Mon 14:30 | 070***43 | 500    | 10%    | 50 SEK
#4839 | Tue 09:20 | 076***89 | 780    | 12%    | 94 SEK
#4841 | Wed 10:15 | 072***55 | 340    | 6%     | 20 SEK

Total to Invoice: 164 SEK + 33 SEK (20% fee) = 197 SEK

[Send to Business for Verification] [Mark as Verified] [Process Payments]
```

### 11.5 Weekly Admin Workflow

#### Step 1: Review & Prepare
- Admin reviews all feedback from the week
- AI quality scores are verified/adjusted if needed
- Fraudulent feedback is flagged and removed

#### Step 2: Create Payment Batch
- Filter approved feedback only
- Generate payment batch database for each business
- Calculate total rewards and platform fees

#### Step 3: Send for Business Verification
```
[Send Verification Batch to Business]

Sending to: ICA Södermalm
Contents: 28 feedback items
Total value: 1,450 SEK
Deadline: 7 days from receipt

This will:
- Place database in business's verification portal
- Start 7-day countdown timer
- Send notification to business
- Track download and upload status

[Confirm Send] [Edit Batch] [Cancel]
```

#### Step 4: Monitor Verification Returns
Admin dashboard shows verification status for all businesses:

```
VERIFICATION TRACKING - WEEK 37

Business         | Sent    | Downloaded | Days Left | Status
-----------------|---------|------------|-----------|------------------
ICA Södermalm    | Oct 16  | Oct 16 ✓   | 5 days    | In Progress
Café Nordic      | Oct 16  | Oct 17 ✓   | 5 days    | In Progress  
Stockholm Elec.  | Oct 16  | Oct 18 ✓   | 3 days    | Uploaded ✓
Fashion Boutique | Oct 16  | Not yet    | 2 days    | ⚠️ Reminder Sent

[Send Bulk Reminder] [View Uploaded Files] [Export Status]
```

#### Step 5: Process Returned Verifications
As businesses upload their verified databases:

```
NEW VERIFICATION RECEIVED

From: ICA Södermalm
Uploaded: Oct 21, 14:32
Status: 27 approved, 1 rejected

[Review Verification] [Accept] [Request Clarification]
```

#### Step 6: Handle Non-Responses
For businesses that don't upload within 7 days:

```
AUTO-APPROVAL REQUIRED

3 businesses missed deadline:
- Fashion Boutique (0 days overdue)
- Small Café (1 day overdue)  
- Corner Store (0 days overdue)

[Auto-Approve All] [Contact Businesses] [Extend Deadline]
```

#### Step 7: Release Feedback
Once all verifications are received or auto-approved:
```
[Release Weekly Feedback]

Ready to release:
✓ 44 businesses verified and uploaded
⚠️ 3 businesses auto-approved (no upload)

This will:
- Populate feedback in business dashboards
- Send notifications to all businesses
- Move feedback to historical records
- Trigger invoice generation

[Confirm Release] [Review Again]
```

#### Step 8: Process Payments
```
PAYMENT PROCESSING

Total Swish Payments: 1,247
Total Amount: 45,670 SEK
Batch File: week37_payments.csv

[Generate Swish Batch] [Download CSV] [Mark as Paid]
```

### 11.6 Payment Processing & Consolidation (ENHANCED)

#### Processing Verified Databases:

When admin receives verified databases from businesses, the system automatically calculates:

```
VERIFIED DATABASE RECEIVED - ICA Södermalm

Individual Payments:
Phone Number | Feedback Count | Individual Amounts      | Total to Pay
-------------|---------------|------------------------|-------------
070-XXX-XX-43| 3 feedbacks   | 50 + 30 + 45 SEK      | 125 SEK
073-XXX-XX-21| 1 feedback    | 65 SEK                | 65 SEK
076-XXX-XX-89| 2 feedbacks   | 94 + 38 SEK           | 132 SEK

Customer Rewards Subtotal: 322 SEK
Platform Fee (20%): 64 SEK
Total Invoice to Business: 386 SEK

[Generate Invoice] [Process Consolidated Payments]
```

#### Phone Number Consolidation:

The system automatically consolidates multiple feedbacks per phone number:

```
WEEKLY PAYMENT CONSOLIDATION

Original Feedback Entries: 1,247
Unique Phone Numbers: 892

Consolidation Summary:
- Single feedback customers: 645
- Multiple feedback customers: 247
  * 2 feedbacks: 178 customers
  * 3 feedbacks: 52 customers
  * 4+ feedbacks: 17 customers

Swish Transactions Saved: 355
Cost Savings: 355 × 0.50 SEK = 177.50 SEK

[View Consolidated List] [Generate Swish Batch]
```

#### Consolidated Swish Payment Batch:

Admin generates a single weekly Swish batch with consolidated amounts:

```
SWISH PAYMENT BATCH - Week 37

Phone Number  | Total Amount | Feedback Sources
--------------|--------------|------------------
070-XXX-XX-43 | 125 SEK     | ICA (3x)
073-XXX-XX-21 | 195 SEK     | ICA (1x), Café Nordic (2x)
076-XXX-XX-89 | 267 SEK     | Multiple stores (4x)

Total Unique Payments: 892
Total Amount: 45,670 SEK
Processing Fee Saved: 177.50 SEK

[Export for Swish] [Send Batch] [Mark as Processed]
```

#### Platform Fee Calculation:

For each business, the admin dashboard shows:

```
WEEKLY SETTLEMENT - Week 37

Business: ICA Södermalm
─────────────────────────
Customer Rewards: 1,450 SEK
Platform Fee (20%): 290 SEK
Total Invoice: 1,740 SEK

Business: Café Nordic
─────────────────────────
Customer Rewards: 890 SEK
Platform Fee (20%): 178 SEK
Total Invoice: 1,068 SEK

TOTAL ALL BUSINESSES:
Customer Rewards: 45,670 SEK
Platform Fees: 9,134 SEK
Total to Collect: 54,804 SEK

[Generate All Invoices] [Export Financial Report]
```

#### Customer Payment Notification:

When customers receive their consolidated payment:

```
SMS to Customer:
"Vocilia: Du har fått 125 kr för dina 3 feedback denna vecka! 
Betalning via Swish till 070-XXX-XX-43. Tack för din hjälp att 
förbättra butikerna! Ref: W37-2024"
```

### 11.7 Financial Tracking Dashboard

Admin has a clear financial overview:

```
WEEKLY FINANCIAL SUMMARY

Revenue:
- Platform Fees (20%): 9,134 SEK
- Subscription Fees: 0 SEK (future feature)
- Total Revenue: 9,134 SEK

Costs:
- Customer Rewards: 45,670 SEK
- Swish Fees (892 × 0.50): 446 SEK
- Total Costs: 46,116 SEK

To Collect from Businesses: 54,804 SEK
Net Platform Earnings: 8,688 SEK

Efficiency Metrics:
- Feedbacks per Swish: 1.40 (improved from 1.0)
- Processing cost per feedback: 0.36 SEK
- Average platform fee per business: 194 SEK

[Download Report] [View Trends] [Export for Accounting]
```

### 11.8 Automated Invoice Generation

After processing verified databases, the system generates invoices:

```
INVOICE #2024-W37-001

To: ICA Södermalm
Date: October 24, 2024
Period: Week 37, 2024

Details:
Customer Feedback Rewards: 1,450.00 SEK
- 28 verified feedbacks
- Average quality score: 7.8/10
- Paid to 24 unique customers

Platform Service Fee (20%): 290.00 SEK

TOTAL DUE: 1,740.00 SEK

Payment Terms: Due within 10 days
Payment Method: Bank Transfer/Swish Business

[Send Invoice] [Download PDF] [Mark as Sent]
```

### 11.6 Admin Tools & Functions

#### Basic Operations:
- **Export Functions**: Download any database as CSV/Excel
- **Bulk Actions**: Approve/reject multiple feedback items
- **Search**: Find specific businesses or feedback
- **Manual Override**: Adjust quality scores when needed
- **Communication**: Send notifications to businesses
- **Reports**: Weekly summaries and financial reports

#### Fraud Management:
- Flag suspicious patterns
- Block fraudulent phone numbers
- Review unusual transaction claims
- Generate fraud reports for businesses

### 11.7 Admin Account Security

- Manual account creation only (no self-registration)
- Two-factor authentication required
- IP whitelist for access
- Full audit log of all admin actions
- Separate login portal from business accounts

---

## Conclusion

This comprehensive business accounts vision transforms vocilia.com/business/dashboard into a sophisticated, AI-powered business intelligence platform with an innovative cashback reward system. The system balances automation with human oversight, provides deep insights while remaining accessible, and scales from single-location businesses to multi-store enterprises.

The success of this vision depends on:
1. **Customer Trust**: Transparent, reliable Swish payments for quality feedback
2. **Business Value**: ROI through actionable insights exceeding reward costs
3. **Platform Integrity**: Robust fraud prevention maintaining system credibility
4. **Seamless Integration**: Efficient weekly cycles minimizing business workload
5. **Quality Incentivization**: Fair rewards driving valuable feedback

The platform creates a win-win-win ecosystem where customers earn rewards for helpful feedback, businesses gain invaluable insights for improvement, and Vocilia facilitates this value exchange while building a sustainable business model through its 20% platform fee. 90-100% match: Full points
- 70-89% match: Partial points
- Below 70%: Significant deduction
- Clear fraud indicators: Automatic disqualification

**2. Depth Score (25% weight)**
- Word count and speaking duration
- Number of specific examples provided
- Detail level in descriptions
- Multiple aspects covered (not just one topic)
- Follow-up question engagement

Scoring:
- Detailed narratives with examples: Full points
- Good explanations, some specifics: 75% points
- Basic responses, limited detail: 50% points
- Single-word or very brief answers: 25% points

**3. Constructiveness Score (20% weight)**
- Actionable suggestions provided
- Specific problems identified
- Solutions or alternatives proposed
- Balanced perspective (not just complaints)
- Future-oriented thinking

Scoring:
-