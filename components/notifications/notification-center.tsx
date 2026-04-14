'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { 
  Bell, X, Check, Trash2, 
  UserPlus, UserMinus, MessageSquare, 
  Lock, Unlock, ArrowRight, Zap 
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { 
  useGetNotificationsQuery, 
  useMarkAsReadMutation, 
  useDeleteNotificationMutation, 
  useMarkAllAsReadMutation 
} from '@/lib/slices/notificationsApi'

export default function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data: notifications, isLoading } = useGetNotificationsQuery()
  const [markAsRead] = useMarkAsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()
  const [markAllAsRead] = useMarkAllAsReadMutation()

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id).unwrap()
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap()
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <Card className="fixed top-16 right-4 z-50 w-96 max-h-[500px] flex flex-col rounded-[20px]">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-body font-medium">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={handleMarkAllAsRead}>
                    Mark all read
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-caption text-[#777169]">Loading...</div>
              ) : !notifications || notifications.length === 0 ? (
                <div className="p-8 text-center text-caption text-[#777169]">
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y divide-[rgba(0,0,0,0.05)]">
                  {notifications.map((notification: any) => {
                    const getIcon = () => {
                      switch (notification.type) {
                        case 'TASK_ASSIGNED': return <UserPlus className="h-4 w-4 text-blue-500" />
                        case 'TASK_UNASSIGNED': return <UserMinus className="h-4 w-4 text-slate-500" />
                        case 'COMMENT_ADDED': return <MessageSquare className="h-4 w-4 text-purple-500" />
                        case 'TASK_BLOCKED': return <Lock className="h-4 w-4 text-red-500" />
                        case 'TASK_UNBLOCKED': return <Unlock className="h-4 w-4 text-green-500" />
                        case 'TASK_MOVED': return <ArrowRight className="h-4 w-4 text-orange-500" />
                        default: return <Zap className="h-4 w-4 text-amber-500" />
                      }
                    }

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-4 hover:bg-[rgba(0,0,0,0.02)] transition-colors cursor-pointer group',
                          !notification.read && 'bg-blue-50/30'
                        )}
                        onClick={() => {
                          if (!notification.read) handleMarkAsRead(notification.id)
                          if (notification.link) {
                             router.push(notification.link)
                             setOpen(false)
                          }
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            !notification.read ? "bg-white shadow-sm" : "bg-slate-50"
                          )}>
                            {getIcon()}
                          </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-medium">{notification.title}</p>
                          <p className="text-caption text-[#777169] mt-1">{notification.message}</p>
                          <p className="text-micro text-[#777169] mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              )}
            </ScrollArea>
          </Card>
        </>
      )}
    </>
  )
}
