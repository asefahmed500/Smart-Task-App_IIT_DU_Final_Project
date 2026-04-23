'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAddCommentMutation } from '@/lib/slices/tasksApi'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

interface CommentFormProps {
  taskId: string
  onCommentAdded?: () => void
}

export default function CommentForm({ taskId, onCommentAdded }: CommentFormProps) {
  const [text, setText] = useState('')
  const [addComment, { isLoading }] = useAddCommentMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) return

    try {
      await addComment({
        taskId,
        text: text.trim(),
      }).unwrap()

      setText('')
      toast.success('Comment added')
      onCommentAdded?.()
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative group">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[100px] resize-none rounded-2xl border-slate-200 bg-white p-4 text-sm transition-all duration-300 focus:ring-primary/20 focus:border-primary/30 group-hover:border-slate-300 shadow-sm"
          disabled={isLoading}
        />
        <div className="absolute bottom-3 right-3">
          <Button
            type="submit"
            size="sm"
            disabled={!text.trim() || isLoading}
            className="h-8 rounded-full px-4 gap-2 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Post</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 px-1">
        Markdown is supported (e.g. **bold**, *italic*, [link](url))
      </p>
    </form>
  )
}
