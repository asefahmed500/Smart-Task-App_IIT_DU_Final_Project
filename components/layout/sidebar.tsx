'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Plus, Home, Users, CheckSquare, Clock, AlertCircle, Shield } from 'lucide-react'
import { setFilterAssignee, setFilterDue } from '@/lib/slices/uiSlice'
import { useState, useMemo } from 'react'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { data: boards } = useGetBoardsQuery()
  const { data: session } = useGetSessionQuery()
  const filterDue = useAppSelector((state) => state.ui.filterDue)
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)
  const [searchQuery, setSearchQuery] = useState('')

  const userRole = session?.role

  // Calculate real due/overdue counts from boards that include tasks
  const { dueTodayCount, overdueCount } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let dueToday = 0
    let overdue = 0

    boards?.forEach((board) => {
      if (board.tasks) {
        board.tasks.forEach((task: { dueDate?: string | null; columnId?: string; column?: { name?: string } }) => {
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate)
            dueDate.setHours(0, 0, 0, 0)
            const isDone = task.column?.name?.toLowerCase() === 'done'
            if (!isDone) {
              if (dueDate.getTime() === today.getTime()) dueToday++
              else if (dueDate.getTime() < today.getTime()) overdue++
            }
          }
        })
      }
    })

    return { dueTodayCount: dueToday, overdueCount: overdue }
  }, [boards])

  // Don't render if sidebar is closed
  if (!sidebarOpen) return null

  const filteredBoards = boards?.filter((board) =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const canCreateBoards = userRole === 'MANAGER' || userRole === 'ADMIN'

  return (
    <div className="fixed left-0 top-0 h-screen w-[280px] border-r bg-background/95 backdrop-blur-sm z-40 flex flex-col shadow-sm">
      {/* Header */}
      <div className="h-16 border-b flex items-center px-4 gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">S</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">SmartTask</h2>
          <p className="text-xs text-muted-foreground truncate">{session?.name}</p>
        </div>
        <Badge variant="outline" className="text-xs flex-shrink-0">
          {userRole}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search boards..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-3 space-y-0.5">
          {userRole === 'MEMBER' && (
            <Button
              variant={pathname === '/member' ? 'secondary' : 'ghost'}
              className="w-full justify-start h-8 text-sm"
              onClick={() => router.push('/member')}
            >
              <Home className="mr-2 h-3.5 w-3.5" />
              Member Overview
            </Button>
          )}

          {userRole === 'MANAGER' && (
            <Button
              variant={pathname === '/manager' ? 'secondary' : 'ghost'}
              className="w-full justify-start h-8 text-sm"
              onClick={() => router.push('/manager')}
            >
              <Users className="mr-2 h-3.5 w-3.5" />
              Manager Overview
            </Button>
          )}

          {userRole === 'ADMIN' && (
            <Button
              variant={pathname === '/admin' ? 'secondary' : 'ghost'}
              className="w-full justify-start h-8 text-sm"
              onClick={() => router.push('/admin')}
            >
              <Shield className="mr-2 h-3.5 w-3.5" />
              Admin Panel
            </Button>
          )}
        </div>

        {/* Quick Filters - Only highlight if on a task-relevant page */}
        <div className="px-3 mt-3 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground px-2 mb-1">FILTERS</p>
          <Button
            variant={(filterDue === 'all' && (pathname === '/dashboard' || pathname.startsWith('/board'))) ? 'secondary' : 'ghost'}
            className="w-full justify-start h-8 text-sm"
            onClick={() => {
              dispatch(setFilterDue('all'))
              if (!pathname.startsWith('/board') && pathname !== '/member' && pathname !== '/manager' && pathname !== '/admin') {
                const homePath = userRole === 'ADMIN' ? '/admin' : userRole === 'MANAGER' ? '/manager' : '/member'
                router.push(homePath)
              }
            }}
          >
            <CheckSquare className="mr-2 h-3.5 w-3.5" />
            All Tasks
            {boards && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {boards.reduce((sum, b) => sum + (b._count?.tasks || 0), 0)}
              </Badge>
            )}
          </Button>

          <Button
            variant={(filterDue === 'today' && (pathname === '/dashboard' || pathname.startsWith('/board'))) ? 'secondary' : 'ghost'}
            className="w-full justify-start h-8 text-sm"
            onClick={() => {
              dispatch(setFilterDue('today'))
              if (!pathname.startsWith('/board') && pathname !== '/dashboard') {
                router.push('/dashboard')
              }
            }}
          >
            <Clock className="mr-2 h-3.5 w-3.5" />
            Due Today
            {dueTodayCount > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {dueTodayCount}
              </Badge>
            )}
          </Button>

          <Button
            variant={(filterDue === 'overdue' && (pathname === '/dashboard' || pathname.startsWith('/board'))) ? 'secondary' : 'ghost'}
            className="w-full justify-start h-8 text-sm"
            onClick={() => {
              dispatch(setFilterDue('overdue'))
              if (!pathname.startsWith('/board') && pathname !== '/dashboard') {
                router.push('/dashboard')
              }
            }}
          >
            <AlertCircle className="mr-2 h-3.5 w-3.5 text-destructive" />
            Overdue
            {overdueCount > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">
                {overdueCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Boards List */}
        <div className="mt-4 px-3">
          <Accordion type="multiple" defaultValue={['boards']}>
            <AccordionItem value="boards" className="border-0">
              <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline px-2">
                WORKSPACES
              </AccordionTrigger>
              <AccordionContent className="pt-1 space-y-0.5">
                {filteredBoards?.map((board) => (
                  <Button
                    key={board.id}
                    variant={pathname === `/board/${board.id}` ? 'secondary' : 'ghost'}
                    className="w-full justify-start h-auto py-2 px-2 text-sm"
                    onClick={() => router.push(`/board/${board.id}`)}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full mr-2.5 flex-shrink-0"
                      style={{ backgroundColor: board.color }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-sm truncate">{board.name}</div>
                      {board.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {board.description}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="ml-auto flex-shrink-0 text-xs"
                    >
                      {board._count?.members || 0}
                    </Badge>
                  </Button>
                ))}

                {filteredBoards?.length === 0 && (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    {searchQuery ? 'No boards found' : 'No boards yet'}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      {/* Create Board Button — only for MANAGER and ADMIN */}
      {canCreateBoards && (
        <div className="p-4 border-t bg-muted/20">
          <Button
            variant="default"
            className="w-full h-10 text-sm font-medium shadow-sm hover:translate-y-[-1px] transition-transform"
            onClick={() => router.push('/dashboard/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </div>
      )}
    </div>
  )
}
