import { useAppSelector } from '@/lib/hooks'
import { cn } from '@/lib/utils'

interface LiveCursorBadgeProps {
  taskId: string
}

export function LiveCursorBadge({ taskId }: LiveCursorBadgeProps) {
  const usersEditing = useAppSelector((state) => state.presence.usersEditing)
  const presenceUsers = useAppSelector((state) => state.presence.users)

  // Get users editing this specific task
  const editingUsers = usersEditing.filter((u) => u.taskId === taskId)

  if (editingUsers.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      {editingUsers.slice(0, 2).map((user) => {
        const presenceUser = presenceUsers[user.userId]
        if (!presenceUser) return null

        return (
          <div
            key={user.userId}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              'bg-blue-500/10 text-blue-600 border border-blue-500/20',
              'animate-pulse'
            )}
            title={`${user.userName} is editing this task`}
          >
            <span className="h-3 w-3">✏️</span>
            <span>{getInitials(user.userName)}</span>
          </div>
        )
      })}
      {editingUsers.length > 2 && (
        <div
          className={cn(
            'flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium',
            'bg-gray-500/10 text-gray-600 border border-gray-500/20'
          )}
          title={`${editingUsers.length - 2} more people editing`}
        >
          +{editingUsers.length - 2}
        </div>
      )}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
