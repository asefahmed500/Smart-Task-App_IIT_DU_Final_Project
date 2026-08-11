'use client'

import { useState, useEffect } from 'react'
import { getManagerTeam, getTeamMemberPerformance } from '@/actions/manager-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Mail, Shield, Calendar, Search, Filter, MoreHorizontal, UserCheck, MessageSquare, ListChecks, TrendingUp, AlertTriangle, CheckCircle2, Clock, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
  image?: string | null
  createdAt: Date
}

interface MemberPerf {
  id: string
  name: string | null
  email: string
  role: string
  image?: string | null
  stats: {
    totalTasks: number
    completedTasks: number
    inProgressTasks: number
    overdueTasks: number
    completionRate: number
  }
  tasks: {
    id: string
    title: string
    priority: string
    dueDate: Date | null
    columnName: string
    boardName: string
    sprintName: string | null
  }[]
}

export default function ManagerTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [perf, setPerf] = useState<MemberPerf[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | 'ALL'>('ALL')
  const [tasksMember, setTasksMember] = useState<MemberPerf | null>(null)
  const [perfMember, setPerfMember] = useState<MemberPerf | null>(null)

  useEffect(() => {
    Promise.all([getManagerTeam(), getTeamMemberPerformance()]).then(([teamRes, perfRes]) => {
      if (teamRes.success) setTeam(teamRes.data as TeamMember[])
      if (perfRes.success) setPerf(perfRes.data as MemberPerf[])
      setLoading(false)
    }).catch((err: unknown) => { setError(err instanceof Error ? err.message : 'Failed to load team'); setLoading(false) })
  }, [])

  const filteredTeam = team.filter(member => {
    const matchesSearch =
      (member.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  const perfFor = (memberId: string): MemberPerf | undefined => perf.find((p) => p.id === memberId)

  if (loading) {
    return <div className="p-8">Loading team...</div>
  }
  if (error) {
    return <div className="p-8 text-destructive">Error: {error}</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">Collaborators across all your project boards — with live task and performance insights.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            className="pl-10 h-11 bg-card/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="outline" className="px-3 py-1 gap-1.5 h-11 bg-card/50">
            <Filter className="size-3.5" />
            <select
              className="bg-transparent outline-none text-xs font-semibold uppercase tracking-wider cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="MANAGER">Managers</option>
              <option value="MEMBER">Members</option>
            </select>
          </Badge>
          <Button variant="outline" className="gap-2 h-11 px-4">
            <Users className="size-4" />
            Team View
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTeam.map((member) => {
          const p = perfFor(member.id)
          return (
            <Card key={member.id} className="group overflow-hidden border-primary/5 hover:border-primary/20 transition-all bg-card/50 backdrop-blur-sm hover:shadow-lg">
              <CardHeader className="pb-4 relative">
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem className="gap-2" onClick={() => setTasksMember(p || null)}>
                        <ListChecks className="size-4" /> View Tasks
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setPerfMember(p || null)}>
                        <TrendingUp className="size-4" /> View Performance
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2">
                        <MessageSquare className="size-4" /> Message
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2">
                        <UserCheck className="size-4" /> View Profile
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="size-16 border-2 border-primary/10 group-hover:border-primary/30 transition-colors shadow-sm">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback className="text-lg bg-primary/5 text-primary">
                      {member.name?.[0] || member.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-none truncate group-hover:text-primary transition-colors">
                      {member.name || 'Unnamed User'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="size-3.5" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={member.role === 'ADMIN' ? 'default' : member.role === 'MANAGER' ? 'secondary' : 'outline'} className="gap-1 px-2.5">
                    <Shield className="size-3" />
                    {member.role}
                  </Badge>
                  <Badge variant="outline" className="bg-primary/5 border-primary/10 gap-1 px-2.5">
                    <Calendar className="size-3" />
                    Since {new Date(member.createdAt).toLocaleDateString()}
                  </Badge>
                </div>

                {p ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                      <ListChecks className="size-4 text-primary" />
                      <div>
                        <p className="text-lg font-semibold leading-none">{p.stats.totalTasks}</p>
                        <p className="text-[10px] text-muted-foreground">Total Tasks</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/5 border border-green-500/10 px-3 py-2">
                      <CheckCircle2 className="size-4 text-green-600" />
                      <div>
                        <p className="text-lg font-semibold leading-none">{p.stats.completedTasks}</p>
                        <p className="text-[10px] text-muted-foreground">Completed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2">
                      <Clock className="size-4 text-blue-600" />
                      <div>
                        <p className="text-lg font-semibold leading-none">{p.stats.inProgressTasks}</p>
                        <p className="text-[10px] text-muted-foreground">In Progress</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2">
                      <AlertTriangle className="size-4 text-red-600" />
                      <div>
                        <p className="text-lg font-semibold leading-none">{p.stats.overdueTasks}</p>
                        <p className="text-[10px] text-muted-foreground">Overdue</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Completion rate</span>
                        <span className="font-semibold">{p.stats.completionRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${p.stats.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic py-2">No task data available for this member.</div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-9 hover:bg-primary/5 hover:text-primary border-primary/10"
                    onClick={() => setTasksMember(p || null)}
                    disabled={!p}
                  >
                    <ListChecks className="size-3.5 mr-1" />
                    View Tasks
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-9 hover:bg-primary/5 hover:text-primary border-primary/10"
                    onClick={() => setPerfMember(p || null)}
                    disabled={!p}
                  >
                    <TrendingUp className="size-3.5 mr-1" />
                    Performance
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredTeam.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl bg-muted/20">
            <Users className="size-12 opacity-20" />
            <div className="text-center">
              <p className="font-medium">No team members found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
            <Button onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }} variant="ghost">Clear Filters</Button>
          </div>
        )}
      </div>

      {/* View Tasks Dialog */}
      <Dialog open={!!tasksMember} onOpenChange={(o) => { if (!o) setTasksMember(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">{tasksMember?.name || 'Member'}&apos;s Tasks</DialogTitle>
            <DialogDescription className="text-xs">
              {tasksMember?.stats.totalTasks ?? 0} total · {tasksMember?.stats.completedTasks ?? 0} done · {tasksMember?.stats.overdueTasks ?? 0} overdue
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[40vh] overflow-y-auto space-y-1.5 pr-1">
            {(tasksMember?.tasks?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No tasks assigned.</p>
            )}
            {tasksMember?.tasks.map((t) => (
              <div key={t.id} className="rounded-md border border-primary/5 bg-muted/20 p-2.5">
                <p className="text-[13px] font-medium truncate">{t.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {t.boardName}{t.sprintName ? ` · ${t.sprintName}` : ''}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[9px] px-1.5 h-4">{t.columnName}</Badge>
                  <Badge variant="outline" className="text-[9px] px-1.5 h-4">{t.priority}</Badge>
                  {t.dueDate && (
                    <span className={`text-[9px] ${new Date(t.dueDate) < new Date() ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {new Date(t.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Performance Dialog */}
      <Dialog open={!!perfMember} onOpenChange={(o) => { if (!o) setPerfMember(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{perfMember?.name || 'Member'}&apos;s Performance</DialogTitle>
            <DialogDescription>Workload and completion insights.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 text-center">
                <BarChart3 className="size-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-semibold">{perfMember?.stats.totalTasks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
              <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-4 text-center">
                <CheckCircle2 className="size-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-semibold">{perfMember?.stats.completedTasks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-4 text-center">
                <Clock className="size-5 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-semibold">{perfMember?.stats.inProgressTasks ?? 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-4 text-center">
                <AlertTriangle className="size-5 mx-auto mb-1 text-red-600" />
                <p className="text-2xl font-semibold">{perfMember?.stats.overdueTasks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Completion rate</span>
                <span className="font-semibold">{perfMember?.stats.completionRate ?? 0}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${perfMember?.stats.completionRate ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
