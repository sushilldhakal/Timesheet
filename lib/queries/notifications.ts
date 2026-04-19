import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import * as notificationsApi from "@/lib/api/notifications"

export function useNotifications(status?: "all" | "unread" | "read", limit = 50) {
  return useQuery({
    queryKey: ["notifications", status, limit],
    queryFn: () => notificationsApi.getNotifications({ status, limit }),
    select: (data) => data.notifications ?? [],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const data = await notificationsApi.getNotifications({ status: "unread" })
      return (data.notifications ?? []).length
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchOnWindowFocus: false,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notificationsApi.markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: () => {
      toast.error("Failed to mark notification as read")
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: notificationsApi.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast.success("All notifications marked as read")
    },
    onError: () => {
      toast.error("Failed to mark all notifications as read")
    },
  })
}