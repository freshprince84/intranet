import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function updateBranch3SmtpPort() {
  try {
    console.log('🔧 Aktualisiere Branch 3 SMTP Port von 465 auf 587...\n');

    // Lade Branch 3
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        emailSettings: true
      }
    });

    if (!branch) {
      console.error('❌ Branch 3 nicht gefunden');
      return;
    }

    if (!branch.emailSettings) {
      console.error('❌ Branch 3 hat keine emailSettings');
      return;
    }

    // Entschlüssele Settings
    const settings = decryptBranchApiSettings(branch.emailSettings as any);
    const emailSettings = settings?.email || settings;

    console.log('📧 Aktuelle Email Settings:');
    console.log(`   smtpHost: ${emailSettings?.smtpHost}`);
    console.log(`   smtpPort: ${emailSettings?.smtpPort}`);
    console.log(`   smtpUser: ${emailSettings?.smtpUser ? 'SET' : 'NOT SET'}`);
    console.log(`   smtpPass: ${emailSettings?.smtpPass ? 'SET' : 'NOT SET'}\n`);

    // Ändere Port von 465 auf 587
    if (emailSettings?.smtpPort === 465) {
      emailSettings.smtpPort = 587;
      console.log('✅ Port geändert: 465 → 587\n');

      // Verschlüssele Settings wieder
      const updatedSettings = {
        ...settings,
        email: emailSettings
      };
      const encryptedSettings = encryptBranchApiSettings(updatedSettings);

      // Speichere in Datenbank
      await prisma.branch.update({
        where: { id: 3 },
        data: {
          emailSettings: encryptedSettings
        }
      });

      console.log('✅ Branch 3 SMTP Port erfolgreich auf 587 geändert');
    } else {
      console.log(`⚠️ Port ist bereits ${emailSettings?.smtpPort}, keine Änderung nötig`);
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateBranch3SmtpPort();

