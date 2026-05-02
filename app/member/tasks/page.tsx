'use client'

import { useState, useEffect } from 'react'
import { getMemberTasks } from "@/lib/member-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, Calendar, MessageSquare, Paperclip, CheckSquare, ExternalLink, Filter, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface MemberTask {
  id: string
  title: string
  description: string | null
  priority: string
  dueDate: Date | null
  updatedAt: Date
  column: {
    name: string
    board: { id: string, name: string }
  }
  tags: { id: string, name: string, color: string }[]
  _count: {
    comments: number
    attachments: number
    checklists: number
  }
}

export default function MemberTasksPage() {
  const [tasks, setTasks] = useState<MemberTask[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  useEffect(() => {
    getMemberTasks().then((res) => {
      if (res.success) {
        setTasks(res.data as MemberTask[])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
    return matchesSearch && matchesPriority
  })

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Scanning your assignments...</div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">My Assignments</h1>
        <p className="text-muted-foreground">All tasks assigned to you across various project boards.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Filter tasks by title or description..." 
            className="pl-10 h-11 bg-card/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="outline" className="px-3 py-1 gap-2 h-11 bg-card/50">
            <Filter className="size-3.5 text-muted-foreground" />
            <select 
              className="bg-transparent outline-none text-xs font-semibold uppercase tracking-wider cursor-pointer"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </Badge>
          <Button variant="outline" className="gap-2 h-11 px-4">
            <CheckCircle2 className="size-4" />
            Completed
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="group overflow-hidden border-primary/5 hover:border-primary/20 transition-all bg-card/40 backdrop-blur-sm hover:shadow-md">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              task.priority === 'URGENT' ? 'bg-red-500' : 
              task.priority === 'HIGH' ? 'bg-amber-500' : 
              task.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-slate-400'
            }`} />
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4">
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[10px] uppercase font-bold tracking-tight px-2 py-0">
                      {task.column.board.name}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight px-2 py-0">
                      {task.column.name}
                    </Badge>
                    {task.tags.map(tag => (
                      <span key={tag.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 italic max-w-2xl">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="size-3.5" />
                      <span className="text-xs font-medium">{task._count.comments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Paperclip className="size-3.5" />
                      <span className="text-xs font-medium">{task._count.attachments}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckSquare className="size-3.5" />
                      <span className="text-xs font-medium">{task._count.checklists}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-l pl-6">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <Clock className="size-3" />
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Due Date</span>
                    </div>
                    <Link href={`/dashboard/board/${task.column.board.id}?task=${task.id}`}>
                      <Button variant="ghost" size="icon" className="size-9 rounded-full bg-primary/5 hover:bg-primary hover:text-white transition-all">
                        <ExternalLink className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl bg-muted/20">
            <CheckCircle2 className="size-12 opacity-10" />
            <div className="text-center">
              <p className="font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">No pending tasks found for your current filters.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
