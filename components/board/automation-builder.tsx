'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateAutomationMutation, useGetBoardColumnsQuery, useGetBoardAutomationsQuery, useDeleteAutomationMutation } from '@/lib/slices/boardsApi'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Zap } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AutomationBuilderProps {
  boardId: string
  members: any[]
}

const TRIGGER_TYPES = [
  { value: 'TASK_MOVED', label: 'Task is moved to column' },
  { value: 'TASK_ASSIGNED', label: 'Task is assigned to' },
  { value: 'PRIORITY_CHANGED', label: 'Priority is changed to' },
]

const ACTION_TYPES = [
  { value: 'AUTO_ASSIGN', label: 'Auto-assign to' },
  { value: 'CHANGE_PRIORITY', label: 'Set priority to' },
  { value: 'NOTIFY_USER', label: 'Notify user' },
]

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function AutomationBuilder({ boardId, members }: AutomationBuilderProps) {
  const { data: columns } = useGetBoardColumnsQuery(boardId)
  const { data: automations, isLoading } = useGetBoardAutomationsQuery(boardId)
  const [createAutomation, { isLoading: isCreating }] = useCreateAutomationMutation()
  const [deleteAutomation] = useDeleteAutomationMutation()

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState({ type: 'TASK_MOVED', value: '' })
  const [action, setAction] = useState({ type: 'AUTO_ASSIGN', target: '', value: '' })

  const handleCreate = async () => {
    if (!name || !trigger.type || !action.type) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createAutomation({
        boardId,
        name,
        trigger,
        action,
      }).unwrap()
      toast.success('Automation rule created')
      setName('')
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to create automation')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAutomation(id).unwrap()
      toast.success('Automation deleted')
    } catch {
      toast.error('Failed to delete automation')
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-[rgba(0,0,0,0.08)] shadow-sm">
        <CardHeader>
          <CardTitle className="text-body-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            New Automation Rule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Name</Label>
            <Input 
              placeholder="e.g. Auto-assign on Move" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>When...</Label>
              <Select value={trigger.type} onValueChange={(v) => setTrigger({ ...trigger, type: v, value: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              {trigger.type === 'TASK_MOVED' && (
                <Select value={trigger.value} onValueChange={(v) => setTrigger({ ...trigger, value: v })}>
                  <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                  <SelectContent>
                    {columns?.map(col => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {trigger.type === 'TASK_ASSIGNED' && (
                <Select value={trigger.value} onValueChange={(v) => setTrigger({ ...trigger, value: v })}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {trigger.type === 'PRIORITY_CHANGED' && (
                <Select value={trigger.value} onValueChange={(v) => setTrigger({ ...trigger, value: v })}>
                  <SelectTrigger><SelectValue placeholder="Priority level" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Then...</Label>
              <Select value={action.type} onValueChange={(v) => setAction({ ...action, type: v, target: '', value: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target / Value</Label>
              {(action.type === 'AUTO_ASSIGN' || action.type === 'NOTIFY_USER') && (
                <Select value={action.target || ''} onValueChange={(v) => setAction({ ...action, target: v })}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {action.type === 'CHANGE_PRIORITY' && (
                <Select value={action.value || ''} onValueChange={(v) => setAction({ ...action, value: v })}>
                  <SelectTrigger><SelectValue placeholder="Priority level" /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={isCreating} className="w-full">
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Create Automation
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-body-medium font-medium px-1">Active Board Automations</h3>
        <ScrollArea className="min-h-[200px] max-h-[400px] border rounded-lg bg-[rgba(0,0,0,0.01)] p-4">
          {isLoading ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
          ) : automations && automations.length > 0 ? (
            <div className="space-y-3">
              {automations.map((rule: any) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border bg-white shadow-sm transition-all hover:border-[rgba(0,0,0,0.15)]">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-medium text-sm truncate">{rule.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                       Rule ID: {rule.id.slice(0, 8)}...
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)} className="text-destructive h-8 w-8 hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
               <Zap className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-2" />
               <p className="text-caption text-muted-foreground">No automations defined for this board</p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}
