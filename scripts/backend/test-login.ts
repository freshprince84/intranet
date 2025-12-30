import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const testEmail = 'test4@example.com';
    const testPassword = 'test123'; // Ändere das zu dem Passwort, das du verwendet hast
    
    console.log('🔍 Suche Benutzer:', testEmail);
    
    // Finde Benutzer
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: testEmail },
          { email: testEmail }
        ]
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Benutzer nicht gefunden!');
      return;
    }

    console.log('✅ Benutzer gefunden:');
    console.log('  ID:', user.id);
    console.log('  Username:', user.username);
    console.log('  Email:', user.email);
    console.log('  Passwort (Hash):', user.password.substring(0, 20) + '...');
    console.log('  Passwort-Länge:', user.password.length);
    console.log('  Rollen:', user.roles.map(r => r.role.name));

    // Teste verschiedene Passwörter
    const passwordsToTest = ['test123', 'password123', 'admin123'];
    
    console.log('\n🔐 Teste Passwörter:');
    for (const pwd of passwordsToTest) {
      const isValid = await bcrypt.compare(pwd, user.password);
      console.log(`  "${pwd}": ${isValid ? '✅ KORREKT' : '❌ FALSCH'}`);
    }

    // Teste mit dem Passwort aus der E-Mail (sollte das sein, was du registriert hast)
    console.log('\n💡 Tipp: Das Passwort sollte das sein, das du bei der Registrierung eingegeben hast.');
    console.log('   Prüfe deine Mailtrap-Inbox für die Registrierungs-E-Mail!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();

