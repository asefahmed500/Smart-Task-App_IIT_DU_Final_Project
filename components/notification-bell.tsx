'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getNotifications, markNotificationRead, markAllNotificationsRead, getCurrentUserId } from '@/lib/notification-actions'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  message: string
  link: string | null
  isRead: boolean
  createdAt: Date
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()

  const loadNotifications = async () => {
    try {
      const data = await getNotifications() as { notifications: Notification[], unreadCount: number }
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // Not logged in or error
    }
  }

  // Get current user ID on mount
  useEffect(() => {
    void getCurrentUserId().catch(() => {})
  }, [])

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadNotifications()
  }, [])

  // Poll every 30s
  useEffect(() => {
    const interval = setInterval(() => { void loadNotifications() }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id)
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED': return '📋'
      case 'COMMENT_MENTION': return '💬'
      case 'TASK_STATUS_CHANGED': return '🔄'
      case 'DUE_DATE_REMINDER': return '⏰'
      case 'OVERDUE': return '⚠️'
      case 'NEW_USER_SIGNUP': return '🎉'
      case 'AUTOMATION_TRIGGERED': return '⚡'
      default: return '🔔'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px] bg-red-500"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto p-0">
        <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-background">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="size-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4">
            <Bell className="size-8 opacity-20 mb-2" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "p-3 cursor-pointer focus:bg-muted focus:outline-none",
                  !notification.isRead && "bg-primary/5"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3 w-full">
                  <div className="size-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 bg-muted">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm line-clamp-2", !notification.isRead && "font-medium")}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="size-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
