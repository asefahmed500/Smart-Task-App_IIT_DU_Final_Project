'use client'

import { useGetTaskCommentsQuery } from '@/lib/slices/tasksApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, MessageSquare } from 'lucide-react'
import CommentForm from './comment-form'
import CommentItem from './comment-item'
import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'

interface CommentsPanelProps {
  taskId: string
  boardId: string
}

export default function CommentsPanel({ taskId, boardId }: CommentsPanelProps) {
  const { data: comments, isLoading, refetch } = useGetTaskCommentsQuery(taskId)
  const { data: session } = useGetSessionQuery()

  useEffect(() => {
    // Listen for new comments via Socket.IO
    const socket = getSocket()
    socket.on('comment:new', () => {
      refetch()
    })

    socket.on('comment:updated', () => {
      refetch()
    })

    socket.on('comment:deleted', () => {
      refetch()
    })

    return () => {
      socket.off('comment:new')
      socket.off('comment:updated')
      socket.off('comment:deleted')
    }
  }, [refetch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-nav font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments ({comments?.length || 0})
        </h3>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={session?.id || ''}
                onDeleted={() => refetch()}
                onUpdated={() => refetch()}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No comments yet. Start the conversation!
            </div>
          )}
        </div>
      </ScrollArea>

      {session && (
        <div className="mt-4 pt-4 border-t">
          <CommentForm taskId={taskId} onCommentAdded={() => refetch()} />
        </div>
      )}
    </div>
  )
}
