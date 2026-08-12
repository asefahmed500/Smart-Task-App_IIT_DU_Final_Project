'use client'

import { useEffect } from 'react'

const STALE_PATTERNS = [
  /module factory is not available/i,
  /deleted in an HMR update/i,
  /Failed to find Server Action/i,
  /may be from an older or newer deployment/i,
]

const RECOVERY_KEY = 'stale-state-recovery-count'

/**
 * Graceful recovery from Turbopack/Next dev + deploy stale-module errors.
 *
 * When the dev server restarts (or a deployment changes) while a tab is open,
 * the old module graph and server-action IDs are gone. The browser shows
 * "module factory is not available" and 404s on server actions. A hard reload
 * fixes it, but users shouldn't have to know that — this component does a
 * one-time auto-reload guarded against loops.
 */
export function StaleStateRecovery() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const triggerReload = () => {
      try {
        const count = Number(sessionStorage.getItem(RECOVERY_KEY) || 0)
        if (count >= 1) return
        sessionStorage.setItem(RECOVERY_KEY, String(count + 1))
      } catch {
        return
      }
      window.location.reload()
    }

    const matchError = (msg: string) =>
      typeof msg === 'string' && STALE_PATTERNS.some((re) => re.test(msg))

    const onError = (event: ErrorEvent) => {
      if (matchError(event.message)) triggerReload()
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? '')
      if (matchError(msg)) triggerReload()
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  return null
}
