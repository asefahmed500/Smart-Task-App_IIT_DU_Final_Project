'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

interface SystemActivityChartProps {
  data: { name: string; value: number }[]
}

// Lazy-loads recharts (large) so it is only fetched when the chart actually
// renders — keeps it out of the admin dashboard/reports initial bundles.
export const SystemActivityChart: ComponentType<SystemActivityChartProps> = dynamic(
  () => import('./activity-chart').then((m) => m.SystemActivityChart),
  {
    ssr: false,
    loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-muted/20" />,
  },
)
