'use client'

import { AutomationRule } from "@/generated/prisma/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Trash2, Zap, Clock } from "lucide-react"
import { toggleAutomationRule, deleteAutomationRule } from '@/actions/admin-actions'
import { toast } from "sonner"
import { useState } from "react"

interface AutomationRuleListProps {
  rules: AutomationRule[]
}

export function AutomationRuleList({ rules: initialRules }: AutomationRuleListProps) {
  const [rules, setRules] = useState(initialRules)

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
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                onClick={() => handleDelete(rule.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
