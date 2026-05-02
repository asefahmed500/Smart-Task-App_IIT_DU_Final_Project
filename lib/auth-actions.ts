'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sendPasswordResetEmail } from './mail'
import crypto from 'crypto'
import { ActionResult } from '@/types/kanban'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function requestPasswordReset(email: string): Promise<ActionResult> {
  if (!email) return { success: false, error: 'Email is required' }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // For security, don't reveal if user exists. 
      // But for this project, let's just return success so user knows we tried.
      return { success: true, message: 'If an account exists with this email, a reset link has been sent.' }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    await prisma.passwordResetToken.upsert({
      where: { email_token: { email, token } },
      update: { token, expires },
      create: { email, token, expires }
    })

    const mailResult = await sendPasswordResetEmail(email, token)
    if (!mailResult.success) {
      return { success: false, error: mailResult.error }
    }

    return { success: true, message: 'If an account exists with this email, a reset link has been sent.' }
  } catch (error) {
    console.error('Password reset request error:', error)
    return { success: false, error: 'Failed to process request' }
  }
}

export async function resetPassword(token: string, password: string): Promise<ActionResult> {
  if (!token || !password) return { success: false, error: 'Missing token or password' }

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    })

    if (!resetToken || resetToken.expires < new Date()) {
      return { success: false, error: 'Invalid or expired token' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      })
    ])

    return { success: true, message: 'Password reset successful. You can now log in.' }
  } catch (error) {
    console.error('Password reset error:', error)
    return { success: false, error: 'Failed to reset password' }
  }
}

export async function changePassword(data: any): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const validation = changePasswordSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return { success: false, error: 'User not found' }

    const isMatch = await bcrypt.compare(validation.data.currentPassword, user.password)
    if (!isMatch) return { success: false, error: 'Incorrect current password' }

    const hashedPassword = await bcrypt.hash(validation.data.newPassword, 10)

    await prisma.user.update({
      where: { id: session.id },
      data: { password: hashedPassword }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: 'CHANGE_PASSWORD',
        details: { message: 'User changed their own password' }
      }
    })

    return { success: true, message: 'Password updated successfully' }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, error: 'Failed to update password' }
  }
}
