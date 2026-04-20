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

interface AttachmentListProps {
  taskId: string
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

export default function AttachmentList({ taskId }: AttachmentListProps) {
  const { data: attachments, isLoading, refetch } = useGetAttachmentsQuery(taskId)
  const { data: session } = useGetSessionQuery()
  const [deleteAttachment, { isLoading: isDeleting }] = useDeleteAttachmentMutation()

  const handleDelete = async (attachmentId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return

    try {
      await deleteAttachment(attachmentId).unwrap()
      toast.success('Attachment deleted')
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
    <ScrollArea className="h-full">
      <div className="space-y-2 pr-4">
        {attachments.map((attachment) => {
          const FileIcon = getFileIcon(attachment.type)
          const isOwner = attachment.userId === session?.id
          const isImage = attachment.type.startsWith('image/')

          return (
            <Card key={attachment.id} className="p-3 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <Avatar className="h-12 w-12 rounded-lg bg-muted">
                      <AvatarFallback className="text-xs font-medium">
                        {getFileExtension(attachment.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={attachment.name}>
                    {attachment.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {attachment.user && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {attachment.user.name || 'Unknown'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(attachment.url, attachment.name)}
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment.id, attachment.name)}
                      disabled={isDeleting}
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}
