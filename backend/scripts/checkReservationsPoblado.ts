import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReservations() {
  try {
    // 1. Prüfe Reservierungen für Parque Poblado
    const pobladoBranch = await prisma.branch.findUnique({
      where: { id: 4 },
      select: { id: true, name: true, organizationId: true }
    });
    
    console.log('Parque Poblado Branch:', JSON.stringify(pobladoBranch, null, 2));
    
    const reservations = await prisma.reservation.findMany({
      where: { branchId: 4 },
      select: {
        id: true,
        guestName: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        branchId: true,
        organizationId: true,
        createdAt: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nReservierungen für Parque Poblado (letzte 10):');
    console.log(JSON.stringify(reservations, null, 2));
    console.log(`\nGesamtanzahl: ${await prisma.reservation.count({ where: { branchId: 4 } })}`);
    
    // 2. Prüfe User "Patrick Ammann"
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: { contains: 'Patrick', mode: 'insensitive' } },
          { lastName: { contains: 'Ammann', mode: 'insensitive' } }
        ]
      },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    if (!user) {
      console.log('\nUser nicht gefunden');
      return;
    }
    
    console.log('\nUser gefunden:', JSON.stringify(user, null, 2));
    
    // 3. Prüfe aktive Rolle
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        lastUsed: true
      },
      include: {
        role: {
          include: {
            organization: { select: { id: true, name: true } }
          }
        }
      }
    });
    
    console.log('\nAktive UserRole:');
    console.log(JSON.stringify({
      id: userRole?.id,
      roleId: userRole?.roleId,
      roleName: userRole?.role?.name,
      organizationId: userRole?.role?.organizationId,
      organizationName: userRole?.role?.organization?.name
    }, null, 2));
    
    // 4. Prüfe Permissions
    if (userRole?.roleId) {
      const permissions = await prisma.permission.findMany({
        where: {
          roleId: userRole.roleId
        },
        select: { accessLevel: true, entity: true, entityType: true }
      });
      
      console.log('\nPermissions:');
      console.log(JSON.stringify(permissions, null, 2));
      
      const hasAllBranches = permissions.some(p => 
        p.entity === 'reservations_all_branches' || 
        (p.entity === 'reservations' && p.accessLevel === 'all')
      );
      const hasOwnBranch = permissions.some(p => 
        p.entity === 'reservations_own_branch' || 
        (p.entity === 'reservations' && p.accessLevel === 'own')
      );
      
      console.log(`\nHas all_branches: ${hasAllBranches}`);
      console.log(`Has own_branch: ${hasOwnBranch}`);
    }
    
    // 5. Prüfe Branch-Zuordnung
    const userBranch = await prisma.usersBranches.findFirst({
      where: {
        userId: user.id,
        lastUsed: true
      },
      include: {
        branch: { select: { id: true, name: true, organizationId: true } }
      }
    });
    
    console.log('\nAktive UserBranch:');
    console.log(JSON.stringify({
      branchId: userBranch?.branchId,
      branchName: userBranch?.branch?.name,
      organizationId: userBranch?.branch?.organizationId
    }, null, 2));
    
    // 6. Prüfe, welche Reservierungen der User sehen würde
    const orgId = userRole?.role?.organizationId;
    if (orgId) {
      const whereClause: any = {
        organizationId: orgId
      };
      
      if (userBranch?.branchId) {
        whereClause.branchId = userBranch.branchId;
        console.log(`\n⚠️ User würde nur Reservierungen für Branch ${userBranch.branchId} (${userBranch.branch?.name}) sehen`);
      } else {
        console.log(`\n✅ User würde alle Reservierungen für Organization ${orgId} sehen`);
      }
      
      const visibleReservations = await prisma.reservation.findMany({
        where: whereClause,
        select: {
          id: true,
          guestName: true,
          branchId: true,
          branch: { select: { name: true } }
        },
        take: 5
      });
      
      console.log('\nReservierungen, die User sehen würde:');
      console.log(JSON.stringify(visibleReservations, null, 2));
      console.log(`\nGesamtanzahl: ${await prisma.reservation.count({ where: whereClause })}`);
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservations();

