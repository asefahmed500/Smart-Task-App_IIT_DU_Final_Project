'use client'

import { useState, useEffect } from 'react'
import { getMemberBoards } from '@/actions/member-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layout, Users, Layers, ExternalLink, Calendar, Star, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface MemberBoard {
  id: string
  name: string
  description: string | null
  createdAt: Date
  owner: {
    name: string | null
    email: string
  }
  _count: {
    members: number
    columns: number
  }
}

export default function MemberBoardsPage() {
  const [boards, setBoards] = useState<MemberBoard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMemberBoards().then((res) => {
      if (res.success) {
        setBoards(res.data as MemberBoard[])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading your workspaces...</div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Project Boards</h1>
          <p className="text-muted-foreground">Workspaces where you are an active collaborator.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Card key={board.id} className="group relative overflow-hidden border-primary/5 hover:border-primary/20 transition-all bg-card/50 backdrop-blur-sm hover:shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Layout className="size-5" />
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-amber-500 transition-colors">
                    <Star className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors">{board.name}</CardTitle>
              <CardDescription className="line-clamp-2 h-10">{board.description || 'No description provided.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  <span>{board._count.members} Members</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  <span>{board._count.columns} Steps</span>
                </div>
              </div>
              
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="size-6 border">
                    <AvatarFallback className="text-[10px] bg-muted">{board.owner.name?.[0] || board.owner.email[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Managed by</span>
                    <span className="text-xs font-medium truncate max-w-[100px]">{board.owner.name || board.owner.email}</span>
                  </div>
                </div>
                <Link href={`/dashboard/board/${board.id}`}>
                  <Button size="sm" className="gap-2 px-4 shadow-sm hover:shadow-md transition-all">
                    Open Board
                    <ExternalLink className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {boards.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-xl bg-muted/30">
            <Layout className="size-12 opacity-20" />
            <div className="text-center">
              <p className="font-medium">No boards found</p>
              <p className="text-sm text-muted-foreground">You haven&apos;t been added to any boards yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
