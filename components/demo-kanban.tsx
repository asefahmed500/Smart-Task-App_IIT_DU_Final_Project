'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MessageSquare, Paperclip } from 'lucide-react'

interface Task {
  id: string
  title: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  tags: string[]
  comments: number
  attachments: number
  assignee: string
}

interface Column {
  id: string
  title: string
  tasks: Task[]
}

const avatarColors: Record<string, string> = {
  JD: 'bg-blue-100 text-blue-700',
  SK: 'bg-amber-100 text-amber-700',
  AL: 'bg-green-100 text-green-700',
  MR: 'bg-purple-100 text-purple-700',
  TN: 'bg-rose-100 text-rose-700',
  CJ: 'bg-cyan-100 text-cyan-700',
  PW: 'bg-orange-100 text-orange-700',
}

const initialColumns: Column[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    tasks: [
      { id: 'b1', title: 'Research competitor analytics features', priority: 'Low', tags: ['Research'], comments: 2, attachments: 1, assignee: 'AL' },
      { id: 'b2', title: 'Draft API documentation v2', priority: 'Medium', tags: ['Docs'], comments: 0, attachments: 0, assignee: 'SK' },
      { id: 'b3', title: 'Design system icon audit', priority: 'Low', tags: ['Design'], comments: 1, attachments: 3, assignee: 'MR' },
      { id: 'b4', title: 'Performance benchmark report', priority: 'Medium', tags: ['Dev', 'Backend'], comments: 3, attachments: 2, assignee: 'JD' },
    ]
  },
  {
    id: 'todo',
    title: 'To Do',
    tasks: [
      { id: 't1', title: 'Refactor notification service', priority: 'High', tags: ['Dev', 'Backend'], comments: 5, attachments: 0, assignee: 'JD' },
      { id: 't2', title: 'Build onboarding wizard flow', priority: 'Medium', tags: ['Design', 'Frontend'], comments: 8, attachments: 4, assignee: 'AL' },
      { id: 't3', title: 'Set up staging environment', priority: 'High', tags: ['DevOps'], comments: 2, attachments: 1, assignee: 'PW' },
    ]
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    tasks: [
      { id: 'i1', title: 'Implement real-time sync engine', priority: 'Critical', tags: ['Dev', 'Core'], comments: 12, attachments: 2, assignee: 'JD' },
      { id: 'i2', title: 'Design system component audit', priority: 'High', tags: ['Design'], comments: 6, attachments: 5, assignee: 'MR' },
      { id: 'i3', title: 'OAuth integration for SSO', priority: 'High', tags: ['Dev', 'Security'], comments: 4, attachments: 0, assignee: 'SK' },
      { id: 'i4', title: 'Mobile responsive fixes', priority: 'Medium', tags: ['Frontend'], comments: 7, attachments: 3, assignee: 'TN' },
    ]
  },
  {
    id: 'review',
    title: 'Review',
    tasks: [
      { id: 'r1', title: 'PR: Dashboard widgets refactor', priority: 'Medium', tags: ['Review', 'Frontend'], comments: 9, attachments: 0, assignee: 'CJ' },
      { id: 'r2', title: 'Database migration scripts', priority: 'Critical', tags: ['Review', 'Backend'], comments: 3, attachments: 1, assignee: 'JD' },
    ]
  },
  {
    id: 'done',
    title: 'Done',
    tasks: [
      { id: 'd1', title: 'Initial project scaffolding', priority: 'Low', tags: ['Dev'], comments: 0, attachments: 0, assignee: 'JD' },
      { id: 'd2', title: 'Database schema design', priority: 'Medium', tags: ['Backend'], comments: 4, attachments: 2, assignee: 'SK' },
      { id: 'd3', title: 'Authentication module', priority: 'High', tags: ['Dev', 'Security'], comments: 10, attachments: 1, assignee: 'PW' },
      { id: 'd4', title: 'Landing page redesign', priority: 'Medium', tags: ['Design', 'Frontend'], comments: 6, attachments: 4, assignee: 'TN' },
      { id: 'd5', title: 'CI/CD pipeline setup', priority: 'High', tags: ['DevOps'], comments: 3, attachments: 0, assignee: 'CJ' },
    ]
  }
]

const priorityColors: Record<string, string> = {
  Critical: 'bg-error',
  High: 'bg-warning',
  Medium: 'bg-amber-500',
  Low: 'bg-success',
}

