import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// Load .env.local file
config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  // Prisma 7 requires explicit override for direct URL
  override: {
    directUrl: process.env.DIRECT_URL,
  },
})
