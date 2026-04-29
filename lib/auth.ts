import { prisma } from './prisma'
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import bcrypt from 'bcryptjs'

// Lazy import email functions to avoid edge runtime issues
const getEmailFunctions = async () => {
  try {
    const { sendVerificationEmail, sendPasswordResetEmail } = await import("./email")
    return { sendVerificationEmail, sendPasswordResetEmail }
  } catch {
    return null
  }
}

// Get allowed origins for CORS and CSRF
const getAllowedOrigins = () => {
  const allowed = process.env.ALLOWED_ORIGIN
  if (!allowed || allowed === '*') return []
  return allowed.split(',').map((o: string) => o.trim())
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // Email & Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Changed to false - users can login without verifying, but features will be limited
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false, // Don't auto-signin until email verified

    // Send password reset email
    sendResetPassword: async ({ user, url }) => {
      const emailFuncs = await getEmailFunctions()
      if (emailFuncs) {
        await emailFuncs.sendPasswordResetEmail(user.email, url)
      } else {
        console.warn('Email functions not available, password reset email not sent')
      }
    },

    resetPasswordTokenExpiresIn: 3600, // 1 hour
    revokeSessionsOnPasswordReset: true,
  },

  // Email verification
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const emailFuncs = await getEmailFunctions()
      if (emailFuncs) {
        await emailFuncs.sendVerificationEmail(user.email, url)
      } else {
        console.warn('Email functions not available, verification email not sent')
      }
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 86400, // 24 hours
    verificationCodeLength: 6, // 6-digit code
  },

  // Session management
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60, // 1 hour cache
    },
  },

  // Advanced security settings
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  // Allow specific origins
  trustedOrigins: getAllowedOrigins(),

  // Custom user fields
  user: {
    additionalFields: {
      role: {
        type: ['ADMIN', 'MANAGER', 'MEMBER'],
        required: false,
        defaultValue: 'MEMBER',
        input: false, // Don't allow users to set their own role
      },
      isActive: {
        type: 'boolean',
        required: false,
        defaultValue: true,
        input: false,
      },
    },
    additionalSignupFields: {
      name: {
        type: 'string',
        required: true,
      },
    },
  },

  // Account management
  account: {
    accountLinking: {
      enabled: false,
    },
  },
})

// Helper functions for password hashing and verification
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Helper function to get session from headers
export async function getSessionFromHeaders(headers: Headers) {
  return auth.api.getSession({ headers })
}

// Helper function to revoke all sessions for a user
export async function revokeAllSessions(userId: string) {
  await prisma.session.deleteMany({
    where: { userId }
  })
}
