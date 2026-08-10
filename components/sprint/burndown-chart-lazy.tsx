'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

interface BurndownChartProps {
  data: { date: string; ideal: number; actual: number }[]
  useStoryPoints?: boolean
  height?: number
}

// Lazy-loads recharts so the burndown chart is fetched only when shown —
// keeps it out of the sprint board's initial bundle.
export const BurndownChart: ComponentType<BurndownChartProps> = dynamic(
  () => import('./burndown-chart').then((m) => m.BurndownChart),
  {
    ssr: false,
    loading: () => <div className="h-[250px] w-full animate-pulse rounded-lg bg-muted/20" />,
  },
)
