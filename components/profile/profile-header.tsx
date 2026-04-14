'use client'

import { useGetProfileQuery } from '@/lib/slices/usersApi'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera } from 'lucide-react'
import { useState } from 'react'

interface ProfileHeaderProps {
  userId: string
}

const roleColors = {
  ADMIN: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  MANAGER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEMBER: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export default function ProfileHeader({ userId }: ProfileHeaderProps) {
  const { data: profile } = useGetProfileQuery()
  const [isUploading, setIsUploading] = useState(false)

  const handleAvatarUpload = async () => {
    setIsUploading(true)
    // TODO: Implement avatar upload
    setTimeout(() => setIsUploading(false), 2000)
  }

  if (!profile) return null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar || undefined} alt={profile.name || 'User'} />
              <AvatarFallback className="text-2xl">
                {profile.name?.[0] || profile.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="ghost"
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background border"
              onClick={handleAvatarUpload}
              disabled={isUploading}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold mb-1">{profile.name || 'User'}</h1>
            <p className="text-muted-foreground mb-3">{profile.email}</p>
            <Badge variant="outline" className={roleColors[profile.role]}>
              {profile.role}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{profile._count?.ownedBoards || 0}</p>
              <p className="text-sm text-muted-foreground">Boards</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile._count?.memberships || 0}</p>
              <p className="text-sm text-muted-foreground">Member Of</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{profile._count?.assignedTasks || 0}</p>
              <p className="text-sm text-muted-foreground">Tasks</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
