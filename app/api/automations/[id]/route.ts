import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'
import { validateRequest } from '@/lib/api/validation-middleware'
import { updateAutomationSchema } from '@/lib/validations/automation'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/automations/:id - Get a single automation rule (all board members)
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const rule = await prisma.automationRule.findUnique({
      where: { id },
      include: {
        board: {
          select: { id: true, name: true }
        }
      }
    })

    if (!rule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    const hasAccess = await prisma.board.findFirst({
      where: {
        id: rule.boardId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      }
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      ...rule,
      trigger: JSON.parse(rule.trigger as string),
      condition: rule.condition ? JSON.parse(rule.condition as string) : null,
      action: JSON.parse(rule.action as string),
    })
  } catch (error) {
    console.error('Get automation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/automations/:id - Update an automation rule (Manager/Admin only)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const validation = await validateRequest(req, updateAutomationSchema)
    if (!validation.success) return validation.error

    const { name, trigger, condition, action, enabled } = validation.data

    const rule = await prisma.automationRule.findUnique({
      where: { id },
      include: { board: true }
    })

    if (!rule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    // Check board-level role (not platform role)
    const effectiveRole = await getEffectiveBoardRole(session, rule.boardId)
    if (effectiveRole === null) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Only managers and admins can update automations' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (trigger !== undefined) updateData.trigger = JSON.stringify(trigger)
    if (condition !== undefined) updateData.condition = condition ? JSON.stringify(condition) : null
    if (action !== undefined) updateData.action = JSON.stringify(action)
    if (enabled !== undefined) updateData.enabled = enabled

    const updatedRule = await prisma.automationRule.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: updateData as any,
    })

    await prisma.auditLog.create({
      data: {
        action: 'AUTOMATION_UPDATED',
        entityType: 'AutomationRule',
        entityId: id,
        actorId: userId,
        boardId: rule.boardId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        changes: updateData as any,
      },
    })

    // Broadcast automation update
    const { broadcastAutomationUpdate } = await import('@/lib/socket-server')
    const updatedAutomations = await prisma.automationRule.findMany({
      where: { boardId: rule.boardId },
      orderBy: { createdAt: 'desc' }
    })
    broadcastAutomationUpdate(rule.boardId, updatedAutomations)

    return NextResponse.json(updatedRule)
  } catch (error) {
    console.error('Update automation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/automations/:id - Delete an automation rule (Manager/Admin only)
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const rule = await prisma.automationRule.findUnique({
      where: { id },
      include: { board: true }
    })

    if (!rule) {
      return NextResponse.json({ error: 'Automation rule not found' }, { status: 404 })
    }

    // Check board-level role (not platform role)
    const effectiveRole = await getEffectiveBoardRole(session, rule.boardId)
    if (effectiveRole === null) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Only managers and admins can delete automations' }, { status: 403 })
    }

    await prisma.automationRule.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action: 'AUTOMATION_DELETED',
        entityType: 'AutomationRule',
        entityId: id,
        actorId: userId,
        boardId: rule.boardId,
        changes: { deletedRule: rule.name },
      },
    })

    // Broadcast automation update
    const { broadcastAutomationUpdate } = await import('@/lib/socket-server')
    const updatedAutomations = await prisma.automationRule.findMany({
      where: { boardId: rule.boardId },
      orderBy: { createdAt: 'desc' }
    })
    broadcastAutomationUpdate(rule.boardId, updatedAutomations)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete automation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
