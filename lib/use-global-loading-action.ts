"use client"

import { useCallback } from "react"
import { useGlobalLoading } from "@/lib/store/use-global-loading"

/**
 * Wrap an async mutation so the full-screen loading overlay shows while it runs.
 * Keeps per-button `loading` state (spinner/disabled) and adds the global overlay.
 */
export function useGlobalLoadingAction() {
  const start = useGlobalLoading((s) => s.start)
  const stop = useGlobalLoading((s) => s.stop)

  return useCallback(
    async <T,>(fn: () => Promise<T>, message?: string): Promise<T> => {
      start(message)
      try {
        return await fn()
      } finally {
        stop()
      }
    },
    [start, stop]
  )
}
