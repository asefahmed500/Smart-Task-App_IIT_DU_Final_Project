import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/app-sidebar"
import { getSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { NotificationBell } from "@/components/notification-bell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-white w-full">
          <AppSidebar user={session} />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b border-[#E8E8E8] px-4 md:px-6 bg-white sticky top-0 z-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="h-3 w-px bg-[#E8E8E8]" />
                <span className="text-[13px] font-medium text-[#5A5A5A]">Admin Console</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#5A5A5A]">v0.0.1</span>
                <NotificationBell userId={session.id} />
              </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
