/// <reference types="node" />

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const SERVER_IP = '65.109.228.106';
const SSH_KEY = '~/.ssh/intranet_rsa';

/**
 * Deploys the Spanish shift planner guide to the Hetzner server as a Cerebro article
 */
async function deploySchichtplanerGuia() {
  try {
    console.log('📚 Deploye spanische Schichtplaner-Guía auf Hetzner Server...\n');

    // Lese die Guía-Datei
    const repoRoot = path.resolve(__dirname, '../..');
    const guiaPath = path.join(repoRoot, 'docs/implementation_plans/SCHICHTPLANER_GUIA_USUARIO_ES.md');
    
    if (!fs.existsSync(guiaPath)) {
      throw new Error(`Guía-Datei nicht gefunden: ${guiaPath}`);
    }

    const content = fs.readFileSync(guiaPath, 'utf8');

    // Erstelle ein temporäres Script, das den Inhalt direkt einbettet
    const scriptContent = `/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

const content = ${JSON.stringify(content)};

async function createSchichtplanerGuia() {
  try {
    console.log('📚 Erstelle spanische Schichtplaner-Guía als Cerebro-Artikel...\\n');

    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: 1 },
          { username: 'admin' }
        ]
      }
    });

    if (!adminUser) {
      throw new Error('Kein Admin-User gefunden!');
    }

    console.log(\`👤 Verwende Admin-User: \${adminUser.username} (ID: \${adminUser.id})\\n\`);

    const title = 'Guía Completa del Usuario - Planificador de Turnos';
    const slug = slugify(title, { lower: true, strict: true });

    console.log(\`📄 Titel: \${title}\`);
    console.log(\`🔗 Slug: \${slug}\\n\`);

    const existing = await prisma.cerebroCarticle.findFirst({
      where: {
        OR: [
          { slug },
          { title }
        ]
      }
    });

    if (existing) {
      await prisma.cerebroCarticle.update({
        where: { id: existing.id },
        data: {
          content,
          parentId: null,
          isPublished: true,
          updatedById: adminUser.id
        }
      });
      console.log(\`✅ Artikel aktualisiert: \${title}\`);
      console.log(\`   ID: \${existing.id}\`);
      console.log(\`   URL: /cerebro/\${slug}\`);
    } else {
      const newArticle = await prisma.cerebroCarticle.create({
        data: {
          title,
          content,
          slug,
          parentId: null,
          createdById: adminUser.id,
          isPublished: true
        }
      });
      console.log(\`➕ Neuer Artikel erstellt: \${title}\`);
      console.log(\`   ID: \${newArticle.id}\`);
      console.log(\`   URL: /cerebro/\${slug}\`);
    }

    console.log('\\n' + '='.repeat(100));
    console.log('\\n✅ Spanische Schichtplaner-Guía erfolgreich erstellt/aktualisiert!\\n');
    console.log(\`   📍 Position: Oberste Ebene (Root-Level)\`);
    console.log(\`   🔗 Zugriff: /cerebro/\${slug}\`);
    console.log('\\n' + '='.repeat(100));

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Guía:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSchichtplanerGuia().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});
`;

    // Speichere temporäres Script
    const tempScriptPath = path.join(repoRoot, 'backend/scripts/temp_create_guia.ts');
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

    console.log('📤 Kopiere Script auf Server...');
    const copyCommand = `scp -i ${SSH_KEY} "${tempScriptPath}" root@${SERVER_IP}:/var/www/intranet/backend/scripts/temp_create_guia.ts`;
    await execAsync(copyCommand);

    console.log('🚀 Führe Script auf Server aus...');
    const executeCommand = `ssh -i ${SSH_KEY} root@${SERVER_IP} "cd /var/www/intranet/backend && npx ts-node scripts/temp_create_guia.ts && rm scripts/temp_create_guia.ts"`;
    
    const { stdout, stderr } = await execAsync(executeCommand);
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Lösche temporäres Script lokal
    fs.unlinkSync(tempScriptPath);

    console.log('\n✅ Deployment erfolgreich abgeschlossen!');

  } catch (error: any) {
    console.error('❌ Fehler beim Deployment:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

deploySchichtplanerGuia();
