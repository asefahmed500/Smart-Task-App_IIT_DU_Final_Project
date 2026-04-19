import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT } from 'jose'
import { sendVerificationEmail } from '@/lib/email'
import { rateLimit, getIdentifier } from '@/lib/rate-limiter'

const JWT_SECRET = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET)

// Generate verification token
async function generateVerificationToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'email_verification' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET)
}

// POST /api/auth/verify-email - Send verification email
export async function POST(req: NextRequest) {
  // Rate limiting: 3 emails per hour per IP
  const identifier = getIdentifier(req)
  const rateLimitResult = await rateLimit(identifier, 3, 60 * 60 * 1000)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many verification requests. Please try again later.',
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
      select: { id: true, email: true, emailVerified: true },
    })

    // Don't reveal if user exists
    if (!user) {
      return NextResponse.json(
        { message: 'If an account exists with this email, a verification link will be sent.' },
        { status: 200 }
      )
    }

    // Already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified.' },
        { status: 200 }
      )
    }

    // Generate verification token
    const token = await generateVerificationToken(user.id)

    // Create verification URL
    const verificationUrl = `${process.env.BETTER_AUTH_URL}/verify-email?token=${token}`

    // Send email
    const emailSent = await sendVerificationEmail(user.email, verificationUrl)

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Verification email sent successfully.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Send verification email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
