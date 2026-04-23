/**
 * Hybrid rate limiter - Database-backed with in-memory cache
 * Uses dedicated RateLimit table for persistence across server restarts
 */

import { prisma } from './prisma'

const memoryCache = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Hybrid rate limiting - database for persistence, memory for speed
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const now = Date.now()
  const expiresAt = new Date(now + windowMs)

  // Check memory cache first (fast path)
  const cached = memoryCache.get(identifier)
  if (cached && cached.resetTime > now) {
    const remaining = Math.max(0, maxRequests - cached.count)
    if (cached.count > maxRequests) {
      return { success: false, limit: maxRequests, remaining: 0, resetTime: cached.resetTime }
    }
    cached.count++
    memoryCache.set(identifier, cached)
    return { success: true, limit: maxRequests, remaining: remaining - 1, resetTime: cached.resetTime }
  }

  // Database fallback for persistence
  try {
    let entry = await prisma.rateLimit.findUnique({ where: { identifier } })
    
    if (entry && entry.expiresAt > new Date(now)) {
      const remaining = Math.max(0, maxRequests - entry.count)
      if (entry.count > maxRequests) {
        return { success: false, limit: maxRequests, remaining: 0, resetTime: entry.expiresAt.getTime() }
      }
      // Update count
      entry = await prisma.rateLimit.update({
        where: { identifier },
        data: { count: entry.count + 1, updatedAt: new Date() },
      })
      memoryCache.set(identifier, { count: entry.count, resetTime: entry.expiresAt.getTime() })
      return { success: true, limit: maxRequests, remaining: remaining - 1, resetTime: entry.expiresAt.getTime() }
    }

    // Create new entry
    await prisma.rateLimit.upsert({
      where: { identifier },
      create: { identifier, count: 1, expiresAt },
      update: { count: 1, expiresAt, updatedAt: new Date() },
    })
    memoryCache.set(identifier, { count: 1, resetTime: expiresAt.getTime() })
    return { success: true, limit: maxRequests, remaining: maxRequests - 1, resetTime: expiresAt.getTime() }
  } catch {
    // Full in-memory fallback if DB unavailable
    const entry = memoryCache.get(identifier) ?? { count: 0, resetTime: now + windowMs }
    if (entry.resetTime <= now) {
      memoryCache.set(identifier, { count: 1, resetTime: now + windowMs })
      return { success: true, limit: maxRequests, remaining: maxRequests - 1, resetTime: now + windowMs }
    }
    entry.count++
    const remaining = Math.max(0, maxRequests - entry.count)
    if (entry.count > maxRequests) {
      return { success: false, limit: maxRequests, remaining: 0, resetTime: entry.resetTime }
    }
    memoryCache.set(identifier, entry)
    return { success: true, limit: maxRequests, remaining, resetTime: entry.resetTime }
  }
}

/**
 * Extract client IP from request headers
 */
export function getIdentifier(req: Request): string {
  const headers = req.headers
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    headers.get('cf-connecting-ip') ??
    'unknown'
  )
}
