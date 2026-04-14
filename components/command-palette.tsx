'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { useRouter } from 'next/navigation'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useLogoutMutation } from '@/lib/slices/authApi'
import { useSearchTasksQuery } from '@/lib/slices/tasksApi'
import { LayoutDashboard, Plus, Settings, Users, LogOut, Search, CheckCircle2 } from 'lucide-react'
import { setCommandPaletteOpen, setSelectedTask } from '@/lib/slices/uiSlice'
import { useEffect, useState } from 'react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

export default function CommandPalette() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const open = useAppSelector((s) => s.ui.commandPaletteOpen)
  const [search, setSearch] = useState('')
  
  const { data: boards } = useGetBoardsQuery()
  const { data: searchResults, isLoading: isSearching } = useSearchTasksQuery(search, { skip: !search || search.length < 2 })
  const [logout] = useLogoutMutation()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault()
        dispatch(setCommandPaletteOpen(!open))
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, dispatch])

  const handleLogout = async () => {
    await logout().unwrap()
    router.push('/login')
  }

  return (
    <CommandDialog open={open} onOpenChange={(v) => { dispatch(setCommandPaletteOpen(v)); if(!v) setSearch('') }}>
      <CommandInput 
        placeholder="Type a command or search tasks/boards..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {search.length >= 2 && searchResults && searchResults.length > 0 && (
          <CommandGroup heading="Tasks">
            {searchResults.map((task: any) => (
              <CommandItem 
                key={task.id} 
                onSelect={() => { 
                  dispatch(setCommandPaletteOpen(false))
                  router.push(`/board/${task.board.id}`)
                  setTimeout(() => dispatch(setSelectedTask(task.id)), 500)
                }}
              >
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                <div className="flex flex-col">
                  <span>{task.title}</span>
                  <span className="text-[10px] text-muted-foreground">in {task.board.name}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        
        <CommandGroup heading="General">
          <CommandItem onSelect={() => { dispatch(setCommandPaletteOpen(false)); router.push('/dashboard') }}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => { dispatch(setCommandPaletteOpen(false)); router.push('/profile') }}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile & Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => { dispatch(setCommandPaletteOpen(false)); router.push('/admin') }}>
            <Users className="mr-2 h-4 w-4" />
            <span>Admin Panel</span>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Boards">
          <CommandItem onSelect={() => { dispatch(setCommandPaletteOpen(false)); router.push('/dashboard/new') }}>
            <Plus className="mr-2 h-4 w-4" />
            <span>Create New Board</span>
          </CommandItem>
          {boards?.slice(0, 5).map((board) => (
            <CommandItem key={board.id} onSelect={() => { dispatch(setCommandPaletteOpen(false)); router.push(`/board/${board.id}`) }}>
              <div className="mr-2 h-4 w-4 rounded-full" style={{ backgroundColor: board.color }} />
              <span>{board.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Account">
          <CommandItem onSelect={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log Out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
