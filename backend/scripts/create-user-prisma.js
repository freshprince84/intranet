const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createUser() {
  console.log('Creating user "cursor"...');
  
  // Passwort hashen
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Cursor123!', salt);
  
  try {
    // Benutzer erstellen
    const user = await prisma.user.create({
      data: {
        username: 'cursor',
        email: 'cursor@example.com',
        password: hashedPassword,
        firstName: 'Cursor',
        lastName: 'AI',
        normalWorkingHours: 7.6,
        country: 'DE',
        language: 'de',
        payrollCountry: 'DE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('User created:', user.id);
    
    // Rolle 999 suchen
    const role = await prisma.role.findUnique({
      where: { id: 999 }
    });
    
    if (!role) {
      console.log('Role with ID 999 not found. Creating role...');
      // Rolle erstellen wenn sie nicht existiert
      const newRole = await prisma.role.create({
        data: {
          id: 999,
          name: 'Cursor AI',
          description: 'Special role for Cursor AI assistant',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('Role created:', newRole.id);
    }
    
    // UserRole erstellen
    const userRole = await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: 999,
        lastUsed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('UserRole created:', userRole.id);
    
    // Branch 1 dem Benutzer zuweisen
    const userBranch = await prisma.usersBranches.create({
      data: {
        userId: user.id,
        branchId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('UserBranch created:', userBranch.id);
    
    // Einstellungen für den Benutzer erstellen
    const settings = await prisma.settings.create({
      data: {
        userId: user.id,
        darkMode: false,
        sidebarCollapsed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('Settings created:', settings.id);
    
    console.log('User "cursor" successfully created with all required relations!');
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

createUser()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect()); 