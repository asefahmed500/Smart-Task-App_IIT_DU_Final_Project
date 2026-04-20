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
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a comment..."
        className="min-h-[80px] resize-none"
        disabled={isLoading}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
