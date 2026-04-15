/**
 * Simple in-memory rate limiter for API routes
 * In production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const limiters = new Map<string, RateLimitEntry>()

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minute default
): Promise<RateLimitResult> {
  const now = Date.now()

  // Clean up expired entries
  for (const [key, entry] of limiters.entries()) {
    if (entry.resetTime < now) {
      limiters.delete(key)
    }
  }

  const entry = limiters.get(identifier)

  if (!entry || entry.resetTime < now) {
    // First request or window expired
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    }
    limiters.set(identifier, newEntry)

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Increment count
  entry.count += 1
  limiters.set(identifier, entry)

  const remaining = Math.max(0, maxRequests - entry.count)

  if (entry.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetTime: entry.resetTime,
  }
}

/**
 * Extract IP address from request
 */
export function getIdentifier(req: Request): string {
  // Try various headers for the real IP
  const headers = req.headers
  const forwardedFor = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip')

  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a default (in production, you might want to reject these)
  return 'unknown'
}
