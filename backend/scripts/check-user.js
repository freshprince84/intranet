const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  console.log('Checking if user "cursor" exists...');
  
  const user = await prisma.user.findUnique({
    where: { username: 'cursor' },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      roles: {
        select: {
          roleId: true,
          role: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });
  
  if (user) {
    console.log('User found:');
    console.log(JSON.stringify(user, null, 2));
  } else {
    console.log('User "cursor" not found.');
  }
}

checkUser()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect()); 