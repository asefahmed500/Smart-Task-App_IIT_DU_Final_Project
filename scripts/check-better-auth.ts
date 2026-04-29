import { prisma } from '../lib/prisma.js'

async function main() {
  const users = await prisma.user.findMany({
    where: { email: 'asefahmed500@gmail.com' },
    include: { accounts: true, sessions: true }
  });
  
  console.log('User data:', JSON.stringify(users, null, 2));
}

main().catch(console.error)
