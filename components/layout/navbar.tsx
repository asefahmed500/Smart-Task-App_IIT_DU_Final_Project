'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { signOut } from '@/lib/auth-client'
import { useSession } from '@/lib/auth-client'
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
  Sun,
  Moon,
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
import { useEffect, useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { data: boards } = useGetBoardsQuery()
  const { data: session } = useSession()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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
    if (session?.user?.name) {
      return session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (session?.user?.email) {
      return session.user.email.slice(0, 2).toUpperCase()
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
      if (e.key === 'd' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          document.documentElement.classList.toggle('dark')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <nav className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 flex items-center justify-between px-6">
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
              {boards?.map((board) => (
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
          <Badge variant="outline" className="hidden lg:flex rounded-[9999px] border-border">
            Focus Mode Active
          </Badge>
        )}

        <NotificationCenter />

        {/* View mode switcher — only shown when on a board page */}
        {isOnBoard && (
          <div className="hidden md:flex items-center border border-border rounded-[8px]">
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
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={(session?.user as any)?.avatar || (session?.user as any)?.image || undefined} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                <Badge variant="outline" className="w-fit mt-1">
                  {(session?.user as any)?.role || 'MEMBER'}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
