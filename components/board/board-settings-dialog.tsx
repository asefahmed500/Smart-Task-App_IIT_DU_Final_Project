'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings, 
  Users, 
  Zap, 
  Loader2, 
  AlertTriangle,
  History,
  Link
} from 'lucide-react'
import {
  useUpdateBoardMutation,
  useDeleteBoardMutation,
  useAddBoardMemberMutation,
  useRemoveBoardMemberMutation,
  useUpdateBoardMemberRoleMutation,
  Board
} from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/use-session'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import AutomationBuilder from './automation-builder'
import MembersList from './members-list'
import MemberInviteDialog from './member-invite-dialog'
import BoardActivityFeed from './board-activity-feed'
import WebhookSettings from './webhook-settings'

interface BoardSettingsDialogProps {
  board: Board
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
}

const BOARD_COLORS = [
  '#000000', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#64748b'
]

export default function BoardSettingsDialog({ board, open, onOpenChange, currentUserId }: BoardSettingsDialogProps) {
  const router = useRouter()
  const { data: session } = useGetSessionQuery()
  const [activeTab, setActiveTab] = useState('general')
  const [updateBoard, { isLoading: isUpdating }] = useUpdateBoardMutation()
  const [deleteBoard, { isLoading: isDeleting }] = useDeleteBoardMutation()
  const [addMember] = useAddBoardMemberMutation()
  const [removeMember] = useRemoveBoardMemberMutation()
  const [updateRole] = useUpdateBoardMemberRoleMutation()

  const [formData, setFormData] = useState({
    name: board.name,
    description: board.description || '',
    color: board.color
  })

  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleUpdate = async () => {
    try {
      await updateBoard({ id: board.id, data: formData }).unwrap()
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to update board:', err)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteBoard(board.id).unwrap()
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to delete board:', err)
    }
  }

  // Find current user's role on this board (board-level only, no platform role fallback)
  const currentMember = board.members.find((m) => m.userId === currentUserId)
  const effectiveRole = currentMember?.role || (board.ownerId === currentUserId ? 'ADMIN' : null)
  const isAdmin = effectiveRole === 'ADMIN'
  const isManager = effectiveRole === 'MANAGER' || effectiveRole === 'ADMIN'
  const isOwner = board.ownerId === currentUserId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl min-h-[600px] max-h-[90vh] rounded-[24px] overflow-hidden p-0 gap-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Board Settings - {board.name}</DialogTitle>
          <DialogDescription>Configure board general settings, members, and automations.</DialogDescription>
        </DialogHeader>
        <div className="flex h-full">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-muted/20 border-r p-4 flex flex-col gap-2">
            <h2 className="text-body-medium font-medium px-2 py-4 flex items-center gap-2">
               <Settings className="h-4 w-4" />
               Board Settings
            </h2>
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex-1 flex flex-col">
              <TabsList className="bg-transparent flex-col h-auto p-0 gap-1 items-stretch">
                <TabsTrigger
                  value="general"
                  className="justify-start px-3 h-10 data-[state=active]:bg-card data-[state=active]:shadow-sm border-none"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="justify-start px-3 h-10 data-[state=active]:bg-card data-[state=active]:shadow-sm border-none"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
                {isManager && (
                  <TabsTrigger
                    value="automations"
                    className="justify-start px-3 h-10 data-[state=active]:bg-card data-[state=active]:shadow-sm border-none"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Automations
                  </TabsTrigger>
                )}
                {isManager && (
                  <TabsTrigger
                    value="webhooks"
                    className="justify-start px-3 h-10 data-[state=active]:bg-card data-[state=active]:shadow-sm border-none"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Webhooks
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="activity"
                  className="justify-start px-3 h-10 data-[state=active]:bg-card data-[state=active]:shadow-sm border-none"
                >
                  <History className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-card overflow-hidden">
            <ScrollArea className="flex-1 h-full">
              <div className="p-8">
                <Tabs value={activeTab}>
              <TabsContent value="general" className="m-0 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Board Name</Label>
                    <Input 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What is this project about?"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Board Branding Color</Label>
                    <div className="flex flex-wrap gap-3">
                      {BOARD_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-black scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t flex flex-col gap-8">
                  <Button onClick={handleUpdate} disabled={isUpdating} className="w-fit">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>

                  {isOwner && (
                    <div className="pt-6 border-t border-destructive/10">
                      <h3 className="text-body-medium font-medium text-destructive flex items-center gap-2 mb-2">
                         <AlertTriangle className="h-4 w-4" />
                         Danger Zone
                      </h3>
                      <p className="text-caption text-muted-foreground mb-4">
                        Deleting this board will remove all tasks, columns, and history. This action cannot be undone.
                      </p>
                      {!confirmDelete ? (
                        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                          Delete Board
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Confirm Permanent Delete'}
                          </Button>
                          <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="members" className="m-0 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="text-body-medium font-medium">Board Members</h3>
                    <p className="text-caption text-muted-foreground">Manage who has access to this board</p>
                  </div>
                  <MemberInviteDialog 
                    boardId={board.id} 
                    existingMemberIds={board.members.map(m => m.userId)}
                    onInvite={async (userId, role) => {
                       await addMember({ boardId: board.id, userId, role }).unwrap()
                    }}
                  />
                </div>
                <MembersList
                  members={board.members}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  isAdmin={isAdmin}
                  isManager={isManager}
                  onRemoveMember={(userId) => removeMember({ boardId: board.id, userId })}
                  onChangeRole={(userId, role) => updateRole({ boardId: board.id, userId, role })}
                />
              </TabsContent>

              <TabsContent value="automations" className="m-0">
                <div className="space-y-1 mb-6">
                  <h3 className="text-body-medium font-medium">No-Code Automations</h3>
                  <p className="text-caption text-muted-foreground">Set up rules to automate your workflow</p>
                </div>
                <AutomationBuilder
                  boardId={board.id}
                  members={board.members}
                />
              </TabsContent>

              <TabsContent value="webhooks" className="m-0">
                <WebhookSettings boardId={board.id} />
              </TabsContent>

              <TabsContent value="activity" className="m-0 space-y-6">
                <div className="space-y-1 mb-4">
                  <h3 className="text-body-medium font-medium">Board Activity</h3>
                  <p className="text-caption text-muted-foreground">Recent changes and events on this board</p>
                </div>
                <BoardActivityFeed boardId={board.id} />
              </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
