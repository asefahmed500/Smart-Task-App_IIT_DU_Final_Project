'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Task {
  id: string
  title: string
  priority: 'Low' | 'Medium' | 'High'
  tags: string[]
}

interface Column {
  id: string
  title: string
  tasks: Task[]
  color: string
}

const initialColumns: Column[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    tasks: [
      { id: '1', title: 'Design System Update', priority: 'High', tags: ['Design'] },
      { id: '2', title: 'User Interview Analysis', priority: 'Medium', tags: ['Research'] },
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    tasks: [
      { id: '3', title: 'Auth Module Implementation', priority: 'High', tags: ['Dev'] },
    ]
  },
  {
    id: 'done',
    title: 'Done',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    tasks: [
      { id: '4', title: 'Initial Project Setup', priority: 'Low', tags: ['Dev'] },
      { id: '5', title: 'Database Schema Design', priority: 'Medium', tags: ['Backend'] },
    ]
  }
]

export function DemoKanban() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)

  const moveTask = (taskId: string, targetColId: string) => {
    setColumns(prev => {
      let taskToMove: Task | null = null
      const newCols = prev.map(col => {
        const taskIdx = col.tasks.findIndex(t => t.id === taskId)
        if (taskIdx > -1) {
          taskToMove = col.tasks[taskIdx]
          return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) }
        }
        return col
      })

      if (taskToMove) {
        return newCols.map(col => {
          if (col.id === targetColId) {
            return { ...col, tasks: [...col.tasks, taskToMove!] }
          }
          return col
        })
      }
      return prev
    })
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 bg-card/30 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl shadow-primary/5 overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <span className="font-bold">ST</span>
          </div>
          <h3 className="text-xl font-serif font-black tracking-tight">Project Board</h3>
        </div>
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="size-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">
              U{i}
            </div>
          ))}
          <Button size="icon" variant="outline" className="size-8 rounded-full ml-2">
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${column.color} border font-serif font-black uppercase tracking-wider text-[10px]`}>
                  {column.title}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">{column.tasks.length}</span>
              </div>
              <Button variant="ghost" size="icon" className="size-6 text-muted-foreground">
                <MoreHorizontal className="size-4" />
              </Button>
            </div>

            <div className="flex flex-col gap-3 min-h-[300px]">
              <AnimatePresence mode="popLayout">
                {column.tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className="group bg-background border border-border/50 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer relative"
                    onClick={() => {
                      const nextCol = column.id === 'todo' ? 'in-progress' : column.id === 'in-progress' ? 'done' : 'todo'
                      moveTask(task.id, nextCol)
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => (
                          <span key={tag} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-tight">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <GripVertical className="size-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </div>
                    <h4 className="text-sm font-semibold mb-3">{task.title}</h4>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <div className={`size-1.5 rounded-full ${
                          task.priority === 'High' ? 'bg-red-500' : 
                          task.priority === 'Medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{task.priority}</span>
                      </div>
                      <div className="size-6 rounded-full bg-muted/50 border border-border flex items-center justify-center text-[8px] font-bold">
                        ME
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary h-10 border-dashed border border-transparent hover:border-primary/20 rounded-xl transition-all">
                <Plus className="size-4 mr-2" />
                <span className="text-xs font-medium">Add Task</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-center gap-4 text-xs text-muted-foreground font-medium">
        <span className="flex items-center gap-1.5">
          <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
          Click tasks to move them across columns
        </span>
      </div>
    </div>
  )
}
