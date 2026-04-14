import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'
import { z } from 'zod'

const settingsSchema = z.object({
  platformName: z.string().min(1).max(50),
  allowMemberBoardCreation: z.boolean(),
  defaultWipLimit: z.number().int().min(1).max(100),
})

// GET /api/admin/settings - Get global platform settings
export async function GET(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' }
    })

    if (!settings) {
      // Initialize with defaults if missing
      settings = await prisma.systemSettings.create({
        data: {
          id: 'global',
          platformName: 'SmartTask',
          allowMemberBoardCreation: true,
          defaultWipLimit: 5
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/settings - Update global platform settings
export async function PATCH(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const body = await req.json()
    const validated = settingsSchema.safeParse(body)
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: validated.error.format() },
        { status: 400 }
      )
    }

    const { platformName, allowMemberBoardCreation, defaultWipLimit } = validated.data

    const updated = await prisma.systemSettings.update({
      where: { id: 'global' },
      data: {
        platformName,
        allowMemberBoardCreation,
        defaultWipLimit
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'SETTINGS_UPDATED',
        entityType: 'System',
        entityId: 'global',
        actorId: session.user.id,
        changes: body
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
