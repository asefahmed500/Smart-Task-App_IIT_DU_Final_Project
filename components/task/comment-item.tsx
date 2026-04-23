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
import { MoreVertical, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { useUpdateCommentMutation, useDeleteCommentMutation } from '@/lib/slices/tasksApi'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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
  taskId: string
  currentUserId: string
  onDeleted?: () => void
  onUpdated?: () => void
}

export default function CommentItem({
  comment,
  taskId,
  currentUserId,
  onDeleted,
  onUpdated,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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
        taskId,
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
    try {
      await deleteComment({ id: comment.id, taskId }).unwrap()
      toast.success('Comment deleted')
      setIsDeleteDialogOpen(false)
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
      "group flex gap-3 p-4 rounded-2xl bg-white border border-slate-100 transition-all duration-300 hover:shadow-md hover:border-primary/10",
      isEditing && "ring-2 ring-primary/20 bg-primary/5 border-primary/20 shadow-lg"
    )}>
      <Avatar className="h-9 w-9 flex-shrink-0 shadow-sm border border-slate-100">
        <AvatarImage src={comment.user.avatar || undefined} alt={comment.user.name || 'User'} />
        <AvatarFallback className="text-xs bg-slate-50 text-slate-500 font-bold">
          {comment.user.name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-[13px] text-slate-900 truncate">{comment.user.name || 'Anonymous'}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-[10px] text-slate-300 italic">(edited)</span>
            )}
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-slate-100"
                >
                  <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-none shadow-xl p-1 w-36 bg-white/90 backdrop-blur-md">
                <DropdownMenuItem onClick={() => setIsEditing(true)} className="rounded-lg gap-2 text-xs font-medium cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Comment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="rounded-lg gap-2 text-xs font-medium text-destructive cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Comment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3 animate-in fade-in duration-300">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="min-h-[100px] resize-none text-sm rounded-xl border-slate-200 focus:ring-primary/20 bg-white shadow-inner p-3"
              disabled={isUpdating}
              placeholder="Write your comment..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating || !editText.trim()}
                className="gap-1.5 rounded-full px-4 shadow-md shadow-primary/20"
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Changes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isUpdating}
                className="gap-1.5 rounded-full px-4 hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-slate-700 leading-relaxed break-words font-medium prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-100 prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {comment.text}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  )
}
