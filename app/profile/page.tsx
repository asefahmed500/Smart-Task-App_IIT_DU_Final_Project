import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/actions/auth-actions'
import { ProfileForm } from '@/components/profile-form'

export default async function ProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const result = await getUserProfile()
  const user = result.success ? (result.data as any) : null
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight font-oswald uppercase text-foreground">
          User <span className="text-primary">Profile</span>
        </h1>
        <p className="text-muted-foreground text-lg">Manage your personal information and account security.</p>
      </div>

      <ProfileForm user={user} />
    </div>
  )
}
