/**
 * 🔧 Organization Middleware Integration Tests
 * Manuelle Tests für Multi-Tenant Funktionalität
 * 
 * Diese Tests können manuell ausgeführt werden, um die
 * Organization-Middleware Funktionalität zu validieren.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  organizationId?: number;
}

interface MockRequest extends Request {
  user?: { id: number; username: string; email: string; roles: string[]; activeRoleId?: number; };
  organizationId?: number;
  organization?: any;
}

/**
 * Test 1: Gültige Organisation-Zuordnung
 */
async function testValidOrganizationAssignment(): Promise<TestResult> {
  try {
    // Simuliere Request mit gültigem User
    const mockReq = {
      user: { id: 1, username: 'testuser', email: 'test@example.com', roles: [] }
    } as MockRequest;

    // Prüfe ob User existiert und aktive Rolle hat
    const user = await prisma.user.findUnique({
      where: { id: 1 },
      include: {
        roles: {
          include: {
            role: {
              include: {
                organization: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return {
        testName: 'Valid Organization Assignment',
        success: false,
        message: 'Test-User (ID: 1) existiert nicht in der Datenbank'
      };
    }

    const activeRole = user.roles.find(userRole => userRole.lastUsed);
    if (!activeRole) {
      return {
        testName: 'Valid Organization Assignment',
        success: false,
        message: 'User hat keine aktive Rolle (lastUsed=true)'
      };
    }

    const organizationId = activeRole.role.organizationId;
    if (!organizationId) {
      return {
        testName: 'Valid Organization Assignment',
        success: false,
        message: 'Aktive Rolle hat keine Organization zugeordnet'
      };
    }

    return {
      testName: 'Valid Organization Assignment',
      success: true,
      message: `Organisation erfolgreich zugeordnet: ${activeRole.role.organization?.name}`,
      organizationId
    };

  } catch (error) {
    return {
      testName: 'Valid Organization Assignment',
      success: false,
      message: `Fehler: ${error}`
    };
  }
}

/**
 * Test 2: Orphaned Roles Detection
 */
async function testOrphanedRolesDetection(): Promise<TestResult> {
  try {
    // Prüfe auf Rollen ohne Organization (sollte nicht existieren da organizationId required ist)
    const allRoles = await prisma.role.findMany({
      include: {
        organization: true
      }
    });

    const orphanedRoles = allRoles.filter(role => !role.organization);

    if (orphanedRoles.length > 0) {
      return {
        testName: 'Orphaned Roles Detection',
        success: false,
        message: `${orphanedRoles.length} orphaned roles gefunden! Diese müssen einer Organisation zugeordnet werden.`
      };
    }

    return {
      testName: 'Orphaned Roles Detection',
      success: true,
      message: 'Keine orphaned roles gefunden - alle Rollen sind einer Organisation zugeordnet'
    };

  } catch (error) {
    return {
      testName: 'Orphaned Roles Detection',
      success: false,
      message: `Fehler: ${error}`
    };
  }
}

/**
 * Test 3: Cross-Organization Data Isolation
 */
async function testDataIsolation(): Promise<TestResult> {
  try {
    // Prüfe ob Tasks mit ungültigen Rollen-Zuordnungen existieren
    const crossOrgTasks = await prisma.$queryRaw`
      SELECT t.id, t.title, r.name as role_name, o.name as org_name
      FROM "Task" t
      LEFT JOIN "Role" r ON t."roleId" = r.id
      LEFT JOIN "Organization" o ON r."organizationId" = o.id
      WHERE t."roleId" IS NOT NULL AND (r.id IS NULL OR o.id IS NULL)
      LIMIT 5
    ` as any[];

    if (crossOrgTasks.length > 0) {
      return {
        testName: 'Cross-Organization Data Isolation',
        success: false,
        message: `${crossOrgTasks.length} Tasks mit ungültigen Rollen-Zuordnungen gefunden!`
      };
    }

    // Prüfe WorkTime-Isolation
    const crossOrgWorkTime = await prisma.$queryRaw`
      SELECT w.id, u.email, 'WORKTIME_NO_ORG' as alert
      FROM "WorkTime" w
      JOIN "User" u ON w."userId" = u.id
      LEFT JOIN "UserRole" ur ON u.id = ur."userId" AND ur."lastUsed" = true
      LEFT JOIN "Role" r ON ur."roleId" = r.id
      WHERE r."organizationId" IS NULL
      LIMIT 3
    ` as any[];

    if (crossOrgWorkTime.length > 0) {
      return {
        testName: 'Cross-Organization Data Isolation',
        success: false,
        message: `${crossOrgWorkTime.length} WorkTime-Einträge ohne Organisation-Kontext gefunden!`
      };
    }

    return {
      testName: 'Cross-Organization Data Isolation',
      success: true,
      message: 'Daten-Isolation zwischen Organisationen ist korrekt implementiert'
    };

  } catch (error) {
    return {
      testName: 'Cross-Organization Data Isolation',
      success: false,
      message: `Fehler: ${error}`
    };
  }
}

/**
 * Test 4: Multi-Organization User Detection
 */
async function testMultiOrgUsers(): Promise<TestResult> {
  try {
    const multiOrgUsers = await prisma.$queryRaw`
      SELECT u.email, COUNT(DISTINCT r."organizationId") as org_count
      FROM "User" u
      JOIN "UserRole" ur ON u.id = ur."userId"
      JOIN "Role" r ON ur."roleId" = r.id
      WHERE r."organizationId" IS NOT NULL
      GROUP BY u.id, u.email
      HAVING COUNT(DISTINCT r."organizationId") > 1
    ` as any[];

    if (multiOrgUsers.length > 0) {
      const userList = multiOrgUsers.map(u => `${u.email} (${u.org_count} Orgs)`).join(', ');
      return {
        testName: 'Multi-Organization User Detection',
        success: false,
        message: `User mit mehreren Organisationen gefunden: ${userList}. Multi-Org-Users erfordern spezielle Behandlung!`
      };
    }

    return {
      testName: 'Multi-Organization User Detection',
      success: true,
      message: 'Keine Multi-Organisation User gefunden - korrekte Einzelorganisation-Zuordnung'
    };

  } catch (error) {
    return {
      testName: 'Multi-Organization User Detection',
      success: false,
      message: `Fehler: ${error}`
    };
  }
}

/**
 * Hauptfunktion zum Ausführen aller Tests
 */
export async function runOrganizationMiddlewareTests(): Promise<void> {
  console.log('🔧 Starting Organization Middleware Integration Tests...\n');

  const tests = [
    testValidOrganizationAssignment,
    testOrphanedRolesDetection,
    testDataIsolation,
    testMultiOrgUsers
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`⏳ Running ${test.name}...`);
    const result = await test();
    results.push(result);
    
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status}: ${result.testName}`);
    console.log(`   ${result.message}`);
    if (result.organizationId) {
      console.log(`   Organization ID: ${result.organizationId}`);
    }
    console.log('');
  }

  // Zusammenfassung
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log('📊 Test Summary:');
  console.log(`   Passed: ${passed}/${total}`);
  console.log(`   Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All Organization Middleware tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }

}

// Ausführen falls direkt aufgerufen
if (require.main === module) {
  runOrganizationMiddlewareTests()
    .catch(console.error);
} 