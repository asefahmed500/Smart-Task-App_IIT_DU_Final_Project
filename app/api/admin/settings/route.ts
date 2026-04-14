import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'

// GET /api/admin/settings - Get platform settings
export async function GET(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
    })

    if (!settings) {
      // Create defaults if not exists
      settings = await prisma.systemSettings.create({
        data: {
          id: 'global',
          platformName: 'SmartTask',
          allowMemberBoardCreation: true,
          defaultWipLimit: 5,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/settings - Update platform settings
export async function PATCH(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await req.json()
    const { platformName, allowMemberBoardCreation, defaultWipLimit } = body

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: {
        ...(platformName && { platformName }),
        ...(allowMemberBoardCreation !== undefined && { allowMemberBoardCreation }),
        ...(defaultWipLimit !== undefined && { defaultWipLimit }),
      },
      create: {
        id: 'global',
        platformName: platformName || 'SmartTask',
        allowMemberBoardCreation: allowMemberBoardCreation ?? true,
        defaultWipLimit: defaultWipLimit ?? 5,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'PLATFORM_SETTINGS_UPDATED',
        entityType: 'System',
        entityId: 'global',
        actorId: authResult.user.id,
        changes: body,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
