import { Resend } from 'resend'
import { renderAsync } from '@react-email/render'
import React from 'react'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailOptions {
  to: string | string[]
  subject: string
  react?: React.ReactElement
  html?: string
  text?: string
  from?: string
  replyTo?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
}

export class EmailService {
  private static fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@vocilia.com'

  /**
   * Send an email using Resend
   */
  static async send(options: EmailOptions) {
    try {
      // Render React email component if provided
      let html = options.html
      if (options.react && !html) {
        html = await renderAsync(options.react)
      }

      const { data, error } = await resend.emails.send({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: html || '',
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
      })

      if (error) {
        console.error('Failed to send email:', error)
        throw new Error(`Email send failed: ${error.message}`)
      }

      return { success: true, data }
    } catch (error) {
      console.error('Email service error:', error)
      throw error
    }
  }

  /**
   * Send welcome email to new business
   */
  static async sendWelcomeEmail(businessName: string, email: string) {
    try {
      const { WelcomeEmail } = await import('./templates/welcome')

      return await this.send({
        to: email,
        subject: `Welcome to Vocilia, ${businessName}!`,
        react: React.createElement(WelcomeEmail, { businessName, email }),
      })
    } catch (error) {
      console.error('Failed to send welcome email:', error)
      // Don't throw - we don't want signup to fail if email fails
      return { success: false, error }
    }
  }

  /**
   * Send email verification reminder
   */
  static async sendVerificationReminder(email: string, verificationUrl: string) {
    try {
      return await this.send({
        to: email,
        subject: 'Please verify your Vocilia account',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Verify your email address</h2>
            <p>You're almost ready to start using Vocilia! Please verify your email address by clicking the link below:</p>
            <p style="margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't create an account with Vocilia, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours.
            </p>
          </div>
        `,
        text: `Verify your email address\n\nPlease verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.`,
      })
    } catch (error) {
      console.error('Failed to send verification reminder:', error)
      return { success: false, error }
    }
  }

  /**
   * Send onboarding started notification
   */
  static async sendOnboardingStarted(businessName: string, email: string) {
    try {
      return await this.send({
        to: email,
        subject: 'Great start with Vocilia!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're on your way, ${businessName}!</h2>
            <p>Thanks for starting your onboarding journey with Vocilia. Here's what's coming next:</p>
            <ul style="line-height: 1.8;">
              <li>Learn how customer feedback drives business growth</li>
              <li>Set up your business profile and goals</li>
              <li>Configure your AI-powered context system</li>
              <li>Generate your first QR codes</li>
              <li>Start receiving valuable customer insights</li>
            </ul>
            <p>The whole process takes less than 10 minutes!</p>
            <p style="margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BUSINESS_URL}/dashboard"
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Continue Onboarding
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Need help? Reply to this email and our team will assist you.
            </p>
          </div>
        `,
      })
    } catch (error) {
      console.error('Failed to send onboarding email:', error)
      return { success: false, error }
    }
  }

  /**
   * Send payment batch notification
   */
  static async sendPaymentBatchNotification(
    businessName: string,
    email: string,
    weekNumber: number,
    itemCount: number,
    deadline: Date
  ) {
    try {
      const formattedDeadline = deadline.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      return await this.send({
        to: email,
        subject: `New payment batch ready for verification - Week ${weekNumber}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment Verification Required</h2>
            <p>Hi ${businessName},</p>
            <p>You have a new payment batch ready for verification:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Week:</strong> ${weekNumber}</p>
              <p style="margin: 5px 0;"><strong>Items to verify:</strong> ${itemCount}</p>
              <p style="margin: 5px 0;"><strong>Deadline:</strong> ${formattedDeadline}</p>
            </div>
            <p>Please verify these transactions within 7 days to ensure your customers receive their rewards on time.</p>
            <p style="margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BUSINESS_URL}/verification"
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Transactions
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              If transactions are not verified by the deadline, they will be automatically approved.
            </p>
          </div>
        `,
      })
    } catch (error) {
      console.error('Failed to send payment batch notification:', error)
      return { success: false, error }
    }
  }
}

export default EmailService