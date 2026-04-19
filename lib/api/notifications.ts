import { apiFetch } from './fetch-client'

export interface Notification {
  _id: string
  title: string
  message: string
  read: boolean
  createdAt: string
  type?: string
  userId: string
}

export interface NotificationsResponse {
  notifications: Notification[]
}

// Get notifications
export async function getNotifications(params?: {
  status?: "all" | "unread" | "read"
  limit?: number
}): Promise<NotificationsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status === "unread") searchParams.set("read", "false")
  if (params?.status === "read") searchParams.set("read", "true")
  if (params?.limit) searchParams.set("limit", params.limit.toString())

  const url = searchParams.toString() ? `/api/notifications?${searchParams}` : '/api/notifications'
  return apiFetch<NotificationsResponse>(url)
}

// Mark notification as read
export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
  })
}

// Mark all notifications as read
export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/api/notifications/read-all', {
    method: 'POST',
  })
}