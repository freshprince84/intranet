import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function deleteTestArticles(localPrisma: PrismaClient) {
  console.log('🗑️  Lösche Test-Artikel aus Cerebro...\n');
  
  // Finde alle Artikel mit "test" im Titel oder Slug (case-insensitive)
  const testArticles = await localPrisma.cerebroCarticle.findMany({
    where: {
      OR: [
        { title: { contains: 'test', mode: 'insensitive' } },
        { slug: { contains: 'test', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      organizationId: true,
    },
    orderBy: { id: 'asc' },
  });
  
  console.log(`📊 Gefundene Test-Artikel: ${testArticles.length}`);
  testArticles.forEach(a => {
    console.log(`  - ID: ${a.id}, Titel: "${a.title}", Slug: "${a.slug}", OrgID: ${a.organizationId}`);
  });
  
  if (testArticles.length === 0) {
    console.log('✅ Keine Test-Artikel gefunden.\n');
    return;
  }
  
  // Bestätigung
  console.log(`\n⚠️  WARNUNG: ${testArticles.length} Artikel werden gelöscht!`);
  console.log('Lösche Test-Artikel lokal...\n');
  
  // Lösche lokal (zuerst verknüpfte Daten, dann Artikel)
  let deletedLocal = 0;
  for (const article of testArticles) {
    try {
      // Lösche zuerst verknüpfte Daten
      await localPrisma.cerebroExternalLink.deleteMany({
        where: { carticleId: article.id },
      });
      await localPrisma.cerebroMedia.deleteMany({
        where: { carticleId: article.id },
      });
      await localPrisma.taskCerebroCarticle.deleteMany({
        where: { carticleId: article.id },
      });
      await localPrisma.requestCerebroCarticle.deleteMany({
        where: { carticleId: article.id },
      });
      // Setze parentId auf null für Kinder-Artikel
      await localPrisma.cerebroCarticle.updateMany({
        where: { parentId: article.id },
        data: { parentId: null },
      });
      
      // Jetzt kann der Artikel gelöscht werden
      await localPrisma.cerebroCarticle.delete({
        where: { id: article.id },
      });
      console.log(`✅ Lokal gelöscht: ID ${article.id} - "${article.title}"`);
      deletedLocal++;
    } catch (error: any) {
      console.error(`❌ Fehler beim Löschen von Artikel ${article.id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Lokal gelöscht: ${deletedLocal} von ${testArticles.length} Artikeln\n`);
  
  // Erstelle Script für Server
  const deleteScript = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteTestArticles() {
  try {
    // Finde alle Artikel mit "test" im Titel oder Slug (case-insensitive)
    const testArticles = await prisma.cerebroCarticle.findMany({
      where: {
        OR: [
          { title: { contains: 'test', mode: 'insensitive' } },
          { slug: { contains: 'test', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
      orderBy: { id: 'asc' },
    });
    
    console.log(\`📊 Gefundene Test-Artikel auf Server: \${testArticles.length}\`);
    testArticles.forEach(a => {
      console.log(\`  - ID: \${a.id}, Titel: "\${a.title}", Slug: "\${a.slug}"\`);
    });
    
    if (testArticles.length === 0) {
      console.log('✅ Keine Test-Artikel gefunden.');
      await prisma.$disconnect();
      return;
    }
    
    console.log(\`\n🗑️  Lösche \${testArticles.length} Test-Artikel...\n\`);
    
    let deleted = 0;
    for (const article of testArticles) {
      try {
        // Lösche zuerst verknüpfte Daten
        await prisma.cerebroExternalLink.deleteMany({
          where: { carticleId: article.id },
        });
        await prisma.cerebroMedia.deleteMany({
          where: { carticleId: article.id },
        });
        await prisma.taskCerebroCarticle.deleteMany({
          where: { carticleId: article.id },
        });
        await prisma.requestCerebroCarticle.deleteMany({
          where: { carticleId: article.id },
        });
        // Setze parentId auf null für Kinder-Artikel
        await prisma.cerebroCarticle.updateMany({
          where: { parentId: article.id },
          data: { parentId: null },
        });
        
        // Jetzt kann der Artikel gelöscht werden
        await prisma.cerebroCarticle.delete({
          where: { id: article.id },
        });
        console.log(\`✅ Gelöscht: ID \${article.id} - "\${article.title}"\`);
        deleted++;
      } catch (error: any) {
        console.error(\`❌ Fehler beim Löschen von Artikel \${article.id}:\`, error.message);
      }
    }
    
    console.log(\`\n✅ Server: \${deleted} von \${testArticles.length} Artikeln gelöscht\`);
  } catch (error) {
    console.error('❌ Fehler beim Löschen:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestArticles();
`;
  
  const scriptFile = 'backend/scripts/delete_test_cerebro_server.ts';
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(scriptFile, deleteScript);
  
  // Kopiere Script auf Server
  console.log('📤 Kopiere Lösch-Script auf den Server...');
  const copyCommand = `scp -i ~/.ssh/intranet_rsa ${scriptFile} root@65.109.228.106:/var/www/intranet/backend/scripts/delete_test_cerebro_server.ts`;
  await execAsync(copyCommand);
  
  // Führe auf Server aus
  console.log('🔄 Führe Löschung auf dem Server aus...\n');
  const executeCommand = `ssh -i ~/.ssh/intranet_rsa root@65.109.228.106 "cd /var/www/intranet/backend && npx ts-node scripts/delete_test_cerebro_server.ts && rm scripts/delete_test_cerebro_server.ts"`;
  
  try {
    const { stdout, stderr } = await execAsync(executeCommand);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('❌ Fehler beim Löschen auf dem Server:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
  
  // Lösche lokales Script
  fs.unlinkSync(scriptFile);
  
  console.log('\n✅ Alle Test-Artikel wurden gelöscht!\n');
}

async function main() {
  const localPrisma = new PrismaClient();
  
  try {
    await deleteTestArticles(localPrisma);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await localPrisma.$disconnect();
  }
}

main();

