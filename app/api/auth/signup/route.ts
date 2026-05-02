import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { login } from '@/lib/auth-server'
import { notifyAdminsNewUser } from '@/lib/notification-utils'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
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

    // Notify admins of new user signup
    notifyAdminsNewUser(user.id, user.name, user.email).catch(console.error)

    // Log the user in immediately after signup
    await login({ id: user.id, email: user.email, name: user.name, image: user.image, role: user.role })

    return NextResponse.json({ 
      user: { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role } 
    }, { status: 201 })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
