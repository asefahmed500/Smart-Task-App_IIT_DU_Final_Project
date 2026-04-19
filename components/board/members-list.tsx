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
  onRemoveMember: (userId: string) => void
  onChangeRole?: (userId: string, role: 'ADMIN' | 'MANAGER' | 'MEMBER') => void
}

const roleConfig = {
  ADMIN: { label: 'Admin', icon: Crown, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  MANAGER: { label: 'Manager', icon: Shield, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  MEMBER: { label: 'Member', icon: User, color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

export default function MembersList({
  members,
  currentUserId,
  isOwner,
  onRemoveMember,
  onChangeRole
}: MembersListProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-2">
      {members.map((member) => {
        const config = roleConfig[member.role]
        const Icon = config.icon
        const isCurrentUser = member.userId === currentUserId

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(0,0,0,0.08)] hover:bg-[rgba(0,0,0,0.02)] transition-colors"
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
                {isCurrentUser && <span className="text-caption text-[#777169] ml-2">(you)</span>}
              </p>
              <p className="text-caption text-[#777169] truncate">{member.user.email}</p>
            </div>
            <Badge variant="outline" className={cn('text-xs gap-1', config.color)}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            {isOwner && !isCurrentUser && (
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
        <div className="text-center py-8 text-body-standard text-[#777169]">
          No members yet. Add someone to get started!
        </div>
      )}
      </div>
    </ScrollArea>
  )
}
