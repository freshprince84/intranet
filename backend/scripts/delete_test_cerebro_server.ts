import { PrismaClient } from '@prisma/client';

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
    
    console.log(`📊 Gefundene Test-Artikel auf Server: ${testArticles.length}`);
    testArticles.forEach(a => {
      console.log(`  - ID: ${a.id}, Titel: "${a.title}", Slug: "${a.slug}"`);
    });
    
    if (testArticles.length === 0) {
      console.log('✅ Keine Test-Artikel gefunden.');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`
🗑️  Lösche ${testArticles.length} Test-Artikel...
`);
    
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
        console.log(`✅ Gelöscht: ID ${article.id} - "${article.title}"`);
        deleted++;
      } catch (error: any) {
        console.error(`❌ Fehler beim Löschen von Artikel ${article.id}:`, error.message);
      }
    }
    
    console.log(`
✅ Server: ${deleted} von ${testArticles.length} Artikeln gelöscht`);
  } catch (error) {
    console.error('❌ Fehler beim Löschen:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestArticles();
