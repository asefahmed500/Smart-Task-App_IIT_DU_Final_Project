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

    const logs = await prisma.timeLog.findMany({
      where: { taskId: id },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Fetch time logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id
  
  try {
    const { id } = await params
    const body = await req.json()
    const { action, description, duration: manualDuration } = body

    const task = await prisma.task.findUnique({
      where: { id },
      select: { boardId: true, totalTimeSpent: true, title: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    let log;

    if (action === 'start') {
      const existingRunning = await prisma.timeLog.findFirst({
        where: {
          taskId: id,
          userId,
          endTime: null
        }
      })

      if (existingRunning) {
        return NextResponse.json({ error: 'Timer already running' }, { status: 400 })
      }

      log = await prisma.timeLog.create({
        data: {
          taskId: id,
          userId,
          description,
          startTime: new Date()
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        }
      })
    } else if (action === 'stop') {
      const runningLog = await prisma.timeLog.findFirst({
        where: {
          taskId: id,
          userId,
          endTime: null
        },
        orderBy: { startTime: 'desc' }
      })

      if (!runningLog) {
        return NextResponse.json({ error: 'No running timer found' }, { status: 400 })
      }

      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - runningLog.startTime.getTime()) / 1000)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      log = await prisma.$transaction(async (tx: any) => {
        const updatedLog = await tx.timeLog.update({
          where: { id: runningLog.id },
          data: {
            endTime,
            duration
          },
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        })

        await tx.task.update({
          where: { id },
          data: {
            totalTimeSpent: { increment: duration }
          }
        })

        return updatedLog
      })
    } else if (action === 'manual') {
      if (!manualDuration || manualDuration <= 0) {
        return NextResponse.json({ error: 'Duration is required for manual log' }, { status: 400 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      log = await prisma.$transaction(async (tx: any) => {
        const newLog = await tx.timeLog.create({
          data: {
            taskId: id,
            userId,
            description,
            duration: manualDuration,
            startTime: new Date(Date.now() - manualDuration * 1000),
            endTime: new Date()
          },
          include: {
            user: { select: { id: true, name: true, avatar: true } }
          }
        })

        await tx.task.update({
          where: { id },
          data: {
            totalTimeSpent: { increment: manualDuration }
          }
        })

        return newLog
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Broadcast updates
    const { broadcastTimeLogUpdate, broadcastTaskUpdate } = await import('@/lib/socket-server')
    broadcastTimeLogUpdate(task.boardId, id)
    
    // Also broadcast full task update so UI shows updated totalTimeSpent
    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } }
      }
    })
    if (updatedTask) {
      broadcastTaskUpdate(task.boardId, updatedTask as any)
    }

    return NextResponse.json(log)
  } catch (error) {
    console.error('Time log error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
