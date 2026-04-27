'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { WifiOff, RefreshCw, Smartphone, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { getQueueSize } from '@/lib/offlineQueue'

export function NetworkStatusListener() {
  const [isOnline, setIsOnline] = useState(true)
  const [queueSize, setQueueSize] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    setQueueSize(getQueueSize())

    const handleOnline = () => {
      setIsOnline(true)
      // Trigger sync logic if needed (handled by middleware usually)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Polling local storage for queue size updates (simple approach)
    const interval = setInterval(() => {
      setQueueSize(getQueueSize())
    }, 2000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
        >
          <div className="bg-white/70 backdrop-blur-md border border-[rgba(255,255,255,0.4)] shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[24px] p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-rose-100 p-2.5 rounded-full">
                <CloudOff className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <p className="text-body-standard font-medium text-black">Offline Mode</p>
                <p className="text-caption text-muted-foreground">
                  {queueSize > 0 
                    ? `${queueSize} action${queueSize > 1 ? 's' : ''} queued for sync` 
                    : 'Changes will be saved locally'}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-full shadow-sm hover:bg-white"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
