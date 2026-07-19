'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  LogOut,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Layout,
  History,
  CalendarDays,
  Layers,
  ListTodo,
  LayoutTemplate,
  ChevronRight,
  Loader2,
  Zap,
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
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createBoardFromTemplate } from "@/actions/board-actions"
import { BOARD_TEMPLATES } from "@/lib/board-templates"

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  scrum: <Zap className="size-3.5" />,
  kanban: <LayoutTemplate className="size-3.5" />,
  'product-launch': <Layers className="size-3.5" />,
  'bug-tracking': <BarChart3 className="size-3.5" />,
}

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
  const router = useRouter()
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [creating, setCreating] = useState<string | null>(null)

  const showTemplates = role === 'ADMIN' || role === 'MANAGER'

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
    { title: "Backlog", icon: ListTodo, url: "/manager/backlog" },
    { title: "Sprints", icon: CalendarDays, url: "/manager/sprints" },
    { title: "Epics", icon: Layers, url: "/manager/epics" },
    { title: "Team Members", icon: Users, url: "/manager/team" },
    { title: "Analytics", icon: BarChart3, url: "/manager/analytics" },
    { title: "Audit Logs", icon: History, url: "/manager/logs" },
  ]

  const memberItems = [
    { title: "My Dashboard", icon: LayoutDashboard, url: "/member" },
    { title: "Boards", icon: Layout, url: "/member/boards" },
    { title: "My Sprints", icon: CalendarDays, url: "/member/sprints" },
    { title: "My Backlog", icon: ListTodo, url: "/member/backlog" },
    { title: "Epics", icon: Layers, url: "/member/epics" },
    { title: "Reports", icon: BarChart3, url: "/member/reports" },
    { title: "My Activity", icon: History, url: "/member/logs" },
  ]

  const items = role === 'ADMIN' ? adminItems : role === 'MANAGER' ? managerItems : memberItems

  async function handleCreateFromTemplate(templateId: string) {
    setCreating(templateId)
    const res = await createBoardFromTemplate(templateId)
    setCreating(null)
    if (res.success && res.data) {
      toast.success(`Board "${(res.data as any).name}" created from template`)
      router.push(`/dashboard/board/${(res.data as any).id}`)
    } else {
      toast.error(res.error || 'Failed to create board from template')
    }
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="h-16 border-b border-sidebar-border px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 flex flex-row items-center gap-2">
        <div className="size-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
          <span className="text-on-primary font-bold text-sm">ST</span>
        </div>
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <span className="font-bold text-sm leading-none text-sidebar-foreground">SmartTask</span>
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

        {showTemplates && (
          <SidebarGroup>
            <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen}>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-sidebar-accent rounded-md px-2 py-1.5 transition-colors">
                  <span className="flex items-center gap-2">
                    <LayoutTemplate className="size-4" />
                    Templates
                  </span>
                  <ChevronRight className={`size-4 transition-transform ${templatesOpen ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {BOARD_TEMPLATES.map((template) => (
                      <SidebarMenuItem key={template.id}>
                        <SidebarMenuButton
                          tooltip={template.description}
                          disabled={creating === template.id}
                          onClick={() => handleCreateFromTemplate(template.id)}
                          className="cursor-pointer"
                        >
                          {creating === template.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            TEMPLATE_ICONS[template.id] || <LayoutTemplate className="size-3.5" />
                          )}
                          <span>{creating === template.id ? 'Creating...' : template.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-12" asChild>
              <Link href="/profile" className="flex items-center">
                <Avatar className="size-8 shrink-0">
                  {user.image && <AvatarImage src={user.image} />}
                  <AvatarFallback className="bg-accent/10 text-accent text-xs">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start ml-2 text-left overflow-hidden group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium leading-none truncate w-full text-sidebar-foreground">{user.name || 'Account'}</span>
                  <span className="text-xs text-muted-foreground mt-1 truncate w-full">{user.email}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
              tooltip="Logout"
              onClick={async (e: React.MouseEvent) => {
                e.preventDefault()
                const toastId = toast.loading('Logging out...')
                try {
                  const res = await fetch('/api/auth/logout', { method: 'POST' })
                  localStorage.removeItem('auth_token')
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
