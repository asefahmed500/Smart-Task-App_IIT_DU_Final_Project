'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Shield, Crown, User } from 'lucide-react'
import { BoardMember } from '@/lib/slices/boardsApi'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MembersListProps {
  members: BoardMember[]
  currentUserId: string
  isOwner: boolean
  isAdmin?: boolean
  isManager?: boolean
  onRemoveMember: (userId: string) => void
  onChangeRole?: (userId: string, role: 'ADMIN' | 'MANAGER' | 'MEMBER') => void
}

const roleConfig = {
  ADMIN: { label: 'Admin', icon: Crown, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  MANAGER: { label: 'Manager', icon: Shield, color: 'bg-primary/10 text-primary border-primary/20' },
  MEMBER: { label: 'Member', icon: User, color: 'bg-muted/10 text-muted-foreground border-muted/20' },
}

export default function MembersList({
  members,
  currentUserId,
  isOwner,
  isAdmin = false,
  isManager = false,
  onRemoveMember,
  onChangeRole
}: MembersListProps) {
  return (
    <ScrollArea className="min-h-[200px] max-h-[500px] pr-4">
      <div className="space-y-2">
      {members.map((member) => {
        const config = roleConfig[member.role]
        const Icon = config.icon
        const isCurrentUser = member.userId === currentUserId

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.user.avatar || undefined} />
              <AvatarFallback>
                {member.user.name?.[0] || member.user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-body-medium font-medium truncate">
                {member.user.name || 'Unnamed'}
                {isCurrentUser && <span className="text-caption text-muted-foreground ml-2">(you)</span>}
              </p>
              <p className="text-caption text-muted-foreground truncate">{member.user.email}</p>
            </div>
            <Badge variant="outline" className={cn('text-xs gap-1', config.color)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            {(isAdmin || isManager) && !isCurrentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-[12px]">
                  {onChangeRole && (
                    <>
                      <DropdownMenuItem onClick={() => onChangeRole(member.userId, 'ADMIN')}>
                        <Crown className="mr-2 h-4 w-4" />
                        Make Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(member.userId, 'MANAGER')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Make Manager
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(member.userId, 'MEMBER')}>
                        <User className="mr-2 h-4 w-4" />
                        Make Member
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onRemoveMember(member.userId)}
                  >
                    Remove from Board
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}
      {members.length === 0 && (
        <div className="text-center py-8 text-body-standard text-muted-foreground">
          No members yet. Add someone to get started!
        </div>
      )}
      </div>
    </ScrollArea>
  )
}
