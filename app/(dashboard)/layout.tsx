'use client'

import { useAppSelector } from '@/lib/hooks'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { setRole } from '@/lib/slices/roleSlice'
import { useAppDispatch } from '@/lib/hooks'
import Navbar from '@/components/layout/navbar'
import Sidebar from '@/components/layout/sidebar'
import RightSidebar from '@/components/layout/right-sidebar'
import CommandPalette from '@/components/command-palette'
import { UndoKeyboardHandler } from '@/components/undo-toast'
import { NetworkStatusListener } from '@/components/offline-banner'
import { ErrorBoundary } from '@/components/error-boundary'
import type { Role } from '@/lib/slices/roleSlice'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)
  const rightSidebarOpen = useAppSelector((state) => state.ui.rightSidebarOpen)

  const { data: session, isLoading, isError } = useGetSessionQuery()

  useEffect(() => {
    if (!isLoading && (isError || session === null)) {
      router.replace('/login')
      return
    }
    if (session?.role) {
      dispatch(setRole(session.role as Role))
    }
  }, [session, isLoading, isError, router, dispatch])

  if (isLoading || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background">
        <NetworkStatusListener />
        <UndoKeyboardHandler />

        {/* Fixed Left Sidebar — overlays content, uses fixed positioning */}
        <Sidebar />

        {/* Main content — shift right when sidebar open using padding-left transition */}
        <div
          className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
          style={{ paddingLeft: sidebarOpen ? 280 : 0 }}
        >
          <Navbar />
          <main className="flex-1 overflow-hidden relative">{children}</main>
        </div>

        {/* Right Sidebar — fixed on the right, overlays */}
        {rightSidebarOpen && <RightSidebar />}

        {/* Command Palette */}
        <CommandPalette />
      </div>
    </ErrorBoundary>
  )
}
