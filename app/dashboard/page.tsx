import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardRedirect() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  if (session.role === 'ADMIN') {
    redirect('/admin')
  }

  if (session.role === 'MANAGER') {
    redirect('/manager')
  }

  // Default to member dashboard
  redirect('/member')
}
