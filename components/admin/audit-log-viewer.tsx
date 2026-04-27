'use client'

import { useGetPlatformAuditQuery } from '@/lib/slices/adminApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'

export default function AuditLogViewer() {
  const { data: auditLogs, isLoading } = useGetPlatformAuditQuery()

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-600/10 text-green-600'
    if (action.includes('DELETE')) return 'bg-destructive/10 text-destructive'
    if (action.includes('UPDATE')) return 'bg-primary/10 text-primary'
    return 'bg-muted/10 text-muted-foreground'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
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
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={log.actor?.avatar || undefined}
                      alt={log.actor?.name || 'User'}
                    />
                    <AvatarFallback>
                      {log.actor?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {log.actor?.name || 'Unknown'}
                      </span>
                      <Badge variant="outline" className={getActionColor(log.action)}>
                        {log.action.replace(/_/g, ' ').toLowerCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {log.entityType === 'Task' ? 'task' : log.entityType?.toLowerCase()}
                      </span>
                    </div>
                    {log.board && (
                      <p className="text-xs text-muted-foreground">
                        in <strong>{log.board.name}</strong>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit logs available
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
