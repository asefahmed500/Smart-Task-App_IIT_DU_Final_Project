'use client'

import { useEffect, ReactNode, useCallback, useRef } from 'react'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { toast } from 'sonner'
import { syncOfflineAction } from '@/lib/offline-sync'
import { WifiOff } from 'lucide-react'

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { queue, isOnline, setOnline, removeAction, initQueue } = useOfflineStore()
  const isSyncingRef = useRef(false)

  // Initialize queue from IndexedDB
  useEffect(() => {
    initQueue().catch(err => console.error('Failed to init offline queue:', err))
  }, [initQueue])

  const syncQueue = useCallback(async () => {
    if (isSyncingRef.current || queue.length === 0) return
    
    isSyncingRef.current = true
    console.log('Syncing offline queue...', queue)
    
    // Create a copy to avoid mutation issues during loop
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
          console.error(`Failed to sync action ${action.id}:`, result?.error)
          failCount++
          // Optional: handle specific errors like 409 Conflict differently
        }
      } catch (error) {
        console.error(`Error syncing action ${action.id}:`, error)
        failCount++
      }
    }
    
    isSyncingRef.current = false

    if (successCount > 0) {
      toast.success(`Synced ${successCount} offline change${successCount > 1 ? 's' : ''}`)
    }
    if (failCount > 0) {
      toast.error(`Failed to sync ${failCount} change${failCount > 1 ? 's' : ''}. Will retry later.`)
    }
  }, [queue, removeAction])

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('SW registered: ', registration)
        } catch (err) {
          console.log('SW registration failed: ', err)
        }
      }
      
      if (document.readyState === 'complete') {
        registerSW()
      } else {
        window.addEventListener('load', registerSW)
      }
    }

    const handleOnline = () => {
      setOnline(true)
      toast.success('Back online! Syncing your changes...')
      syncQueue()
    }

    const handleOffline = () => {
      setOnline(false)
      toast.warning('Working offline. Changes will be synced when you reconnect.')
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_REQUIRED') {
        syncQueue()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    navigator.serviceWorker?.addEventListener('message', handleMessage)

    // Initial check if we are online and have items to sync
    if (navigator.onLine && queue.length > 0) {
      syncQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [setOnline, syncQueue, queue.length])

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-1 px-4 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <WifiOff className="size-3" />
          Offline Mode - {queue.length} changes pending sync
        </div>
      )}
      {children}
    </>
  )
}
