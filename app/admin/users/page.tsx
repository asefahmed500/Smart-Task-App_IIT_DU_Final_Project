import { getUsers } from '@/actions/admin-actions'
import { UserTable } from "@/components/admin/user-table"
import { AddUserDialog } from "@/components/admin/add-user-dialog"

export default async function AdminUsersPage() {
  const usersResult = await getUsers()
  const users = usersResult.success ? (usersResult.data as any[]) : []

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">User Management</h1>
          <p className="text-muted-foreground">Manage system users, assign roles, and handle account deletions.</p>
        </div>
        <AddUserDialog />
      </div>

      <UserTable users={users} />
    </div>
  )
}
