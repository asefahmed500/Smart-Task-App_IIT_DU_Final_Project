import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT, jwtVerify } from 'jose'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit, getIdentifier } from '@/lib/rate-limiter'
import { randomBytes } from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET)

// Generate reset token
async function generateResetToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'password_reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET)
}

// POST /api/auth/reset-password - Request password reset
export async function POST(req: NextRequest) {
  // Rate limiting: 3 requests per hour per IP
  const identifier = getIdentifier(req)
  const rateLimitResult = await rateLimit(identifier, 3, 60 * 60 * 1000)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many reset requests. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    // Don't reveal if user exists
    if (!user) {
      return NextResponse.json(
        { message: 'If an account exists with this email, a password reset link will be sent.' },
        { status: 200 }
      )
    }

    // Generate reset token
    const token = await generateResetToken(user.id)

    // Store token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    // Create reset URL
    const resetUrl = `${process.env.BETTER_AUTH_URL}/reset-password?token=${token}`

    // Send email
    const emailSent = await sendPasswordResetEmail(user.email, resetUrl)

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Password reset email sent successfully.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Send reset email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/auth/reset-password - Confirm password reset with new password
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, newPassword } = body

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required.' },
        { status: 400 }
      )
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      )
    }

    // Verify token
    let payload: { userId: string; type: string } | null = null
    try {
      const { payload: verified } = await jwtVerify(token, JWT_SECRET)
      payload = verified as unknown as { userId: string; type: string }
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired reset token.' },
        { status: 400 }
      )
    }

    // Check token type
    if (payload?.type !== 'password_reset') {
      return NextResponse.json(
        { error: 'Invalid token type.' },
        { status: 400 }
      )
    }

    // Find user with valid reset token
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        resetToken: true,
        resetTokenExpires: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    // Check if token matches and hasn't expired
    if (user.resetToken !== token || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token.' },
        { status: 400 }
      )
    }

    // Hash new password
    const bcrypt = await import('bcryptjs')
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    })

    return NextResponse.json(
      { message: 'Password reset successfully.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
