import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { login } from '@/lib/auth-server'
import { notifyAdminsNewUser, sendNotification } from '@/utils/notification-utils'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    if (!name || name.trim().length < 1) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'MEMBER' // Default role
      }
    })

    // Create default notification preferences
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
      }
    })

    // Notify admins of new user signup
    notifyAdminsNewUser(user.id, user.name, user.email).catch(console.error)

    // Log the user in immediately after signup
    await login({ id: user.id, email: user.email, name: user.name, image: user.image, role: user.role })

    // Auto-create a welcome board for new members
    if (user.role === 'MEMBER') {
      try {
        const welcomeBoard = await prisma.board.create({
          data: {
            name: `${name}'s Board`,
            description: 'Your personal board to explore and manage tasks',
            ownerId: user.id,
            members: {
              connect: { id: user.id }
            },
            columns: {
              create: [
                { name: 'To Do', order: 0 },
                { name: 'In Progress', order: 1 },
                { name: 'Done', order: 2 }
              ]
            }
          }
        })

        await sendNotification({
          userId: user.id,
          type: 'BOARD_MEMBER_ADDED',
          message: 'Developer assigned you a board to check the functionality of the system',
          link: `/dashboard/board/${welcomeBoard.id}`,
        })
      } catch (boardError) {
        console.error('Welcome board creation failed:', boardError)
      }
    }

    return NextResponse.json({ 
      user: { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role } 
    }, { status: 201 })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
