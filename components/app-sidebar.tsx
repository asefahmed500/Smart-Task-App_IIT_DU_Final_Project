'use client'

import {
  LayoutDashboard,
  Users,
  LogOut,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Layout,
  MessageSquare,
  History
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { toast } from "sonner"

interface AppSidebarProps {
  user: {
    name?: string | null
    email: string
    role: 'ADMIN' | 'MANAGER' | 'MEMBER'
    image?: string | null
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const { role } = user

  const adminItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/admin" },
    { title: "User Management", icon: Users, url: "/admin/users" },
    { title: "System Audit Logs", icon: ShieldCheck, url: "/admin/logs" },
    { title: "All Boards", icon: Layout, url: "/admin/boards" },
    { title: "Automation Rules", icon: ShieldAlert, url: "/admin/automation" },
    { title: "System Reports", icon: BarChart3, url: "/admin/reports" },
  ]

  const managerItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/manager" },
    { title: "Team Boards", icon: Layout, url: "/manager/boards" },
    { title: "Team Members", icon: Users, url: "/manager/team" },
    { title: "Analytics", icon: BarChart3, url: "/manager/analytics" },
    { title: "Audit Logs", icon: History, url: "/manager/logs" },
  ]

  const memberItems = [
    { title: "My Dashboard", icon: LayoutDashboard, url: "/member" },
    { title: "Boards", icon: Layout, url: "/member/boards" },
    { title: "Reports", icon: BarChart3, url: "/member/reports" },
    { title: "My Activity", icon: History, url: "/member/logs" },
  ]

  const items = role === 'ADMIN' ? adminItems : role === 'MANAGER' ? managerItems : memberItems

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="h-16 border-b px-6 flex flex-row items-center gap-2">
        <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">ST</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-none">SmartTask</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">{role}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>


      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-12" asChild>
              <Link href="/profile" className="flex items-center">
                <Avatar className="size-8">
                  {user.image && <AvatarImage src={user.image} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start ml-2 text-left overflow-hidden">
                  <span className="text-sm font-medium leading-none truncate w-full">{user.name || 'Account'}</span>
                  <span className="text-xs text-muted-foreground mt-1 truncate w-full">{user.email}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors" 
              onClick={async (e) => {
                e.preventDefault()
                const toastId = toast.loading('Logging out...')
                try {
                  const res = await fetch('/api/auth/logout', { method: 'POST' })
                  if (res.ok) {
                    toast.success('Logged out successfully', { id: toastId })
                    window.location.href = '/login'
                  } else {
                    toast.error('Logout failed', { id: toastId })
                  }
                } catch (error) {
                  console.error('Logout failed:', error)
                  toast.error('Logout failed. Please try again.', { id: toastId })
                }
              }}
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
