'use client'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ShieldCheck, Send, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { User, Task } from '@/types/kanban'

interface TaskReviewsSectionProps {
  task: Task
  currentUser: User
  allUsers: User[]
  isSubmittingReview: boolean
  setIsSubmittingReview: (val: boolean) => void
  selectedReviewer: string
  setSelectedReviewer: (val: string) => void
  reviewFeedback: string
  setReviewFeedback: (val: string) => void
  onSubmitReview: () => Promise<void>
  onCompleteReview: (status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED') => Promise<void>
}

export function TaskReviewsSection({
  task,
  currentUser,
  allUsers,
  isSubmittingReview,
  setIsSubmittingReview,
  selectedReviewer,
  setSelectedReviewer,
  reviewFeedback,
  setReviewFeedback,
  onSubmitReview,
  onCompleteReview
}: TaskReviewsSectionProps) {
  const activeReview = task.reviews?.find(r => r.status === 'PENDING')
  const isReviewer = activeReview?.reviewerId === currentUser.id
  const hasHistory = (task.reviews?.length || 0) > 0

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle2 className="size-3 text-green-500" />
      case 'CHANGES_REQUESTED': return <AlertCircle className="size-3 text-orange-500" />
      case 'REJECTED': return <XCircle className="size-3 text-red-500" />
      default: return <ShieldCheck className="size-3 text-primary" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'CHANGES_REQUESTED': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'REJECTED': return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'PENDING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-primary/5 pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <ShieldCheck className="size-4" />
          Reviews
        </div>
        {!activeReview && !isSubmittingReview && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsSubmittingReview(true)}
            className="h-7 text-xs border-primary/20 hover:bg-primary/5"
          >
            Request Review
          </Button>
        )}
      </div>

      {isSubmittingReview && !activeReview && (
        <div className="p-4 rounded-xl border border-primary/10 bg-muted/20 space-y-4 animate-in zoom-in-95 duration-200">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Reviewer</label>
            <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
              <SelectTrigger className="bg-background border-primary/10">
                <SelectValue placeholder="Choose a member..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter(u => u.id !== currentUser.id)
                  .map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-4">
                          <AvatarImage src={u.image || undefined} />
                          <AvatarFallback>{u.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {u.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsSubmittingReview(false)}>Cancel</Button>
            <Button size="sm" onClick={onSubmitReview} className="bg-primary shadow-lg shadow-primary/20">Submit Request</Button>
          </div>
        </div>
      )}

      {activeReview && (
        <div className={cn(
          "p-4 rounded-xl border space-y-4",
          isReviewer ? "border-primary/20 bg-primary/5 shadow-sm" : "border-primary/10 bg-muted/20"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-8 border border-primary/10">
                <AvatarImage src={activeReview.reviewer?.image || undefined} />
                <AvatarFallback>{activeReview.reviewer?.name?.slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold">Review Pending</p>
                <p className="text-[10px] text-muted-foreground">Reviewer: {activeReview.reviewer?.name}</p>
              </div>
            </div>
            <Badge className={cn("text-[10px] font-bold", getStatusBadge('PENDING'))}>PENDING</Badge>
          </div>

          {isReviewer && (
            <div className="space-y-3 pt-2">
              <Textarea 
                placeholder="Add feedback (required for changes or rejection)..."
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                className="bg-background border-primary/10 resize-none h-20 text-sm"
              />
              <div className="flex flex-wrap gap-2 justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-500 border-red-500/20 hover:bg-red-500/5"
                  onClick={() => onCompleteReview('REJECTED')}
                >
                  <XCircle className="size-3 mr-1.5" /> Reject
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-orange-500 border-orange-500/20 hover:bg-orange-500/5"
                  onClick={() => onCompleteReview('CHANGES_REQUESTED')}
                >
                  <AlertCircle className="size-3 mr-1.5" /> Request Changes
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                  onClick={() => onCompleteReview('APPROVED')}
                >
                  <CheckCircle2 className="size-3 mr-1.5" /> Approve
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {hasHistory && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Review History</p>
          {task.reviews?.filter(r => r.status !== 'PENDING').map((review) => (
            <div key={review.id} className="p-3 rounded-lg border border-primary/5 bg-muted/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="size-5 border border-primary/5">
                    <AvatarImage src={review.reviewer?.image || undefined} />
                    <AvatarFallback className="text-[8px]">{review.reviewer?.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium">{review.reviewer?.name}</span>
                </div>
                <Badge className={cn("text-[9px] px-1.5 py-0", getStatusBadge(review.status))}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(review.status)}
                    {review.status}
                  </div>
                </Badge>
              </div>
              {review.feedback && (
                <p className="text-[11px] text-muted-foreground bg-background/50 p-2 rounded border border-primary/5 leading-relaxed">
                  {review.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
