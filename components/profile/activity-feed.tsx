'use client'

import { useGetUserActivityQuery } from '@/lib/slices/usersApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function ActivityFeed() {
  const { data: activities, isLoading } = useGetUserActivityQuery()

  const actionLabels: Record<string, string> = {
    TASK_CREATED: 'created',
    TASK_UPDATED: 'updated',
    TASK_MOVED: 'moved',
    TASK_ASSIGNED: 'assigned',
    BOARD_CREATED: 'created board',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={activity.actor?.avatar || undefined}
                      alt={activity.actor?.name || 'User'}
                    />
                    <AvatarFallback>
                      {activity.actor?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">
                        {activity.actor?.name || 'User'}
                      </span>{' '}
                      {actionLabels[activity.action] || activity.action.toLowerCase()}
                      {activity.board && (
                        <span className="text-muted-foreground">
                          {' '}
                          in <strong>{activity.board.name}</strong>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
