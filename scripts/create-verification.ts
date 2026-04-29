import { prisma } from '../lib/prisma.js'

async function main() {
  const code = '123456'; // Test code
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  
  await prisma.verification.create({
    data: {
      identifier: 'admin@test.com',
      value: code,
      expiresAt,
    },
  });
  
  console.log('Verification code created: 123456 for admin@test.com');
}

main().catch(console.error)
