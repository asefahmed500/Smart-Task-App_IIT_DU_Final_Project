import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/app-sidebar"
import { getSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { NotificationBell } from "@/components/notification-bell"

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background w-full">
          <AppSidebar user={session} />
          <main className="flex-1 flex flex-col min-w-0">
            {/* Premium Header */}
            <header className="h-16 border-b px-4 md:px-8 bg-background/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="h-4 w-px bg-border hidden md:block" />
                <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="hover:text-foreground transition-colors cursor-pointer font-medium">Manager</span>
                  <span>/</span>
                  <span className="text-foreground font-semibold">Dashboard</span>
                </nav>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold uppercase tracking-tighter text-primary">
                  Team Pulse Active
                </div>
                <NotificationBell userId={session.id} />
              </div>
            </header>

            {/* Content with Noise Overlay and Max Width Control */}
            <div className="flex-1 relative overflow-y-auto">
              <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
              <div className="mx-auto w-full p-4 md:p-6 lg:p-10 space-y-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}

