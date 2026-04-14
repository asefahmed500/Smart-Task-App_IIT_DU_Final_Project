import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { requireApiRole } from '@/lib/session'

// GET /api/admin/users - List all users (Admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedBoards: true,
            memberships: true,
            assignedTasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create a new user with a specific role (Admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await req.json()
    const { email, password, name, role = 'MEMBER' } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    if (!['ADMIN', 'MANAGER', 'MEMBER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN, MANAGER, or MEMBER' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
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

    // Hash the password before storing
    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
