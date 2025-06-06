-- MCP-Verifikation für Phase 4.4: Multi-Tenant Datenisolation testen

-- 4.4a: Test-Daten für Isolation-Test vorbereiten
SELECT 'PHASE 4.4A - TEST-DATEN VORBEREITUNG' as section;

-- Erstelle zweite Test-Organisation
INSERT INTO "Organization" (name, "displayName", "subscriptionPlan", "maxUsers", "isActive")
VALUES ('test-org-2', 'Test Organisation 2', 'basic', 25, true)
ON CONFLICT (name) DO NOTHING;

-- Erstelle Test-Rolle für zweite Organisation
INSERT INTO "Role" (name, description, "organizationId")
SELECT 'Test-Admin-2', 'Test Administrator 2', o.id
FROM "Organization" o 
WHERE o.name = 'test-org-2';

-- Liste alle Organisationen und deren Rollen
SELECT 'ORGANISATIONEN UND ROLLEN' as info;
SELECT o.id as org_id, o.name as org_name, r.id as role_id, r.name as role_name
FROM "Organization" o
LEFT JOIN "Role" r ON o.id = r."organizationId"
ORDER BY o.name, r.name;

-- 4.4b: Datenisolation zwischen Organisationen prüfen
SELECT 'PHASE 4.4B - DATENISOLATION PRÜFUNG' as section;

-- User der Standard-Organisation sollten nur ihre Daten sehen
SELECT 'BENUTZER DER STANDARD-ORGANISATION' as info;
SELECT u.username, r.name as role_name, o.name as org_name
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
JOIN "Organization" o ON r."organizationId" = o.id
WHERE o.name = 'default'
ORDER BY u.username;

-- Prüfe Tasks - sollten nur für User derselben Organisation sichtbar sein
SELECT 'TASKS PRO ORGANISATION' as info;
SELECT COUNT(*) as task_count, o.name as org_name
FROM "Task" t
JOIN "User" u ON t."creatorId" = u.id
JOIN "UserRole" ur ON u.id = ur."userId" AND ur."lastUsed" = true
JOIN "Role" r ON ur."roleId" = r.id
JOIN "Organization" o ON r."organizationId" = o.id
GROUP BY o.name
ORDER BY o.name;

-- Prüfe Requests - sollten auch isoliert sein
SELECT 'REQUESTS PRO ORGANISATION' as info;
SELECT COUNT(*) as request_count, o.name as org_name
FROM "Request" req
JOIN "User" u ON req."creatorId" = u.id
JOIN "UserRole" ur ON u.id = ur."userId" AND ur."lastUsed" = true
JOIN "Role" r ON ur."roleId" = r.id
JOIN "Organization" o ON r."organizationId" = o.id
GROUP BY o.name
ORDER BY o.name; 