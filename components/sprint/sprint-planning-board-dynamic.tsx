'use client'

import dynamic from 'next/dynamic'

function PlanningLoading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        <span className="text-sm text-muted-text">Loading planning board...</span>
      </div>
    </div>
  )
}

export const SprintPlanningBoard = dynamic(
  () => import('./sprint-planning-board').then((m) => ({ default: m.SprintPlanningBoard })),
  { ssr: false, loading: PlanningLoading },
)
