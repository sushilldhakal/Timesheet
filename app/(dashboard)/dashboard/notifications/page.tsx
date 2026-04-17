"use client"

import { useState } from "react"
import Link from "next/link"
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/lib/hooks/use-notifications"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Bell,
  CalendarCheck,
  ArrowLeftRight,
  CheckCircle,
  AlertTriangle,
  CheckCheck,
  Settings,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

type NotificationCategory = string

function getCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case "roster_published":
      return <CalendarCheck className="h-5 w-5 text-blue-500" />
    case "shift_swap_request":
      return <ArrowLeftRight className="h-5 w-5 text-orange-500" />
    case "shift_swap_approved":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "shift_swap_denied":
      return <CheckCircle className="h-5 w-5 text-red-500" />
    case "compliance_warning":
    case "compliance_breach":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case "timesheet_approved":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />
  }
}

function NotificationRow({ notification, onMarkRead }: { notification: any; onMarkRead: (id: string) => void }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
        !notification.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
      }`}
    >
      <div className="mt-0.5 shrink-0">{getCategoryIcon(notification.category)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{notification.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!notification.read && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                New
              </Badge>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.sentAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
      {!notification.read && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-8 text-xs"
          onClick={() => onMarkRead(notification._id)}
        >
          Mark read
        </Button>
      )}
    </div>
  )
}

function NotificationList({ status }: { status?: "all" | "unread" | "read" }) {
  const { data: notifications = [], isLoading } = useNotifications(status)
  const markRead = useMarkNotificationRead()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">You&apos;re all caught up</h3>
        <p className="text-sm text-muted-foreground mt-1">No notifications to show</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification: any) => (
        <NotificationRow
          key={notification._id}
          notification={notification}
          onMarkRead={(id) => markRead.mutate(id)}
        />
      ))}
    </div>
  )
}

export default function NotificationsPage() {
  const markAllRead = useMarkAllNotificationsRead()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground text-sm">Stay up to date with your team activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/profile#notification-preferences">
              <Settings className="h-4 w-4 mr-1" />
              Preferences
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="read">Read</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <NotificationList status="all" />
        </TabsContent>
        <TabsContent value="unread" className="mt-4">
          <NotificationList status="unread" />
        </TabsContent>
        <TabsContent value="read" className="mt-4">
          <NotificationList status="read" />
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/dashboard/profile#notification-preferences"
          className="hover:underline"
        >
          Manage preferences
        </Link>
      </div>
    </div>
  )
}
