import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { LanguageDetectionService } from '../src/services/languageDetectionService';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkUserPhoneNumber() {
  try {
    console.log('🔍 Prüfe User Telefonnummer\n');
    console.log('='.repeat(60));

    // Test verschiedene Formate, wie WhatsApp sie senden könnte
    const testNumbers = [
      '41787192338',      // Ohne +
      '+41787192338',     // Mit +
      '0041787192338',    // Mit 00
      '41787192338',      // Original
    ];

    console.log('\n1. Teste verschiedene Telefonnummer-Formate:');
    console.log('-'.repeat(60));

    for (const testNum of testNumbers) {
      const normalized = LanguageDetectionService.normalizePhoneNumber(testNum);
      console.log(`   - Original: ${testNum} → Normalisiert: ${normalized}`);
    }

    // 2. Prüfe User in DB
    console.log('\n\n2. User in Datenbank:');
    console.log('-'.repeat(60));

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
                name: true
              }
            }
          }
        }
      }
    });

    if (user) {
      console.log(`✅ User gefunden: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      console.log(`   - Telefonnummer in DB: "${user.phoneNumber}"`);
      console.log(`   - Länge: ${user.phoneNumber?.length || 0} Zeichen`);
      console.log(`   - Mit +: ${user.phoneNumber?.startsWith('+') ? 'Ja' : 'Nein'}`);
      console.log(`   - Branches:`);
      for (const userBranch of user.branches) {
        console.log(`     - ${userBranch.branch.name} (ID: ${userBranch.branchId})`);
      }

      // 3. Teste Suche mit verschiedenen Formaten
      console.log('\n\n3. Teste User-Suche mit verschiedenen Formaten:');
      console.log('-'.repeat(60));

      const testFormats = [
        user.phoneNumber,
        LanguageDetectionService.normalizePhoneNumber(user.phoneNumber || ''),
        user.phoneNumber?.replace('+', ''),
        user.phoneNumber?.replace('+', '00'),
      ];

      for (const format of testFormats) {
        if (!format) continue;
        
        const found = await prisma.user.findFirst({
          where: {
            phoneNumber: format,
            branches: {
              some: {
                branchId: 2 // Manila
              }
            }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        });

        console.log(`   - Format: "${format}" → ${found ? '✅ Gefunden' : '❌ Nicht gefunden'}`);
        if (found) {
          console.log(`     User: ${found.firstName} ${found.lastName} (ID: ${found.id})`);
        }
      }

      // 4. Teste wie WhatsApp sendet
      console.log('\n\n4. Simuliere WhatsApp-Format:');
      console.log('-'.repeat(60));
      
      // WhatsApp sendet normalerweise ohne +, nur die Nummer
      const whatsappFormat = user.phoneNumber?.replace('+', '') || '';
      const normalizedWhatsapp = LanguageDetectionService.normalizePhoneNumber(whatsappFormat);
      
      console.log(`   - WhatsApp sendet vermutlich: "${whatsappFormat}"`);
      console.log(`   - Nach Normalisierung: "${normalizedWhatsapp}"`);
      console.log(`   - In DB gespeichert: "${user.phoneNumber}"`);
      console.log(`   - Stimmen überein: ${normalizedWhatsapp === user.phoneNumber ? '✅ Ja' : '❌ Nein'}`);

      if (normalizedWhatsapp !== user.phoneNumber) {
        console.log('\n   ⚠️  PROBLEM: Normalisierte Nummer stimmt nicht mit DB überein!');
        console.log(`   → Lösung: Telefonnummer in DB auf "${normalizedWhatsapp}" ändern`);
      }
    } else {
      console.log('❌ User nicht gefunden');
    }

    console.log('\n✅ Prüfung abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPhoneNumber();

