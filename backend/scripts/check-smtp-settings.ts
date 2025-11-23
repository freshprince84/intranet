import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function checkSmtpSettings() {
  try {
    // Branch 3 SMTP Settings prüfen
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        emailSettings: true,
        organizationId: true
      }
    });
    console.log('BRANCH_3_SETTINGS:', JSON.stringify({
      id: branch?.id,
      name: branch?.name,
      hasEmailSettings: !!branch?.emailSettings,
      emailSettingsKeys: branch?.emailSettings ? Object.keys(branch.emailSettings as any) : [],
      organizationId: branch?.organizationId
    }, null, 2));
    
    if (branch?.emailSettings) {
      try {
        const settings = decryptBranchApiSettings(branch.emailSettings as any);
        const emailSettings = settings?.email || settings;
        console.log('BRANCH_3_DECRYPTED:', JSON.stringify({
          smtpHost: emailSettings?.smtpHost ? 'SET' : 'NOT SET',
          smtpPort: emailSettings?.smtpPort,
          smtpUser: emailSettings?.smtpUser ? 'SET' : 'NOT SET',
          smtpPass: emailSettings?.smtpPass ? 'SET' : 'NOT SET',
          smtpHostValue: emailSettings?.smtpHost || null
        }, null, 2));
      } catch (e) {
        console.error('BRANCH_3_DECRYPT_ERROR:', e instanceof Error ? e.message : String(e));
      }
    }
    
    // Organization 1 SMTP Settings prüfen
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        settings: true
      }
    });
    const orgSettings = org?.settings as any;
    console.log('ORG_1_SETTINGS:', JSON.stringify({
      id: org?.id,
      name: org?.name,
      hasSettings: !!org?.settings,
      smtpHost: orgSettings?.smtpHost ? 'SET' : 'NOT SET',
      smtpPort: orgSettings?.smtpPort,
      smtpUser: orgSettings?.smtpUser ? 'SET' : 'NOT SET',
      smtpPass: orgSettings?.smtpPass ? 'SET' : 'NOT SET',
      smtpHostValue: orgSettings?.smtpHost || null
    }, null, 2));
    
  } catch (error) {
    console.error('ERROR:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkSmtpSettings();

