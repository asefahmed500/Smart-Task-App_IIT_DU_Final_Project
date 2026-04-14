'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useGetUsersQuery } from '@/lib/slices/adminApi'

interface MemberInviteDialogProps {
  boardId: string
  onInvite: (userId: string, role: 'ADMIN' | 'MANAGER' | 'MEMBER') => Promise<void>
  existingMemberIds?: string[]
}

export default function MemberInviteDialog({ boardId, onInvite, existingMemberIds = [] }: MemberInviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER')
  const [isInviting, setIsInviting] = useState(false)

  const { data: users = [] } = useGetUsersQuery()

  const availableUsers = users.filter(user => !existingMemberIds.includes(user.id) && user.isActive)

  const handleInvite = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user to invite')
      return
    }

    setIsInviting(true)
    try {
      await onInvite(selectedUserId, role)
      toast.success('Member added successfully')
      setSelectedUserId('')
      setRole('MEMBER')
      setOpen(false)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to add member')
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle className="text-section-heading font-waldenburg font-light">Add Board Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-caption">Select User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user to invite" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="p-2 text-caption text-[#777169]">No available users</div>
                ) : (
                  availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-caption">Board Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'ADMIN' | 'MANAGER' | 'MEMBER')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Team Member</SelectItem>
                <SelectItem value="MANAGER">Team Manager</SelectItem>
                <SelectItem value="ADMIN">Board Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isInviting}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!selectedUserId || isInviting}>
              {isInviting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
