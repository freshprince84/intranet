#!/usr/bin/env node
/**
 * Erklärt die verschiedenen Admin-Rollen
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Admin-Rollen Analyse...\n');
  
  try {
    const adminRoles = await prisma.role.findMany({
      where: { name: 'Admin' },
      include: { organization: true },
      orderBy: { id: 'asc' }
    });
    
    console.log('='.repeat(60));
    console.log('ADMIN-ROLLEN ÜBERSICHT:');
    console.log('='.repeat(60));
    
    for (const role of adminRoles) {
      const userCount = await prisma.userRole.count({ where: { roleId: role.id } });
      const orgName = role.organizationId 
        ? (role.organization?.name || 'N/A')
        : 'NULL (global)';
      
      let zweck = '';
      if (role.organizationId === null) {
        zweck = 'Globaler Admin (für alle Organisationen) - aus Seed';
      } else if (role.organizationId === 3) {
        zweck = 'Standard-Organisation Admin (Rückwärtskompatibilität) - aus Seed';
      } else {
        zweck = `Organisations-spezifischer Admin für ${orgName}`;
      }
      
      console.log(`\nID: ${role.id}`);
      console.log(`  Organization: ${orgName}`);
      console.log(`  Description: ${role.description || 'N/A'}`);
      console.log(`  Users: ${userCount}`);
      console.log(`  Zweck: ${zweck}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('ERKLÄRUNG:');
    console.log('='.repeat(60));
    console.log('\n1. Globaler Admin (ID 1, organizationId = NULL):');
    console.log('   - Für den fixen "admin"-User, der Zugriff auf ALLE Organisationen hat');
    console.log('   - Wird im Seed erstellt');
    console.log('   - NOTWENDIG für System-Administration');
    
    console.log('\n2. La Familia Hostel Admin (ID 4, organizationId = 1):');
    console.log('   - Organisations-spezifischer Admin für La Familia Hostel');
    console.log('   - Wird im Seed erstellt');
    console.log('   - Für normale Admin-User dieser Organisation');
    
    console.log('\n3. Mosaik Admin (ID 7, organizationId = 2):');
    console.log('   - Organisations-spezifischer Admin für Mosaik');
    console.log('   - Wird im Seed erstellt');
    console.log('   - Für normale Admin-User dieser Organisation');
    
    console.log('\n4. Standard-Organisation Admin (ID 10, organizationId = 3):');
    console.log('   - Für Rückwärtskompatibilität mit alten Daten');
    console.log('   - Wird im Seed erstellt');
    console.log('   - Sollte nicht mehr verwendet werden, kann aber bleiben');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

