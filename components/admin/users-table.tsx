'use client'

import { useCreateUserMutation, useGetUsersQuery, useUpdateUserMutation, useDeleteUserMutation, useResetUserPasswordMutation } from '@/lib/slices/adminApi'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { MoreVertical, Trash2, Shield, Key, Search, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react'
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'

const roleColors = {
  ADMIN: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  MANAGER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEMBER: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  avatar: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    ownedBoards: number
    memberships: number
    assignedTasks: number
  }
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

export default function UsersTable() {
  const { data: users, isLoading } = useGetUsersQuery()
  const [updateUser] = useUpdateUserMutation()
  const [deleteUser] = useDeleteUserMutation()
  const [resetUserPassword] = useResetUserPasswordMutation()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editRole, setEditRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER')

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MANAGER' | 'MEMBER'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Filter and paginate users
  const filteredUsers = useMemo(() => {
    if (!users) return []

    return users.filter((user) => {
      // Search filter
      const matchesSearch = !searchQuery ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())

      // Role filter
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter

      // Status filter
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.isActive) ||
        (statusFilter === 'INACTIVE' && !user.isActive)

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage)
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || []

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MANAGER' | 'MEMBER') => {
    // Safety check: Cannot demote the last active admin
    const activeAdmins = users?.filter(u => u.role === 'ADMIN' && u.isActive) || []
    const targetUser = users?.find(u => u.id === userId)
    
    if (targetUser?.role === 'ADMIN' && activeAdmins.length <= 1 && newRole !== 'ADMIN') {
      toast.error('Safety Rule: Cannot demote the last active administrator.')
      return
    }

    try {
      await updateUser({ id: userId, data: { role: newRole } }).unwrap()
      toast.success('User role updated successfully')
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to update user role')
    }
  }

  const handleToggleActive = async (user: User) => {
    // Safety check: Cannot deactivate the last active admin
    if (user.isActive && user.role === 'ADMIN') {
      const activeAdmins = users?.filter(u => u.role === 'ADMIN' && u.isActive) || []
      if (activeAdmins.length <= 1) {
        toast.error('Safety Rule: Cannot deactivate the last active administrator.')
        return
      }
    }

    try {
      await updateUser({ id: user.id, data: { isActive: !user.isActive } }).unwrap()
      toast.success(user.isActive ? 'User deactivated' : 'User reactivated')
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to update user status')
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setEditRole(user.role)
    setEditDialogOpen(true)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setRoleFilter('ALL')
    setStatusFilter('ALL')
    setCurrentPage(1)
    setItemsPerPage(20)
  }

  const handlePasswordReset = async (userId: string, userName: string) => {
    try {
      const result = await resetUserPassword(userId).unwrap()
      if (result.resetUrl) {
        toast.success(`Password reset link generated for ${userName}: ${result.resetUrl}`)
      } else {
        toast.success(`Password reset email sent to ${userName}`)
      }
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to send password reset')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777169]" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v as 'ALL' | 'ADMIN' | 'MANAGER' | 'MEMBER'); setCurrentPage(1) }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as 'ALL' | 'ACTIVE' | 'INACTIVE'); setCurrentPage(1) }}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <Button variant="outline" onClick={resetFilters} className="text-caption">
            Clear
          </Button>
        )}
      </div>

      {/* Results Count and Page Size Selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-caption text-[#777169]">
          Showing {paginatedUsers.length} of {filteredUsers.length} users
          {filteredUsers.length !== (users?.length || 0) && ` (filtered from ${users?.length || 0} total)`}
        </div>
        <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
          <SelectTrigger className="w-[100px] text-caption">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEMS_PER_PAGE_OPTIONS.map(size => (
              <SelectItem key={size} value={size.toString()}>{size} / page</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-nav font-medium text-black">User</TableHead>
              <TableHead className="text-nav font-medium text-black">Email</TableHead>
              <TableHead className="text-nav font-medium text-black">Role</TableHead>
              <TableHead className="text-nav font-medium text-black">Status</TableHead>
              <TableHead className="text-nav font-medium text-black">Boards</TableHead>
              <TableHead className="text-nav font-medium text-black">Tasks</TableHead>
              <TableHead className="text-right text-nav font-medium text-black">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-body-standard text-[#777169] py-8">
                  {searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'No users match your filters'
                    : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user: User) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || undefined} alt={user.name || 'User'} />
                        <AvatarFallback>{user.name?.[0] || user.email[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-body-standard font-medium">{user.name || 'Unnamed'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-body-standard">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleColors[user.role]}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-body-standard">{user._count?.ownedBoards || 0}</TableCell>
                  <TableCell className="text-body-standard">{user._count?.assignedTasks || 0}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-[12px]">
                        <DropdownMenuItem onClick={() => openEditDialog(user)} disabled={!user.isActive}>
                          <Shield className="mr-2 h-4 w-4" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePasswordReset(user.id, user.name || user.email)} disabled={!user.isActive}>
                          <Key className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className={user.isActive ? "text-destructive" : "text-green-600"} 
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Reactivate
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-caption text-[#777169]">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="text-caption"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="text-caption"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-section-heading font-waldenburg font-light">Change User Role</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 pb-4 border-b border-[rgba(0,0,0,0.05)]">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar || undefined} />
                  <AvatarFallback>{selectedUser.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-body font-medium">{selectedUser.name || 'Unnamed'}</p>
                  <p className="text-caption text-[#777169]">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-caption">Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as 'ADMIN' | 'MANAGER' | 'MEMBER')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Team Member</SelectItem>
                    <SelectItem value="MANAGER">Team Manager</SelectItem>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => { handleRoleChange(selectedUser.id, editRole); setEditDialogOpen(false) }}>
                Update Role
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
