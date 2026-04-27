'use client'

import { useGetBoardAutomationsQuery, useUpdateAutomationMutation, useDeleteAutomationMutation } from '@/lib/slices/boardsApi'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Trash2, Edit, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  trigger: any
  condition?: any
  action: any
  lastFiredAt?: string | null
  createdAt: string
}

interface RulesListProps {
  boardId: string
  onEditRule: (rule: AutomationRule) => void
  onCreateRule: () => void
}

const triggerLabels: Record<string, string> = {
  TASK_MOVED: 'Task moved to column',
  TASK_ASSIGNED: 'Task assigned',
  PRIORITY_CHANGED: 'Priority changed',
  TASK_STALLED: 'Task stalled',
}

const actionLabels: Record<string, string> = {
  NOTIFY_USER: 'Notify user',
  NOTIFY_ROLE: 'Notify role',
  AUTO_ASSIGN: 'Auto-assign',
  CHANGE_PRIORITY: 'Change priority',
  ADD_LABEL: 'Add label',
}

export default function RulesList({ boardId, onEditRule, onCreateRule }: RulesListProps) {
  const { data: rules, isLoading } = useGetBoardAutomationsQuery(boardId)
  const [updateAutomation] = useUpdateAutomationMutation()
  const [deleteAutomation] = useDeleteAutomationMutation()

  const handleToggleEnabled = async (ruleId: string, enabled: boolean) => {
    try {
      await updateAutomation({ id: ruleId, enabled }).unwrap()
      toast.success(enabled ? 'Rule enabled' : 'Rule disabled')
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to update rule')
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteAutomation(ruleId).unwrap()
      toast.success('Rule deleted')
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to delete rule')
    }
  }

  const getTriggerDescription = (trigger: any): string => {
    if (trigger.type === 'TASK_MOVED') {
      return `When task is moved`
    }
    if (trigger.type === 'TASK_ASSIGNED') {
      return `When task is assigned`
    }
    if (trigger.type === 'PRIORITY_CHANGED') {
      return `When priority changes`
    }
    if (trigger.type === 'TASK_STALLED') {
      return `When task hasn't moved in ${trigger.value} days`
    }
    return `When ${trigger.type}`
  }

  const getActionDescription = (action: any): string => {
    if (action.type === 'NOTIFY_USER') {
      return `Notify user`
    }
    if (action.type === 'NOTIFY_ROLE') {
      return `Notify ${action.target}s`
    }
    if (action.type === 'AUTO_ASSIGN') {
      return `Assign to user`
    }
    if (action.type === 'CHANGE_PRIORITY') {
      return `Set priority to ${action.value}`
    }
    if (action.type === 'ADD_LABEL') {
      return `Add label "${action.value}"`
    }
    return `Then ${action.type}`
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-[#f5f5f5] rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-section-heading font-waldenburg font-light">Automation Rules</h3>
        <Button size="sm" onClick={onCreateRule}>
          + New Rule
        </Button>
      </div>

      {!rules || rules.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-body-standard text-muted-foreground">
            No automation rules yet. Create one to automate your workflow!
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule: AutomationRule) => (
            <Card key={rule.id} className="p-4">
              <div className="flex items-start gap-3">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => handleToggleEnabled(rule.id, checked)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-body font-medium truncate">{rule.name}</h4>
                    {!rule.enabled && (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {getTriggerDescription(rule.trigger)}
                    {rule.condition && (
                      <span> and {rule.condition.field} {rule.condition.operator} {rule.condition.value}</span>
                    )}
                    → {getActionDescription(rule.action)}
                  </p>
                  {rule.lastFiredAt && (
                    <p className="text-micro text-muted-foreground mt-1">
                      Last fired {formatDistanceToNow(new Date(rule.lastFiredAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-[12px]">
                    <DropdownMenuItem onClick={() => onEditRule(rule)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleEnabled(rule.id, !rule.enabled)}>
                      {rule.enabled ? (
                        <>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Power className="mr-2 h-4 w-4" />
                          Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
