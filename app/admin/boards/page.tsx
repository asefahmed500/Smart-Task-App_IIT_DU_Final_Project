'use client'

import { useState, useEffect } from 'react'
import { getAllBoards, getUsers } from "@/lib/admin-actions"
import { addBoardMember, removeBoardMember } from "@/lib/board-actions"
import { deleteBoard } from "@/lib/board-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layout, Users, Layers, Calendar, ExternalLink, MoreHorizontal, Trash2, UserPlus, UserMinus } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface AdminBoard {
  id: string
  name: string
  description: string | null
  createdAt: Date
  ownerId: string
  owner: {
    name: string | null
    email: string
  }
  members: { id: string; name: string | null; email: string }[]
  _count: {
    members: number
    columns: number
  }
}

interface BoardUser {
  id: string
  name: string | null
  email: string
}

export default function AdminBoardsPage() {
  const [boards, setBoards] = useState<AdminBoard[]>([])
  const [users, setUsers] = useState<BoardUser[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [selectedBoard, setSelectedBoard] = useState<AdminBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadData = () => {
    Promise.all([
      getAllBoards(),
      getUsers()
    ]).then(([boardsRes, usersRes]) => {
      setBoards(boardsRes.success ? (boardsRes.data as AdminBoard[]) : [])
      setUsers(usersRes.success ? (usersRes.data as BoardUser[]) : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSuccess = () => {
    router.refresh()
    loadData()
  }

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure? This will delete all tasks, comments, and attachments in this board.')) return
    try {
      await deleteBoard({ boardId })
      toast.success('Board deleted')
      loadData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete board'
      toast.error(message)
    }
  }

  const handleAddMember = async (userId: string) => {
    if (!selectedBoard) return
    try {
      await addBoardMember({ boardId: selectedBoard.id, userId })
      toast.success('Member added')
      loadData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add member'
      toast.error(message)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!selectedBoard) return
    try {
      await removeBoardMember({ boardId: selectedBoard.id, userId })
      toast.success('Member removed')
      loadData()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove member'
      toast.error(message)
    }
  }

  const openMemberDialog = (board: AdminBoard) => {
    setSelectedBoard(board)
    setMemberDialogOpen(true)
  }

  const boardMembers = selectedBoard?.members || []
  const nonMembers = users.filter(u => !boardMembers.find(m => m.id === u.id))

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">All Project Boards</h1>
            <p className="text-muted-foreground">Comprehensive overview of every task board across the organization.</p>
          </div>
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
            onClick={() => setIsCreateOpen(true)}
          >
            <Layout className="size-4" />
            Create Global Board
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Card key={board.id} className="bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all group overflow-hidden">
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {board._count.columns} Columns
                  </Badge>
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => openMemberDialog(board)}>
                          <UserPlus className="size-4" /> Manage Members
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 text-red-500 focus:text-red-500"
                          onClick={() => handleDeleteBoard(board.id)}
                        >
                          <Trash2 className="size-4" /> Delete Board
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Link href={`/dashboard/board/${board.id}`} className="p-2 rounded-full hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100">
                      <ExternalLink className="size-4 text-primary" />
                    </Link>
                  </div>
                </div>
                <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">{board.name}</CardTitle>
                <CardDescription className="line-clamp-2">{board.description || 'No description provided.'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-4" />
                    <span>{board._count.members} Members</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="size-4" />
                    <span>{board._count.columns} Steps</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                      {board.owner.name?.[0] || board.owner.email[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[120px]">{board.owner.name || board.owner.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                    <Calendar className="size-3" />
                    {new Date(board.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {boards.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl bg-muted/50">
              <Layout className="size-12 opacity-20" />
              <p className="text-muted-foreground">No boards have been created yet.</p>
            </div>
          )}
        </div>
      </div>

      <CreateBoardDialog 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={handleSuccess}
      />

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manage Members - {selectedBoard?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Current Members</h4>
              <div className="space-y-2">
                {boardMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-xs">{member.name?.[0] || member.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name || member.email}</span>
                    </div>
                    {member.id !== selectedBoard?.ownerId && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Add Members</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {nonMembers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-xs">{user.name?.[0] || user.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.name || user.email}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleAddMember(user.id)}
                    >
                      <UserPlus className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}