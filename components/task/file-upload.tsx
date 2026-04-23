'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, File, X, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  taskId: string
  onUploadComplete?: (attachment: any) => void
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

export default function FileUpload({ taskId, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    await uploadFiles(files)
  }, [taskId])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    await uploadFiles(files)
  }, [taskId])

  const uploadFiles = async (files: File[]) => {
    for (const file of files) {
      // Validate file size (10MB max)
      const MAX_SIZE = 10 * 1024 * 1024
      if (file.size > MAX_SIZE) {
        toast.error(`"${file.name}" is too large. Maximum size is 10MB.`)
        continue
      }

      // Validate file type
      const ALLOWED_TYPES = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
      ]

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" has an unsupported file type.`)
        continue
      }

      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/tasks/${taskId}/attachments/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const attachment = await response.json()
      setUploadedFiles(prev => [...prev, attachment])
      toast.success(`"${file.name}" uploaded successfully`)
      onUploadComplete?.(attachment)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={cn(
          'relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-500 cursor-pointer group',
          isDragging 
            ? 'border-primary bg-primary/5 scale-[1.02] shadow-2xl shadow-primary/10' 
            : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50/50',
          isUploading && 'pointer-events-none opacity-60'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {/* Decorative Background Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />

        <div className="relative flex flex-col items-center justify-center p-10 space-y-4">
          {isUploading ? (
            <div className="flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900">Uploading assets...</p>
                <p className="text-xs text-slate-500 mt-1">Please wait while we process your files</p>
              </div>
            </div>
          ) : (
            <>
              <div className="h-14 w-14 rounded-2xl bg-white shadow-soft-elevation flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-slate-100">
                <Upload className={cn(
                  "h-6 w-6 transition-colors duration-300",
                  isDragging ? "text-primary" : "text-slate-400 group-hover:text-primary"
                )} />
              </div>
              <div className="text-center max-w-[240px]">
                <p className="text-sm font-bold text-slate-900 leading-tight">
                  {isDragging ? 'Drop to upload' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Support for Images, PDFs, and Documents up to <span className="font-bold text-slate-700">10MB</span>
                </p>
              </div>
            </>
          )}
        </div>
        <input
          id="file-input"
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        />
      </div>

      {/* Upload Validation Info */}
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="mt-1 p-1.5 rounded-lg bg-white shadow-sm border border-slate-100">
          <AlertCircle className="h-4 w-4 text-slate-400" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Storage Policy</p>
          <ul className="grid grid-cols-1 gap-1 text-[11px] text-slate-500 font-medium">
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              Maximum 10MB per file
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              Secure encrypted storage
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-slate-300" />
              Standardized format processing
            </li>
          </ul>
        </div>
      </div>

      {/* Recently Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Recently Uploaded</p>
          <div className="space-y-2">
            {uploadedFiles.map((file) => {
              const FileIcon = getFileIcon(file.type)
              return (
                <div 
                  key={file.id} 
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm"
                >
                  <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                    <FileIcon className="h-4 w-4 text-primary/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate">{file.name}</p>
                    <p className="text-[11px] font-medium text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-slate-100 text-slate-400"
                    onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
