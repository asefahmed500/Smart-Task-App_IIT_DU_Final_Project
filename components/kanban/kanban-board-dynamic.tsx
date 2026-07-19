'use client'

import dynamic from 'next/dynamic'

function BoardLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        <span className="text-sm text-muted-text">Loading board...</span>
      </div>
    </div>
  )
}

export const KanbanBoard = dynamic(
  () => import('./kanban-board').then(m => ({ default: m.KanbanBoard })),
  { ssr: false, loading: BoardLoading },
)
