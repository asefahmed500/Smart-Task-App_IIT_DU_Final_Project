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
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
          Profile
        </h1>
        <p className="text-[14px] text-[#5A5A5A]">Manage your personal information and account security.</p>
      </div>

      <ProfileForm user={user} />
    </div>
  )
}
