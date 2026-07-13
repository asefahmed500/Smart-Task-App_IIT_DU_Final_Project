'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Layout, Users, AlertTriangle, ListChecks, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Board {
  id: string
  name: string
  memberCount: number
  taskCount: number
}

interface ManagerDashboardClientProps {
  user: { name: string | null; email: string }
  data: {
    boards: Board[]
    totalTasks: number
    completedThisWeek: number
    teamMemberCount: number
    unassignedTasks: number
    bottleneckColumns: { name: string; taskCount: number }[]
  }
}

export function ManagerDashboardClient({ user, data }: ManagerDashboardClientProps) {
  const router = useRouter()

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">Manager Dashboard</h1>
          <p className="text-[14px] text-[#5A5A5A]">Welcome back, {user.name}. Here&apos;s your team overview.</p>
        </div>
        <Button className="bg-[#3B82F6] text-white hover:bg-[#2558d6] h-9 text-sm" onClick={() => router.push('/manager/boards')}>
          <Plus className="size-3.5 mr-1.5" />
          Create Board
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Team Boards</CardTitle>
            <Layout className="size-4 text-[#3B82F6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.boards.length}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">Active projects</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Total Tasks</CardTitle>
            <ListChecks className="size-4 text-[#3B82F6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.totalTasks}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">{data.completedThisWeek} completed this week</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Team Members</CardTitle>
            <Users className="size-4 text-[#3B82F6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.teamMemberCount}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">All members active</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Unassigned</CardTitle>
            <AlertTriangle className="size-4 text-[#3B82F6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.unassignedTasks}</div>
            <Badge variant="outline" className="mt-1.5 text-[11px] text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/5">Needs attention</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-[#E8E8E8] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1A1A1A]">Team Boards</CardTitle>
          </CardHeader>
          <CardContent>
            {data.boards.length === 0 ? (
              <div className="text-sm text-[#5A5A5A] text-center py-10">
                No boards found. Create a board to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {data.boards.map((board) => (
                  <Link
                    key={board.id}
                    href={`/dashboard/board/${board.id}`}
                    className="flex items-center justify-between p-3 rounded-md border border-[#E8E8E8] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-md bg-[#3B82F6]/5 border border-[#3B82F6]/10 flex items-center justify-center">
                        <Layout className="size-4 text-[#3B82F6]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A1A1A]">{board.name}</p>
                        <p className="text-[12px] text-[#5A5A5A]">{board.memberCount} members</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] text-[#5A5A5A] border-[#E8E8E8]">{board.taskCount} tasks</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 border border-[#E8E8E8] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1A1A1A]">Bottleneck Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bottleneckColumns.length === 0 ? (
              <p className="text-sm text-[#5A5A5A] text-center py-6">No bottlenecks detected</p>
            ) : (
              <div className="space-y-3">
                {data.bottleneckColumns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between border-b border-[#E8E8E8] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-[#F59E0B]/5 border border-[#F59E0B]/10 flex items-center justify-center">
                        <AlertTriangle className="size-4 text-[#F59E0B]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A1A1A]">{col.name}</p>
                        <p className="text-[12px] text-[#5A5A5A]">High backlog</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/5">{col.taskCount} tasks</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
