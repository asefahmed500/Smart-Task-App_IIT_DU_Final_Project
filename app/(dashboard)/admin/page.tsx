'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { useCreateUserMutation } from '@/lib/slices/adminApi'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PlatformStats from '@/components/admin/platform-stats'
import UsersTable from '@/components/admin/users-table'
import BoardsTable from '@/components/admin/boards-table'
import AuditLogViewer from '@/components/admin/audit-log-viewer'
import PlatformSettings from '@/components/admin/platform-settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users as UsersIcon, LayoutGrid, ShieldAlert, Settings, UserPlus } from 'lucide-react'

const ROLES = ['ADMIN', 'MANAGER', 'MEMBER'] as const

export default function AdminPage() {
  const router = useRouter()
  const { data: session, isLoading } = useGetSessionQuery()
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation()
  
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MEMBER' as (typeof ROLES)[number]
  })

  useEffect(() => {
    if (!isLoading && session && session.role !== 'ADMIN') {
      router.replace(session.role === 'MANAGER' ? '/manager' : '/dashboard')
    }
  }, [session, isLoading, router])

  if (isLoading || (session && session.role !== 'ADMIN')) {
    return null
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await createUser(formData).unwrap()
      toast.success('User created successfully')
      setOpen(false)
      setFormData({ name: '', email: '', password: '', role: 'MEMBER' })
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to create user')
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-hero font-waldenburg font-light tracking-tight">Admin Control Center</h1>
            <p className="text-body text-muted-foreground mt-2">Manage the platform, oversight users, and audit all activities.</p>
          </div>
          <Button 
            className="rounded-[9999px] h-11 px-6 shadow-sm hover:translate-y-[-1px] transition-transform" 
            onClick={() => setOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Create New User
          </Button>
        </div>

        <PlatformStats />

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-[rgba(0,0,0,0.04)] p-1 h-10 w-fit">
            <TabsTrigger value="users" className="h-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <UsersIcon className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="boards" className="h-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutGrid className="h-4 w-4" />
              Board Oversight
            </TabsTrigger>
            <TabsTrigger value="audit" className="h-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ShieldAlert className="h-4 w-4" />
              Security Audit
            </TabsTrigger>
            <TabsTrigger value="settings" className="h-8 gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings className="h-4 w-4" />
              Platform Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="m-0 focus-visible:outline-none">
            <UsersTable />
          </TabsContent>

          <TabsContent value="boards" className="m-0 focus-visible:outline-none">
            <BoardsTable />
          </TabsContent>

          <TabsContent value="audit" className="m-0 focus-visible:outline-none">
            <AuditLogViewer />
          </TabsContent>

          <TabsContent value="settings" className="m-0 focus-visible:outline-none">
            <PlatformSettings />
          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-[24px]">
            <DialogHeader>
              <DialogTitle className="text-section-heading font-waldenburg font-light">Add New User</DialogTitle>
              <p className="text-caption text-muted-foreground">Define account details and system access level.</p>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Initial Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">System Role</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(v: any) => setFormData({ ...formData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Standard Member</SelectItem>
                    <SelectItem value="MANAGER">Team Manager</SelectItem>
                    <SelectItem value="ADMIN">Platform Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="rounded-[9999px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isCreating}
                className="rounded-[9999px]"
              >
                {isCreating ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
