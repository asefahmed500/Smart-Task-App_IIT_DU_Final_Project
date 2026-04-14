'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchUsersQuery } from '@/lib/slices/usersApi'

interface MemberInviteDialogProps {
  boardId: string
  onInvite: (userId: string, role: 'ADMIN' | 'MANAGER' | 'MEMBER') => Promise<void>
  existingMemberIds?: string[]
}

export default function MemberInviteDialog({ boardId, onInvite, existingMemberIds = [] }: MemberInviteDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER')
  const [isInviting, setIsInviting] = useState(false)

  const { data: searchResults = [], isLoading: isSearching } = useSearchUsersQuery(searchTerm, {
     skip: searchTerm.length < 2
  })

  const availableUsers = searchResults.filter(user => !existingMemberIds.includes(user.id))

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
            <Label className="text-caption">Search User (Name or Email)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Type at least 2 characters..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {searchTerm.length >= 2 && (
               <div className="border rounded-lg mt-2 max-h-[200px] overflow-y-auto bg-card">
                  {isSearching ? (
                     <div className="p-4 text-center text-caption text-muted-foreground">Searching...</div>
                  ) : availableUsers.length === 0 ? (
                     <div className="p-4 text-center text-caption text-muted-foreground">No users found</div>
                  ) : (
                     availableUsers.map(user => (
                        <div 
                          key={user.id} 
                          className={`flex items-center justify-between p-3 hover:bg-muted cursor-pointer transition-colors ${selectedUserId === user.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                          onClick={() => setSelectedUserId(user.id)}
                        >
                           <div>
                              <p className="text-body-standard font-medium">{user.name}</p>
                              <p className="text-caption text-muted-foreground">{user.email}</p>
                           </div>
                           {selectedUserId === user.id && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                           )}
                        </div>
                     ))
                  )}
               </div>
            )}
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
