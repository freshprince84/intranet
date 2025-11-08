import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function testOrgSMTP() {
  try {
    // Hole alle Organisationen
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        domain: true,
        settings: true
      }
    });

    console.log('\n📋 Gefundene Organisationen:');
    console.log('='.repeat(60));
    
    for (const org of organizations) {
      console.log(`\n🏢 Organisation: ${org.displayName} (ID: ${org.id})`);
      console.log(`   Domain: ${org.domain || 'nicht gesetzt'}`);
      
      if (org.settings && typeof org.settings === 'object') {
        const settings = org.settings as any;
        console.log(`   Settings vorhanden: ✅`);
        
        if (settings.smtpHost) {
          console.log(`   📧 SMTP Host: ${settings.smtpHost}`);
          console.log(`   📧 SMTP Port: ${settings.smtpPort || 'nicht gesetzt'}`);
          console.log(`   📧 SMTP User: ${settings.smtpUser || 'nicht gesetzt'}`);
          console.log(`   📧 SMTP Pass: ${settings.smtpPass ? '***' : 'nicht gesetzt'}`);
          console.log(`   📧 From Email: ${settings.smtpFromEmail || 'nicht gesetzt'}`);
          console.log(`   📧 From Name: ${settings.smtpFromName || 'nicht gesetzt'}`);
          
          // Teste SMTP-Verbindung
          console.log(`\n   🔍 Teste SMTP-Verbindung...`);
          try {
            const port = settings.smtpPort ? parseInt(settings.smtpPort) : 587;
            const transporter = nodemailer.createTransport({
              host: settings.smtpHost,
              port: port,
              secure: port === 465,
              auth: {
                user: settings.smtpUser,
                pass: settings.smtpPass
              }
            });
            
            // Teste Verbindung
            await transporter.verify();
            console.log(`   ✅ SMTP-Verbindung erfolgreich!`);
            
            // Versuche Test-E-Mail zu senden (nur wenn Test-Email angegeben)
            const testEmail = process.argv[2];
            if (testEmail) {
              console.log(`\n   📨 Sende Test-E-Mail an: ${testEmail}...`);
              const fromEmail = settings.smtpFromEmail || settings.smtpUser;
              const fromName = settings.smtpFromName || org.displayName;
              const fromString = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
              
              const info = await transporter.sendMail({
                from: fromString,
                to: testEmail,
                subject: 'Test-E-Mail von Intranet',
                html: `
                  <h1>Test-E-Mail</h1>
                  <p>Dies ist eine Test-E-Mail von der Organisation <strong>${org.displayName}</strong>.</p>
                  <p>SMTP-Konfiguration funktioniert korrekt! ✅</p>
                `,
                text: `Test-E-Mail von ${org.displayName}. SMTP-Konfiguration funktioniert korrekt!`
              });
              
              console.log(`   ✅ Test-E-Mail erfolgreich versendet! Message ID: ${info.messageId}`);
            } else {
              console.log(`   ℹ️  Keine Test-E-Mail-Adresse angegeben. Verwende: npm run test-org-smtp <email@example.com>`);
            }
          } catch (smtpError: any) {
            console.error(`   ❌ SMTP-Fehler:`, smtpError.message);
            if (smtpError.code) {
              console.error(`   Fehler-Code: ${smtpError.code}`);
            }
            if (smtpError.response) {
              console.error(`   Response: ${smtpError.response}`);
            }
          }
        } else {
          console.log(`   ⚠️  Keine SMTP-Einstellungen gefunden`);
        }
      } else {
        console.log(`   ⚠️  Keine Settings vorhanden`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testOrgSMTP();

