"use client"

import { Bell, Settings } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter()
  const { data: unreadCount = 0 } = useUnreadCount()
  const { data: recentNotifications = [] } = useNotifications("unread", 5)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const handleNotificationClick = (notificationId: string, href?: string) => {
    markRead.mutate(notificationId)
    if (href) router.push(href)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification: any) => (
                <button
                  key={notification._id}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  onClick={() =>
                    handleNotificationClick(
                      notification._id,
                      notification.relatedEntity
                        ? `/dashboard/${notification.relatedEntity.type}/${notification.relatedEntity.id}`
                        : undefined
                    )
                  }
                >
                  {!notification.read && (
                    <div className="mt-2 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t px-4 py-2 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => router.push("/dashboard/notifications")}
          >
            View all notifications
          </Button>
          <Link
            href="/dashboard/profile#notification-preferences"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-3 w-3" />
            Settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
