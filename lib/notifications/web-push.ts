import webpush from 'web-push'
import type { NotificationChannelAdapter, NotificationPayload, NotificationResult } from './types'
import type { PushSubscription } from '@/types'

let initialized = false

function init() {
  if (initialized) return
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'eliran.ashwal@gmail.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  initialized = true
}

export class WebPushChannel implements NotificationChannelAdapter {
  async send(subscription: PushSubscription, payload: NotificationPayload): Promise<NotificationResult> {
    init()
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload)
      )
      return { success: true }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error }
    }
  }
}
