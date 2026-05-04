'use client'

import { Button } from "@/components/ui/button"
import { Paperclip, Plus, Trash2, File, Image as ImageIcon, FileText, FileCode, Loader2, Download, WifiOff } from 'lucide-react'
import { Attachment } from '@/types/kanban'
import { useOfflineStore } from '@/lib/store/use-offline-store'

interface TaskAttachmentsSectionProps {
  attachments: Attachment[]
  onDeleteAttachment: (id: string) => Promise<void>
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  isUploading: boolean
}

export function TaskAttachmentsSection({
  attachments,
  onDeleteAttachment,
  onUpload,
  isUploading
}: TaskAttachmentsSectionProps) {
  const { isOnline } = useOfflineStore()
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="size-4" />
    if (type.includes('pdf')) return <FileText className="size-4" />
    if (type.includes('javascript') || type.includes('typescript') || type.includes('json')) return <FileCode className="size-4" />
    return <File className="size-4" />
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Paperclip className="size-4" />
          Attachments
        </div>
        <div className="relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={onUpload}
            disabled={isUploading || !isOnline}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-primary/20 hover:bg-primary/5"
            disabled={isUploading || !isOnline}
            title={isOnline ? 'Attach a file' : 'File uploads are not available offline'}
          >
            {isUploading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Plus className="mr-1 size-3" />}
            {isOnline ? 'Attach' : 'Offline'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="group flex items-center gap-3 p-3 rounded-lg border border-primary/5 bg-muted/20 hover:bg-muted/30 transition-all hover:border-primary/20"
          >
            {attachment.type.startsWith('image/') && attachment.url ? (
              <div className="size-10 rounded overflow-hidden bg-background border border-primary/5 shadow-sm flex-shrink-0">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="size-10 rounded bg-background flex items-center justify-center text-primary border border-primary/5 shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
                {getFileIcon(attachment.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate pr-6">{attachment.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {(attachment.size / 1024).toFixed(1)} KB • {new Date(attachment.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              {attachment.url && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  asChild
                >
                  <a href={attachment.url} download={attachment.name} title="Download">
                    <Download className="size-3" />
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteAttachment(attachment.id)}
                className="size-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {attachments.length === 0 && !isUploading && (
        <div className="text-center py-8 border-2 border-dashed border-primary/5 rounded-lg bg-muted/5">
          <p className="text-xs text-muted-foreground">No attachments yet</p>
        </div>
      )}
    </section>
  )
}
