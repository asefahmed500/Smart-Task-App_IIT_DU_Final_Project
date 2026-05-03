'use client'

import { useState, useEffect } from 'react'
import { getManagerBoards } from '@/actions/manager-actions'
import { deleteBoard, addBoardMember, removeBoardMember, searchUsers } from '@/actions/board-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layout, Users, Layers, Calendar, ExternalLink, MoreHorizontal, Trash2, UserPlus, UserMinus, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CreateBoardDialog } from "@/components/kanban/create-board-dialog"
import { useRouter } from "next/navigation"
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"

interface BoardMember {
  id: string
  name: string | null
  email: string
  role: string
  image?: string | null
}

interface ManagerBoard {
  id: string
  name: string
  description: string | null
  createdAt: Date
  ownerId: string
  owner: {
    name: string | null
    email: string
    image?: string | null
  }
  members: BoardMember[]
  _count: {
    members: number
    columns: number
  }
}

export default function ManagerBoardsPage() {
  const [boards, setBoards] = useState<ManagerBoard[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState<ManagerBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BoardMember[]>([])
  const router = useRouter()

  const loadData = () => {
    setLoading(true)
    getManagerBoards().then((res) => {
      if (res.success) {
        setBoards(res.data as ManagerBoard[])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchUsers({ query: searchQuery }).then(res => {
        if (res.success) {
          setSearchResults(res.data as BoardMember[])
        }
      })
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleSuccess = () => {
    router.refresh()
    loadData()
  }

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure? This will delete all tasks, columns, and history for this board.')) return
    try {
      const res = await deleteBoard({ boardId })
      if (res.success) {
        toast.success('Board deleted successfully')
        loadData()
      } else {
        toast.error(res.error || 'Failed to delete board')
      }
    } catch (error) {
      toast.error('An error occurred while deleting the board')
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!selectedBoard) return
    try {
      const res = await addBoardMember({ boardId: selectedBoard.id, userId })
      if (res.success) {
        toast.success('Member added')
        setSearchQuery('')
        // Refresh local board members
        getManagerBoards().then(res => {
          if (res.success) {
            const updatedBoards = res.data as ManagerBoard[]
            setBoards(updatedBoards)
            const updatedSelected = updatedBoards.find(b => b.id === selectedBoard.id)
            if (updatedSelected) setSelectedBoard(updatedSelected)
          }
        })
      } else {
        toast.error(res.error || 'Failed to add member')
      }
    } catch (error) {
      toast.error('Error adding member')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedBoard) return
    try {
      const res = await removeBoardMember({ boardId: selectedBoard.id, userId })
      if (res.success) {
        toast.success('Member removed')
        // Refresh local board members
        getManagerBoards().then(res => {
          if (res.success) {
            const updatedBoards = res.data as ManagerBoard[]
            setBoards(updatedBoards)
            const updatedSelected = updatedBoards.find(b => b.id === selectedBoard.id)
            if (updatedSelected) setSelectedBoard(updatedSelected)
          }
        })
      } else {
        toast.error(res.error || 'Failed to remove member')
      }
    } catch (error) {
      toast.error('Error removing member')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-48 bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Manage Boards</h1>
          <p className="text-muted-foreground">Manage your project boards and team access.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Layout className="size-4" />
          Create New Board
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Card key={board.id} className="group overflow-hidden border-primary/10 hover:border-primary/30 transition-all bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">
                  {board._count.columns} Columns
                </Badge>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => {
                        setSelectedBoard(board)
                        setMemberDialogOpen(true)
                      }}>
                        <Users className="size-4" /> Manage Members
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => handleDeleteBoard(board.id)}
                      >
                        <Trash2 className="size-4" /> Delete Board
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link href={`/dashboard/board/${board.id}`}>
                    <Button variant="ghost" size="icon" className="size-8">
                      <ExternalLink className="size-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <CardTitle className="text-xl mt-2 truncate group-hover:text-primary transition-colors">{board.name}</CardTitle>
              <CardDescription className="line-clamp-2 h-10">{board.description || 'No description provided.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="size-4" />
                  <span>{board._count.members} Members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="size-4" />
                  <span>{board._count.columns} Steps</span>
                </div>
              </div>
              
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Avatar className="size-6 border">
                    <AvatarImage src={board.owner.image || undefined} />
                    <AvatarFallback className="text-[10px]">{board.owner.name?.[0] || board.owner.email[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium truncate max-w-[120px]">{board.owner.name || board.owner.email}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  <Calendar className="size-3" />
                  {new Date(board.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {boards.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl bg-muted/30">
            <Layout className="size-12 opacity-20" />
            <div className="text-center">
              <p className="font-medium">No boards found</p>
              <p className="text-sm text-muted-foreground">Get started by creating your first project board.</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline">Create Board</Button>
          </div>
        )}
      </div>

      <CreateBoardDialog 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={handleSuccess}
      />

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Board Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4" /> Current Members ({selectedBoard?.members.length})
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {selectedBoard?.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 group">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={member.image || undefined} />
                        <AvatarFallback>{member.name?.[0] || member.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{member.name || member.email}</span>
                        <span className="text-xs text-muted-foreground lowercase">{member.role}</span>
                      </div>
                    </div>
                    {member.id !== selectedBoard?.ownerId && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Search className="size-4" /> Add New Member
              </h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {searchResults
                  .filter(u => !selectedBoard?.members.find(m => m.id === u.id))
                  .map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{user.name?.[0] || user.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name || user.email}</span>
                        <span className="text-xs text-muted-foreground uppercase text-[10px] font-bold">{user.role}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="size-8 text-primary"
                      onClick={() => handleAddMember(user.id)}
                    >
                      <UserPlus className="size-4" />
                    </Button>
                  </div>
                ))}
                {searchQuery.length > 2 && searchResults.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-4">No users found</p>
                )}
                {searchQuery.length > 0 && searchQuery.length <= 2 && (
                  <p className="text-[10px] text-center text-muted-foreground py-2 italic uppercase font-bold tracking-widest">Type at least 3 characters...</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
