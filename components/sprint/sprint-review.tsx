'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSprintDetail, getSprintMetrics, getVelocityData, updateSprintReview } from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Target, CheckCircle, Award, TrendingUp, Save } from 'lucide-react'
import { isDoneColumn } from '@/utils/column-utils'

const ISSUE_TYPE_COLORS: Record<string, string> = {
  BUG: 'bg-red-100 text-red-800',
  FEATURE: 'bg-emerald-100 text-emerald-800',
  STORY: 'bg-blue-100 text-blue-800',
  TASK: 'bg-slate-100 text-slate-800',
  EPIC: 'bg-purple-100 text-purple-800',
  SUBTASK: 'bg-amber-100 text-amber-800',
}

export function SprintReview({
  sprintId,
  basePath = '/manager',
  readOnly = false,
}: {
  sprintId: string
  basePath?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [sprint, setSprint] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviewNotes, setReviewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [sprintId])

  async function loadData() {
    setLoading(true)
    const [detailRes, metricsRes] = await Promise.all([
      getSprintDetail(sprintId),
      getSprintMetrics(sprintId),
    ])
    if (detailRes.success) {
      setSprint(detailRes.data)
      setReviewNotes((detailRes.data as any).reviewNotes || '')
    }
    if (metricsRes.success) setMetrics(metricsRes.data)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateSprintReview({ id: sprintId, reviewNotes })
    if (res.success) {
      toast.success('Review notes saved')
    } else {
      toast.error(res.error || 'Failed to save')
    }
    setSaving(false)
  }

  const completedTasks = sprint?.tasks?.filter(
    (t: any) => isDoneColumn(t.column?.name)
  ) || []

  const incompleteTasks = sprint?.tasks?.filter(
    (t: any) => !isDoneColumn(t.column?.name)
  ) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent mx-auto" />
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-text">Sprint not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`${basePath}/sprints`)}>
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/sprints/${sprintId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{sprint.name} — Review</h1>
          {sprint.goal && (
            <p className="text-sm text-muted-text flex items-center gap-1 mt-1">
              <Target className="h-3 w-3" />
              {sprint.goal}
            </p>
          )}
        </div>
        <Badge variant="outline">{sprint.status}</Badge>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-hairline">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-text">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{metrics.totalTasks}</p>
            </CardContent>
          </Card>
          <Card className="border-hairline">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-text">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-green-600">{metrics.completedTasks}</p>
            </CardContent>
          </Card>
          <Card className="border-hairline">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-text">Story Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{metrics.completedStoryPoints}<span className="text-sm text-muted-text"> / {metrics.totalStoryPoints}</span></p>
            </CardContent>
          </Card>
          <Card className="border-hairline">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-text">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{metrics.completionRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Completed tasks showcase */}
      <Card className="border-hairline">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Completed Work ({completedTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completedTasks.length === 0 ? (
            <p className="text-sm text-muted-text">No tasks were completed this sprint.</p>
          ) : (
            <div className="grid gap-2">
              {completedTasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-2 bg-green-50/50 rounded-lg border border-green-100">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.issueType && (
                        <Badge variant="secondary" className={`text-[9px] px-1.5 ${ISSUE_TYPE_COLORS[task.issueType]}`}>
                          {task.issueType}
                        </Badge>
                      )}
                      {task.storyPoints && (
                        <span className="text-[10px] text-muted-text">{task.storyPoints} pts</span>
                      )}
                      {task.assignee && (
                        <span className="text-[10px] text-muted-text">{task.assignee.name || 'Unassigned'}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incomplete tasks */}
      {incompleteTasks.length > 0 && (
        <Card className="border-hairline">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Moved Back to Backlog ({incompleteTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {incompleteTasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-2 p-1.5 text-sm">
                <span className="text-muted-text">{task.title}</span>
                {task.storyPoints && <Badge variant="outline" className="text-[9px] font-mono">{task.storyPoints} pts</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Review notes */}
      <Card className="border-hairline">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" />
            Sprint Review Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="What was accomplished this sprint? Any demos or highlights to note?"
            className="min-h-[150px] text-sm"
            disabled={readOnly}
          />
          {!readOnly && (
            <Button className="mt-3" size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Notes'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
