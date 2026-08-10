import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Serves a stored attachment's file bytes.
 *
 * URL: /api/attachments/[id]/file  (id = attachment id)
 *
 * Same-origin requests (e.g. <img src>, <a download>) send the httpOnly
 * session cookie automatically, so we authenticate + check board access here.
 * The bytes are read from the FileBlob table (base64) and returned with the
 * original content-type and a Content-Disposition for download.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: { blob: true, task: { include: { column: { include: { board: { include: { members: { select: { id: true } } } } } } } } },
    })

    if (!attachment || !attachment.blob) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const board = attachment.task.column.board
    const isMember = board.members.some((m) => m.id === session.id)
    const isOwner = board.ownerId === session.id
    const isAdmin = session.role === 'ADMIN'
    if (!isMember && !isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const buffer = Buffer.from(attachment.blob.data, 'base64')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': attachment.type || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Content-Disposition': `attachment; filename="${attachment.name.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
