-- MCP-Verifikation für Phase 2.2: Standard-Organisation
SELECT 'ORGANIZATION VERIFICATION' as section;
SELECT id, name, displayName, subscriptionPlan, maxUsers, isActive FROM Organization WHERE name = 'default';

SELECT 'ROLES WITH ORGANIZATIONID VERIFICATION' as section;  
SELECT id, name, organizationId FROM Role WHERE organizationId = 1; 