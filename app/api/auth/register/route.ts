import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken } from '@/lib/auth'
import { rateLimit, getIdentifier } from '@/lib/rate-limiter'

export async function POST(req: NextRequest) {
  // Rate limiting: 3 registrations per hour per IP
  const identifier = getIdentifier(req)
  const rateLimitResult = await rateLimit(identifier, 3, 60 * 60 * 1000)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many registration attempts. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  try {
    const body = await req.json()
    // Note: `role` is intentionally NOT accepted from self-registration.
    // The first user becomes ADMIN automatically; all others start as MEMBER.
    const { email, password, name } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    const { validatePassword } = await import('@/lib/utils/password')
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.isValid) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // The first registered user automatically becomes ADMIN
    console.log('[Registration] Checking user count...')
    let userCount = 0
    try {
      userCount = await prisma.user.count()
      console.log(`[Registration] Current user count: ${userCount}`)
    } catch (dbError) {
      console.error('[Registration] Database connection failed during user count check:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed. Please ensure DATABASE_URL is correct.' },
        { status: 503 }
      )
    }

    const isFirstUser = userCount === 0
    const userRole = isFirstUser ? 'ADMIN' : 'MEMBER'

    // Hash password
    console.log('[Registration] Hashing password...')
    const hashedPassword = await hashPassword(password)

    // Create user
    console.log(`[Registration] Creating user with role: ${userRole}...`)
    let user
    try {
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: userRole,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
        },
      })
      console.log(`[Registration] User created successfully: ${user.id}`)
    } catch (createError) {
      console.error('[Registration] Database error during user creation:', createError)
      return NextResponse.json(
        { error: 'Failed to create user in database.' },
        { status: 500 }
      )
    }

    // Create token
    console.log('[Registration] Generating session token...')
    const token = await createToken(user)

    // Set cookie
    const response = NextResponse.json(
      {
        user,
        token,
        isFirstUser,
      },
      { status: 201 }
    )

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    console.log('[Registration] Registration complete.')
    return response
  } catch (error) {
    console.error('[Registration API Error]:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Internal server error during registration. Please check server logs.' },
      { status: 500 }
    )
  }
}
