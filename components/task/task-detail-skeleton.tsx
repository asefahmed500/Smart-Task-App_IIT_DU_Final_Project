'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function TaskDetailSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-l border-slate-200/50">
      <div className="p-4 pb-0">
        <div className="w-[calc(100%-1rem)] mx-auto h-12 bg-slate-100 rounded-[16px] mb-6 border border-slate-200/50 flex items-center px-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex-1 h-10 rounded-[12px] bg-white/50 m-0.5" />
          ))}
        </div>

        <div className="px-4 space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>

          <div className="grid grid-cols-2 gap-y-8 gap-x-12 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-3 w-20 rounded-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>

          <Skeleton className="h-px w-full bg-slate-100" />

          <div className="space-y-6 pt-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
