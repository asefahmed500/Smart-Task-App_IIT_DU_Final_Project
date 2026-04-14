'use client'

import { useGetProfileQuery } from '@/lib/slices/usersApi'
import { useGetUserBoardsQuery } from '@/lib/slices/usersApi'
import ProfileHeader from '@/components/profile/profile-header'
import PersonalInfoForm from '@/components/profile/personal-info-form'
import ActivityFeed from '@/components/profile/activity-feed'
import SettingsSection from '@/components/profile/settings-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { data: boards } = useGetUserBoardsQuery()

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Header */}
      <ProfileHeader userId="" />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <PersonalInfoForm />
          <SettingsSection />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ActivityFeed />

          {/* My Boards */}
          <Card>
            <CardHeader>
              <CardTitle>My Boards</CardTitle>
            </CardHeader>
            <CardContent>
              {boards && boards.length > 0 ? (
                <div className="space-y-2">
                  {boards.map((board) => (
                    <Button
                      key={board.id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => router.push(`/board/${board.id}`)}
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: board.color }}
                      />
                      <span className="flex-1 text-left">{board.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {board._count?.tasks || 0} tasks
                      </span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You are not a member of any boards yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
