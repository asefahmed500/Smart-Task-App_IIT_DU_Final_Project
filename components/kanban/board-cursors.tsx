'use client'

import { useAppSelector } from '@/lib/hooks'
import { useGetSessionQuery } from '@/lib/use-session'
import { MousePointer2 } from 'lucide-react'

export function BoardCursors() {
  const presenceUsers = useAppSelector((state) => state.presence.users)
  const { data: session } = useGetSessionQuery()
  const currentUserId = session?.id

  const cursors = Object.entries(presenceUsers)
    .filter(([userId, user]) => userId !== currentUserId && user.cursor)
    .map(([userId, user]) => ({
      userId,
      name: user.name,
      cursor: user.cursor!,
      color: getUserColor(userId)
    }))

  if (cursors.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((c) => (
        <div
          key={c.userId}
          className="absolute transition-all duration-100 ease-linear"
          style={{
            left: `${c.cursor.x}%`,
            top: `${c.cursor.y}%`,
          }}
        >
          <MousePointer2 
            className="h-4 w-4" 
            style={{ 
              fill: c.color, 
              color: 'white',
              filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.2))'
            }} 
          />
          <div 
            className="ml-4 mt-1 px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap font-medium text-white shadow-sm"
            style={{ backgroundColor: c.color }}
          >
            {c.name}
          </div>
        </div>
      ))}
    </div>
  )
}

function getUserColor(userId: string): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}
