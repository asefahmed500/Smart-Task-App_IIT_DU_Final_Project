import { prisma } from './prisma'
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import bcrypt from 'bcrypt'
import { SignJWT, jwtVerify } from 'jose'

import { jwt } from "better-auth/plugins/jwt"

// Get allowed origins for CORS and CSRF
const getAllowedOrigins = () => {
  const allowed = process.env.ALLOWED_ORIGIN?.split(',') || ['http://localhost:3000']
  return allowed.map(o => o.trim())
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

// Enforce secure JWT secret - must be set and at least 64 characters
if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required. Set it to a secure random string of at least 64 characters.')
}

if (process.env.BETTER_AUTH_SECRET.length < 64) {
  throw new Error(`BETTER_AUTH_SECRET must be at least 64 characters long for security. Current length: ${process.env.BETTER_AUTH_SECRET.length}`)
}

const JWT_SECRET = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET)

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
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createToken(user: User): Promise<string> {
  return new SignJWT({ userId: user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { userId: payload.userId as string }
  } catch {
    return null
  }
}

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
