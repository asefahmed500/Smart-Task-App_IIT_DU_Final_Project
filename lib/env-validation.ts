import { z } from 'zod'

/**
 * Environment variable schema with validation
 * Fails fast on startup if required variables are missing or invalid
 */
const envSchema = z.object({
  // Auth
  BETTER_AUTH_SECRET: z.string().min(64, 'BETTER_AUTH_SECRET must be at least 64 characters'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid URL'),

  // Server
  PORT: z.string().regex(/^\d+$/, 'PORT must be a number').transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  ALLOWED_ORIGIN: z.string().min(1, 'ALLOWED_ORIGIN is required'),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/, 'SMTP_PORT must be a number').transform(Number).optional(),
  SMTP_SECURE: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  SMTP_USER: z.string().email().optional(),
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

  try {
    validatedEnv = envSchema.parse(process.env)
    return validatedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
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
    throw new Error('Environment not validated. Call validateEnv() first.')
  }
  return validatedEnv
}

// Validate on import (fail fast during development)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  validateEnv()
}
