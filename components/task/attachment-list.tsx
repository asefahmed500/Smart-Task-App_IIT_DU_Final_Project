'use client'

import { useGetAttachmentsQuery, useDeleteAttachmentMutation } from '@/lib/slices/tasksApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { File, Image as ImageIcon, FileText, Download, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { onAttachmentUpdate } from '@/lib/socket'

interface AttachmentListProps {
  taskId: string
  boardId?: string
}

// File type icons
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText
  return File
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Get file extension for fallback avatar
const getFileExtension = (name: string): string => {
  const ext = name.split('.').pop()?.toUpperCase()
  return ext || 'FILE'
}

export default function AttachmentList({ taskId, boardId }: AttachmentListProps) {
  const { data: attachments, isLoading, refetch } = useGetAttachmentsQuery(taskId)
  const { data: session } = useGetSessionQuery()
  const [deleteAttachment, { isLoading: isDeleting }] = useDeleteAttachmentMutation()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  const canManage = session?.role === 'ADMIN' || session?.role === 'MANAGER'

  useEffect(() => {
    const unsubscribe = onAttachmentUpdate((data) => {
      if (data.taskId === taskId) {
        refetch()
      }
    })
    return () => { unsubscribe() }
  }, [taskId, refetch])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await deleteAttachment({ id: deleteId, taskId }).unwrap()
      toast.success('Attachment deleted')
      setDeleteId(null)
      refetch()
    } catch (error) {
      toast.error('Failed to delete attachment')
    }
  }

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No attachments yet
      </div>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)] -mr-4 pr-4">
      <div className="space-y-3 pb-4">
        {attachments.map((attachment) => {
          const FileIcon = getFileIcon(attachment.type)
          const isOwner = attachment.userId === session?.id
          const isImage = attachment.type.startsWith('image/')

          return (
            <div 
              key={attachment.id} 
              className="group flex items-center gap-4 p-3.5 rounded-2xl bg-white border border-slate-100 transition-all duration-300 hover:shadow-md hover:border-primary/10"
            >
              {/* File Icon/Preview */}
              <div className="flex-shrink-0 relative">
                {isImage ? (
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-primary/60 transition-transform duration-300 group-hover:scale-105 shadow-sm">
                    <FileIcon className="h-5 w-5" />
                    <span className="absolute -bottom-1 -right-1 bg-white border border-slate-100 rounded-md px-1 py-0 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                      {getFileExtension(attachment.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-900 truncate group-hover:text-primary transition-colors duration-300" title={attachment.name}>
                  {attachment.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-medium text-slate-400">
                    {formatFileSize(attachment.size)}
                  </span>
                  <span className="text-slate-200">•</span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {attachment.user && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="h-3.5 w-3.5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500">
                      {attachment.user.name?.[0] || 'U'}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {attachment.user.name || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pr-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-primary/5 hover:text-primary"
                  onClick={() => handleDownload(attachment.url, attachment.name)}
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {(isOwner || canManage) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-destructive/5 hover:text-destructive"
                    onClick={() => {
                      setDeleteId(attachment.id)
                      setDeleteName(attachment.name)
                    }}
                    disabled={isDeleting}
                    title="Delete"
                  >
                    {isDeleting && deleteId === attachment.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title="Delete Attachment"
          description={`Are you sure you want to delete "${deleteName}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          confirmText="Delete"
          variant="destructive"
          isLoading={isDeleting}
        />
      </div>
    </ScrollArea>
  )
}
