import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LanguageDetectionService } from '../src/services/languageDetectionService';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verifyUserPhoneInDb() {
  try {
    console.log('🔍 Verifiziere User Telefonnummer in DB\n');
    console.log('='.repeat(60));

    // Finde User Patrick
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firstName: 'Patrick' },
          { email: { contains: 'patrick' } }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        branches: {
          select: {
            branchId: true,
            branch: {
              select: {
                id: true,
                name: true,
                whatsappSettings: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User nicht gefunden');
      return;
    }

    console.log(`✅ User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`   - Telefonnummer: "${user.phoneNumber}"`);
    console.log(`   - Länge: ${user.phoneNumber?.length || 0} Zeichen`);
    console.log(`   - Mit +: ${user.phoneNumber?.startsWith('+') ? 'Ja' : 'Nein'}`);

    // Teste verschiedene Formate, wie WhatsApp sie senden könnte
    console.log('\n📱 Teste verschiedene WhatsApp-Formate:');
    console.log('-'.repeat(60));

    const testFormats = [
      '41787192338',      // WhatsApp sendet vermutlich ohne +
      '+41787192338',     // Mit +
      user.phoneNumber,   // Wie in DB gespeichert
    ];

    for (const format of testFormats) {
      if (!format) continue;
      
      const normalized = LanguageDetectionService.normalizePhoneNumber(format);
      console.log(`\n   Format: "${format}"`);
      console.log(`   → Normalisiert: "${normalized}"`);
      console.log(`   → Stimmt mit DB überein: ${normalized === user.phoneNumber ? '✅ Ja' : '❌ Nein'}`);

      // Teste Suche
      const found = await prisma.user.findFirst({
        where: {
          phoneNumber: normalized,
          branches: {
            some: {
              branchId: 2 // Manila
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      });

      console.log(`   → User gefunden: ${found ? `✅ Ja (${found.firstName} ${found.lastName})` : '❌ Nein'}`);
    }

    // Prüfe Branch-Zuordnung
    console.log('\n\n🏢 Branch-Zuordnung:');
    console.log('-'.repeat(60));
    const manilaBranch = user.branches.find(b => b.branchId === 2);
    if (manilaBranch) {
      console.log(`✅ User ist Branch "Manila" (ID: 2) zugeordnet`);
      console.log(`   - Branch hat WhatsApp Settings: ${!!manilaBranch.branch.whatsappSettings}`);
    } else {
      console.log(`❌ User ist NICHT Branch "Manila" (ID: 2) zugeordnet!`);
      console.log(`   - User Branches:`);
      for (const userBranch of user.branches) {
        console.log(`     - ${userBranch.branch.name} (ID: ${userBranch.branchId})`);
      }
    }

    console.log('\n✅ Verifizierung abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verifyUserPhoneInDb();

