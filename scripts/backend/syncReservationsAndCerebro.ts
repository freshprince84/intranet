import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function syncReservations(localPrisma: PrismaClient) {
  console.log('\n📋 Synchronisiere Reservationen...\n');
  
  // Lokale Reservationen abrufen
  const localReservations = await localPrisma.reservation.findMany({
    orderBy: { id: 'asc' },
  });
  
  console.log(`✅ Lokale Reservationen gefunden: ${localReservations.length}`);
  
  if (localReservations.length === 0) {
    console.log('⚠️  Keine lokalen Reservationen gefunden.\n');
    return;
  }
  
  // Exportiere als JSON
  const jsonFile = path.join(__dirname, 'sync_reservations.json');
  fs.writeFileSync(jsonFile, JSON.stringify(localReservations, null, 2));
  console.log(`📝 JSON-Datei erstellt: ${jsonFile}`);
  
  // Kopiere auf Server
  console.log('📤 Kopiere Daten auf den Server...');
  const copyCommand = `scp -i ~/.ssh/intranet_rsa ${jsonFile} root@65.109.228.106:/tmp/sync_reservations.json`;
  await execAsync(copyCommand);
  
  // Erstelle Import-Script auf dem Server
  const importScript = `import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importReservations() {
  try {
    // Prüfe zuerst, ob Organisation ID 1 existiert
    const org1 = await prisma.organization.findUnique({ where: { id: 1 } });
    if (!org1) {
      console.error('❌ Organisation ID 1 (La Familia Hostel) existiert nicht auf dem Server!');
      process.exit(1);
    }
    console.log(\`✅ Organisation gefunden: \${org1.displayName} (ID: \${org1.id})\`);
    
    const data = JSON.parse(fs.readFileSync('/var/www/intranet/backend/scripts/sync_reservations.json', 'utf-8'));
    console.log(\`📥 Importiere \${data.length} Reservationen für Organisation ID 1...\`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const reservation of data) {
      try {
        // Stelle sicher, dass organizationId = 1 ist
        if (reservation.organizationId !== 1) {
          console.log(\`⚠️  Reservation \${reservation.id}: organizationId ist \${reservation.organizationId}, setze auf 1\`);
          reservation.organizationId = 1;
        }
        
        // Prüfe ob bereits vorhanden (nach ID oder lobbyReservationId)
        const existing = await prisma.reservation.findFirst({
          where: {
            OR: [
              { id: reservation.id },
              ...(reservation.lobbyReservationId ? [{ lobbyReservationId: reservation.lobbyReservationId }] : []),
            ],
          },
        });
        
        if (existing) {
          skipped++;
          continue;
        }
        
        // Erstelle neue Reservation
        await prisma.reservation.create({
          data: {
            id: reservation.id,
            lobbyReservationId: reservation.lobbyReservationId,
            guestName: reservation.guestName,
            guestEmail: reservation.guestEmail,
            guestPhone: reservation.guestPhone,
            checkInDate: new Date(reservation.checkInDate),
            checkOutDate: new Date(reservation.checkOutDate),
            arrivalTime: reservation.arrivalTime ? new Date(reservation.arrivalTime) : null,
            roomNumber: reservation.roomNumber,
            roomDescription: reservation.roomDescription,
            status: reservation.status,
            paymentStatus: reservation.paymentStatus,
            amount: reservation.amount,
            currency: reservation.currency,
            paymentLink: reservation.paymentLink,
            doorPin: reservation.doorPin,
            doorAppName: reservation.doorAppName,
            ttlLockId: reservation.ttlLockId,
            ttlLockPassword: reservation.ttlLockPassword,
            onlineCheckInCompleted: reservation.onlineCheckInCompleted,
            onlineCheckInCompletedAt: reservation.onlineCheckInCompletedAt ? new Date(reservation.onlineCheckInCompletedAt) : null,
            invitationSentAt: reservation.invitationSentAt ? new Date(reservation.invitationSentAt) : null,
            sentMessage: reservation.sentMessage,
            sentMessageAt: reservation.sentMessageAt ? new Date(reservation.sentMessageAt) : null,
            sireRegistered: reservation.sireRegistered,
            sireRegistrationId: reservation.sireRegistrationId,
            sireRegisteredAt: reservation.sireRegisteredAt ? new Date(reservation.sireRegisteredAt) : null,
            sireRegistrationError: reservation.sireRegistrationError,
            guestNationality: reservation.guestNationality,
            guestPassportNumber: reservation.guestPassportNumber,
            guestBirthDate: reservation.guestBirthDate ? new Date(reservation.guestBirthDate) : null,
            organizationId: 1, // Immer Organisation ID 1 (La Familia Hostel)
            taskId: reservation.taskId,
            createdAt: new Date(reservation.createdAt),
            updatedAt: new Date(reservation.updatedAt),
          },
        });
        
        imported++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint violation - bereits vorhanden
          skipped++;
        } else {
          console.error(\`❌ Fehler beim Importieren von Reservation \${reservation.id}:\`, error.message);
          errors++;
        }
      }
    }
    
    // ⚠️ WICHTIG: Synchronisiere PostgreSQL-Sequenz nach Import mit expliziten IDs
    // Dies stellt sicher, dass nachfolgende autoincrement-Erstellungen (manuell oder Email-Import) funktionieren
    try {
      const maxIdResult = await prisma.$queryRaw<[{ max: bigint | null }]>`
        SELECT MAX(id) as max FROM "Reservation"
      `;
      const maxId = maxIdResult[0].max;
      
      if (maxId && maxId > 0) {
        await prisma.$executeRaw\`SELECT setval('"Reservation_id_seq"', \${Number(maxId)}, true)\`;
        console.log(\`✅ PostgreSQL-Sequenz für Reservation.id synchronisiert auf \${maxId}\`);
      } else {
        console.log('⚠️  Keine Reservationen gefunden, Sequenz bleibt unverändert');
      }
    } catch (seqError) {
      console.error('⚠️  Fehler beim Synchronisieren der Sequenz (nicht kritisch):', seqError);
      // Nicht kritisch, Import war erfolgreich
    }
    
    console.log(\`✅ Import abgeschlossen: \${imported} importiert, \${skipped} übersprungen, \${errors} Fehler\`);
  } catch (error) {
    console.error('❌ Fehler beim Import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importReservations();
`;
  
  const scriptFile = path.join(__dirname, 'import_reservations.ts');
  fs.writeFileSync(scriptFile, importScript);
  
  // Kopiere Import-Script auf Server (ins Backend-Verzeichnis, nicht /tmp)
  const copyScriptCommand = `scp -i ~/.ssh/intranet_rsa ${scriptFile} root@65.109.228.106:/var/www/intranet/backend/scripts/import_reservations.ts`;
  await execAsync(copyScriptCommand);
  
  // Kopiere auch JSON-Datei ins Backend-Verzeichnis
  const copyJsonCommand = `scp -i ~/.ssh/intranet_rsa ${jsonFile} root@65.109.228.106:/var/www/intranet/backend/scripts/sync_reservations.json`;
  await execAsync(copyJsonCommand);
  
  // Führe Import auf Server aus (mit einfacheren Anführungszeichen)
  console.log('🔄 Führe Import auf dem Server aus...');
  const executeCommand = `ssh -i ~/.ssh/intranet_rsa root@65.109.228.106 "cd /var/www/intranet/backend && npx ts-node scripts/import_reservations.ts && rm scripts/import_reservations.ts scripts/sync_reservations.json"`;
  
  try {
    const { stdout, stderr } = await execAsync(executeCommand);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('❌ Fehler beim Importieren:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
  
  // Lösche temporäre Dateien lokal
  fs.unlinkSync(jsonFile);
  fs.unlinkSync(scriptFile);
  
  console.log('✅ Reservationen-Synchronisation abgeschlossen!\n');
}

async function syncCerebroArticles(localPrisma: PrismaClient) {
  console.log('\n📚 Synchronisiere Cerebro-Artikel...\n');
  
  // Lokale Cerebro-Artikel abrufen
  const localArticles = await localPrisma.cerebroCarticle.findMany({
    orderBy: { id: 'asc' },
  });
  
  console.log(`✅ Lokale Cerebro-Artikel gefunden: ${localArticles.length}`);
  
  if (localArticles.length === 0) {
    console.log('⚠️  Keine lokalen Cerebro-Artikel gefunden.\n');
    return;
  }
  
  // Exportiere als JSON
  const jsonFile = path.join(__dirname, 'sync_cerebro.json');
  fs.writeFileSync(jsonFile, JSON.stringify(localArticles, null, 2));
  console.log(`📝 JSON-Datei erstellt: ${jsonFile}`);
  
  // Kopiere auf Server (wird später nochmal kopiert, aber hier für Kompatibilität)
  console.log('📤 Kopiere Daten auf den Server...');
  
  // Erstelle Import-Script auf dem Server
  const importScript = `
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importCerebroArticles() {
  try {
    const data = JSON.parse(fs.readFileSync('/var/www/intranet/backend/scripts/sync_cerebro.json', 'utf-8'));
    console.log(\`📥 Importiere \${data.length} Cerebro-Artikel...\`);
    
    let imported = 0;
    let skipped = 0;
    let updated = 0;
    
    for (const article of data) {
      try {
        // Prüfe ob bereits vorhanden (nach ID oder Slug)
        const existing = await prisma.cerebroCarticle.findFirst({
          where: {
            OR: [
              { id: article.id },
              { slug: article.slug },
            ],
          },
        });
        
        if (existing) {
          // Update falls vorhanden
          await prisma.cerebroCarticle.update({
            where: { id: existing.id },
            data: {
              title: article.title,
              content: article.content,
              slug: article.slug,
              parentId: article.parentId,
              updatedById: article.updatedById,
              isPublished: article.isPublished,
              position: article.position,
              githubPath: article.githubPath,
              organizationId: article.organizationId,
              updatedAt: new Date(),
            },
          });
          updated++;
          continue;
        }
        
        // Erstelle neuen Artikel
        await prisma.cerebroCarticle.create({
          data: {
            id: article.id,
            title: article.title,
            content: article.content,
            slug: article.slug,
            parentId: article.parentId,
            createdById: article.createdById,
            updatedById: article.updatedById,
            isPublished: article.isPublished,
            position: article.position,
            githubPath: article.githubPath,
            organizationId: article.organizationId,
            createdAt: new Date(article.createdAt),
            updatedAt: new Date(article.updatedAt),
          },
        });
        
        imported++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          // Unique constraint violation - bereits vorhanden
          skipped++;
        } else {
          console.error(\`❌ Fehler beim Importieren von Artikel \${article.id}:\`, error.message);
        }
      }
    }
    
    console.log(\`✅ Import abgeschlossen: \${imported} importiert, \${updated} aktualisiert, \${skipped} übersprungen\`);
  } catch (error) {
    console.error('❌ Fehler beim Import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importCerebroArticles();
`;
  
  const scriptFile = path.join(__dirname, 'import_cerebro.ts');
  fs.writeFileSync(scriptFile, importScript);
  
  // Kopiere Import-Script auf Server (ins Backend-Verzeichnis, nicht /tmp)
  const copyScriptCommand = `scp -i ~/.ssh/intranet_rsa ${scriptFile} root@65.109.228.106:/var/www/intranet/backend/scripts/import_cerebro.ts`;
  await execAsync(copyScriptCommand);
  
  // Kopiere auch JSON-Datei ins Backend-Verzeichnis
  const copyJsonCommand = `scp -i ~/.ssh/intranet_rsa ${jsonFile} root@65.109.228.106:/var/www/intranet/backend/scripts/sync_cerebro.json`;
  await execAsync(copyJsonCommand);
  
  // Führe Import auf Server aus (mit einfacheren Anführungszeichen)
  console.log('🔄 Führe Import auf dem Server aus...');
  const executeCommand = `ssh -i ~/.ssh/intranet_rsa root@65.109.228.106 "cd /var/www/intranet/backend && npx ts-node scripts/import_cerebro.ts && rm scripts/import_cerebro.ts scripts/sync_cerebro.json"`;
  
  try {
    const { stdout, stderr } = await execAsync(executeCommand);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('❌ Fehler beim Importieren:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
  
  // Lösche temporäre Dateien lokal
  fs.unlinkSync(jsonFile);
  fs.unlinkSync(scriptFile);
  
  console.log('✅ Cerebro-Artikel-Synchronisation abgeschlossen!\n');
}

async function main() {
  console.log('🚀 Starte Synchronisation von Reservationen und Cerebro-Artikeln...\n');
  
  const localPrisma = new PrismaClient();
  
  try {
    await syncReservations(localPrisma);
    await syncCerebroArticles(localPrisma);
    
    console.log('✅ Synchronisation vollständig abgeschlossen!\n');
  } catch (error) {
    console.error('❌ Fehler bei der Synchronisation:', error);
    process.exit(1);
  } finally {
    await localPrisma.$disconnect();
  }
}

main();
