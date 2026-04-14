import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  
  try {
    const { id } = await params

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.text?.trim()) {
       return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        text: body.text,
        taskId: id,
        userId: session.user.id
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
