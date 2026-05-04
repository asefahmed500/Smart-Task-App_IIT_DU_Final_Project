"use client"

import { useEffect, ReactNode, useCallback, useRef } from "react"
import { useOfflineStore } from "@/lib/store/use-offline-store"
import { toast } from "sonner"
import { syncOfflineAction } from "@/lib/offline-sync"
import { WifiOff, Trash2, RefreshCw } from "lucide-react"

const MAX_RETRIES = 3

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
          const currentRetry = action.retryCount ?? 0
          if (currentRetry + 1 >= MAX_RETRIES) {
            await updateAction(action.id, {
              retryCount: currentRetry + 1,
              errorMsg: result?.error || "Sync failed",
            })
            failCount++
          } else {
            await updateAction(action.id, {
              retryCount: currentRetry + 1,
              errorMsg: result?.error || "Sync failed",
            })
            failCount++
          }
        }
      } catch (error) {
        const currentRetry = action.retryCount ?? 0
        if (currentRetry + 1 >= MAX_RETRIES) {
          await updateAction(action.id, {
            retryCount: currentRetry + 1,
            errorMsg: error instanceof Error ? error.message : "Unknown error",
          })
          failCount++
        } else {
          await updateAction(action.id, {
            retryCount: currentRetry + 1,
            errorMsg: error instanceof Error ? error.message : "Unknown error",
          })
          failCount++
        }
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
          const registration = await navigator.serviceWorker.register("/sw.js")
          console.log("SW registered: ", registration)
        } catch (err) {
          console.log("SW registration failed: ", err)
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

    if (navigator.onLine && queue.length > 0) {
      syncQueue()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      navigator.serviceWorker?.removeEventListener("message", handleMessage)
    }
  }, [setOnline, syncQueue, queue.length])

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
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive/90 text-destructive-foreground py-1.5 px-4 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 animate-in slide-in-from-top duration-300 backdrop-blur-sm">
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
      {children}
    </>
  )
}
