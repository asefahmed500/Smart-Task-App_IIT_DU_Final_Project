import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BoardCardProps {
  board: {
    id: string
    name: string
    description?: string | null
    color: string
    members?: any[]
    _count?: {
      tasks?: number
      members?: number
    }
    archived?: boolean
  }
  onClick: () => void
}

export function BoardCard({ board, onClick }: BoardCardProps) {
  return (
    <Card
      className="p-6 rounded-[20px] cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: board.color }}
          />
          <h3 className="text-body font-medium">{board.name}</h3>
        </div>
        {board.archived && (
          <span className="text-caption text-muted-foreground">Archived</span>
        )}
      </div>
      {board.description && (
        <p className="text-caption text-muted-foreground line-clamp-2 mb-4">
          {board.description}
        </p>
      )}
      <div className="flex items-center gap-4 text-caption text-muted-foreground">
        <span>{board._count?.members || board.members?.length || 0} members</span>
        <span>{board._count?.tasks || 0} tasks</span>
      </div>
    </Card>
  )
}
