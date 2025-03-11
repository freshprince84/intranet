import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const prisma = new PrismaClient();

interface DokumentationLink {
  slug: string;
  title: string;
  githubUrl: string;
}

// Links zu den GitHub-Dokumenten
const dokumentationLinks: DokumentationLink[] = [
  {
    slug: 'intranet-ueberblick',
    title: 'Intranet - Überblick',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/README.md'
  },
  {
    slug: 'projekteinrichtung',
    title: 'Projekteinrichtung',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/PROJECT_SETUP.md'
  },
  {
    slug: 'datenbankschema',
    title: 'Datenbankschema',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/DB_SCHEMA.md'
  },
  {
    slug: 'backend-einrichtung',
    title: 'Backend-Einrichtung',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/BACKEND_SETUP.md'
  },
  {
    slug: 'frontend-einrichtung',
    title: 'Frontend-Einrichtung',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/FRONTEND_SETUP.md'
  },
  {
    slug: 'api-integration',
    title: 'API-Integration',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/API_INTEGRATION.md'
  },
  {
    slug: 'cerebro-dokumentation',
    title: 'Cerebro Dokumentation',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/CEREBRO_WIKI.md'
  },
  {
    slug: 'changelog',
    title: 'Änderungsprotokoll',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/CHANGELOG.md'
  },
  {
    slug: 'benutzerhandbuch-intranet',
    title: 'Benutzerhandbuch Intranet',
    githubUrl: 'https://github.com/freshprince84/intranet/blob/main/USER_MANUAL.md'
  }
];

/**
 * Artikelinhalte mit GitHub-Links aktualisieren
 */
const updateCerebroLinks = async () => {
  console.log('Starte Aktualisierung der Cerebro-Artikel mit GitHub-Links...');
  
  try {
    for (const dokLink of dokumentationLinks) {
      // Suche den Artikel anhand des Slugs
      const artikel = await prisma.cerebroCarticle.findFirst({
        where: {
          slug: { contains: dokLink.slug }
        }
      });
      
      if (artikel) {
        // Artikel gefunden - aktualisiere mit GitHub-Link
        const updatedContent = `
# ${dokLink.title}

Dieser Artikel wurde in unsere GitHub-Dokumentation verschoben und wird dort gepflegt.

## GitHub-Link

[${dokLink.title} auf GitHub](${dokLink.githubUrl})

---

Sie werden in 3 Sekunden automatisch weitergeleitet...

<script>
setTimeout(function() {
  window.location.href = "${dokLink.githubUrl}";
}, 3000);
</script>
`;

        await prisma.cerebroCarticle.update({
          where: { id: artikel.id },
          data: {
            content: updatedContent
          }
        });
        
        console.log(`Artikel "${artikel.title}" (${artikel.slug}) wurde aktualisiert.`);
      } else {
        console.log(`Kein Artikel mit Slug "${dokLink.slug}" gefunden.`);
      }
    }
    
    console.log('Aktualisierung der Cerebro-Artikel abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Aktualisierung der Cerebro-Artikel:', error);
  } finally {
    await prisma.$disconnect();
  }
};

// Ausführen der Aktualisierung
updateCerebroLinks()
  .then(() => console.log('Skript erfolgreich ausgeführt.'))
  .catch(error => console.error('Fehler bei der Ausführung des Skripts:', error)); 