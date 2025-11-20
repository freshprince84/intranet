import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkSMTPConfig() {
  try {
    console.log('🔍 Prüfe SMTP-Konfiguration...\n');

    // 1. Environment Variables
    console.log('📋 Environment Variables:');
    console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'NICHT GESETZT');
    console.log('   SMTP_PORT:', process.env.SMTP_PORT || 'NICHT GESETZT');
    console.log('   SMTP_USER:', process.env.SMTP_USER || 'NICHT GESETZT');
    console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '***' : 'NICHT GESETZT');
    console.log('');

    // 2. Organisation 1 Settings
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (org) {
      console.log('📋 Organisation 1 Settings:');
      const settings = org.settings as any;
      console.log('   Name:', org.displayName || org.name);
      console.log('   SMTP Host:', settings?.smtpHost || 'NICHT GESETZT');
      console.log('   SMTP Port:', settings?.smtpPort || 'NICHT GESETZT');
      console.log('   SMTP User:', settings?.smtpUser || 'NICHT GESETZT');
      console.log('   SMTP Pass:', settings?.smtpPass ? '***' : 'NICHT GESETZT');
      console.log('   SMTP From Email:', settings?.smtpFromEmail || 'NICHT GESETZT');
      console.log('   SMTP From Name:', settings?.smtpFromName || 'NICHT GESETZT');
      console.log('');

      // 3. Analyse
      const hasEnvSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      const hasOrgSMTP = !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpPass);

      console.log('🔍 Analyse:');
      console.log('   SMTP in Environment Variables:', hasEnvSMTP ? '✅' : '❌');
      console.log('   SMTP in Organisation Settings:', hasOrgSMTP ? '✅' : '❌');
      console.log('');

      if (!hasEnvSMTP && !hasOrgSMTP) {
        console.log('   ⚠️ PROBLEM: Keine SMTP-Konfiguration gefunden!');
        console.log('   → Email-Versand ist nicht möglich ohne SMTP-Konfiguration');
        console.log('   → Lösung: SMTP-Einstellungen in Organisation-Settings oder Environment Variables setzen');
      } else {
        console.log('   ✅ SMTP-Konfiguration vorhanden');
        if (hasOrgSMTP) {
          console.log('   → Verwendet Organisation-spezifische SMTP-Einstellungen');
        } else {
          console.log('   → Verwendet Environment Variables');
        }
      }
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSMTPConfig();

