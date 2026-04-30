import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { rateLimit, getIdentifier } from '@/lib/rate-limiter'

// GET /api/users/search?q=... - Search for active users to invite
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult

  // Rate limiting: 20 searches per minute per user
  const session = authResult as any
  const identifier = session?.user?.id || getIdentifier(req)
  const rateLimitResult = await rateLimit(identifier, 20, 60 * 1000)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Too many search requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''

    if (query.length < 2) {
      return NextResponse.json([])
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
      },
      take: 10,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Search users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
