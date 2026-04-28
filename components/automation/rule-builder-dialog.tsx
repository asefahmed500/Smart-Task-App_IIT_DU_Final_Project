'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateAutomationMutation, useUpdateAutomationMutation } from '@/lib/slices/boardsApi'
import { toast } from 'sonner'

import { AutomationRule, AutomationTrigger, AutomationCondition, AutomationAction } from '@/lib/automation/engine'

interface RuleBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  editRule?: AutomationRule
  onSuccess?: () => void
}

const TRIGGER_TYPES = [
  { value: 'TASK_MOVED', label: 'Task moved to column' },
  { value: 'TASK_ASSIGNED', label: 'Task assigned to user' },
  { value: 'PRIORITY_CHANGED', label: 'Priority changed to' },
  { value: 'TASK_STALLED', label: 'Task stalled (days)' },
]

const CONDITION_FIELDS = [
  { value: 'priority', label: 'Priority' },
  { value: 'assigneeId', label: 'Assignee' },
  { value: 'columnId', label: 'Column' },
  { value: 'label', label: 'Label contains' },
]

const CONDITION_OPERATORS = [
  { value: 'EQ', label: 'Equals' },
  { value: 'NEQ', label: 'Not equals' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'GT', label: 'Greater than' },
  { value: 'LT', label: 'Less than' },
]

const ACTION_TYPES = [
  { value: 'NOTIFY_USER', label: 'Notify user' },
  { value: 'NOTIFY_ROLE', label: 'Notify role' },
  { value: 'AUTO_ASSIGN', label: 'Auto-assign to user' },
  { value: 'CHANGE_PRIORITY', label: 'Change priority to' },
  { value: 'ADD_LABEL', label: 'Add label' },
]

const ROLES = ['ADMIN', 'MANAGER', 'MEMBER']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function RuleBuilderDialog({
  open,
  onOpenChange,
  boardId,
  editRule,
  onSuccess,
}: RuleBuilderDialogProps) {
  const [createAutomation] = useCreateAutomationMutation()
  const [updateAutomation] = useUpdateAutomationMutation()

  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('TASK_MOVED')
  const [triggerValue, setTriggerValue] = useState('')
  const [conditionEnabled, setConditionEnabled] = useState(false)
  const [conditionField, setConditionField] = useState('priority')
  const [conditionOperator, setConditionOperator] = useState('EQ')
  const [conditionValue, setConditionValue] = useState('')
  const [actionType, setActionType] = useState('NOTIFY_USER')
  const [actionTarget, setActionTarget] = useState('')
  const [actionValue, setActionValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editRule) {
      setName(editRule.name || '')
      const trigger = typeof editRule.trigger === 'string' ? JSON.parse(editRule.trigger) : editRule.trigger
      setTriggerType(trigger.type || 'TASK_MOVED')
      setTriggerValue(trigger.value || '')

      if (editRule.condition) {
        const condition = typeof editRule.condition === 'string' ? JSON.parse(editRule.condition) : editRule.condition
        setConditionEnabled(true)
        setConditionField(condition.field || 'priority')
        setConditionOperator(condition.operator || 'EQ')
        setConditionValue(condition.value?.toString() || '')
      }

      const action = typeof editRule.action === 'string' ? JSON.parse(editRule.action) : editRule.action
      setActionType(action.type || 'NOTIFY_USER')
      setActionTarget(action.target || '')
      setActionValue(action.value || '')
    }
  }, [editRule])

  const resetForm = () => {
    setName('')
    setTriggerType('TASK_MOVED')
    setTriggerValue('')
    setConditionEnabled(false)
    setConditionField('priority')
    setConditionOperator('EQ')
    setConditionValue('')
    setActionType('NOTIFY_USER')
    setActionTarget('')
    setActionValue('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a rule name')
      return
    }

    setIsSubmitting(true)
    try {
      const trigger: AutomationTrigger = { 
        type: triggerType as AutomationTrigger['type'], 
        value: triggerValue || undefined 
      }
      
      const condition: AutomationCondition | undefined = conditionEnabled
        ? { 
            field: conditionField as AutomationCondition['field'], 
            operator: conditionOperator as AutomationCondition['operator'], 
            value: conditionValue 
          }
        : undefined

      const action: AutomationAction = { 
        type: actionType as AutomationAction['type'],
        target: (actionType === 'NOTIFY_USER' || actionType === 'AUTO_ASSIGN' || actionType === 'NOTIFY_ROLE') ? actionTarget : undefined,
        value: (actionType === 'CHANGE_PRIORITY' || actionType === 'ADD_LABEL') ? actionValue : undefined
      }

      if (editRule) {
        await updateAutomation({
          id: editRule.id,
          name,
          trigger,
          condition,
          action,
        }).unwrap()
        toast.success('Rule updated successfully')
      } else {
        await createAutomation({
          boardId,
          name,
          trigger,
          condition,
          action,
        }).unwrap()
        toast.success('Rule created successfully')
      }

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to save rule')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen)
      if (!newOpen) resetForm()
    }}>
      <DialogContent className="rounded-[20px] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-section-heading font-waldenburg font-light">
            {editRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label className="text-caption">Rule Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Notify on high priority review"
            />
          </div>

          {/* Trigger */}
          <div className="space-y-2">
            <Label className="text-caption">When (Trigger)</Label>
            <div className="flex gap-2">
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(triggerType === 'TASK_MOVED' || triggerType === 'TASK_ASSIGNED' || triggerType === 'PRIORITY_CHANGED' || triggerType === 'TASK_STALLED') && (
                <Input
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  placeholder={
                    triggerType === 'TASK_MOVED' ? 'Column ID' :
                    triggerType === 'TASK_ASSIGNED' ? 'User ID' :
                    triggerType === 'TASK_STALLED' ? 'Days' :
                    'Value'
                  }
                  type={triggerType === 'TASK_STALLED' ? 'number' : 'text'}
                  className="w-32"
                />
              )}
            </div>
          </div>

          {/* Condition (Optional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="condition-enabled"
                checked={conditionEnabled}
                onChange={(e) => setConditionEnabled(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="condition-enabled" className="text-caption cursor-pointer">
                And (Optional Condition)
              </Label>
            </div>
            {conditionEnabled && (
              <div className="flex gap-2">
                <Select value={conditionField} onValueChange={setConditionField}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={conditionOperator} onValueChange={setConditionOperator}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                />
              </div>
            )}
          </div>

          {/* Action */}
          <div className="space-y-2">
            <Label className="text-caption">Then (Action)</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(actionType === 'NOTIFY_USER' || actionType === 'NOTIFY_ROLE' || actionType === 'AUTO_ASSIGN') && (
              <Select value={actionTarget} onValueChange={setActionTarget}>
                <SelectTrigger>
                  <SelectValue placeholder={actionType === 'NOTIFY_ROLE' ? 'Select role' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  {actionType === 'NOTIFY_ROLE' ? (
                    ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.toLowerCase()}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="">Select a user...</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {(actionType === 'CHANGE_PRIORITY' || actionType === 'ADD_LABEL') && (
              <Select
                value={actionValue}
                onValueChange={setActionValue}
              >
                <SelectTrigger>
                  <SelectValue placeholder={actionType === 'CHANGE_PRIORITY' ? 'Select priority' : 'Enter label'} />
                </SelectTrigger>
                <SelectContent>
                  {actionType === 'CHANGE_PRIORITY' ? (
                    PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.toLowerCase()}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="enhancement">Enhancement</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : editRule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
