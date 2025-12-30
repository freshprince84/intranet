/**
 * Script zur Bereinigung der Cerebro-Datenbank
 * 
 * Setzt content auf null für alle Artikel mit githubPath,
 * da der Content von GitHub geladen wird und nicht in der DB gespeichert werden soll.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupCerebroContent() {
  try {
    console.log('🧹 Starte Bereinigung der Cerebro-Artikel...');
    
    // Finde alle Artikel mit githubPath
    const articlesWithGithubPath = await prisma.cerebroCarticle.findMany({
      where: {
        githubPath: {
          not: null
        }
      },
      select: {
        id: true,
        title: true,
        githubPath: true,
        content: true
      }
    });
    
    console.log(`📊 Gefunden: ${articlesWithGithubPath.length} Artikel mit githubPath`);
    
    // Zähle Artikel, die noch content haben
    const articlesWithContent = articlesWithGithubPath.filter((a: { content: string | null }) => a.content !== null);
    console.log(`📝 Davon haben noch content: ${articlesWithContent.length} Artikel`);
    
    if (articlesWithContent.length === 0) {
      console.log('✅ Keine Bereinigung notwendig - alle Artikel haben bereits content: null');
      return;
    }
    
    // Setze content auf null für alle Artikel mit githubPath
    const result = await prisma.cerebroCarticle.updateMany({
      where: {
        githubPath: {
          not: null
        },
        content: {
          not: null
        }
      },
      data: {
        content: null
      }
    });
    
    console.log(`✅ Bereinigt: ${result.count} Artikel (content auf null gesetzt)`);
    
    // Zeige einige Beispiele
    if (articlesWithContent.length > 0) {
      console.log('\n📋 Beispiele bereinigter Artikel:');
      articlesWithContent.slice(0, 5).forEach((article: { title: string; githubPath: string | null }) => {
        console.log(`   - ${article.title} (${article.githubPath})`);
      });
      if (articlesWithContent.length > 5) {
        console.log(`   ... und ${articlesWithContent.length - 5} weitere`);
      }
    }
    
    console.log('\n✅ Bereinigung abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Fehler bei der Bereinigung:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
cleanupCerebroContent()
  .then(() => {
    console.log('✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

