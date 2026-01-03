// Direkte DB-Prüfung ohne Prisma Client
const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

async function checkUserPhone() {
  const client = new Client({
    host: process.env.DATABASE_URL?.match(/@([^:]+)/)?.[1] || 'localhost',
    port: process.env.DATABASE_URL?.match(/:(\d+)\//)?.[1] || 5432,
    database: process.env.DATABASE_URL?.match(/\/\/([^:]+):([^@]+)@[^:]+:\d+\/(.+)/)?.[3] || 
              process.env.DATABASE_URL?.match(/\/([^?]+)/)?.[1] || 'intranet',
    user: process.env.DATABASE_URL?.match(/\/\/([^:]+):/)?.[1] || 
          process.env.DATABASE_URL?.match(/postgres:\/\/([^:]+):/)?.[1] || 'postgres',
    password: process.env.DATABASE_URL?.match(/\/\/([^:]+):([^@]+)@/)?.[2] || 
              process.env.DATABASE_URL?.match(/postgres:\/\/[^:]+:([^@]+)@/)?.[1] || 
              process.env.DATABASE_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Verbindung zur DB hergestellt\n');

    const userPhone = '+41787192338';
    const branchId = 2; // Manila

    console.log('=== WhatsApp User-Identifikation DB-Prüfung ===\n');
    console.log('Gesuchte Telefonnummer:', userPhone);
    console.log('Branch ID:', branchId, '(Manila)\n');

    // 1. Suche User mit exakter Telefonnummer
    console.log('=== 1. EXAKTE SUCHE ===');
    const exactResult = await client.query(`
      SELECT 
        id, 
        "firstName", 
        "lastName", 
        email, 
        "phoneNumber",
        "phoneNumber" = $1 as exact_match,
        "phoneNumber" = $2 as without_plus,
        "phoneNumber" LIKE $3 as contains_number
      FROM "User"
      WHERE "phoneNumber" IS NOT NULL
        AND (
          "phoneNumber" = $1 
          OR "phoneNumber" = $2
          OR "phoneNumber" LIKE $3
        )
      ORDER BY id
    `, ['+41787192338', '41787192338', '%41787192338%']);

    if (exactResult.rows.length > 0) {
      console.log(`✅ ${exactResult.rows.length} User gefunden:\n`);
      exactResult.rows.forEach(u => {
        console.log(`  ID: ${u.id}`);
        console.log(`  Name: ${u.firstName} ${u.lastName}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Telefonnummer: "${u.phoneNumber}"`);
        console.log(`  Exact Match: ${u.exact_match}`);
        console.log(`  Without Plus: ${u.without_plus}`);
        console.log(`  Contains: ${u.contains_number}`);
        console.log('');
      });
    } else {
      console.log('❌ Kein User gefunden mit exakter Suche!\n');
    }

    // 2. Prüfe User-Branch-Zuordnung
    if (exactResult.rows.length > 0) {
      console.log('=== 2. USER-BRANCH-ZUORDNUNG ===');
      for (const user of exactResult.rows) {
        const branchResult = await client.query(`
          SELECT 
            ub."branchId",
            b.name as branch_name
          FROM "UsersBranches" ub
          LEFT JOIN "Branch" b ON ub."branchId" = b.id
          WHERE ub."userId" = $1
          ORDER BY ub."branchId"
        `, [user.id]);

        console.log(`\nUser ${user.id} (${user.firstName} ${user.lastName}):`);
        if (branchResult.rows.length > 0) {
          branchResult.rows.forEach(b => {
            const isManila = b.branchId === branchId;
            console.log(`  ${isManila ? '✅' : '  '} Branch: ${b.branch_name} (ID: ${b.branchId})${isManila ? ' [MANILA]' : ''}`);
          });
        } else {
          console.log('  ⚠️  Keine Branch-Zuordnung gefunden!');
        }
      }
    }

    // 3. Zeige alle User mit Telefonnummern (erste 20)
    console.log('\n=== 3. ALLE USER MIT TELEFONNUMMERN (erste 20) ===');
    const allUsersResult = await client.query(`
      SELECT 
        id, 
        "firstName", 
        "lastName", 
        "phoneNumber"
      FROM "User"
      WHERE "phoneNumber" IS NOT NULL
      ORDER BY id
      LIMIT 20
    `);

    console.log(`Gefunden: ${allUsersResult.rows.length} User\n`);
    allUsersResult.rows.forEach(u => {
      const matches = u.phoneNumber && (
        u.phoneNumber === '+41787192338' ||
        u.phoneNumber === '41787192338' ||
        u.phoneNumber.includes('41787192338')
      );
      console.log(`  ${matches ? '⭐' : '  '} ${u.id}: ${u.firstName} ${u.lastName} - "${u.phoneNumber}"`);
    });

    // 4. Prüfe Branch Manila WhatsApp Settings
    console.log('\n=== 4. BRANCH MANILA WHATSAPP SETTINGS ===');
    const branchResult = await client.query(`
      SELECT 
        id,
        name,
        "whatsappSettings"
      FROM "Branch"
      WHERE id = $1
    `, [branchId]);

    if (branchResult.rows.length > 0) {
      const branch = branchResult.rows[0];
      console.log(`Branch: ${branch.name} (ID: ${branch.id})`);
      console.log('WhatsApp Settings:', JSON.stringify(branch.whatsappSettings, null, 2));
    } else {
      console.log('❌ Branch Manila nicht gefunden!');
    }

    // 5. Prüfe WhatsApp Phone Number Mappings
    console.log('\n=== 5. WHATSAPP PHONE NUMBER MAPPINGS ===');
    const mappingResult = await client.query(`
      SELECT 
        wm.id,
        wm."phoneNumberId",
        wm."branchId",
        b.name as branch_name,
        wm."isPrimary"
      FROM "WhatsAppPhoneNumberMapping" wm
      LEFT JOIN "Branch" b ON wm."branchId" = b.id
      ORDER BY wm."branchId"
    `);

    if (mappingResult.rows.length > 0) {
      mappingResult.rows.forEach(m => {
        console.log(`  ${m.phoneNumberId} -> ${m.branch_name} (ID: ${m.branchId})${m.isPrimary ? ' [PRIMARY]' : ''}`);
      });
    } else {
      console.log('  Keine Mappings gefunden');
    }

    // 6. Prüfe WhatsApp Conversations
    console.log('\n=== 6. WHATSAPP CONVERSATIONS ===');
    const convResult = await client.query(`
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
      WHERE wc."phoneNumber" LIKE $1
      ORDER BY wc."lastMessageAt" DESC
      LIMIT 10
    `, ['%41787192338%']);

    if (convResult.rows.length > 0) {
      console.log(`Gefunden: ${convResult.rows.length} Conversations\n`);
      convResult.rows.forEach(c => {
        console.log(`  Conversation ID: ${c.id}`);
        console.log(`    Phone: "${c.phoneNumber}"`);
        console.log(`    Branch: ${c.branch_name} (ID: ${c.branchId})`);
        console.log(`    User: ${c.user_name || 'NICHT ZUGEWIESEN'} (ID: ${c.userId || 'null'})`);
        console.log(`    State: ${c.state}`);
        console.log('');
      });
    } else {
      console.log('  Keine Conversations gefunden');
    }

  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

checkUserPhone();

