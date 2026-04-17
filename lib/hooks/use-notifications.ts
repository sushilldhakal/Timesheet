import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function useNotifications(status?: "all" | "unread" | "read", limit = 50) {
  return useQuery({
    queryKey: ["notifications", status, limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status === "unread") params.set("read", "false")
      if (status === "read") params.set("read", "true")

      const res = await fetch(`/api/notifications?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const data = await res.json()
      return data.notifications ?? []
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?read=false")
      if (!res.ok) return 0
      const data = await res.json()
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
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to mark notification as read")
      return res.json()
    },
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
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" })
      if (!res.ok) throw new Error("Failed to mark all notifications as read")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      toast.success("All notifications marked as read")
    },
    onError: () => {
      toast.error("Failed to mark notifications as read")
    },
  })
}
