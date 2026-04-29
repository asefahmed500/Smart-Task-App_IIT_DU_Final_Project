import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { z } from 'zod'

const setPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = setPasswordSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password)

    // Create Better Auth account for email/password authentication
    const existingAccount = await prisma.account.findFirst({
      where: {
        providerId: 'credential',
        accountId: email,
      },
    })

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          providerId: 'credential',
          accountId: email,
          userId: user.id,
          password: hashedPassword,
        },
      })
      console.log('Better Auth account created for:', email)
    } else {
      // Update existing account password
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      })
      console.log('Better Auth account password updated for:', email)
    }

    // Update user password (for backward compatibility)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailVerified: true, // Mark as verified since they set a password
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
    })
  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    )
  }
}