export function DemoKanban() {
  const [columns, setColumns] = useState<Column[]>(initialColumns)

  const cycleStatus = (taskId: string) => {
    setColumns(prev => {
      let taskToMove: Task | null = null
      let sourceColIdx = -1
      const newCols = prev.map((col, idx) => {
        const taskIdx = col.tasks.findIndex(t => t.id === taskId)
        if (taskIdx > -1) {
          taskToMove = col.tasks[taskIdx]
          sourceColIdx = idx
          return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) }
        }
        return col
      })

      if (taskToMove && sourceColIdx > -1) {
        const targetIdx = (sourceColIdx + 1) % newCols.length
        return newCols.map((col, idx) => {
          if (idx === targetIdx) {
            return { ...col, tasks: [...col.tasks, taskToMove!] }
          }
          return col
        })
      }
      return prev
    })
  }

  const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {['JD', 'SK', 'AL', 'MR'].map((initials) => (
              <div
                key={initials}
                className={`size-6 sm:size-7 rounded-full border-2 border-canvas flex items-center justify-center text-[9px] sm:text-[10px] font-semibold ${avatarColors[initials]}`}
              >
                {initials}
              </div>
            ))}
            <div className="size-6 sm:size-7 rounded-full border-2 border-canvas bg-canvas-soft flex items-center justify-center text-[9px] sm:text-[10px] font-medium text-body-text">
              +3
            </div>
          </div>
          <div className="h-4 w-px bg-hairline hidden sm:block" />
          <span className="text-xs sm:text-sm font-medium text-ink hidden sm:inline">Sprint 24</span>
          <span className="text-[11px] sm:text-xs font-medium text-body-text">{totalTasks} tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs text-body-text hidden sm:inline">Click to move</span>
          <div className="size-2 rounded-full bg-accent animate-pulse" />
        </div>
      </div>

      {/* Board */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 sm:gap-5 p-4 sm:p-6 min-w-[900px] lg:min-w-0 lg:grid lg:grid-cols-5">
          {columns.map((column) => (
            <div key={column.id} className="flex-1 lg:flex-none flex flex-col gap-3 sm:gap-4 min-w-[160px] lg:min-w-0">
              {/* Column Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-ink uppercase tracking-wider">{column.title}</span>
                  <span className="text-[11px] sm:text-xs font-medium text-body-text bg-canvas-soft px-1.5 py-0.5 rounded">{column.tasks.length}</span>
                </div>
              </div>

              {/* Tasks */}
              <div className="flex flex-col gap-2 sm:gap-3 min-h-[200px]">
                <AnimatePresence mode="popLayout">
                  {column.tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="group bg-canvas border border-hairline rounded-lg p-3 sm:p-4 hover:border-accent/30 hover:shadow-sm cursor-pointer transition-all"
                      onClick={() => cycleStatus(task.id)}
                    >
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {task.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded bg-canvas-soft text-body-text"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Title */}
                      <h4 className="text-[12px] sm:text-[13px] font-semibold text-ink leading-snug mb-2.5 sm:mb-3">
                        {task.title}
                      </h4>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`size-1.5 sm:size-2 rounded-full ${priorityColors[task.priority]}`} />
                          <span className="text-[9px] sm:text-[10px] font-medium text-body-text">{task.priority}</span>
                          {task.comments > 0 && (
                            <div className="flex items-center gap-0.5 text-body-text">
                              <MessageSquare className="size-2.5 sm:size-3" />
                              <span className="text-[9px] sm:text-[10px]">{task.comments}</span>
                            </div>
                          )}
                          {task.attachments > 0 && (
                            <div className="flex items-center gap-0.5 text-body-text">
                              <Paperclip className="size-2.5 sm:size-3" />
                              <span className="text-[9px] sm:text-[10px]">{task.attachments}</span>
                            </div>
                          )}
                        </div>
                        <div className={`size-5 sm:size-6 rounded-full flex items-center justify-center text-[8px] sm:text-[9px] font-semibold ${avatarColors[task.assignee]}`}>
                          {task.assignee}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add button */}
                <button className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5 rounded-lg border border-dashed border-hairline text-[11px] sm:text-xs font-medium text-body-text hover:text-accent hover:border-accent/30 transition-all">
                  <Plus className="size-3 sm:size-3.5" />
                  Add Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
