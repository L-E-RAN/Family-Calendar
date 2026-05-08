export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
  url?: string
}

export interface NotificationResult {
  success: boolean
  error?: string
}

export interface NotificationChannelAdapter {
  send(subscription: unknown, payload: NotificationPayload): Promise<NotificationResult>
}
