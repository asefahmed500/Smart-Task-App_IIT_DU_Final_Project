'use client'

import { useGetTaskCommentsQuery } from '@/lib/slices/tasksApi'
import { useGetSessionQuery } from '@/lib/use-session'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, MessageSquare } from 'lucide-react'
import { useEffect } from 'react'
import { onCommentUpdate } from '@/lib/socket'
import CommentForm from './comment-form'
import CommentItem from './comment-item'

interface CommentsPanelProps {
  taskId: string
  boardId: string
}

export default function CommentsPanel({ taskId, boardId }: CommentsPanelProps) {
  const { data: comments, isLoading, refetch } = useGetTaskCommentsQuery(taskId)
  const { data: session } = useGetSessionQuery()

  useEffect(() => {
    const unsubscribe = onCommentUpdate((data) => {
      if (data.taskId === taskId) {
        refetch()
      }
    })
    return () => { unsubscribe() }
  }, [taskId, refetch])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="text-card-heading">
            Comments
            <span className="ml-2 text-micro text-slate-400 font-normal">
              {comments?.length || 0} total
            </span>
          </h3>
        </div>
      </div>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        <div className="space-y-6 pb-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                taskId={taskId}
                currentUserId={session?.id || ''}
                onDeleted={() => refetch()}
                onUpdated={() => refetch()}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <div className="p-3 rounded-full bg-white shadow-sm">
                <MessageSquare className="h-6 w-6 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">No comments yet</p>
                <p className="text-xs text-slate-500">Be the first to share your thoughts on this task.</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {session && (
        <div className="mt-4 pt-6 border-t border-slate-100">
          <CommentForm taskId={taskId} onCommentAdded={() => refetch()} />
        </div>
      )}
    </div>
  )
}
