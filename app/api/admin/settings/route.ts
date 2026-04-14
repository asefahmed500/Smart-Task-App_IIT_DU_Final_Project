import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'

// GET /api/admin/settings - Get platform settings (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' }
    })

    // Create default if they don't exist
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: 'global',
          platformName: 'SmartTask',
          allowMemberBoardCreation: true,
          defaultWipLimit: 5,
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Get system settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/settings - Update platform settings (Admin only)
export async function PATCH(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await req.json()
    const { platformName, allowMemberBoardCreation, defaultWipLimit, allowedColors } = body

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'global' },
      update: {
        platformName,
        allowMemberBoardCreation,
        defaultWipLimit,
        allowedColors
      },
      create: {
        id: 'global',
        platformName: platformName || 'SmartTask',
        allowMemberBoardCreation: allowMemberBoardCreation ?? true,
        defaultWipLimit: defaultWipLimit || 5,
        allowedColors
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Update system settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
