/**
 * Test-Script für die GitHub-Links-Korrektur-Funktion
 * 
 * Verwendung:
 * npx ts-node backend/scripts/test-fix-github-links.ts <username> <password>
 * 
 * Beispiel:
 * npx ts-node backend/scripts/test-fix-github-links.ts admin admin123
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';
const PROD_URL = 'https://65.109.228.106.nip.io';

async function testFixGitHubLinks(username: string, password: string, useProd: boolean = false) {
  const baseUrl = useProd ? PROD_URL : API_BASE_URL;
  
  console.log('\n🔍 GitHub-Links-Korrektur Test');
  console.log('='.repeat(50));
  console.log(`URL: ${baseUrl}`);
  console.log(`Benutzer: ${username}`);
  console.log('='.repeat(50));

  try {
    // Schritt 1: Login
    console.log('\n📝 Schritt 1: Authentifizierung...');
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      username,
      password
    });

    if (!loginResponse.data.token) {
      console.error('❌ Login fehlgeschlagen');
      console.error('   Response:', loginResponse.data);
      process.exit(1);
    }

    const token = loginResponse.data.token;
    console.log('✅ Login erfolgreich');
    console.log(`   User: ${loginResponse.data.user?.username || 'N/A'}`);

    // Schritt 2: Bestehende GitHub-Links prüfen
    console.log('\n📊 Schritt 2: Bestehende GitHub-Links prüfen...');
    
    // Alle Artikel abrufen
    const articlesResponse = await axios.get(`${baseUrl}/api/cerebro/carticles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const articles = articlesResponse.data;
    console.log(`   Gefunden: ${articles.length} Artikel`);
    
    // Artikel mit githubPath finden
    const articlesWithGithubPath = articles.filter((a: any) => a.githubPath);
    console.log(`   Artikel mit githubPath: ${articlesWithGithubPath.length}`);
    
    // GitHub-Links für alle Artikel prüfen
    let totalLinks = 0;
    const linksByArticle: Array<{ articleId: number; articleSlug: string; articleTitle: string; links: any[] }> = [];
    
    for (const article of articles) {
      try {
        const linksResponse = await axios.get(`${baseUrl}/api/cerebro/links/carticle/${article.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const links = linksResponse.data.filter((l: any) => 
          l.type === 'github_markdown' || 
          l.url?.includes('github.com') || 
          l.url?.includes('raw.githubusercontent.com')
        );
        
        if (links.length > 0) {
          totalLinks += links.length;
          linksByArticle.push({
            articleId: article.id,
            articleSlug: article.slug,
            articleTitle: article.title,
            links
          });
          
          console.log(`\n   Artikel: ${article.title} (${article.slug})`);
          console.log(`     ID: ${article.id}`);
          console.log(`     githubPath: ${article.githubPath || '(kein)'}`);
          console.log(`     GitHub-Links: ${links.length}`);
          links.forEach((link: any) => {
            console.log(`       - Link ${link.id}: ${link.url}`);
            console.log(`         Zuordnung: Artikel ${link.carticleId}`);
          });
        }
      } catch (err: any) {
        // Ignoriere Fehler (Artikel hat möglicherweise keine Links)
      }
    }
    
    console.log(`\n   Gesamt: ${totalLinks} GitHub-Links gefunden`);

    // Schritt 3: Korrektur-Funktion aufrufen
    console.log('\n🔧 Schritt 3: Korrektur-Funktion aufrufen...');
    const fixResponse = await axios.post(
      `${baseUrl}/api/cerebro/links/fix-github`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('✅ Korrektur abgeschlossen');
    console.log('\n📋 Ergebnisse:');
    console.log(JSON.stringify(fixResponse.data, null, 2));

    // Schritt 4: Nach der Korrektur nochmal prüfen
    if (fixResponse.data.corrected > 0) {
      console.log('\n🔍 Schritt 4: Überprüfung nach Korrektur...');
      
      for (const correction of fixResponse.data.corrections || []) {
        try {
          const linkResponse = await axios.get(`${baseUrl}/api/cerebro/links/${correction.linkId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const link = linkResponse.data;
          console.log(`\n   Link ${correction.linkId}:`);
          console.log(`     URL: ${link.url}`);
          console.log(`     Alter Artikel: ${correction.oldArticleId}`);
          console.log(`     Neuer Artikel: ${correction.newArticleId} (aktuell: ${link.carticleId})`);
          console.log(`     Pfad: ${correction.path}`);
          
          if (link.carticleId === correction.newArticleId) {
            console.log(`     ✅ Korrektur erfolgreich`);
          } else {
            console.log(`     ❌ Korrektur fehlgeschlagen (erwartet: ${correction.newArticleId}, aktuell: ${link.carticleId})`);
          }
        } catch (err: any) {
          console.error(`     ❌ Fehler beim Abrufen des Links: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Test abgeschlossen');
  } catch (error: any) {
    console.error('\n❌ Fehler:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Hauptfunktion
const args = process.argv.slice(2);
const useProd = args.includes('--prod');

// Credentials aus Umgebungsvariablen oder als Parameter
const username = process.env.API_USERNAME || args[0] || '';
const password = process.env.API_PASSWORD || args[1] || '';

if (!username || !password) {
  console.error('❌ Fehler: Benutzername und Passwort erforderlich');
  console.error('   Als Umgebungsvariablen: API_USERNAME und API_PASSWORD');
  console.error('   Oder als Parameter: npx ts-node scripts/test-fix-github-links.ts <username> <password> [--prod]');
  process.exit(1);
}

testFixGitHubLinks(username, password, useProd);

