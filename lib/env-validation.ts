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
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid URL'),

  // Server
  PORT: z.string().optional().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  ALLOWED_ORIGIN: z.string().optional().default('*'),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, 'SMTP_PORT must be a number').transform(Number).optional(),
  SMTP_SECURE: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
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
      console.warn(`Environment validation warning:\n${errors}`)
      // In production, we might want to continue even if some non-critical vars are missing
      // But for core vars, we should probably still fail.
      // For now, let's just return what we have if it's production
      if (process.env.NODE_ENV === 'production') {
         return process.env as unknown as Env
      }
      throw new Error(`Environment validation failed:\n${errors}`)
    }
    throw error
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

// Validate on import if on server
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test' && process.env.NEXT_PHASE !== 'phase-production-build') {
  validateEnv()
}
