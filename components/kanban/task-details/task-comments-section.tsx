"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Send, Trash2, Pencil, X, Check, ChevronDown } from "lucide-react"
import { Comment as TaskComment, User } from "@/types/kanban"
import { formatDistanceToNow } from "date-fns"
import { MentionTextarea } from "./mention-textarea"
import { Badge } from "@/components/ui/badge"
import { Reaction } from "@/types/kanban"

const REACTION_EMOJIS = ["👍", "🚀", "❤️"]
const FIVE_MINUTES_MS = 5 * 60 * 1000
const COMMENTS_PER_PAGE = 5

const MENTION_REGEX = /@([\w\s]+?)(?=\s|$|[,.!?:;])/g

function renderCommentWithMentions(content: string, members: User[]) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let key = 0

  const memberNames = new Set((members || []).map(m => m?.name).filter(Boolean))

  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags)
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const mentionName = match[1].trim()
    const isKnownMember = memberNames.has(mentionName)
    if (isKnownMember) {
      parts.push(
        <span key={key++} className="inline-flex items-center px-1.5 py-0 mx-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
          @{mentionName}
        </span>
      )
    } else {
      parts.push(match[0])
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : content
}

interface TaskCommentsSectionProps {
  comments: TaskComment[]
  onAddComment: () => Promise<void>
  onDeleteComment: (id: string) => Promise<void>
  onEditComment: (id: string, content: string) => Promise<void>
  onToggleReaction: (commentId: string, emoji: string) => Promise<void>
  isCommentEditable: (comment: TaskComment) => boolean
  newComment: string
  setNewComment: (value: string) => void
  currentUser: User
  boardMembers: User[]
}

export function TaskCommentsSection({
  comments,
  onAddComment,
  onDeleteComment,
  onEditComment,
  onToggleReaction,
  isCommentEditable,
  newComment,
  setNewComment,
  currentUser,
  boardMembers,
}: TaskCommentsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [visibleCount, setVisibleCount] = useState(COMMENTS_PER_PAGE)

  const startEdit = (comment: TaskComment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent("")
  }

  const saveEdit = async (commentId: string) => {
    await onEditComment(commentId, editContent)
    setEditingId(null)
    setEditContent("")
  }

  const getReactionsByEmoji = (reactions?: Reaction[]) => {
    if (!reactions) return {}
    return REACTION_EMOJIS.reduce((acc, emoji) => {
      acc[emoji] = reactions.filter((r) => r.emoji === emoji)
      return acc
    }, {} as Record<string, Reaction[]>)
  }

  const hasUserReacted = (reactions?: Reaction[], emoji?: string) => {
    if (!reactions || !emoji) return false
    return reactions.some((r) => r.emoji === emoji && r.userId === currentUser.id)
  }

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
            {currentUser.name?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <MentionTextarea
            placeholder="Write a comment... use @ to mention someone"
            value={newComment}
            onChange={setNewComment}
            members={boardMembers}
            className="min-h-[80px] bg-muted/20 border-primary/5 focus:border-primary/20 resize-none transition-all focus:bg-background text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault()
                onAddComment()
              }
            }}
          />
          <div className="flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground italic">
              Tip: Press{" "}
              <kbd className="px-1 py-0.5 bg-muted rounded border border-primary/10">
                Ctrl + Enter
              </kbd>{" "}
              to post
            </p>
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
        {comments.slice(0, visibleCount).map((comment) => {
          const reactionsByEmoji = getReactionsByEmoji(comment.reactions)
          const editable = isCommentEditable(comment)
          const isEditing = editingId === comment.id

          return (
            <div
              key={comment.id}
              className="flex gap-4 group/comment animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <Avatar className="size-8 border border-primary/5">
                <AvatarImage src={comment.user?.image || undefined} />
                <AvatarFallback className="bg-muted text-[10px]">
                  {comment.user?.name?.slice(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{comment.user?.name}</span>
                    {comment.user?.role === "ADMIN" && (
                      <Badge
                        variant="outline"
                        className="text-[8px] h-3 px-1 border-primary/20 text-primary"
                      >
                        Admin
                      </Badge>
                    )}
                    {comment.user?.role === "MANAGER" && (
                      <Badge
                        variant="outline"
                        className="text-[8px] h-3 px-1 border-secondary/20 text-secondary"
                      >
                        Manager
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                    {editable && !isEditing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(comment)}
                        className="size-6 text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="size-3" />
                      </Button>
                    )}
                    {(comment.userId === currentUser.id || currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteComment(comment.id)}
                        className="size-6 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[80px] bg-muted/20 border-primary/10 p-2 rounded-lg text-sm resize-none focus:border-primary/30 outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(comment.id)}
                        className="h-7 px-3 bg-primary hover:bg-primary/90"
                      >
                        <Check className="mr-1 size-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-7 px-3"
                      >
                        <X className="mr-1 size-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm bg-muted/10 p-3 rounded-xl border border-primary/5 leading-relaxed text-muted-foreground hover:bg-muted/20 transition-colors whitespace-pre-wrap">
                    {renderCommentWithMentions(comment.content, boardMembers)}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {REACTION_EMOJIS.map((emoji) => {
                    const reactors = reactionsByEmoji[emoji] || []
                    const reacted = hasUserReacted(comment.reactions, emoji)
                    return (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(comment.id, emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                          reacted
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-muted/20 text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span>{emoji}</span>
                        {reactors.length > 0 && (
                          <span className="font-medium">{reactors.length}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {comments.length > visibleCount && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisibleCount(prev => prev + COMMENTS_PER_PAGE)}
            className="text-xs text-muted-foreground hover:text-primary gap-1"
          >
            <ChevronDown className="size-3" />
            Load more comments ({comments.length - visibleCount} remaining)
          </Button>
        </div>
      )}

      {comments.length === 0 && (
        <div className="text-center py-8 bg-muted/5 rounded-lg border-2 border-dotted border-primary/5">
          <p className="text-xs text-muted-foreground">
            No comments yet. Start the conversation!
          </p>
        </div>
      )}
    </section>
  )
}
