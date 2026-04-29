import { prisma } from '../lib/prisma.js'

async function main() {
  const verifications = await prisma.verification.findMany({});
  console.log('All verification codes:', JSON.stringify(verifications, null, 2));
}

main().catch(console.error)
