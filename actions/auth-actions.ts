'use server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  updateProfileSchema 
} from '@/lib/schemas'
import { sendPasswordResetEmail } from '@/utils/mail'
import crypto from 'crypto'
import { ActionResult } from '@/types/kanban'
import { createAuditLog } from '@/lib/create-audit-log'
import { z } from 'zod'

/**
 * Validates current password and sets a new one
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

/**
 * Requests a password reset link
 */
export async function requestPasswordReset(email: string): Promise<ActionResult> {
  const validation = forgotPasswordSchema.safeParse({ email })
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message }
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // For security, don't reveal if user exists in UI, but log it
      console.log(`Password reset requested for non-existent email: ${email}`)
      return { success: true, message: 'If an account exists with this email, a reset link has been sent.' }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    await prisma.passwordResetToken.upsert({
      where: { email },
      update: { token, expires },
      create: { email, token, expires }
    })

    const mailResult = await sendPasswordResetEmail(email, token)
    
    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      details: { email }
    })

    return { success: true, message: 'If an account exists with this email, a reset link has been sent.' }
  } catch (error) {
    console.error('Password reset request error:', error)
    return { success: false, error: 'Failed to process request' }
  }
}

/**
 * Resets password using a valid token
 */
export async function resetPassword(token: string, password: string): Promise<ActionResult> {
  const validation = resetPasswordSchema.safeParse({ token, password })
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message }
  }

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    })

    if (!resetToken || resetToken.expires < new Date()) {
      return { success: false, error: 'Invalid or expired token' }
    }

    const user = await prisma.user.findUnique({ where: { email: resetToken.email } })
    if (!user) return { success: false, error: 'User no longer exists' }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { email: resetToken.email },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      }),
    ])

    await createAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      details: { email: user.email }
    })

    return { success: true, message: 'Password reset successful. You can now log in.' }
  } catch (error) {
    console.error('Password reset error:', error)
    return { success: false, error: 'Failed to reset password' }
  }
}

/**
 * Updates the current user's profile information
 */
export async function updateProfile(data: z.infer<typeof updateProfileSchema>): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  const validation = updateProfileSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message }
  }

  try {
    const updateData: any = { name: validation.data.name }
    
    // Handle password update if provided
    if (validation.data.password) {
      updateData.password = await bcrypt.hash(validation.data.password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: updateData
    })

    await createAuditLog({
      userId: session.id,
      action: 'UPDATE_PROFILE',
      details: { name: validation.data.name, passwordChanged: !!validation.data.password }
    })

    revalidatePath('/dashboard')
    revalidatePath('/profile')
    return { success: true, data: updatedUser }
  } catch (error) {
    console.error('Update profile error:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}

export async function getUserProfile(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
      }
    })
    return { success: true, data: user }
  } catch (error) {
    console.error('Get user profile error:', error)
    return { success: false, error: 'Failed to fetch profile' }
  }
}

/**
 * Specifically for changing password from the profile page
 */
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

    await createAuditLog({
      userId: session.id,
      action: 'CHANGE_PASSWORD',
      details: { message: 'User changes their own password' }
    })

    return { success: true, message: 'Password updated successfully' }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, error: 'Failed to update password' }
  }
}

