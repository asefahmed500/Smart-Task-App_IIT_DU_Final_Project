import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'
import { sendPasswordResetEmail } from '@/lib/email'

// POST /api/admin/users/:id/reset-password - Generate password reset token (Admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate reset token
    const resetToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: userId },
      data: {
        resetToken,
        resetTokenExpires: expiresAt
      }
    })

    const resetUrl = `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(targetUser.email, resetUrl)

    return NextResponse.json({
      success: true,
      message: 'Password reset initiated',
      emailSent,
      // Only expose token in development
      ...(process.env.NODE_ENV === 'development' && { resetUrl, token: resetToken })
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
