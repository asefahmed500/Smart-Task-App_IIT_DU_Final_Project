'use client'

import { AutomationRule } from "@/generated/prisma/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Trash2, Zap, Clock, Pencil } from "lucide-react"
import { toggleAutomationRule, deleteAutomationRule, updateAutomationRule } from '@/actions/admin-actions'
import { toast } from "sonner"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getAvailableTriggers, getAvailableConditions, getAvailableActions } from '@/utils/automation-utils'

interface AutomationRuleListProps {
  rules: AutomationRule[]
}

export function AutomationRuleList({ rules: initialRules }: AutomationRuleListProps) {
  const [rules, setRules] = useState(initialRules)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [editName, setEditName] = useState('')
  const [editTrigger, setEditTrigger] = useState('')
  const [editAction, setEditAction] = useState('')
  const [editCondition, setEditCondition] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const triggers = getAvailableTriggers()
  const conditions = getAvailableConditions()
  const actions = getAvailableActions()

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleAutomationRule({ id, enabled })
      setRules(rules.map(r => r.id === id ? { ...r, enabled } : r))
      toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`)
    } catch {
      toast.error("Failed to update rule")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return
    try {
      await deleteAutomationRule({ id })
      setRules(rules.filter(r => r.id !== id))
      toast.success("Rule deleted")
    } catch {
      toast.error("Failed to delete rule")
    }
  }

  const startEdit = (rule: AutomationRule) => {
    setEditingRule(rule)
    setEditName(rule.name)
    setEditTrigger(rule.trigger)
    setEditAction(rule.action)
    setEditCondition(rule.condition || 'none')
  }

  const handleUpdate = async () => {
    if (!editingRule) return
    setEditLoading(true)
    try {
      const result = await updateAutomationRule({
        id: editingRule.id,
        name: editName,
        trigger: editTrigger,
        action: editAction,
        condition: editCondition === 'none' ? null : editCondition,
      })
      if (result.success) {
        toast.success("Rule updated")
        setRules(rules.map(r => r.id === editingRule.id ? { ...r, name: editName, trigger: editTrigger, action: editAction, condition: editCondition === 'none' ? null : editCondition } : r))
        setEditingRule(null)
      } else {
        toast.error(result.error || "Failed to update rule")
      }
    } catch {
      toast.error("Failed to update rule")
    } finally {
      setEditLoading(false)
    }
  }

  if (rules.length === 0) {
    return (
      <div className="p-12 text-center space-y-4">
        <div className="size-12 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Zap className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">No automation rules found</p>
          <p className="text-sm text-muted-foreground">Create your first system-wide rule to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-b border-primary/5">
          <TableHead className="w-[300px]">Rule Name</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id} className="group hover:bg-primary/5 transition-colors">
            <TableCell className="font-medium">
              <div className="flex flex-col">
                <span>{rule.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-tighter flex items-center gap-1 mt-1">
                  <Clock className="size-3" />
                  Created {new Date(rule.createdAt).toLocaleDateString()}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                {rule.trigger}
              </Badge>
            </TableCell>
            <TableCell>
              <span className="text-sm text-muted-foreground italic">
                {rule.condition || "None"}
              </span>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                {rule.action}
              </Badge>
            </TableCell>
            <TableCell>
              <Switch 
                checked={rule.enabled} 
                onCheckedChange={(checked) => handleToggle(rule.id, checked)}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => startEdit(rule)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(rule.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
      <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-oswald uppercase flex items-center gap-2">
            <Zap className="size-6 text-primary" />
            Edit <span className="text-primary">Automation</span> Rule
          </DialogTitle>
          <DialogDescription>
            Update the rule configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Rule Name</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-muted/50 border-primary/10 focus-visible:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-trigger">Trigger Event</Label>
              <Select value={editTrigger} onValueChange={setEditTrigger}>
                <SelectTrigger className="bg-muted/50 border-primary/10">
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-action">Resulting Action</Label>
              <Select value={editAction} onValueChange={setEditAction}>
                <SelectTrigger className="bg-muted/50 border-primary/10">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-condition">Condition (Optional)</Label>
            <Select value={editCondition} onValueChange={setEditCondition}>
              <SelectTrigger className="bg-muted/50 border-primary/10">
                <SelectValue placeholder="No condition (always run)" />
              </SelectTrigger>
              <SelectContent>
                {conditions.filter(c => c.value).map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setEditingRule(null)}
            disabled={editLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={editLoading} className="gap-2">
            {editLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
