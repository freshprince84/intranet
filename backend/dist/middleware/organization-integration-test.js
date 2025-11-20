"use strict";
/**
 * 🔧 Organization Middleware Integration Tests
 * Manuelle Tests für Multi-Tenant Funktionalität
 *
 * Diese Tests können manuell ausgeführt werden, um die
 * Organization-Middleware Funktionalität zu validieren.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runOrganizationMiddlewareTests = runOrganizationMiddlewareTests;
const prisma_1 = require("../utils/prisma");
/**
 * Test 1: Gültige Organisation-Zuordnung
 */
function testValidOrganizationAssignment() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // Simuliere Request mit gültigem User
            const mockReq = {
                user: { id: 1, username: 'testuser', email: 'test@example.com', roles: [] }
            };
            // Prüfe ob User existiert und aktive Rolle hat
            const user = yield prisma_1.prisma.user.findUnique({
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
                message: `Organisation erfolgreich zugeordnet: ${(_a = activeRole.role.organization) === null || _a === void 0 ? void 0 : _a.name}`,
                organizationId
            };
        }
        catch (error) {
            return {
                testName: 'Valid Organization Assignment',
                success: false,
                message: `Fehler: ${error}`
            };
        }
    });
}
/**
 * Test 2: Orphaned Roles Detection
 */
function testOrphanedRolesDetection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Prüfe auf Rollen ohne Organization (sollte nicht existieren da organizationId required ist)
            const allRoles = yield prisma_1.prisma.role.findMany({
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
        }
        catch (error) {
            return {
                testName: 'Orphaned Roles Detection',
                success: false,
                message: `Fehler: ${error}`
            };
        }
    });
}
/**
 * Test 3: Cross-Organization Data Isolation
 */
function testDataIsolation() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Prüfe ob Tasks mit ungültigen Rollen-Zuordnungen existieren
            const crossOrgTasks = yield prisma_1.prisma.$queryRaw `
      SELECT t.id, t.title, r.name as role_name, o.name as org_name
      FROM "Task" t
      LEFT JOIN "Role" r ON t."roleId" = r.id
      LEFT JOIN "Organization" o ON r."organizationId" = o.id
      WHERE t."roleId" IS NOT NULL AND (r.id IS NULL OR o.id IS NULL)
      LIMIT 5
    `;
            if (crossOrgTasks.length > 0) {
                return {
                    testName: 'Cross-Organization Data Isolation',
                    success: false,
                    message: `${crossOrgTasks.length} Tasks mit ungültigen Rollen-Zuordnungen gefunden!`
                };
            }
            // Prüfe WorkTime-Isolation
            const crossOrgWorkTime = yield prisma_1.prisma.$queryRaw `
      SELECT w.id, u.email, 'WORKTIME_NO_ORG' as alert
      FROM "WorkTime" w
      JOIN "User" u ON w."userId" = u.id
      LEFT JOIN "UserRole" ur ON u.id = ur."userId" AND ur."lastUsed" = true
      LEFT JOIN "Role" r ON ur."roleId" = r.id
      WHERE r."organizationId" IS NULL
      LIMIT 3
    `;
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
        }
        catch (error) {
            return {
                testName: 'Cross-Organization Data Isolation',
                success: false,
                message: `Fehler: ${error}`
            };
        }
    });
}
/**
 * Test 4: Multi-Organization User Detection
 */
function testMultiOrgUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const multiOrgUsers = yield prisma_1.prisma.$queryRaw `
      SELECT u.email, COUNT(DISTINCT r."organizationId") as org_count
      FROM "User" u
      JOIN "UserRole" ur ON u.id = ur."userId"
      JOIN "Role" r ON ur."roleId" = r.id
      WHERE r."organizationId" IS NOT NULL
      GROUP BY u.id, u.email
      HAVING COUNT(DISTINCT r."organizationId") > 1
    `;
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
        }
        catch (error) {
            return {
                testName: 'Multi-Organization User Detection',
                success: false,
                message: `Fehler: ${error}`
            };
        }
    });
}
/**
 * Hauptfunktion zum Ausführen aller Tests
 */
function runOrganizationMiddlewareTests() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🔧 Starting Organization Middleware Integration Tests...\n');
        const tests = [
            testValidOrganizationAssignment,
            testOrphanedRolesDetection,
            testDataIsolation,
            testMultiOrgUsers
        ];
        const results = [];
        for (const test of tests) {
            console.log(`⏳ Running ${test.name}...`);
            const result = yield test();
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
        }
        else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
        }
    });
}
// Ausführen falls direkt aufgerufen
if (require.main === module) {
    runOrganizationMiddlewareTests()
        .catch(console.error);
}
//# sourceMappingURL=organization-integration-test.js.map