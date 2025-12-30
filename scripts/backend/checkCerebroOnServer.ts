/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Prüft Cerebro-Artikel auf dem Server
 */
async function checkCerebroOnServer() {
  try {
    console.log('🔍 Prüfe Cerebro-Artikel auf Server...\n');
    
    // Hole alle Artikel
    const allArticles = await prisma.cerebroCarticle.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        githubPath: true,
        isPublished: true,
        organizationId: true,
        parentId: true
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`📊 Gesamt Artikel: ${allArticles.length}\n`);
    
    const articlesWithGithubPath = allArticles.filter(a => a.githubPath);
    const articlesWithoutGithubPath = allArticles.filter(a => !a.githubPath);
    
    console.log(`   - Artikel mit githubPath: ${articlesWithGithubPath.length}`);
    console.log(`   - Artikel ohne githubPath: ${articlesWithoutGithubPath.length}\n`);
    
    // Prüfe Artikel mit githubPath
    if (articlesWithGithubPath.length > 0) {
      console.log('📄 Artikel mit githubPath:\n');
      const repoRoot = path.resolve(__dirname, '../../');
      
      for (const article of articlesWithGithubPath) {
        const filePath = path.join(repoRoot, article.githubPath!);
        const exists = fs.existsSync(filePath);
        const status = exists ? '✅' : '❌';
        
        console.log(`   ${status} ID ${article.id}: ${article.title}`);
        console.log(`      githubPath: ${article.githubPath}`);
        console.log(`      Datei existiert: ${exists ? 'JA' : 'NEIN'}\n`);
      }
    }
    
    // Prüfe fehlerhafte Pfade
    if (articlesWithGithubPath.length > 0) {
      console.log('🔍 Prüfe Pfade auf Fehler...\n');
      const repoRoot = path.resolve(__dirname, '../../');
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
        
        // Prüfe ob Datei existiert
        const filePath = path.join(repoRoot, article.githubPath);
        if (!fs.existsSync(filePath)) {
          problems.push({
            id: article.id,
            title: article.title,
            githubPath: article.githubPath,
            issue: 'Datei existiert nicht'
          });
        }
      }
      
      if (problems.length > 0) {
        console.log(`❌ ${problems.length} Probleme gefunden:\n`);
        for (const problem of problems) {
          console.log(`   - ID ${problem.id}: ${problem.title}`);
          console.log(`     githubPath: ${problem.githubPath}`);
          console.log(`     Problem: ${problem.issue}\n`);
        }
      } else {
        console.log('✅ Alle Pfade sind korrekt!\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCerebroOnServer().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});

