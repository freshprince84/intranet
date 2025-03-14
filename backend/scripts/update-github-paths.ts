import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping von Slug zu githubPath
const GITHUB_PATH_MAPPING = [
  { slug: 'readme', path: 'README.md' },
  { slug: 'project-setup', path: 'PROJECT_SETUP.md' },
  { slug: 'dokumentationsstandards', path: 'DOKUMENTATIONSSTANDARDS.md' },
  { slug: 'design-standards', path: 'DESIGN_STANDARDS.md' },
  { slug: 'coding-standards', path: 'CODING_STANDARDS.md' },
  { slug: 'modul-zeiterfassung', path: 'MODUL_ZEITERFASSUNG.md' },
  { slug: 'cerebro-wiki', path: 'MODUL_CEREBRO.md' },
  { slug: 'modul-teamkontrolle', path: 'MODUL_TEAMKONTROLLE.md' },
  { slug: 'modul-abrechnung', path: 'MODUL_ABRECHNUNG.md' },
  { slug: 'db-schema', path: 'DB_SCHEMA.md' },
  { slug: 'api-integration', path: 'API_INTEGRATION.md' },
  { slug: 'role-switch', path: 'ROLE_SWITCH.md' },
  { slug: 'changelog', path: 'CHANGELOG.md' }
];

/**
 * Dieses Skript aktualisiert die githubPath-Werte für alle Cerebro-Artikel,
 * nachdem die Migration hinzugefügt wurde.
 */
async function updateGithubPaths() {
  console.log('Aktualisiere githubPath-Werte für Cerebro-Artikel...');
  
  try {
    // Für jeden Eintrag im Mapping
    for (const { slug, path } of GITHUB_PATH_MAPPING) {
      // Suche den Artikel mit diesem Slug
      const article = await prisma.cerebroCarticle.findUnique({
        where: { slug }
      });
      
      if (article) {
        // Aktualisiere den githubPath
        await prisma.cerebroCarticle.update({
          where: { id: article.id },
          data: { githubPath: path }
        });
        console.log(`✅ Aktualisiert: ${slug} -> ${path}`);
      } else {
        console.log(`❌ Nicht gefunden: ${slug}`);
      }
    }
    
    console.log('Aktualisierung abgeschlossen!');
  } catch (error) {
    console.error('Fehler bei der Aktualisierung:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe die Funktion aus
updateGithubPaths(); 