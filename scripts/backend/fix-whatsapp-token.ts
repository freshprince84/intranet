import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptSecret, encryptSecret } from '../src/utils/encryption';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Fix WhatsApp Token - Entschlüsselt und speichert Token neu (unverschlüsselt oder korrekt verschlüsselt)
 * 
 * Verwendung:
 * npm run ts-node scripts/fix-whatsapp-token.ts [organizationId] [newToken]
 * 
 * Wenn newToken angegeben wird, wird dieser Token verwendet (unverschlüsselt gespeichert)
 * Wenn newToken nicht angegeben wird, wird der aktuelle Token entschlüsselt und unverschlüsselt gespeichert
 */

async function fixWhatsAppToken() {
  try {
    const organizationId = parseInt(process.argv[2] || '1', 10);
    const newToken = process.argv[3]; // Optional: Neuer Token

    console.log('🔧 Fix WhatsApp Token...\n');
    console.log(`Organisation ID: ${organizationId}`);

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error(`Organisation ${organizationId} nicht gefunden!`);
    }

    console.log(`✅ Organisation: ${organization.displayName}\n`);

    const settings = (organization.settings || {}) as any;
    const currentToken = settings?.whatsapp?.apiKey;

    if (!currentToken) {
      throw new Error('Kein WhatsApp Token in Settings gefunden!');
    }

    console.log('Aktueller Token Status:');
    console.log(`  Länge: ${currentToken.length}`);
    console.log(`  Enthält Doppelpunkt: ${currentToken.includes(':')}`);
    console.log(`  Start: ${currentToken.substring(0, 50)}...\n`);

    let tokenToSave: string;

    if (newToken) {
      // Neuer Token wurde übergeben - verwende diesen (unverschlüsselt)
      console.log('📝 Verwende neuen Token (wird unverschlüsselt gespeichert)...');
      tokenToSave = newToken;
    } else {
      // Versuche aktuellen Token zu entschlüsseln
      if (currentToken.includes(':')) {
        console.log('🔓 Versuche Token zu entschlüsseln...');
        try {
          const decrypted = decryptSecret(currentToken);
          console.log(`✅ Token erfolgreich entschlüsselt!`);
          console.log(`  Entschlüsselte Länge: ${decrypted.length}`);
          console.log(`  Start: ${decrypted.substring(0, 50)}...`);
          tokenToSave = decrypted;
        } catch (error) {
          console.error('❌ Fehler beim Entschlüsseln:', error);
          console.log('⚠️  Token wird als bereits unverschlüsselt behandelt');
          tokenToSave = currentToken;
        }
      } else {
        console.log('✅ Token ist bereits unverschlüsselt');
        tokenToSave = currentToken;
      }
    }

    // Prüfe ob Token gültig aussieht (sollte nur alphanumerische Zeichen enthalten)
    const isValidFormat = /^[A-Za-z0-9]+$/.test(tokenToSave);
    if (!isValidFormat) {
      console.warn('⚠️  WARNUNG: Token enthält nicht-alphanumerische Zeichen!');
      console.warn(`  Token: ${tokenToSave.substring(0, 100)}...`);
    }

    // Speichere Token UNVERSCHLÜSSELT (damit er funktioniert)
    // Später kann er wieder verschlüsselt werden, wenn ENCRYPTION_KEY korrekt ist
    const updatedSettings = {
      ...settings,
      whatsapp: {
        ...settings.whatsapp,
        provider: 'whatsapp-business-api',
        apiKey: tokenToSave, // Unverschlüsselt speichern
        phoneNumberId: settings.whatsapp?.phoneNumberId || undefined
      }
    };

    // Speichere in DB (ohne Verschlüsselung)
    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings }
    });

    console.log(`\n✅ WhatsApp Token erfolgreich aktualisiert!`);
    console.log(`   Token wird unverschlüsselt gespeichert (für sofortige Funktionalität)`);
    console.log(`   Token-Länge: ${tokenToSave.length}`);
    console.log(`   Token-Start: ${tokenToSave.substring(0, 30)}...`);
    console.log(`\n⚠️  HINWEIS: Token ist jetzt unverschlüsselt gespeichert.`);
    console.log(`   Für Produktion sollte der Token später wieder verschlüsselt werden.`);

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('Fehlermeldung:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixWhatsAppToken();

