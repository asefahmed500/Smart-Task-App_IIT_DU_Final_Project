'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckSquare, Plus, Trash2, Edit2, X, CheckCircle2 } from 'lucide-react'
import { Checklist, ChecklistItem } from '@/types/kanban'
import { cn } from '@/utils/utils'

interface TaskChecklistSectionProps {
  checklists: Checklist[]
  onAddItem: (checklistId: string) => Promise<void>
  onToggleItem: (itemId: string, isCompleted: boolean) => Promise<void>
  onDeleteItem: (itemId: string) => Promise<void>
  onUpdateItem: (itemId: string) => Promise<void>
  onAddChecklist: () => Promise<void>
  onDeleteChecklist: (checklistId: string) => Promise<void>
  newChecklistItem: string
  setNewChecklistItem: (value: string) => void
  editingItemId: string | null
  editingContent: string
  setEditingContent: (value: string) => void
  onStartEdit: (itemId: string, content: string) => void
  onCancelEdit: () => void
}

export function TaskChecklistSection({
  checklists,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onAddChecklist,
  onDeleteChecklist,
  newChecklistItem,
  setNewChecklistItem,
  editingItemId,
  editingContent,
  setEditingContent,
  onStartEdit,
  onCancelEdit
}: TaskChecklistSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <CheckSquare className="size-4" />
          Checklists
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onAddChecklist}
          className="h-7 text-xs border-primary/20 hover:bg-primary/5"
        >
          <Plus className="mr-1 size-3" />
          Add Checklist
        </Button>
      </div>

      {checklists.map((checklist) => {
        const completedCount = checklist.items.filter(i => i.isCompleted).length
        const totalCount = checklist.items.length
        const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

        return (
          <div key={checklist.id} className="space-y-3 group">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                {checklist.title}
                <span className="text-xs text-muted-foreground font-normal">
                  ({completedCount}/{totalCount})
                </span>
              </h4>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onDeleteChecklist(checklist.id)}
                className="size-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>

            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-primary/5">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_8px_rgba(var(--primary),0.4)]" 
                style={{ width: `${progress}%` }} 
              />
            </div>

            <div className="space-y-1">
              {checklist.items.map((item) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md transition-colors group/item",
                    item.isCompleted ? "bg-muted/5" : "hover:bg-muted/10"
                  )}
                >
                  <Checkbox 
                    checked={item.isCompleted}
                    onCheckedChange={(checked) => onToggleItem(item.id, checked as boolean)}
                    className="border-primary/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  
                  {editingItemId === item.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        autoFocus
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onUpdateItem(item.id)
                          if (e.key === 'Escape') onCancelEdit()
                        }}
                        className="h-8 bg-background border-primary/20"
                      />
                      <Button size="icon" variant="ghost" className="size-8 text-primary" onClick={() => onUpdateItem(item.id)}>
                        <CheckCircle2 className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8 text-muted-foreground" onClick={onCancelEdit}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-between group/text">
                      <span className={cn(
                        "text-sm transition-all",
                        item.isCompleted && "text-muted-foreground line-through decoration-primary/30"
                      )}>
                        {item.content}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onStartEdit(item.id, item.content)}
                          className="size-6 text-muted-foreground hover:text-primary"
                        >
                          <Edit2 className="size-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onDeleteItem(item.id)}
                          className="size-6 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pl-8 pt-1">
              <Input
                placeholder="Add an item..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAddItem(checklist.id)
                }}
                className="h-8 bg-muted/20 border-primary/5 focus:border-primary/20 focus:bg-background transition-all text-sm"
              />
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => onAddItem(checklist.id)}
                className="h-8 px-2 text-primary hover:bg-primary/10"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        )
      })}

      {checklists.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-primary/5 rounded-lg bg-muted/5">
          <p className="text-xs text-muted-foreground">No checklists added yet</p>
        </div>
      )}
    </section>
  )
}
