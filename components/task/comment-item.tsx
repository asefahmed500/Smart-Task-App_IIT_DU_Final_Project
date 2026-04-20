'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react'
import { useUpdateCommentMutation, useDeleteCommentMutation } from '@/lib/slices/tasksApi'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Comment {
  id: string
  text: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    avatar: string | null
  }
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onDeleted?: () => void
  onUpdated?: () => void
}

export default function CommentItem({
  comment,
  currentUserId,
  onDeleted,
  onUpdated,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const [updateComment, { isLoading: isUpdating }] = useUpdateCommentMutation()
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation()

  const isOwner = comment.user.id === currentUserId

  const handleUpdate = async () => {
    if (!editText.trim()) {
      toast.error('Comment cannot be empty')
      return
    }

    try {
      await updateComment({
        id: comment.id,
        text: editText.trim(),
      }).unwrap()

      setIsEditing(false)
      toast.success('Comment updated')
      onUpdated?.()
    } catch (error) {
      toast.error('Failed to update comment')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await deleteComment(comment.id).unwrap()
      toast.success('Comment deleted')
      onDeleted?.()
    } catch (error) {
      toast.error('Failed to delete comment')
    }
  }

  const handleCancel = () => {
    setEditText(comment.text)
    setIsEditing(false)
  }

  return (
    <div className={cn(
      "group flex gap-3 p-3 rounded-lg bg-card border border-border transition-colors",
      isEditing && "ring-2 ring-primary/20"
    )}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={comment.user.avatar || undefined} alt={comment.user.name || 'User'} />
        <AvatarFallback className="text-xs">
          {comment.user.name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-sm truncate">{comment.user.name || 'Anonymous'}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              disabled={isUpdating}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating || !editText.trim()}
                className="gap-1"
              >
                <Check className="h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isUpdating}
                className="gap-1"
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.text}</p>
        )}
      </div>
    </div>
  )
}
