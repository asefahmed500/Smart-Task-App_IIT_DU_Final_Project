import { prisma } from '../lib/prisma.js'

async function main() {
  const account = await prisma.account.findFirst({
    where: { accountId: 'test@example.com' }
  });
  
  console.log('Account data:', JSON.stringify(account, null, 2));
}

main().catch(console.error)
