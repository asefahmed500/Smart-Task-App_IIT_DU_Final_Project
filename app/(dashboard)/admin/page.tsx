'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGetSessionQuery } from '@/lib/slices/authApi'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ROLE_LABELS } from '@/lib/constants/colors'
import PlatformStats from '@/components/admin/platform-stats'
import UsersTable from '@/components/admin/users-table'
import BoardsTable from '@/components/admin/boards-table'
import AuditLogViewer from '@/components/admin/audit-log-viewer'
import PlatformSettings from '@/components/admin/platform-settings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users as UsersIcon, LayoutGrid, ShieldAlert, Plus, Settings } from 'lucide-react'
import { useCreateUserMutation } from '@/lib/slices/adminApi'
import { toast } from 'sonner'

const ROLES = ['ADMIN', 'MANAGER', 'MEMBER'] as const

export default function AdminPage() {
  const router = useRouter()
  const { data: session } = useGetSessionQuery()
  
  useEffect(() => {
    if (session && session.role !== 'ADMIN') {
      router.replace(session.role === 'MANAGER' ? '/manager' : '/dashboard')
    }
  }, [session, router])

  const [createUser] = useCreateUserMutation()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'MEMBER' as (typeof ROLES)[number]
  })

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
    } catch {
      toast.error('Failed to create user')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-hero font-waldenburg font-light">Admin Dashboard</h1>
          <p className="text-body text-[#777169] mt-2">Manage users and platform settings</p>
        </div>
        <Button onClick={() => setOpen(true)}>Create User</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[20px] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-section-heading font-waldenburg font-light">Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as typeof ROLES[number] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              Create User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PlatformStats />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-[rgba(0,0,0,0.04)] p-1 h-10 w-fit">
          <TabsTrigger value="users" className="h-8 gap-2">
            <UsersIcon className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="boards" className="h-8 gap-2">
            <LayoutGrid className="h-4 w-4" />
            Board Oversight
          </TabsTrigger>
          <TabsTrigger value="audit" className="h-8 gap-2">
            <ShieldAlert className="h-4 w-4" />
            Platform Audit
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-8 gap-2">
            <Settings className="h-4 w-4" />
            Global Settings
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
    </div>
  )
}
