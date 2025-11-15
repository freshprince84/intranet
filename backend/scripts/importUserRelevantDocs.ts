/// <reference types="node" />

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const prisma = new PrismaClient();

/**
 * Liste von Schlüsselwörtern, die auf sensible/Admin-Informationen hinweisen
 */
const SENSITIVE_KEYWORDS = [
  'admin',
  'administrator',
  'server',
  'deployment',
  'hetzner',
  'database',
  'db',
  'zugang',
  'zugriff',
  'password',
  'passwort',
  'token',
  'api_key',
  'api-key',
  'secret',
  'credentials',
  'setup',
  'configuration',
  'config',
  'env',
  '.env',
  'ssh',
  'root',
  'postgres',
  'prisma',
  'migration',
  'seed',
  'troubleshooting',
  'fix',
  'anleitung_fix',
  'server_fix',
  'migration_fix',
  'backend',
  'frontend_anleitung',
  'git_merge',
  'quick_reference_api_keys',
  'webhook_setup',
  'webhook_server_setup',
  'token_setup',
  'claude', // Claude-spezifische Dokumente sind für Entwickler
  'implementation_plans', // Implementierungspläne sind für Entwickler
  'implementation_reports', // Implementierungsberichte sind für Entwickler
  'analysis', // Analysen sind für Entwickler
  'technical', // Technische Details sind für Entwickler
  'coding_standards', // Coding-Standards sind für Entwickler
  'design_standards', // Design-Standards sind für Entwickler
  'dokumentationsstandards', // Dokumentationsstandards sind für Entwickler
  'entwicklungsumgebung', // Entwicklungsumgebung ist für Entwickler
  'architektur', // Architektur ist für Entwickler
  'api_referenz', // API-Referenz ist für Entwickler
  'datenbankschema', // Datenbankschema ist für Entwickler
  'berechtigungssystem', // Berechtigungssystem-Details sind für Entwickler
  'deployment', // Deployment ist für Admins
  'server_update', // Server-Update ist für Admins
  'fehlerbehebung', // Fehlerbehebung ist für Admins/Entwickler
  'frontend_technologien', // Frontend-Technologien sind für Entwickler
  'mobile_app', // Mobile App Details sind für Entwickler
  'performance_analysis', // Performance-Analyse ist für Entwickler
  'timezone_handling', // Timezone-Handling ist für Entwickler
  'attachment_url_fix', // Fixes sind für Entwickler
  'expandable_description_implementation', // Implementierungsdetails sind für Entwickler
  'image_preview_implementation', // Implementierungsdetails sind für Entwickler
  'automatische_monatsabrechnungen', // Technische Details
  'api_differenzen', // Technische Details
  'backlog', // Backlog ist für Entwickler
];

/**
 * Liste von Verzeichnissen, die ausgeschlossen werden sollen
 */
const EXCLUDED_DIRECTORIES = [
  'claude',
  'implementation_plans',
  'implementation_reports',
  'analysis',
  'technical',
  'backend',
  'node_modules',
  '.git',
  'dist',
  'build',
  'uploads',
];

/**
 * Liste von Dateien, die explizit eingeschlossen werden sollen (trotz möglicherweise sensibler Keywords)
 */
const EXPLICITLY_INCLUDED = [
  'docs/user/BENUTZERHANDBUCH.md',
  'docs/user/ADMINISTRATORHANDBUCH.md',
  'docs/modules/MODUL_ZEITERFASSUNG.md',
  'docs/modules/MODUL_CEREBRO.md',
  'docs/modules/MODUL_TEAMKONTROLLE.md',
  'docs/modules/MODUL_ABRECHNUNG.md',
  'docs/modules/MODUL_CONSULTATIONS.md',
  'docs/modules/MODUL_DOKUMENT_ERKENNUNG.md',
  'docs/modules/MODUL_FILTERSYSTEM.md',
  'docs/modules/MODUL_WORKTRACKER.md',
  'docs/modules/NOTIFICATION_SYSTEM.md',
  'docs/modules/WORKFLOW_AUTOMATISIERUNG.md',
  'docs/modules/ROLE_SWITCH.md',
  'docs/core/CHANGELOG.md',
  'docs/core/README.md',
  'docs/BENUTZERANLEITUNG_LEBENSZYKLUS.md',
  'README.md',
];

/**
 * Prüft, ob eine Datei sensible Informationen enthält
 */
