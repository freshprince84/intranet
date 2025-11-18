import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    console.log('🔍 Prüfe Berechtigungen in der Datenbank...\n');

    const permissions = await prisma.permission.findMany({
      where: {
        entity: {
          in: ['usermanagement', 'organization_management', 'organization', 'users', 'roles']
        }
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            organizationId: true
          }
        }
      },
      orderBy: [
        { entity: 'asc' },
        { entityType: 'asc' },
        { role: { name: 'asc' } }
      ]
    });

    console.log(`📊 Gefundene Berechtigungen: ${permissions.length}\n`);

    // Gruppiere nach entity
    const grouped: Record<string, any[]> = {};
    permissions.forEach(p => {
      const key = `${p.entity} (${p.entityType})`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        role: p.role.name,
        roleId: p.role.id,
        orgId: p.role.organizationId,
        accessLevel: p.accessLevel
      });
    });

    // Zeige alle gefundenen Berechtigungen
    Object.keys(grouped).sort().forEach(key => {
      console.log(`\n📋 ${key}:`);
      grouped[key].forEach(p => {
        const orgInfo = p.orgId ? ` (Org: ${p.orgId})` : ' (global)';
        console.log(`   - ${p.role}${orgInfo}: ${p.accessLevel}`);
      });
    });

    // Zusammenfassung
    console.log('\n\n📊 Zusammenfassung:');
    const entityCounts: Record<string, number> = {};
    permissions.forEach(p => {
      const key = `${p.entity}-${p.entityType}`;
      entityCounts[key] = (entityCounts[key] || 0) + 1;
    });

    Object.keys(entityCounts).sort().forEach(key => {
      const [entity, type] = key.split('-');
      console.log(`   ${entity} (${type}): ${entityCounts[key]} Berechtigungen`);
    });

    // Problemanalyse
    console.log('\n\n⚠️  Problemanalyse:');
    const hasUsermanagement = permissions.some(p => p.entity === 'usermanagement' && p.entityType === 'page');
    const hasOrgManagement = permissions.some(p => p.entity === 'organization_management' && p.entityType === 'page');
    
    if (hasUsermanagement && hasOrgManagement) {
      console.log('   ❌ PROBLEM: Beide Berechtigungen existieren (usermanagement UND organization_management)');
      console.log('   → Aufräumen erforderlich!');
    } else if (hasUsermanagement) {
      console.log('   ⚠️  Nur usermanagement vorhanden - muss auf organization_management umgestellt werden');
    } else if (hasOrgManagement) {
      console.log('   ✅ Nur organization_management vorhanden - ist korrekt');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();


















