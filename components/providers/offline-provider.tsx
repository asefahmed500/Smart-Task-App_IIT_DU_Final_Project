"use client"

import { useEffect, ReactNode, useCallback, useRef } from "react"
import { useOfflineStore } from "@/lib/store/use-offline-store"
import { toast } from "sonner"
import { syncOfflineAction } from "@/lib/offline-sync"
import { WifiOff, Trash2, RefreshCw, X } from "lucide-react"

export function OfflineProvider({ children }: { children: ReactNode }) {
  const {
    queue,
    failedActions,
    isOnline,
    setOnline,
    removeAction,
    updateAction,
    initQueue,
    clearQueue,
    retryAction,
    dismissFailed,
  } = useOfflineStore()
  const isSyncingRef = useRef(false)
  const didInitialSyncRef = useRef(false)

  useEffect(() => {
    initQueue().catch((err) =>
      console.error("Failed to init offline queue:", err)
    )
  }, [initQueue])

  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current || queue.length === 0) return

    isSyncingRef.current = true
    const currentQueue = [...queue]
    let successCount = 0
    let failCount = 0

    for (const action of currentQueue) {
      try {
        const result = await syncOfflineAction(action)

        if (result?.success) {
          await removeAction(action.id)
          successCount++
        } else {
          // Both retry branches were identical — a failed action either still
          // has retries left (stays in queue) or hits the cap (moves to the
          // failed list via updateAction). Consolidate to one code path.
          await updateAction(action.id, {
            retryCount: (action.retryCount ?? 0) + 1,
            errorMsg: result?.error || "Sync failed",
          })
          failCount++
        }
      } catch (error) {
        await updateAction(action.id, {
          retryCount: (action.retryCount ?? 0) + 1,
          errorMsg: error instanceof Error ? error.message : "Unknown error",
        })
        failCount++
      }
    }

    isSyncingRef.current = false

    if (successCount > 0) {
      toast.success(
        `Synced ${successCount} offline change${successCount > 1 ? "s" : ""}`
      )
    }
    if (failCount > 0) {
      toast.error(
        `Failed to sync ${failCount} change${failCount > 1 ? "s" : ""}. Will retry later.`
      )
    }
  }, [queue, removeAction, updateAction])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const registerSW = async () => {
        try {
          await navigator.serviceWorker.register("/sw.js")
          if (process.env.NODE_ENV !== 'production') {
            console.log("SW registered")
          }
        } catch (err) {
          if (process.env.NODE_ENV !== 'production') {
            console.log("SW registration failed: ", err)
          }
        }
      }

      if (document.readyState === "complete") {
        registerSW()
      } else {
        window.addEventListener("load", registerSW)
      }
    }

    const handleOnline = () => {
      setOnline(true)
      toast.success("Back online! Syncing your changes...")
      syncQueue()
    }

    const handleOffline = () => {
      setOnline(false)
      toast.warning(
        "Working offline. Changes will be synced when you reconnect."
      )
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "SYNC_REQUIRED") {
        syncQueue()
      }
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    navigator.serviceWorker?.addEventListener("message", handleMessage)

    // Sync pending actions once on mount (page load while online). Do NOT run
    // on every queue change — that caused a retry cascade where each failed
    // attempt bumped retryCount, re-ran this effect, and immediately retried
    // the same actions again. Online/SYNC_REQUIRED events handle the rest.
    if (!didInitialSyncRef.current) {
      didInitialSyncRef.current = true
      if (navigator.onLine && useOfflineStore.getState().queue.length > 0) {
        syncQueue()
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      navigator.serviceWorker?.removeEventListener("message", handleMessage)
    }
  }, [setOnline, syncQueue])

  const handleClearQueue = async () => {
    if (!confirm(`Clear ${queue.length + failedActions.length} pending actions? This cannot be undone.`)) {
      return
    }
    await clearQueue()
    toast.success("Pending actions cleared")
  }

  const handleRetryFailed = async (id: string) => {
    await retryAction(id)
    toast.success("Action queued for retry")
    if (navigator.onLine) {
      syncQueue()
    }
  }

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive/90 text-destructive-foreground py-1.5 px-4 text-center text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-3 animate-in slide-in-from-top duration-300 backdrop-blur-sm">
          <WifiOff className="size-3 shrink-0" />
          <span>
            Offline — {queue.length} change{queue.length !== 1 ? "s" : ""} pending
            {failedActions.length > 0 &&
              ` · ${failedActions.length} failed`}
          </span>
          {queue.length > 0 && (
            <button
              onClick={handleClearQueue}
              className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors"
              title="Clear pending queue"
            >
              <Trash2 className="size-3" />
              <span>Clear</span>
            </button>
          )}
          {failedActions.length > 0 && (
            <button
              onClick={() => {
                failedActions.forEach(async (a) => {
                  await dismissFailed(a.id)
                })
                toast.success("Failed actions dismissed")
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-destructive-foreground/20 hover:bg-destructive-foreground/30 transition-colors"
              title="Dismiss all failed"
            >
              <span>Dismiss All</span>
            </button>
          )}
        </div>
      )}

      {/* Per-item failed-action retry list (only shown when something failed) */}
      {failedActions.length > 0 && (
        <div className="fixed top-7 left-0 right-0 z-[99] flex justify-center px-4">
          <div className="w-full max-w-xl rounded-lg border border-destructive/30 bg-background/95 backdrop-blur-xl shadow-xl p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-text px-2 pb-1">
              {failedActions.length} change{failedActions.length > 1 ? "s" : ""} failed to sync
            </p>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {failedActions.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-destructive/5 hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono font-semibold text-destructive shrink-0">
                      {a.type}
                    </span>
                    {a.errorMsg && (
                      <span className="text-[10px] text-muted-text truncate" title={a.errorMsg}>
                        {a.errorMsg}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRetryFailed(a.id)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-[10px] font-semibold"
                      title={`Retry ${a.type}`}
                    >
                      <RefreshCw className="size-3" />
                      Retry
                    </button>
                    <button
                      onClick={() => dismissFailed(a.id)}
                      className="flex items-center px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 transition-colors text-muted-text"
                      title="Dismiss"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
