'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  UserPlus, 
  Trash2, 
  Search,
  Shield,
  User,
  Loader2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { searchUsers, addBoardMember, removeBoardMember, undoLastAction } from '@/lib/board-actions'

interface ManageMembersDialogProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  members: Array<{
    id: string
    name: string | null
    email: string
    image: string | null
    role: string
  }>
}

export function ManageMembersDialog({ isOpen, onClose, boardId, members }: ManageMembersDialogProps) {
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    name: string | null
    email: string
    image: string | null
  }>>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (val: string) => {
    setSearch(val)
    if (val.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const result = await searchUsers({ query: val })
      if (result.success && result.data) {
        // Filter out existing members
        const filtered = result.data.filter((r: any) => !members.some(m => m.id === r.id))
        setSearchResults(filtered as Array<{
          id: string
          name: string | null
          email: string
          image: string | null
        }>)
      } else {
        setSearchResults([])
      }
    } catch (error: unknown) {
      console.error(error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddMember = async (userId: string) => {
    try {
      const result = await addBoardMember({ boardId, userId })
      if (result.success) {
        toast.success('Member added successfully', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const undoResult = await undoLastAction()
              if (undoResult.success) {
                toast.success('Action undone')
              } else {
                toast.error(undoResult.error || 'Failed to undo')
              }
            }
          }
        })
        setSearch('')
        setSearchResults([])
      } else {
        toast.error(result.error || 'Failed to add member')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add member'
      toast.error(message)
    } finally {
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    try {
      const result = await removeBoardMember({ boardId, userId })
      if (result.success) {
        toast.success('Member removed successfully', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const undoResult = await undoLastAction()
              if (undoResult.success) {
                toast.success('Action undone')
              } else {
                toast.error(undoResult.error || 'Failed to undo')
              }
            }
          }
        })
      } else {
        toast.error(result.error || 'Failed to remove member')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove member'
      toast.error(message)
    } finally {
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/10">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-wider text-xl">Manage Members</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label>Invite New Member</Label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search users to invite..." 
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9 bg-background/50 border-primary/10"
                  />
                  {search && (
                    <button 
                      onClick={() => { setSearch(''); setSearchResults([]) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-primary/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 space-y-1">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleAddMember(user.id)}
                        className="w-full flex items-center justify-between p-2 hover:bg-primary/5 rounded-lg transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={user.image ?? undefined} />
                            <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-medium">{user.name || 'Unnamed'}</span>
                            <span className="text-[10px] text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                        <UserPlus className="size-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {isSearching && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-primary/10 rounded-xl p-4 flex justify-center z-50">
                  <Loader2 className="size-4 animate-spin text-primary" />
                </div>
              )}

              {search.length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-primary/10 rounded-xl p-4 text-center text-xs text-muted-foreground z-50">
                  No users found matching {search}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Current Members ({members.length})</Label>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-primary/5 group">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarImage src={member.image ?? undefined} />
                      <AvatarFallback>{member.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium leading-none">{member.name || 'Unnamed'}</span>
                      <span className="text-[10px] text-muted-foreground">{member.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold tracking-tighter h-5">
                      {member.role === 'ADMIN' ? <Shield className="size-3 mr-1" /> : <User className="size-3 mr-1" />}
                      {member.role}
                    </Badge>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className="size-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
