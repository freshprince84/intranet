/// <reference types="node" />

import axios from 'axios';

const PROD_URL = 'https://65.109.228.106.nip.io';

/**
 * Prüft Cerebro-Artikel auf dem Prod-Server über die API
 */
async function checkCerebroProdViaAPI() {
  try {
    console.log('🔍 Prüfe Cerebro-Artikel auf Prod-Server über API...\n');
    
    // Hole alle Artikel
    const response = await axios.get(`${PROD_URL}/api/cerebro/carticles`);
    const articles = response.data;
    
    console.log(`📊 Gesamt Artikel: ${articles.length}\n`);
    
    const articlesWithGithubPath = articles.filter((a: any) => a.githubPath);
    const articlesWithoutGithubPath = articles.filter((a: any) => !a.githubPath);
    const publishedArticles = articles.filter((a: any) => a.isPublished);
    const unpublishedArticles = articles.filter((a: any) => !a.isPublished);
    
    console.log(`   - Artikel mit githubPath: ${articlesWithGithubPath.length}`);
    console.log(`   - Artikel ohne githubPath: ${articlesWithoutGithubPath.length}`);
    console.log(`   - Artikel isPublished=true: ${publishedArticles.length}`);
    console.log(`   - Artikel isPublished=false: ${unpublishedArticles.length}\n`);
    
    // Zeige Artikel mit githubPath
    if (articlesWithGithubPath.length > 0) {
      console.log('📄 Artikel mit githubPath:\n');
      for (const article of articlesWithGithubPath) {
        const hasDocsPrefix = article.githubPath.startsWith('docs/') || article.githubPath === 'README.md';
        const status = hasDocsPrefix ? '✅' : '❌';
        
        console.log(`   ${status} ID ${article.id}: ${article.title}`);
        console.log(`      githubPath: ${article.githubPath}`);
        console.log(`      Pfad korrekt: ${hasDocsPrefix ? 'JA' : 'NEIN (fehlt docs/ Präfix)'}`);
        console.log(`      isPublished: ${article.isPublished}\n`);
      }
    }
    
    // Zeige Artikel ohne githubPath
    if (articlesWithoutGithubPath.length > 0) {
      console.log('📄 Artikel ohne githubPath (manuell erstellt):\n');
      for (const article of articlesWithoutGithubPath) {
        console.log(`   - ID ${article.id}: ${article.title} (slug: ${article.slug})`);
        console.log(`     isPublished: ${article.isPublished}\n`);
      }
    }
    
    // Prüfe fehlerhafte Pfade
    if (articlesWithGithubPath.length > 0) {
      console.log('🔍 Prüfe Pfade auf Fehler...\n');
      const problems: Array<{ id: number; title: string; githubPath: string; issue: string }> = [];
      
      for (const article of articlesWithGithubPath) {
        if (!article.githubPath) continue;
        
        // Prüfe ob Pfad mit docs/ beginnt
        if (!article.githubPath.startsWith('docs/') && article.githubPath !== 'README.md') {
          problems.push({
            id: article.id,
            title: article.title,
            githubPath: article.githubPath,
            issue: 'Pfad beginnt nicht mit docs/ und ist nicht README.md'
          });
        }
      }
      
      if (problems.length > 0) {
        console.log(`❌ ${problems.length} Probleme gefunden:\n`);
        for (const problem of problems) {
          console.log(`   - ID ${problem.id}: ${problem.title}`);
          console.log(`     githubPath: ${problem.githubPath}`);
          console.log(`     Problem: ${problem.issue}`);
          console.log(`     Erwartet: docs/${problem.githubPath} oder docs/[ordner]/${problem.githubPath}\n`);
        }
      } else {
        console.log('✅ Alle Pfade sind korrekt!\n');
      }
    }
    
    // Zusammenfassung
    console.log('='.repeat(100));
    console.log('\n📋 Zusammenfassung:\n');
    console.log(`   - Gesamt Artikel: ${articles.length}`);
    console.log(`   - Artikel mit githubPath: ${articlesWithGithubPath.length}`);
    console.log(`   - Artikel ohne githubPath: ${articlesWithoutGithubPath.length}`);
    
    if (articlesWithGithubPath.length > 0) {
      const correctPaths = articlesWithGithubPath.filter((a: any) => 
        a.githubPath.startsWith('docs/') || a.githubPath === 'README.md'
      );
      const incorrectPaths = articlesWithGithubPath.filter((a: any) => 
        !a.githubPath.startsWith('docs/') && a.githubPath !== 'README.md'
      );
      
      console.log(`   - Korrekte Pfade: ${correctPaths.length}`);
      console.log(`   - Fehlerhafte Pfade: ${incorrectPaths.length}`);
    }
    
    console.log('\n' + '='.repeat(100));
    
  } catch (error: any) {
    console.error('❌ Fehler:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Daten:', error.response.data);
    }
    throw error;
  }
}

// Starte Prüfung
checkCerebroProdViaAPI().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

