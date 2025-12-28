#!/usr/bin/env node
/**
 * Script zur Analyse von Branch- und Rollen-Problemen
 * 
 * 1. Findet doppelte Rollen bei Mosaik (Org 2)
 * 2. Listet alle Abhängigkeiten für Branches "Haupt" und "Nowhere" auf
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRoleDuplicates() {
  console.log('\n🔍 ANALYSE: Doppelte Rollen in allen Organisationen\n');
  console.log('='.repeat(60));
  
  // Finde alle Organisationen
  const organizations = await prisma.organization.findMany({
    orderBy: { id: 'asc' }
  });
  
  if (organizations.length === 0) {
    console.log('❌ Keine Organisationen gefunden!');
    return;
  }
  
  console.log(`✅ ${organizations.length} Organisation(en) gefunden\n`);
  
  // Analysiere jede Organisation
  for (const org of organizations) {
    console.log(`\n📊 Organisation: ${org.displayName} (ID: ${org.id}, name: ${org.name})`);
    console.log('-'.repeat(60));
    
    // Finde alle Rollen für diese Organisation
    const roles = await prisma.role.findMany({
      where: {
        organizationId: org.id
      },
      orderBy: [
        { name: 'asc' },
        { id: 'asc' }
      ],
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    console.log(`   Gesamtanzahl Rollen: ${roles.length}`);
    
    // Gruppiere nach Name
    const rolesByName = new Map<string, typeof roles>();
    
    for (const role of roles) {
      if (!rolesByName.has(role.name)) {
        rolesByName.set(role.name, []);
      }
      rolesByName.get(role.name)!.push(role);
    }
    
    // Finde Duplikate
    const duplicates: Array<{ name: string; roles: typeof roles }> = [];
    
    for (const [name, roleList] of rolesByName.entries()) {
      if (roleList.length > 1) {
        duplicates.push({ name, roles: roleList });
      }
    }
    
    if (duplicates.length === 0) {
      console.log(`   ✅ Keine doppelten Rollen`);
    } else {
      console.log(`   ⚠️  ${duplicates.length} doppelte Rollen gefunden:`);
      
      for (const { name, roles: roleList } of duplicates) {
        console.log(`\n   📋 Rolle "${name}" (${roleList.length}x vorhanden):`);
        for (const role of roleList) {
          console.log(`      - ID: ${role.id}, Beschreibung: ${role.description || '(keine)'}`);
          console.log(`        Zugewiesen an ${role.users.length} Benutzer:`);
          for (const userRole of role.users) {
            const user = userRole.user;
            const nameStr = user.firstName || user.lastName 
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
              : user.username;
            console.log(`          • ${nameStr} (${user.username}, ID: ${user.id})`);
          }
        }
      }
    }
    
    // Zeige alle Rollen
    if (roles.length > 0) {
      console.log(`\n   📋 Alle Rollen:`);
      for (const role of roles) {
        console.log(`      - ${role.name} (ID: ${role.id}, ${role.users.length} Benutzer)`);
      }
    }
  }
  
  // Prüfe auch globale Rollen (organizationId = null)
  console.log(`\n📊 Globale Rollen (organizationId = null):`);
  console.log('-'.repeat(60));
  
  const globalRoles = await prisma.role.findMany({
    where: {
      organizationId: null
    },
    orderBy: [
      { name: 'asc' },
      { id: 'asc' }
    ],
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    }
  });
  
  console.log(`   Gesamtanzahl globale Rollen: ${globalRoles.length}`);
  
  // Gruppiere nach Name
  const globalRolesByName = new Map<string, typeof globalRoles>();
  
  for (const role of globalRoles) {
    if (!globalRolesByName.has(role.name)) {
      globalRolesByName.set(role.name, []);
    }
    globalRolesByName.get(role.name)!.push(role);
  }
  
  // Finde Duplikate
  const globalDuplicates: Array<{ name: string; roles: typeof globalRoles }> = [];
  
  for (const [name, roleList] of globalRolesByName.entries()) {
    if (roleList.length > 1) {
      globalDuplicates.push({ name, roles: roleList });
    }
  }
  
  if (globalDuplicates.length === 0) {
    console.log(`   ✅ Keine doppelten globalen Rollen`);
  } else {
    console.log(`   ⚠️  ${globalDuplicates.length} doppelte globale Rollen gefunden:`);
    
    for (const { name, roles: roleList } of globalDuplicates) {
      console.log(`\n   📋 Rolle "${name}" (${roleList.length}x vorhanden):`);
      for (const role of roleList) {
        console.log(`      - ID: ${role.id}, Beschreibung: ${role.description || '(keine)'}`);
        console.log(`        Zugewiesen an ${role.users.length} Benutzer:`);
        for (const userRole of role.users) {
          const user = userRole.user;
          const nameStr = user.firstName || user.lastName 
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
            : user.username;
          console.log(`          • ${nameStr} (${user.username}, ID: ${user.id})`);
        }
      }
    }
  }
  
  if (globalRoles.length > 0) {
    console.log(`\n   📋 Alle globalen Rollen:`);
    for (const role of globalRoles) {
      console.log(`      - ${role.name} (ID: ${role.id}, ${role.users.length} Benutzer)`);
    }
  }
}

async function analyzeBranchDependencies(branchName: string) {
  console.log(`\n🔍 ANALYSE: Abhängigkeiten für Branch "${branchName}"\n`);
  console.log('='.repeat(60));
  
  // Finde Branch
  const branch = await prisma.branch.findUnique({
    where: { name: branchName }
  });
  
  if (!branch) {
    console.log(`❌ Branch "${branchName}" nicht gefunden!`);
    return;
  }
  
  console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);
  if (branch.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: branch.organizationId }
    });
    console.log(`   Organisation: ${org?.displayName || 'Unbekannt'} (ID: ${branch.organizationId})`);
  } else {
    console.log(`   Organisation: Keine (null)`);
  }
  console.log('');
  
  // Prüfe alle Abhängigkeiten
  const dependencies: Array<{ table: string; count: number; details?: any[] }> = [];
  
  // 1. WorkTime
  const workTimes = await prisma.workTime.findMany({
    where: { branchId: branch.id },
    select: { id: true, userId: true, startTime: true, endTime: true }
  });
  if (workTimes.length > 0) {
    dependencies.push({
      table: 'WorkTime',
      count: workTimes.length,
      details: workTimes.slice(0, 10) // Erste 10 als Beispiel
    });
  }
  
  // 2. Task
  const tasks = await prisma.task.findMany({
    where: { branchId: branch.id },
    select: { id: true, title: true, status: true }
  });
  if (tasks.length > 0) {
    dependencies.push({
      table: 'Task',
      count: tasks.length,
      details: tasks.slice(0, 10)
    });
  }
  
  // 3. Request
  const requests = await prisma.request.findMany({
    where: { branchId: branch.id },
    select: { id: true, title: true, status: true }
  });
  if (requests.length > 0) {
    dependencies.push({
      table: 'Request',
      count: requests.length,
      details: requests.slice(0, 10)
    });
  }
  
  // 4. UsersBranches
  const usersBranches = await prisma.usersBranches.findMany({
    where: { branchId: branch.id },
    include: {
      user: {
        select: { id: true, username: true, firstName: true, lastName: true }
      }
    }
  });
  if (usersBranches.length > 0) {
    dependencies.push({
      table: 'UsersBranches',
      count: usersBranches.length,
      details: usersBranches.map(ub => ({
        id: ub.id,
        userId: ub.userId,
        username: ub.user.username,
        name: `${ub.user.firstName || ''} ${ub.user.lastName || ''}`.trim() || ub.user.username
      }))
    });
  }
  
  // 5. RoleBranch
  const roleBranches = await prisma.roleBranch.findMany({
    where: { branchId: branch.id },
    include: {
      role: {
        select: { id: true, name: true, organizationId: true }
      }
    }
  });
  if (roleBranches.length > 0) {
    dependencies.push({
      table: 'RoleBranch',
      count: roleBranches.length,
      details: roleBranches.map(rb => ({
        id: rb.id,
        roleId: rb.roleId,
        roleName: rb.role.name,
        organizationId: rb.role.organizationId
      }))
    });
  }
  
  // 6. ShiftTemplate
  const shiftTemplates = await prisma.shiftTemplate.findMany({
    where: { branchId: branch.id },
    select: { id: true, name: true, roleId: true }
  });
  if (shiftTemplates.length > 0) {
    dependencies.push({
      table: 'ShiftTemplate',
      count: shiftTemplates.length,
      details: shiftTemplates
    });
  }
  
  // 7. Shift
  const shifts = await prisma.shift.findMany({
    where: { branchId: branch.id },
    select: { id: true, date: true, roleId: true, userId: true, status: true }
  });
  if (shifts.length > 0) {
    dependencies.push({
      table: 'Shift',
      count: shifts.length,
      details: shifts.slice(0, 10)
    });
  }
  
  // 8. UserAvailability
  const userAvailabilities = await prisma.userAvailability.findMany({
    where: { branchId: branch.id },
    select: { id: true, userId: true, roleId: true, type: true }
  });
  if (userAvailabilities.length > 0) {
    dependencies.push({
      table: 'UserAvailability',
      count: userAvailabilities.length,
      details: userAvailabilities
    });
  }
  
  // 9. Reservation
  const reservations = await prisma.reservation.findMany({
    where: { branchId: branch.id },
    select: { id: true, checkInDate: true, status: true }
  });
  if (reservations.length > 0) {
    dependencies.push({
      table: 'Reservation',
      count: reservations.length,
      details: reservations.slice(0, 10)
    });
  }
  
  // 10. Tour
  const tours = await prisma.tour.findMany({
    where: { branchId: branch.id },
    select: { id: true, name: true, isActive: true }
  });
  if (tours.length > 0) {
    dependencies.push({
      table: 'Tour',
      count: tours.length,
      details: tours
    });
  }
  
  // 11. TourBooking
  const tourBookings = await prisma.tourBooking.findMany({
    where: { branchId: branch.id },
    select: { id: true, bookingDate: true, status: true }
  });
  if (tourBookings.length > 0) {
    dependencies.push({
      table: 'TourBooking',
      count: tourBookings.length,
      details: tourBookings.slice(0, 10)
    });
  }
  
  // 12. TourProvider
  const tourProviders = await prisma.tourProvider.findMany({
    where: { branchId: branch.id },
    select: { id: true, name: true }
  });
  if (tourProviders.length > 0) {
    dependencies.push({
      table: 'TourProvider',
      count: tourProviders.length,
      details: tourProviders
    });
  }
  
  // 13. OTAListing
  const otaListings = await prisma.oTAListing.findMany({
    where: { branchId: branch.id },
    select: { id: true, name: true }
  });
  if (otaListings.length > 0) {
    dependencies.push({
      table: 'OTAListing',
      count: otaListings.length,
      details: otaListings
    });
  }
  
  // 14. PriceAnalysis
  const priceAnalyses = await prisma.priceAnalysis.findMany({
    where: { branchId: branch.id },
    select: { id: true, createdAt: true }
  });
  if (priceAnalyses.length > 0) {
    dependencies.push({
      table: 'PriceAnalysis',
      count: priceAnalyses.length,
      details: priceAnalyses.slice(0, 10)
    });
  }
  
  // 15. PriceRecommendation
  const priceRecommendations = await prisma.priceRecommendation.findMany({
    where: { branchId: branch.id },
    select: { id: true, createdAt: true }
  });
  if (priceRecommendations.length > 0) {
    dependencies.push({
      table: 'PriceRecommendation',
      count: priceRecommendations.length,
      details: priceRecommendations.slice(0, 10)
    });
  }
  
  // 16. PricingRule
  const pricingRules = await prisma.pricingRule.findMany({
    where: { branchId: branch.id },
    select: { id: true, name: true }
  });
  if (pricingRules.length > 0) {
    dependencies.push({
      table: 'PricingRule',
      count: pricingRules.length,
      details: pricingRules
    });
  }
  
  // 17. RateShoppingJob
  const rateShoppingJobs = await prisma.rateShoppingJob.findMany({
    where: { branchId: branch.id },
    select: { id: true, createdAt: true, status: true }
  });
  if (rateShoppingJobs.length > 0) {
    dependencies.push({
      table: 'RateShoppingJob',
      count: rateShoppingJobs.length,
      details: rateShoppingJobs
    });
  }
  
  // 18. TaskStatusHistory
  const taskStatusChanges = await prisma.taskStatusHistory.findMany({
    where: { branchId: branch.id },
    select: { id: true, taskId: true, oldStatus: true, newStatus: true }
  });
  if (taskStatusChanges.length > 0) {
    dependencies.push({
      table: 'TaskStatusHistory',
      count: taskStatusChanges.length,
      details: taskStatusChanges.slice(0, 10)
    });
  }
  
  // 19. RequestStatusHistory
  const requestStatusChanges = await prisma.requestStatusHistory.findMany({
    where: { branchId: branch.id },
    select: { id: true, requestId: true, oldStatus: true, newStatus: true }
  });
  if (requestStatusChanges.length > 0) {
    dependencies.push({
      table: 'RequestStatusHistory',
      count: requestStatusChanges.length,
      details: requestStatusChanges.slice(0, 10)
    });
  }
  
  // 20. WhatsAppConversation
  const whatsappConversations = await prisma.whatsAppConversation.findMany({
    where: { branchId: branch.id },
    select: { id: true, phoneNumber: true, status: true }
  });
  if (whatsappConversations.length > 0) {
    dependencies.push({
      table: 'WhatsAppConversation',
      count: whatsappConversations.length,
      details: whatsappConversations.slice(0, 10)
    });
  }
  
  // 21. WhatsAppMessage
  const whatsappMessages = await prisma.whatsAppMessage.findMany({
    where: { branchId: branch.id },
    select: { id: true, conversationId: true, direction: true }
  });
  if (whatsappMessages.length > 0) {
    dependencies.push({
      table: 'WhatsAppMessage',
      count: whatsappMessages.length,
      details: whatsappMessages.slice(0, 10)
    });
  }
  
  // 22. WhatsAppPhoneNumberMapping
  const phoneNumberMappings = await prisma.whatsAppPhoneNumberMapping.findMany({
    where: { branchId: branch.id },
    select: { id: true, phoneNumber: true, mappingType: true }
  });
  if (phoneNumberMappings.length > 0) {
    dependencies.push({
      table: 'WhatsAppPhoneNumberMapping',
      count: phoneNumberMappings.length,
      details: phoneNumberMappings
    });
  }
  
  // Ausgabe
  if (dependencies.length === 0) {
    console.log('✅ Keine Abhängigkeiten gefunden - Branch kann gelöscht werden!\n');
  } else {
    console.log(`⚠️  ${dependencies.length} Abhängigkeiten gefunden:\n`);
    
    let totalCount = 0;
    for (const dep of dependencies) {
      totalCount += dep.count;
      console.log(`📊 ${dep.table}: ${dep.count} Einträge`);
      if (dep.details && dep.details.length > 0) {
        console.log(`   Beispiele (erste ${Math.min(dep.details.length, 5)}):`);
        for (const detail of dep.details.slice(0, 5)) {
          console.log(`     - ${JSON.stringify(detail)}`);
        }
        if (dep.details.length > 5) {
          console.log(`     ... und ${dep.details.length - 5} weitere`);
        }
      }
      console.log('');
    }
    
    console.log(`📈 Gesamtanzahl Abhängigkeiten: ${totalCount}\n`);
  }
}

async function main() {
  try {
    console.log('🚀 Starte Analyse...\n');
    
    // 1. Analysiere doppelte Rollen in allen Organisationen
    await analyzeRoleDuplicates();
    
    // 2. Analysiere Branch-Abhängigkeiten
    await analyzeBranchDependencies('Haupt');
    await analyzeBranchDependencies('Nowhere');
    await analyzeBranchDependencies('Hauptsitz');
    
    console.log('\n✅ Analyse abgeschlossen!\n');
  } catch (error) {
    console.error('❌ Fehler bei der Analyse:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

