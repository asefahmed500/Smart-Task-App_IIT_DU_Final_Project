import { prisma } from './prisma'
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import bcrypt from 'bcrypt'
import { SignJWT, jwtVerify } from 'jose'

import { jwt } from "better-auth/plugins/jwt"
import { cookies } from 'next/headers'
import { validateEnv } from './env-validation'

// Get allowed origins for CORS and CSRF
const getAllowedOrigins = () => {
  const allowed = process.env.ALLOWED_ORIGIN
  if (!allowed || allowed === '*') return []
  return allowed.split(',').map((o: string) => o.trim())
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
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
    // Disable cross-subdomain cookies for security
    crossSubDomainCookies: {
      enabled: false,
    },
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  // Allow specific origins only
  trustedOrigins: getAllowedOrigins(),
  plugins: [
    jwt({
        jwt: {
            expirationTime: "7d",
        }
    })
  ]
})

// Validate environment variables at module load time
const env = validateEnv()
const JWT_SECRET = new TextEncoder().encode(env.BETTER_AUTH_SECRET)

export interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  avatar: string | null
}

export interface Session {
  user: User
  token: string
  ipAddress?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(user: User, options?: { ipAddress?: string }): Promise<string> {
  const payload: Record<string, unknown> = { userId: user.id }
  
  // Optionally bind IP for additional security (can cause issues with mobile users)
  if (options?.ipAddress && process.env.NODE_ENV === 'production') {
    payload.ip = options.ipAddress
  }
  
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string; ip?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { 
      userId: payload.userId as string,
      ip: payload.ip as string | undefined
    }
  } catch {
    return null
  }
}

/**
 * Get session from token - verify and fetch user
 */
export async function getSession(token: string): Promise<Session | null> {
  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
    },
  })

  if (!user) return null

  return {
    user,
    token,
  }
}

/**
 * Revoke all sessions for a user (call when password changes)
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } })
}

/**
 * Get current IP from request headers
 * NOTE: Requires headers parameter - cookies are user-controlled and cannot be trusted
 */
export async function getClientIp(headers?: Headers): Promise<string> {
  if (headers) {
    const forwardedFor = headers.get('x-forwarded-for')
    const realIp = headers.get('x-real-ip')
    const cfConnectingIp = headers.get('cf-connecting-ip') // Cloudflare

    const ip = forwardedFor || realIp || cfConnectingIp || 'unknown'
    return ip.split(',')[0].trim()
  }

  // Fallback for backward compatibility (but warn)
  console.warn('[Security] getClientIp called without headers - IP may be unreliable')
  return 'unknown'
}
