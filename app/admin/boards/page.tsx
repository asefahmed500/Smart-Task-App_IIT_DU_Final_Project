import { getAllBoards } from "@/lib/admin-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Layout, Users, Layers, Calendar, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface AdminBoard {
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

export default async function AdminBoardsPage() {
  const boards = await getAllBoards() as unknown as AdminBoard[]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">All Project Boards</h1>
          <p className="text-muted-foreground">Comprehensive overview of every task board across the organization.</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90 transition-all shadow-md hover:shadow-lg">
          <Layout className="size-4" />
          Create Global Board
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {boards.map((board: AdminBoard) => (
          <Card key={board.id} className="bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all group overflow-hidden">
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  {board._count.columns} Columns
                </Badge>
                <Link href={`/dashboard/board/${board.id}`} className="p-2 rounded-full hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100">
                  <ExternalLink className="size-4 text-primary" />
                </Link>
              </div>
              <CardTitle className="mt-4 text-xl group-hover:text-primary transition-colors">{board.name}</CardTitle>
              <CardDescription className="line-clamp-2">{board.description || 'No description provided.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  <span>{board._count.members} Members</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Layers className="size-4" />
                  <span>{board._count.columns} Steps</span>
                </div>
              </div>
              
              <div className="pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold">
                    {board.owner.name?.[0] || board.owner.email[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium truncate max-w-[120px]">{board.owner.name || board.owner.email}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  <Calendar className="size-3" />
                  {new Date(board.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {boards.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl bg-muted/50">
            <Layout className="size-12 opacity-20" />
            <p className="text-muted-foreground">No boards have been created yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
