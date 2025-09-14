import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  businessName: string
  email: string
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  businessName,
  email,
}) => {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_BUSINESS_URL || 'https://business.vocilia.com'}/dashboard`

  return (
    <Html>
      <Head />
      <Preview>Welcome to Vocilia - Start collecting valuable customer feedback today</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Vocilia</Heading>
            <Text style={tagline}>AI-Powered Customer Feedback Platform</Text>
          </Section>

          <Hr style={hr} />

          {/* Welcome Message */}
          <Section style={content}>
            <Heading as="h2" style={h2}>
              Welcome to Vocilia, {businessName}! 🎉
            </Heading>

            <Text style={paragraph}>
              Thank you for joining Vocilia! You&apos;re now part of a growing community of businesses
              that value genuine customer feedback and reward their customers for quality insights.
            </Text>

            <Text style={paragraph}>
              Your account has been successfully created with the email: <strong>{email}</strong>
            </Text>
          </Section>

          {/* What's Next */}
          <Section style={content}>
            <Heading as="h3" style={h3}>What happens next?</Heading>

            <div style={list}>
              <Text style={listItem}>
                <strong>1. Verify your email</strong> - Check your inbox for our verification email
              </Text>
              <Text style={listItem}>
                <strong>2. Complete onboarding</strong> - Takes just 10 minutes to set up everything
              </Text>
              <Text style={listItem}>
                <strong>3. Build your context</strong> - Help our AI understand your business better
              </Text>
              <Text style={listItem}>
                <strong>4. Generate QR codes</strong> - Start collecting feedback immediately
              </Text>
              <Text style={listItem}>
                <strong>5. Get insights</strong> - Receive valuable feedback every week
              </Text>
            </div>
          </Section>

          {/* Key Benefits */}
          <Section style={benefitsSection}>
            <Heading as="h3" style={h3}>Why businesses love Vocilia</Heading>

            <div style={benefitGrid}>
              <div style={benefitItem}>
                <Text style={benefitTitle}>💬 Quality Feedback</Text>
                <Text style={benefitText}>
                  AI-scored conversations ensure you get actionable insights, not just ratings
                </Text>
              </div>

              <div style={benefitItem}>
                <Text style={benefitTitle}>💰 Customer Rewards</Text>
                <Text style={benefitText}>
                  3-15% cashback motivates customers to provide detailed, honest feedback
                </Text>
              </div>

              <div style={benefitItem}>
                <Text style={benefitTitle}>🛡️ Fraud Protection</Text>
                <Text style={benefitText}>
                  AI-powered verification ensures authentic feedback from real customers
                </Text>
              </div>

              <div style={benefitItem}>
                <Text style={benefitTitle}>📊 Weekly Insights</Text>
                <Text style={benefitText}>
                  Regular reports help you track trends and make data-driven decisions
                </Text>
              </div>
            </div>
          </Section>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Go to Your Dashboard
            </Button>
          </Section>

          {/* Support Section */}
          <Section style={content}>
            <Text style={paragraph}>
              Need help getting started? Our team is here to support you:
            </Text>
            <ul style={supportList}>
              <li>Reply to this email for direct support</li>
              <li>Visit our <Link href="https://vocilia.com/help" style={link}>Help Center</Link></li>
              <li>Schedule a <Link href="https://vocilia.com/demo" style={link}>demo call</Link></li>
            </ul>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this email because you signed up for Vocilia at {email}.
            </Text>
            <Text style={footerText}>
              © 2024 Vocilia. All rights reserved.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://vocilia.com/privacy" style={footerLink}>Privacy Policy</Link>
              {' • '}
              <Link href="https://vocilia.com/terms" style={footerLink}>Terms of Service</Link>
              {' • '}
              <Link href="https://vocilia.com/contact" style={footerLink}>Contact Us</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '40px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
}

const header = {
  padding: '40px 48px 20px',
  textAlign: 'center' as const,
}

const h1 = {
  color: '#3b82f6',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
}

const tagline = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '8px 0 0 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 48px',
}

const content = {
  padding: '0 48px',
}

const h2 = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '32px 0 16px',
}

const h3 = {
  color: '#374151',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '24px 0 12px',
}

const paragraph = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const list = {
  margin: '16px 0',
}

const listItem = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
  paddingLeft: '20px',
}

const benefitsSection = {
  padding: '20px 48px',
  backgroundColor: '#f9fafb',
  margin: '32px 0',
}

const benefitGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '20px',
  marginTop: '20px',
}

const benefitItem = {
  padding: '16px',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
}

const benefitTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#111827',
  margin: '0 0 8px 0',
}

const benefitText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '18px',
}

const buttonContainer = {
  padding: '32px 48px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
}

const supportList = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '16px 0',
  paddingLeft: '20px',
}

const link = {
  color: '#3b82f6',
  textDecoration: 'underline',
}

const footer = {
  padding: '20px 48px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '4px 0',
}

const footerLinks = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '12px 0 0 0',
}

const footerLink = {
  color: '#6b7280',
  textDecoration: 'underline',
}

export default WelcomeEmail