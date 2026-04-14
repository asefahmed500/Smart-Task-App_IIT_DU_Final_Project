'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Edit2 } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { memo } from 'react'

interface PresenceStackProps {
  taskId: string
}

const PresenceStack = memo(function PresenceStack({ taskId }: PresenceStackProps) {
  // Get users viewing/editing this task from Redux presence slice
  const users = useAppSelector((state) => {
    const usersArray = Object.values(state.presence.users)
    return usersArray.filter(
      (user) => user.editingTaskId === taskId
    )
  })

  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-1 mt-2">
      {users.slice(0, 3).map((user) => (
        <div key={user.id} className="relative -space-x-2">
          <Avatar className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.avatar} alt={user.name || 'User'} />
            <AvatarFallback className="text-xs">{user.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          {user.isEditing && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center rounded-full">
              <Edit2 className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      ))}
      {users.length > 3 && (
        <Badge variant="secondary" className="h-6 px-1.5 text-xs">
          +{users.length - 3}
        </Badge>
      )}
    </div>
  )
})

export default PresenceStack
