'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

interface BoardAnalyticsDialogProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  boardName: string
}

// Lazy-loads the analytics dialog (recharts) so it is only fetched when the
// dialog opens — keeps recharts out of the kanban board's initial bundle.
export const BoardAnalyticsDialog: ComponentType<BoardAnalyticsDialogProps> = dynamic(
  () => import('./board-analytics-dialog').then((m) => m.BoardAnalyticsDialog),
  { ssr: false },
)
