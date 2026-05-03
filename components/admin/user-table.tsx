'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Shield, User as UserIcon, Trash2, ShieldAlert, Edit2 } from "lucide-react"
import { updateUserRole, deleteUser, updateUserDetails } from '@/actions/admin-actions'
import { Role } from "@/generated/prisma/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AdminUser {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
}

interface UserTableProps {
  users: AdminUser[]
}

export function UserTable({ users: initialUsers }: UserTableProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null)
  const [editData, setEditData] = useState({ name: '', email: '' })

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole({ userId, role: role as Role })
      toast.success(`User role updated to ${role}`)
      setUsers(users.map(u => u.id === userId ? { ...u, role: role as Role } : u))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update role"
      toast.error(message)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToEdit) return
    setIsActionLoading(true)
    try {
      await updateUserDetails({ userId: userToEdit.id, ...editData })
      toast.success("User details updated")
      setUsers(users.map(u => u.id === userToEdit.id ? { ...u, ...editData } : u))
      setUserToEdit(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update user"
      toast.error(message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    setIsActionLoading(true)
    try {
      await deleteUser({ userId: userToDelete.id })
      toast.success("User deleted successfully")
      setUsers(users.filter(u => u.id !== userToDelete.id))
      setUserToDelete(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete user"
      toast.error(message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[250px]">User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="group transition-colors hover:bg-muted/50">
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="size-4 text-primary" />
                  </div>
                  <span>{user.name || 'N/A'}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <Badge 
                  variant="secondary" 
                  className={
                    user.role === 'ADMIN' 
                      ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                      : user.role === 'MANAGER'
                      ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                      : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                  }
                >
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={() => {
                        setUserToEdit(user)
                        setEditData({ name: user.name || '', email: user.email })
                      }} 
                      className="gap-2"
                    >
                      <Edit2 className="size-4" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Change Role</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'ADMIN')} className="gap-2">
                      <Shield className="size-4" /> Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'MANAGER')} className="gap-2">
                      <ShieldAlert className="size-4" /> Manager
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'MEMBER')} className="gap-2">
                      <UserIcon className="size-4" /> Member
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setUserToDelete(user)}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2"
                    >
                      <Trash2 className="size-4" /> Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Update the user&apos;s personal information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={editData.name} 
                onChange={(e) => setEditData({...editData, name: e.target.value})} 
                placeholder="Enter user name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email"
                value={editData.email} 
                onChange={(e) => setEditData({...editData, email: e.target.value})} 
                placeholder="Enter email address"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserToEdit(null)}>Cancel</Button>
              <Button type="submit" disabled={isActionLoading}>
                {isActionLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the account
              for <span className="font-semibold">{userToDelete?.email}</span> and remove their data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isActionLoading}
            >
              {isActionLoading ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
