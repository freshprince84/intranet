-- MCP-Verifikation für Phase 4.4: Multi-Tenant Datenisolation prüfen

-- Liste alle Organisationen und deren Rollen
SELECT 'ORGANISATIONEN UND ROLLEN' as info;
SELECT o.id as org_id, o.name as org_name, r.id as role_id, r.name as role_name
FROM "Organization" o
LEFT JOIN "Role" r ON o.id = r."organizationId"
ORDER BY o.name, r.name;

-- User der Standard-Organisation
SELECT 'BENUTZER DER STANDARD-ORGANISATION' as info;
SELECT u.username, r.name as role_name, o.name as org_name, ur."lastUsed"
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
JOIN "Organization" o ON r."organizationId" = o.id
WHERE o.name = 'default'
ORDER BY u.username;

-- Prüfe Tasks - pro Organisation
SELECT 'TASKS PRO ORGANISATION' as info;
SELECT COUNT(*) as task_count, o.name as org_name
FROM "Task" t
JOIN "User" u ON t."userId" = u.id
JOIN "UserRole" ur ON u.id = ur."userId" AND ur."lastUsed" = true
JOIN "Role" r ON ur."roleId" = r.id
JOIN "Organization" o ON r."organizationId" = o.id
GROUP BY o.name
ORDER BY o.name;

-- Prüfe Requests - pro Organisation  
SELECT 'REQUESTS PRO ORGANISATION' as info;
SELECT COUNT(*) as request_count, o.name as org_name
FROM "Request" req
JOIN "User" u ON req."userId" = u.id
JOIN "UserRole" ur ON u.id = ur."userId" AND ur."lastUsed" = true
JOIN "Role" r ON ur."roleId" = r.id
JOIN "Organization" o ON r."organizationId" = o.id
GROUP BY o.name
ORDER BY o.name; 