/**
 * API endpoint for sending push notifications
 *
 * POST /api/notifications/push
 * Sends push notifications to web browsers using Web Push Protocol
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'
import { z } from 'zod'

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:noreply@vocilia.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// Request validation schema
const pushNotificationSchema = z.object({
  subscriptions: z.array(z.object({
    endpoint: z.string(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string()
    })
  })),
  payload: z.object({
    title: z.string(),
    body: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    tag: z.string().optional(),
    data: z.record(z.any()).optional(),
    actions: z.array(z.object({
      action: z.string(),
      title: z.string(),
      icon: z.string().optional()
    })).optional(),
    requireInteraction: z.boolean().optional(),
    silent: z.boolean().optional()
  })
})

type PushNotificationRequest = z.infer<typeof pushNotificationSchema>

export async function POST(request: NextRequest) {
  try {
    // Verify VAPID configuration
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = pushNotificationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { subscriptions, payload } = validation.data

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/notification-default.png',
      badge: payload.badge || '/icons/badge.png',
      tag: payload.tag,
      data: {
        ...payload.data,
        timestamp: Date.now(),
        url: payload.data?.url || '/verification'
      },
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false
    })

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          notificationPayload,
          {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: getUrgencyFromPayload(payload),
            topic: payload.tag
          }
        )

        results.successful++

      } catch (error) {
        results.failed++

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`${subscription.endpoint}: ${errorMessage}`)

        // If subscription is invalid, mark it as inactive
        if (errorMessage.includes('410') || errorMessage.includes('invalid')) {
          try {
            await supabase
              .from('push_subscriptions')
              .update({ active: false })
              .eq('endpoint', subscription.endpoint)
          } catch (updateError) {
            console.error('Failed to deactivate invalid subscription:', updateError)
          }
        }

        console.error('Push notification failed:', error)
      }
    })

    await Promise.all(sendPromises)

    // Log notification metrics
    await supabase
      .from('push_notification_logs')
      .insert({
        user_id: user.id,
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        subscriptions_sent: subscriptions.length,
        successful_deliveries: results.successful,
        failed_deliveries: results.failed,
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      results: {
        total: subscriptions.length,
        successful: results.successful,
        failed: results.failed
      },
      errors: results.errors.length > 0 ? results.errors : undefined
    })

  } catch (error) {
    console.error('Error in POST /api/notifications/push:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to determine urgency based on payload
function getUrgencyFromPayload(payload: any): 'very-low' | 'low' | 'normal' | 'high' {
  if (payload.requireInteraction) return 'high'
  if (payload.tag?.includes('critical') || payload.tag?.includes('urgent')) return 'high'
  if (payload.tag?.includes('warning')) return 'normal'
  return 'normal'
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}