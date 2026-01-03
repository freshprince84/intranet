-- Prüfe User mit Telefonnummer +41787192338
-- Führe diese Befehle auf dem Server aus: psql -U postgres -d intranet

-- 1. Suche User mit exakter Telefonnummer
SELECT 
  id, 
  "firstName", 
  "lastName", 
  email, 
  "phoneNumber",
  "phoneNumber" = '+41787192338' as exact_match,
  "phoneNumber" = '41787192338' as without_plus,
  "phoneNumber" LIKE '%41787192338%' as contains_number
FROM "User"
WHERE "phoneNumber" IS NOT NULL
  AND (
    "phoneNumber" = '+41787192338' 
    OR "phoneNumber" = '41787192338'
    OR "phoneNumber" LIKE '%41787192338%'
  )
ORDER BY id;

-- 2. Zeige alle User mit Telefonnummern (erste 20)
SELECT 
  id, 
  "firstName", 
  "lastName", 
  "phoneNumber"
FROM "User"
WHERE "phoneNumber" IS NOT NULL
ORDER BY id
LIMIT 20;

-- 3. Prüfe User-Branch-Zuordnung für User mit dieser Telefonnummer
SELECT 
  u.id as user_id,
  u."firstName",
  u."lastName",
  u."phoneNumber",
  ub."branchId",
  b.name as branch_name
FROM "User" u
LEFT JOIN "UsersBranches" ub ON u.id = ub."userId"
LEFT JOIN "Branch" b ON ub."branchId" = b.id
WHERE u."phoneNumber" IS NOT NULL
  AND (
    u."phoneNumber" = '+41787192338' 
    OR u."phoneNumber" = '41787192338'
    OR u."phoneNumber" LIKE '%41787192338%'
  )
ORDER BY u.id, ub."branchId";

-- 4. Prüfe Branch Manila (ID: 2) WhatsApp Settings
SELECT 
  id,
  name,
  "whatsappSettings"
FROM "Branch"
WHERE id = 2;

-- 5. Prüfe WhatsApp Phone Number Mappings
SELECT 
  wm.id,
  wm."phoneNumberId",
  wm."branchId",
  b.name as branch_name,
  wm."isPrimary"
FROM "WhatsAppPhoneNumberMapping" wm
LEFT JOIN "Branch" b ON wm."branchId" = b.id
ORDER BY wm."branchId";

-- 6. Prüfe WhatsApp Conversations für diese Telefonnummer
SELECT 
  wc.id,
  wc."phoneNumber",
  wc."userId",
  wc."branchId",
  b.name as branch_name,
  wc.state,
  u."firstName" || ' ' || u."lastName" as user_name
FROM "WhatsAppConversation" wc
LEFT JOIN "Branch" b ON wc."branchId" = b.id
LEFT JOIN "User" u ON wc."userId" = u.id
WHERE wc."phoneNumber" LIKE '%41787192338%'
ORDER BY wc."lastMessageAt" DESC;

