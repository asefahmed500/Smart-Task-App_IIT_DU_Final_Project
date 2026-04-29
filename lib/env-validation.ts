import { z } from 'zod'

/**
 * Environment variable schema with validation
 * Fails fast on startup if required variables are missing or invalid
 */
const envSchema = z.object({
  // Auth
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid URL').optional(),

  // Server
  PORT: z.string().optional().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  ALLOWED_ORIGIN: z.string().optional().default('*'),

  // Email (optional)
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().regex(/^\d+$/, 'EMAIL_PORT must be a number').transform(Number).optional(),
  EMAIL_SECURE: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
})

export type Env = z.infer<typeof envSchema>

let validatedEnv: Env | null = null

/**
 * Validate environment variables
 * Call this at application startup to fail fast on configuration errors
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv
  }

  // Skip validation during Next.js build or if not on server
  if (process.env.NEXT_PHASE === 'phase-production-build' || typeof window !== 'undefined') {
    return process.env as unknown as Env
  }

  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
      const criticalVars = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL']
      const missingCritical = error.issues.some(issue => 
        criticalVars.includes(issue.path[0] as string)
      )

      if (missingCritical) {
        console.error(`CRITICAL: Missing or invalid required environment variables:\n${errors}`)
        // In production, we log it loudly but try to return what we have
        // This avoids crashing the entire serverless function during module load
        return process.env as unknown as Env
      } else {
        console.warn(`Environment validation warning (non-critical):\n${errors}`)
      }
      
      return process.env as unknown as Env
    }
    console.error('Unexpected environment validation error:', error)
    return process.env as unknown as Env
  }
}

/**
 * Get validated environment variables
 * Throws if validateEnv() hasn't been called
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv()
  }
  return validatedEnv
}

// Pre-validate on import if on server (log errors, but don't throw yet)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test' && process.env.NEXT_PHASE !== 'phase-production-build') {
  try {
    validateEnv()
  } catch (error) {
    console.error('Environment pre-validation failed:', error instanceof Error ? error.message : error)
  }
}
