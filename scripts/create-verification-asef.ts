import { prisma } from '../lib/prisma.js'

async function main() {
  // Delete any existing verification codes for this email
  await prisma.verification.deleteMany({
    where: { identifier: 'asefahmed500@gmail.com' }
  });
  
  // Create a new verification code (will be updated by user)
  const code = '000000'; // Placeholder
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  await prisma.verification.create({
    data: {
      identifier: 'asefahmed500@gmail.com',
      value: code,
      expiresAt,
    },
  });
  
  console.log('Verification code created for asefahmed500@gmail.com');
  console.log('Current code: 000000 (placeholder - will update with real code)');
}

main().catch(console.error)
