import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET)

// POST /api/auth/verify - Verify email with token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Verify token
    let payload: { userId: string; type: string } | null = null
    try {
      const { payload: verified } = await jwtVerify(token, JWT_SECRET)
      payload = verified as unknown as { userId: string; type: string }
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired verification token.' },
        { status: 400 }
      )
    }

    // Check token type
    if (payload?.type !== 'email_verification') {
      return NextResponse.json(
        { error: 'Invalid token type.' },
        { status: 400 }
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, emailVerified: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      )
    }

    // Already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified.' },
        { status: 200 }
      )
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    })

    return NextResponse.json(
      { message: 'Email verified successfully.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