function containsSensitiveInfo(filePath: string, fileName: string): boolean {
  const lowerPath = filePath.toLowerCase();
  const lowerName = fileName.toLowerCase();
  
  // Prüfe auf explizit eingeschlossene Dateien
  if (EXPLICITLY_INCLUDED.includes(filePath)) {
    return false;
  }
  
  // Prüfe auf ausgeschlossene Verzeichnisse
  for (const excludedDir of EXCLUDED_DIRECTORIES) {
    if (lowerPath.includes(`/${excludedDir}/`) || lowerPath.startsWith(`${excludedDir}/`)) {
      return true;
    }
  }
  
  // Prüfe auf sensible Keywords
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (lowerPath.includes(keyword) || lowerName.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Erstellt einen eindeutigen Slug
 */
async function createUniqueSlug(title: string, id?: number): Promise<string> {
  let slug = slugify(title, {
    lower: true,
    strict: true,
    locale: 'de'
  });
  
  const existingArticle = await prisma.cerebroCarticle.findFirst({
    where: {
      slug: {
        startsWith: slug
      },
      NOT: id ? { id } : undefined
    }
  });
  
  if (existingArticle) {
    slug = `${slug}-${Date.now()}`;
  }
  
  return slug;
}

/**
 * Erstellt oder findet einen Parent-Artikel basierend auf dem Verzeichnis
 */
async function getOrCreateParentCategory(dirPath: string, adminUserId: number): Promise<number | null> {
  if (!dirPath || dirPath === '.' || dirPath === 'docs') {
    return null; // Root-Level
  }
  
  // Erstelle einen lesbaren Titel aus dem Verzeichnisnamen
  const dirName = path.basename(dirPath);
  const title = dirName
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  const slug = await createUniqueSlug(title);
  
  // Prüfe, ob bereits vorhanden
  const existing = await prisma.cerebroCarticle.findFirst({
    where: { slug }
  });
  
  if (existing) {
    return existing.id;
  }
  
  // Erstelle neuen Parent
  const parent = await prisma.cerebroCarticle.create({
    data: {
      title,
      slug,
      content: `Kategorie: ${title}`,
      createdById: adminUserId,
      isPublished: true,
      githubPath: null
    }
  });
  
  return parent.id;
}

/**
 * Importiert eine Dokumentationsdatei
 */
async function importDocument(filePath: string, adminUserId: number) {
  try {
    const repoRoot = path.resolve(__dirname, '../../');
    const fullPath = path.join(repoRoot, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Datei nicht gefunden: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const fileName = path.basename(filePath, '.md');
    
    // Erstelle Titel aus Dateinamen
    const title = fileName
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const slug = await createUniqueSlug(title);
    
    // Bestimme Parent basierend auf Verzeichnis
    const dirPath = path.dirname(filePath);
    let parentId: number | null = null;
    
    if (dirPath && dirPath !== '.' && dirPath !== 'docs') {
      // Erstelle Parent-Kategorie für Unterverzeichnisse
      const parentDir = dirPath.replace(/^docs\//, ''); // Entferne 'docs/' Präfix
      if (parentDir && parentDir !== 'docs') {
        parentId = await getOrCreateParentCategory(parentDir, adminUserId);
      }
    }
    
    // Prüfe, ob bereits vorhanden
    const existing = await prisma.cerebroCarticle.findFirst({
      where: {
        OR: [
          { githubPath: filePath },
          { slug }
        ]
      }
    });
    
    if (existing) {
      // Aktualisiere bestehenden Artikel
      await prisma.cerebroCarticle.update({
        where: { id: existing.id },
        data: {
          content,
          parentId,
          githubPath: filePath,
          isPublished: true
        }
      });
      console.log(`✅ Aktualisiert: ${title}`);
    } else {
      // Erstelle neuen Artikel
      await prisma.cerebroCarticle.create({
        data: {
          title,
          content,
          slug,
          parentId,
          createdById: adminUserId,
          isPublished: true,
          githubPath: filePath
        }
      });
      console.log(`➕ Erstellt: ${title}`);
    }
  } catch (error) {
    console.error(`❌ Fehler beim Importieren von ${filePath}:`, error);
  }
}

/**
 * Findet alle nutzerrelevanten Markdown-Dateien
 */
function findUserRelevantFiles(dir: string, baseDir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      // Prüfe, ob Verzeichnis ausgeschlossen werden soll
      const shouldExclude = EXCLUDED_DIRECTORIES.some(excluded => 
        entry.name.toLowerCase().includes(excluded.toLowerCase())
      );
      
      if (!shouldExclude) {
        findUserRelevantFiles(fullPath, baseDir, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Prüfe, ob Datei nutzerrelevant ist
      if (!containsSensitiveInfo(relativePath, entry.name)) {
        files.push(relativePath);
      }
    }
  }
  
  return files;
}

/**
 * Hauptfunktion: Importiert alle nutzerrelevanten Dokumente
 */
async function importUserRelevantDocs() {
  try {
    console.log('🔍 Suche nach nutzerrelevanten Dokumenten...\n');
    
    // Finde Admin-User
    const adminUser = await prisma.user.findFirst({
      where: { username: 'admin' }
    });
    
    if (!adminUser) {
      console.error('❌ Admin-User nicht gefunden. Bitte Seed ausführen.');
      return;
    }
    
    const repoRoot = path.resolve(__dirname, '../../');
    
    // Finde alle nutzerrelevanten Dateien
    const relevantFiles = findUserRelevantFiles(repoRoot, repoRoot);
    
    console.log(`📊 Gefunden: ${relevantFiles.length} nutzerrelevante Dokumente\n`);
    console.log('📋 Zu importierende Dateien:\n');
    relevantFiles.forEach(file => console.log(`   - ${file}`));
    console.log('\n');
    
    // Importiere jede Datei
    for (const file of relevantFiles) {
      await importDocument(file, adminUser.id);
    }
    
    console.log(`\n✅ Import abgeschlossen! ${relevantFiles.length} Dokumente verarbeitet.`);
    
  } catch (error) {
    console.error('❌ Fehler beim Import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Starte Import
importUserRelevantDocs().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});
