'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/lib/hooks'
import { setOnline } from '@/lib/slices/uiSlice'
import { replayQueue } from '@/lib/offlineQueue'
import { toast } from 'sonner'
import { Wifi, WifiOff } from 'lucide-react'
import { useStore } from 'react-redux'

export function ConnectivityListener() {
  const dispatch = useAppDispatch()
  const store = useStore()
  
  useEffect(() => {
    const handleOnline = () => {
      dispatch(setOnline(true))
      toast.success('Back online!', {
        description: 'Syncing your offline actions...',
        icon: <Wifi className="h-4 w-4 text-green-500" />
      })
      replayQueue(store)
    }

    const handleOffline = () => {
      dispatch(setOnline(false))
      toast.error('You are offline', {
        description: 'Your changes will be saved and synced later.',
        icon: <WifiOff className="h-4 w-4 text-red-500" />,
        duration: Infinity,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Manual check on mount
    if (!navigator.onLine) {
      handleOffline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [dispatch, store])

  return null
}
