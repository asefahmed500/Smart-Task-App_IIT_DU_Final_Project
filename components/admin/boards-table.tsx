'use client'

import { useGetBoardsQuery, useDeleteBoardMutation } from '@/lib/slices/boardsApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Trash2,
  ExternalLink,
  Loader2,
  Layout,
  Users,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function BoardsTable() {
  const { data: boards, isLoading } = useGetBoardsQuery()
  const [deleteBoard, { isLoading: isDeleting }] = useDeleteBoardMutation()

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete board "${name}"? This cannot be undone.`)) {
      return
    }

    try {
      await deleteBoard(id).unwrap()
      toast.success(`Board "${name}" deleted`)
    } catch {
      toast.error('Failed to delete board')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="border-[rgba(0,0,0,0.08)] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-body-medium font-medium">Platform Boards</CardTitle>
          <p className="text-caption text-muted-foreground mt-1">
             Oversee all active project workspaces across the organization.
          </p>
        </div>
        <Badge variant="secondary">{boards?.length || 0} Total</Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Board Name</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Team Size</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boards?.map((board) => (
              <TableRow key={board.id} className="group hover:bg-[rgba(0,0,0,0.01)] transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: board.color }} 
                    />
                    <div>
                      <p className="font-medium text-sm">{board.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                         {board.description || 'No description'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                       <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                       {board._count?.tasks || 0}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {board._count?.members || 0}
                   </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(board.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/board/${board.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(board.id, board.name)}
                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
