import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SignJWT, jwtVerify } from 'jose'
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

// Verify JWT token
async function verifyVerificationToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string }
  } catch (error) {
    return null
  }
}

// GET /api/auth/verify-email - Verify email from link
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(
      `${process.env.BETTER_AUTH_URL}/login?error=missing_token`
    )
  }

  try {
    // Verify token
    const payload = await verifyVerificationToken(token)

    if (!payload) {
      return NextResponse.redirect(
        `${process.env.BETTER_AUTH_URL}/login?error=invalid_token`
      )
    }

    // Update user email verification status
    await prisma.user.update({
      where: { id: payload.userId },
      data: { emailVerified: true },
    })

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.BETTER_AUTH_URL}/login?verified=true`
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(
      `${process.env.BETTER_AUTH_URL}/login?error=verification_failed`
    )
  }
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
