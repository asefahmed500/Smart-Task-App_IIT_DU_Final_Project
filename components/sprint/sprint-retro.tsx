'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSprintDetail, updateSprintRetro } from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Target,
  ThumbsUp,
  ThumbsDown,
  ListChecks,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
} from 'lucide-react'

interface ActionItem {
  text: string
  owner: string
  done: boolean
}

export function SprintRetro({
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
  const [loading, setLoading] = useState(true)
  const [wentWell, setWentWell] = useState('')
  const [toImprove, setToImprove] = useState('')
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [sprintId])

  async function loadData() {
    setLoading(true)
    const res = await getSprintDetail(sprintId)
    if (res.success) {
      const data = res.data as any
      setSprint(data)
      setWentWell(data.retroWentWell || '')
      setToImprove(data.retroToImprove || '')
      setActionItems(data.retroActionItems || [])
    }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await updateSprintRetro({
      id: sprintId,
      wentWell,
      toImprove,
      actionItems,
    })
    if (res.success) {
      toast.success('Retro notes saved')
    } else {
      toast.error(res.error || 'Failed to save')
    }
    setSaving(false)
  }

  function addActionItem() {
    setActionItems((prev) => [...prev, { text: '', owner: '', done: false }])
  }

  function updateActionItem(index: number, field: keyof ActionItem, value: string | boolean) {
    setActionItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function removeActionItem(index: number) {
    setActionItems((prev) => prev.filter((_, i) => i !== index))
  }

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
          <h1 className="text-xl font-semibold">{sprint.name} — Retrospective</h1>
          {sprint.goal && (
            <p className="text-sm text-muted-text flex items-center gap-1 mt-1">
              <Target className="h-3 w-3" />
              {sprint.goal}
            </p>
          )}
        </div>
        <Badge variant="outline">{sprint.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* What Went Well */}
        <Card className="border-hairline">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              What Went Well
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              placeholder="What practices or achievements should we continue?"
              className="min-h-[200px] text-sm"
              disabled={readOnly}
            />
          </CardContent>
        </Card>

        {/* What to Improve */}
        <Card className="border-hairline">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-500" />
              What to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={toImprove}
              onChange={(e) => setToImprove(e.target.value)}
              placeholder="What could we do better next sprint?"
              className="min-h-[200px] text-sm"
              disabled={readOnly}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card className="border-hairline">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-accent" />
              Action Items
            </CardTitle>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={addActionItem}>
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionItems.length === 0 ? (
            <p className="text-sm text-muted-text">No action items yet. Add some to track improvements.</p>
          ) : (
            actionItems.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-hairline">
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0 text-muted-text hover:text-destructive"
                    onClick={() => removeActionItem(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-6 w-6 p-0 shrink-0 rounded-full border ${
                    item.done ? 'bg-green-500 text-on-primary border-green-500' : 'border-hairline'
                  }`}
                  onClick={() => {
                    if (!readOnly) updateActionItem(index, 'done', !item.done)
                  }}
                  disabled={readOnly}
                >
                  {item.done && <CheckCircle2 className="h-3 w-3" />}
                </Button>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {readOnly ? (
                    <p className={`text-sm ${item.done ? 'line-through text-muted-text' : ''}`}>
                      {item.text || '(no description)'}
                    </p>
                  ) : (
                    <Input
                      value={item.text}
                      onChange={(e) => updateActionItem(index, 'text', e.target.value)}
                      placeholder="What needs to be done?"
                      className="h-8 text-sm"
                    />
                  )}
                  {readOnly ? (
                    <p className="text-sm text-muted-text">
                      {item.owner ? `Owner: ${item.owner}` : ''}
                    </p>
                  ) : (
                    <Input
                      value={item.owner}
                      onChange={(e) => updateActionItem(index, 'owner', e.target.value)}
                      placeholder="Owner"
                      className="h-8 text-sm"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Retro'}
          </Button>
        </div>
      )}
    </div>
  )
}
