import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/app-sidebar"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.role !== 'MEMBER') {
    redirect('/login')
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background">
          <AppSidebar user={session} />
          <main className="flex-1 overflow-auto">
            <div className="flex h-16 items-center border-b px-6 bg-background/95 backdrop-blur sticky top-0 z-10">
              <SidebarTrigger />
              <div className="ml-4 flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Member Dashboard</span>
              </div>
            </div>
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
