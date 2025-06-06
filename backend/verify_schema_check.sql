-- Schema-Check für MCP-Verifikation

-- Liste alle Organisationen und deren Rollen
SELECT 'ORGANISATIONEN UND ROLLEN' as info;
SELECT o.id as org_id, o.name as org_name, r.id as role_id, r.name as role_name
FROM "Organization" o
LEFT JOIN "Role" r ON o.id = r."organizationId"
ORDER BY o.name, r.name;

-- Zähle User pro Organisation
SELECT 'USER PRO ORGANISATION' as info;
SELECT COUNT(DISTINCT u.id) as user_count, o.name as org_name
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
JOIN "Organization" o ON r."organizationId" = o.id
GROUP BY o.name
ORDER BY o.name;

-- Überprüfe Multi-Tenant Setup
SELECT 'MULTI-TENANT SETUP VERIFICATION' as info;
SELECT 
  (SELECT COUNT(*) FROM "Organization") as total_organizations,
  (SELECT COUNT(*) FROM "Role") as total_roles,
  (SELECT COUNT(*) FROM "UserRole") as total_user_roles,
  (SELECT COUNT(*) FROM "User") as total_users; 