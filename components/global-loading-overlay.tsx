"use client"

import { useGlobalLoading } from "@/lib/store/use-global-loading"

/**
 * Full-screen loading overlay. Mounted once in the root layout; driven by
 * `useGlobalLoading().start()/stop()`. Shown during board/task/column/sprint
 * mutations so the user always sees a clear full-screen loading state while a
 * server action is in flight.
 */
export function GlobalLoadingOverlay() {
  const active = useGlobalLoading((s) => s.active)
  const message = useGlobalLoading((s) => s.message)

  if (active <= 0) return null

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-sm font-medium text-muted-text">{message ?? "Loading..."}</p>
    </div>
  )
}
