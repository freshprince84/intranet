#!/bin/bash
# Führe dieses Script auf dem Server aus: bash scripts/backend/check-user-phone-server.sh

# Lade .env Variablen
cd /var/www/intranet/backend
source .env 2>/dev/null || true

# Extrahiere DB-Daten aus DATABASE_URL oder verwende Umgebungsvariablen
if [ -n "$DATABASE_URL" ]; then
  DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
  DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
else
  DB_USER=${DB_USER:-postgres}
  DB_PASS=${DB_PASSWORD:-}
  DB_HOST=${DB_HOST:-localhost}
  DB_PORT=${DB_PORT:-5432}
  DB_NAME=${DB_NAME:-intranet}
fi

echo "=== WhatsApp User-Identifikation DB-Prüfung ==="
echo ""
echo "Gesuchte Telefonnummer: +41787192338"
echo "Branch ID: 2 (Manila)"
echo ""

# 1. Suche User mit exakter Telefonnummer
echo "=== 1. EXAKTE SUCHE ==="
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  id, 
  \"firstName\", 
  \"lastName\", 
  email, 
  \"phoneNumber\",
  \"phoneNumber\" = '+41787192338' as exact_match,
  \"phoneNumber\" = '41787192338' as without_plus
FROM \"User\"
WHERE \"phoneNumber\" IS NOT NULL
  AND (
    \"phoneNumber\" = '+41787192338' 
    OR \"phoneNumber\" = '41787192338'
    OR \"phoneNumber\" LIKE '%41787192338%'
  )
ORDER BY id;
"

# 2. Prüfe User-Branch-Zuordnung
echo ""
echo "=== 2. USER-BRANCH-ZUORDNUNG ==="
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  u.id as user_id,
  u.\"firstName\",
  u.\"lastName\",
  u.\"phoneNumber\",
  ub.\"branchId\",
  b.name as branch_name,
  CASE WHEN ub.\"branchId\" = 2 THEN '✅ MANILA' ELSE '' END as is_manila
FROM \"User\" u
LEFT JOIN \"UsersBranches\" ub ON u.id = ub.\"userId\"
LEFT JOIN \"Branch\" b ON ub.\"branchId\" = b.id
WHERE u.\"phoneNumber\" IS NOT NULL
  AND (
    u.\"phoneNumber\" = '+41787192338' 
    OR u.\"phoneNumber\" = '41787192338'
    OR u.\"phoneNumber\" LIKE '%41787192338%'
  )
ORDER BY u.id, ub.\"branchId\";
"

# 3. Zeige alle User mit Telefonnummern (erste 20)
echo ""
echo "=== 3. ALLE USER MIT TELEFONNUMMERN (erste 20) ==="
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  id, 
  \"firstName\", 
  \"lastName\", 
  \"phoneNumber\"
FROM \"User\"
WHERE \"phoneNumber\" IS NOT NULL
ORDER BY id
LIMIT 20;
"

# 4. Prüfe Branch Manila WhatsApp Settings
echo ""
echo "=== 4. BRANCH MANILA WHATSAPP SETTINGS ==="
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  id,
  name,
  \"whatsappSettings\"
FROM \"Branch\"
WHERE id = 2;
"

# 5. Prüfe WhatsApp Phone Number Mappings
echo ""
echo "=== 5. WHATSAPP PHONE NUMBER MAPPINGS ==="
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  wm.id,
  wm.\"phoneNumberId\",
  wm.\"branchId\",
  b.name as branch_name,
  wm.\"isPrimary\"
FROM \"WhatsAppPhoneNumberMapping\" wm
LEFT JOIN \"Branch\" b ON wm.\"branchId\" = b.id
ORDER BY wm.\"branchId\";
"

# 6. Prüfe WhatsApp Conversations
echo ""
echo "=== 6. WHATSAPP CONVERSATIONS ==="
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT 
  wc.id,
  wc.\"phoneNumber\",
  wc.\"userId\",
  wc.\"branchId\",
  b.name as branch_name,
  wc.state,
  COALESCE(u.\"firstName\" || ' ' || u.\"lastName\", 'NICHT ZUGEWIESEN') as user_name
FROM \"WhatsAppConversation\" wc
LEFT JOIN \"Branch\" b ON wc.\"branchId\" = b.id
LEFT JOIN \"User\" u ON wc.\"userId\" = u.id
WHERE wc.\"phoneNumber\" LIKE '%41787192338%'
ORDER BY wc.\"lastMessageAt\" DESC
LIMIT 10;
"


