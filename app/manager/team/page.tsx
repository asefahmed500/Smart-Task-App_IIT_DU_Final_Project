'use client'

import { useState, useEffect } from 'react'
import { getManagerTeam } from "@/lib/manager-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Mail, Shield, Calendar, Search, Filter, MoreHorizontal, UserCheck, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
  image?: string | null
  createdAt: Date
}

export default function ManagerTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string | 'ALL'>('ALL')

  useEffect(() => {
    getManagerTeam().then((res) => {
      if (res.success) {
        setTeam(res.data as TeamMember[])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredTeam = team.filter(member => {
    const matchesSearch = 
      (member.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  if (loading) {
    return <div className="p-8">Loading team...</div>
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground">Collaborators across all your project boards.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search team members..." 
            className="pl-10 h-11 bg-card/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="outline" className="px-3 py-1 gap-1.5 h-11 bg-card/50">
            <Filter className="size-3.5" />
            <select 
              className="bg-transparent outline-none text-xs font-semibold uppercase tracking-wider cursor-pointer"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Roles</option>
              <option value="MANAGER">Managers</option>
              <option value="MEMBER">Members</option>
            </select>
          </Badge>
          <Button variant="outline" className="gap-2 h-11 px-4">
            <Users className="size-4" />
            Team View
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredTeam.map((member) => (
          <Card key={member.id} className="group overflow-hidden border-primary/5 hover:border-primary/20 transition-all bg-card/50 backdrop-blur-sm hover:shadow-lg">
            <CardHeader className="pb-4 relative">
              <div className="absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem className="gap-2">
                      <MessageSquare className="size-4" /> Message
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2">
                      <UserCheck className="size-4" /> View Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2">
                      <Shield className="size-4" /> Remove from Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="size-16 border-2 border-primary/10 group-hover:border-primary/30 transition-colors shadow-sm">
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback className="text-lg bg-primary/5 text-primary">
                    {member.name?.[0] || member.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 className="font-bold text-lg leading-none truncate group-hover:text-primary transition-colors">
                    {member.name || 'Unnamed User'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="size-3.5" />
                    <span className="truncate">{member.email}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex flex-wrap gap-2">
                <Badge variant={member.role === 'ADMIN' ? 'default' : member.role === 'MANAGER' ? 'secondary' : 'outline'} className="gap-1 px-2.5">
                  <Shield className="size-3" />
                  {member.role}
                </Badge>
                <Badge variant="outline" className="bg-primary/5 border-primary/10 gap-1 px-2.5">
                  <Calendar className="size-3" />
                  Since {new Date(member.createdAt).toLocaleDateString()}
                </Badge>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-9 hover:bg-primary/5 hover:text-primary border-primary/10">
                  View Tasks
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs h-9 hover:bg-primary/5 hover:text-primary border-primary/10">
                  Performance
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTeam.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl bg-muted/20">
            <Users className="size-12 opacity-20" />
            <div className="text-center">
              <p className="font-medium">No team members found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
            <Button onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); }} variant="ghost">Clear Filters</Button>
          </div>
        )}
      </div>
    </div>
  )
}
