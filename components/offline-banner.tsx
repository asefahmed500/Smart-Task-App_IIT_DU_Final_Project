'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch } from '@/lib/hooks'
import { setOnlineStatus } from '@/lib/slices/presenceSlice'
import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function NetworkStatusListener() {
  const dispatch = useAppDispatch()
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      dispatch(setOnlineStatus(true))
      setShowBanner(true)

      // Hide banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      dispatch(setOnlineStatus(false))
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [dispatch])

  if (!showBanner || isOnline) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <Alert variant="destructive">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>You're offline</AlertTitle>
        <AlertDescription>
          <p className="text-sm mb-2">
            Your actions will be queued and synced when you reconnect.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reconnect
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
