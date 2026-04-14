'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useLogoutMutation } from '@/lib/slices/authApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { useRouter, usePathname } from 'next/navigation'
import NotificationCenter from '@/components/notifications/notification-center'
import {
  Search,
  Command,
  LayoutGrid,
  Rows,
  BarChart3,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Plus,
  MoreVertical,
  Target,
  Undo,
  Redo,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toggleSidebar, toggleCommandPalette, toggleFocusMode } from '@/lib/slices/uiSlice'
import { undo, redo } from '@/lib/slices/undoSlice'
import { useEffect } from 'react'

export default function Navbar() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { data: boards } = useGetBoardsQuery()
  const { data: session } = useGetSessionQuery()
  const [logout] = useLogoutMutation()
  const pathname = usePathname()
  const isOnBoard = pathname?.startsWith('/board/')
  const currentBoardIdFromPath = isOnBoard ? pathname?.split('/')[2] : null

  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const focusMode = useAppSelector((state) => state.ui.focusMode)
  const currentBoardId = useAppSelector((state) => state.presence.currentBoardId)
  const presenceUsers = useAppSelector((state) => state.presence.users)
  const past = useAppSelector((s) => s.undo.past)
  const future = useAppSelector((s) => s.undo.future)

  // Get user initials from session
  const getUserInitials = () => {
    if (session?.name) {
      return session.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (session?.email) {
      return session.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        dispatch(toggleCommandPalette())
      }
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          dispatch({ type: 'ui/toggleFocusMode' })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  const handleLogout = async () => {
    await logout().unwrap()
    router.push('/login')
  }

  return (
    <nav className="h-16 border-b border-[rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => dispatch(toggleSidebar())}>
          <LayoutGrid className="h-5 w-5" />
        </Button>

        {boards && boards.length > 0 && (
          <Select
            value={currentBoardIdFromPath || undefined}
            onValueChange={(id) => router.push(`/board/${id}`)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a board" />
            </SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: board.color }} />
                    {board.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {isOnBoard && currentBoardIdFromPath && (
          <h1 className="text-nav font-medium text-black hidden md:block">
            {boards?.find((b) => b.id === currentBoardIdFromPath)?.name}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {focusMode && (
          <Badge variant="outline" className="hidden lg:flex rounded-[9999px] border-[rgba(0,0,0,0.08)]">
            Focus Mode Active
          </Badge>
        )}

        <NotificationCenter />

        {/* View mode switcher — only shown when on a board page */}
        {isOnBoard && (
          <div className="hidden md:flex items-center border border-[rgba(0,0,0,0.08)] rounded-[8px]">
            <Button variant={viewMode === 'board' ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none" onClick={() => dispatch({ type: 'ui/setViewMode', payload: 'board' })}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'swimlane' ? 'secondary' : 'ghost'} size="sm" className="rounded-none border-l-0 border-r-0" onClick={() => dispatch({ type: 'ui/setViewMode', payload: 'swimlane' })}>
              <Rows className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'metrics' ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none" onClick={() => dispatch({ type: 'ui/setViewMode', payload: 'metrics' })}>
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="hidden md:flex items-center gap-1">
          <Button
            variant={focusMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => dispatch(toggleFocusMode())}
            title="Toggle Focus Mode (f)"
          >
            <Target className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(undo())}
            disabled={past.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(redo())}
            disabled={future.length === 0}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="white" size="sm" className="hidden md:flex" onClick={() => dispatch(toggleCommandPalette())}>
          <Command className="h-4 w-4 mr-2" />
          <span className="text-nav">Search...</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-[rgba(0,0,0,0.08)] bg-[#f5f5f5] px-1.5 font-mono text-tiny text-[#777169]">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        {/* Live presence avatars - show users viewing current board */}
        <div className="hidden sm:flex items-center -space-x-2">
          {currentBoardId && Object.values(presenceUsers || {}).length > 0 && (
            <>
              {Object.values(presenceUsers || {})
                .slice(0, 3)
                .map((user: any) => (
                  <Avatar key={user.id} className="w-8 h-8 border-2 border-white" title={user.name}>
                    <AvatarFallback className="text-xs">
                      {user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || user.email?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
            </>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.avatar || undefined} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-nav font-medium text-black">{session?.name || 'User'}</p>
                <p className="text-caption text-[#777169]">{session?.email || 'user@example.com'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span className="text-body-standard">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="text-body-standard">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
