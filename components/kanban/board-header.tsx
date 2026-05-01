'use client'

import { useState } from 'react'
import { Layout, Calendar, Users, Settings, Edit2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ManageMembersDialog } from './manage-members-dialog'
import { EditBoardDialog } from './edit-board-dialog'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Board, User } from '@/types/kanban'

interface BoardHeaderProps {
  board: Board
  currentUser: User
}

export function BoardHeader({ board, currentUser }: BoardHeaderProps) {
  const router = useRouter()
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false)
  const [isEditBoardOpen, setIsEditBoardOpen] = useState(false)

  const canManageMembers = currentUser.role !== 'MEMBER'
  const canEditBoard = currentUser.role === 'ADMIN' || board.ownerId === currentUser.id

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/30 backdrop-blur-sm p-4 rounded-2xl border border-primary/5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 h-8 text-[10px] uppercase font-bold tracking-wider rounded-full border-primary/20 hover:bg-primary/10 transition-all shadow-sm"
              onClick={() => {
                const role = currentUser.role.toLowerCase()
                router.push(`/${role}/boards`)
              }}
            >
              <ArrowLeft className="size-3.5" />
              Boards
            </Button>
            <div className="h-4 w-px bg-primary/10 mx-1" />
            <div className="p-2 bg-primary/10 rounded-lg hidden sm:block">
              <Layout className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-oswald uppercase text-foreground/90">{board.name}</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-xs md:text-sm line-clamp-1 opacity-80 pl-[92px] sm:pl-[124px]">
            {board.description || 'Manage your team tasks and workflow efficiency.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-3 overflow-hidden">
              {board.members.slice(0, 5).map((member: User) => (
                <div key={member.id} className="inline-block size-9 rounded-full ring-2 ring-background bg-muted flex items-center justify-center overflow-hidden" title={member.name || member.email}>
                  {member.image ? (
                    <Image src={member.image} alt={member.name || ''} width={36} height={36} className="size-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold">{member.name?.[0] || member.email[0].toUpperCase()}</span>
                  )}
                </div>
              ))}
              {board.members.length > 5 && (
                <div className="flex items-center justify-center size-9 rounded-full ring-2 ring-background bg-primary/10 text-primary text-[10px] font-bold">
                  +{board.members.length - 5}
                </div>
              )}
            </div>
            
            {canManageMembers && (
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="size-9 rounded-full hover:bg-primary/10 transition-colors"
                  onClick={() => setIsManageMembersOpen(true)}
                  title="Manage Members"
                >
                  <Users className="size-4 text-primary" />
                </Button>

                {canEditBoard && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="size-9 rounded-full hover:bg-primary/10 transition-colors"
                    onClick={() => setIsEditBoardOpen(true)}
                    title="Edit Board"
                  >
                    <Edit2 className="size-4 text-primary" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-border hidden md:block" />
          
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full">
            <Calendar className="size-3.5" />
            <span>Updated {new Date(board.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <ManageMembersDialog
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        boardId={board.id}
        members={board.members}
      />

      <EditBoardDialog
        isOpen={isEditBoardOpen}
        onClose={() => setIsEditBoardOpen(false)}
        board={board}
      />
    </>
  )
}
