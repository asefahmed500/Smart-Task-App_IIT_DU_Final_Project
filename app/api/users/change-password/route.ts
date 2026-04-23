import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword, revokeAllSessions } from '@/lib/auth'
import { requireApiAuth } from '@/lib/session'

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Passwords required' }, { status: 400 })
    }

    // Validate new password complexity
    const { validatePassword } = await import('@/lib/utils/password')
    const passwordCheck = validatePassword(newPassword)
    if (!passwordCheck.isValid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Current password incorrect' }, { status: 401 })
    }

    // Hash new password and update
    const hashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    // Security: Revoke all sessions when password changes (forces re-login)
    // In production, consider letting current session stay valid
    await revokeAllSessions(userId)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
        actorId: userId,
        changes: { timestamp: new Date().toISOString() }
      }
    })

    return NextResponse.json({ success: true, message: 'All sessions invalidated. Please log in again.' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
