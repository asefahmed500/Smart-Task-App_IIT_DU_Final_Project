import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Return 200 even if user not found for security (don't leak emails)
      return NextResponse.json({ message: 'If an account exists with this email, a reset link has been sent.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    await prisma.passwordResetToken.upsert({
      where: { email },
      update: { token, expires },
      create: { email, token, expires },
    })

    // IN PRODUCTION: Send email here.
    // FOR THIS TASK: Log to console.
    console.log(`[PASSWORD RESET] Token for ${email}: ${token}`)
    console.log(`[PASSWORD RESET] Link: http://localhost:3002/reset-password?token=${token}&email=${email}`)

    return NextResponse.json({ message: 'If an account exists with this email, a reset link has been sent.' })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
