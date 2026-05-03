'use client'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Send, Trash2 } from 'lucide-react'
import { Comment as TaskComment, User } from '@/types/kanban'
import { formatDistanceToNow } from 'date-fns'

interface TaskCommentsSectionProps {
  comments: TaskComment[]
  onAddComment: () => Promise<void>
  onDeleteComment: (id: string) => Promise<void>
  newComment: string
  setNewComment: (value: string) => void
  currentUser: User
}

export function TaskCommentsSection({
  comments,
  onAddComment,
  onDeleteComment,
  newComment,
  setNewComment,
  currentUser
}: TaskCommentsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground border-b border-primary/5 pb-2">
        <MessageSquare className="size-4" />
        Comments
      </div>

      <div className="flex gap-4">
        <Avatar className="size-8 border border-primary/10 shadow-sm">
          <AvatarImage src={currentUser.image || undefined} />
          <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
            {currentUser.name?.slice(0, 2).toUpperCase() || '??'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] bg-muted/20 border-primary/5 focus:border-primary/20 resize-none transition-all focus:bg-background text-sm"
          />
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={onAddComment}
              disabled={!newComment.trim()}
              className="h-8 px-4 bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all active:scale-95"
            >
              <Send className="mr-2 size-3" />
              Comment
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 pt-2">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group/comment">
            <Avatar className="size-8 border border-primary/5">
              <AvatarImage src={comment.user?.image || undefined} />
              <AvatarFallback className="bg-muted text-[10px]">
                {comment.user?.name?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{comment.user?.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {comment.userId === currentUser.id && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDeleteComment(comment.id)}
                    className="size-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-opacity"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>
              <div className="text-sm bg-muted/10 p-3 rounded-lg border border-primary/5 leading-relaxed text-muted-foreground hover:bg-muted/20 transition-colors">
                {comment.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8 bg-muted/5 rounded-lg border-2 border-dotted border-primary/5">
          <p className="text-xs text-muted-foreground">No comments yet. Start the conversation!</p>
        </div>
      )}
    </section>
  )
}
