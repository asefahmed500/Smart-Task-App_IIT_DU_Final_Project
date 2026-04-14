import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  
  try {
    const { id } = await params
    const body = await req.json()
    const { type, linkedTaskId } = body

    if (!type || !linkedTaskId) {
       return NextResponse.json({ error: 'Type and linked taskId required' }, { status: 400 })
    }

    if (id === linkedTaskId) {
       return NextResponse.json({ error: 'Cannot depend on self' }, { status: 400 })
    }

    // Identify which is blocking which
    const blockerId = type === 'BLOCKS' ? id : linkedTaskId
    const blockingId = type === 'BLOCKS' ? linkedTaskId : id

    // See if exists
    const exists = await prisma.taskBlock.findUnique({
      where: {
        blockerId_blockingId: {
          blockerId,
          blockingId
        }
      }
    })

    if (exists) {
      return NextResponse.json({ message: 'Dependency already exists' }, { status: 200 })
    }

    const dep = await prisma.taskBlock.create({
      data: {
        blockerId,
        blockingId,
        createdById: session.user.id
      }
    })

    // Optionally mark the blocked task as Blocked if not already
    await prisma.task.update({
       where: { id: blockingId },
       data: { isBlocked: true }
    })

    return NextResponse.json(dep)
  } catch (error) {
    console.error('Create dependency error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
