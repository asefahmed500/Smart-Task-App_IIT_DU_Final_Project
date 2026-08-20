import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

if (process.env.NODE_ENV === 'production') {
  config()
} else {
  config()
  config({ path: '.env.local' })
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL || env('DATABASE_URL'),
  },
})