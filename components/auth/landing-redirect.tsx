'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGetSessionQuery } from '@/lib/use-session'

export function LandingRedirect() {
  const router = useRouter()
  const { data: session, isLoading } = useGetSessionQuery()

  useEffect(() => {
    if (!isLoading && session) {
      if (session.role === 'ADMIN') {
        router.push('/admin')
      } else if (session.role === 'MANAGER') {
        router.push('/manager')
      } else {
        router.push('/dashboard')
      }
    }
  }, [session, isLoading, router])

  return null
}
