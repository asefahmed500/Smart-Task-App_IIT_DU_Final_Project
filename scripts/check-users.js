const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });
  console.log('Users:', JSON.stringify(users, null, 2));

  // Check if asefahmed500@gmail.com exists
  const member = users.find(u => u.email === 'asefahmed500@gmail.com');
  if (member) {
    console.log('\nFound member:', member.id);
  }

  // Check if admin exists
  const admin = users.find(u => u.role === 'ADMIN');
  if (admin) {
    console.log('\nFound admin:', admin.email, admin.id);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
