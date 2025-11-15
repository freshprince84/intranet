/// <reference types="node" />

import fs from 'fs';
import path from 'path';

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
  'claude',
  'implementation_plans',
  'implementation_reports',
  'analysis',
  'technical',
  'coding_standards',
  'design_standards',
  'dokumentationsstandards',
  'entwicklungsumgebung',
  'architektur',
  'api_referenz',
  'datenbankschema',
  'berechtigungssystem',
  'deployment',
  'server_update',
  'fehlerbehebung',
  'frontend_technologien',
  'mobile_app',
  'performance_analysis',
  'timezone_handling',
  'attachment_url_fix',
  'expandable_description_implementation',
  'image_preview_implementation',
  'automatische_monatsabrechnungen',
  'api_differenzen',
  'backlog',
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
 * Liste von Dateien, die explizit eingeschlossen werden sollen
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
 * Findet alle nutzerrelevanten Markdown-Dateien
 */
function findUserRelevantFiles(dir: string, baseDir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      const shouldExclude = EXCLUDED_DIRECTORIES.some(excluded => 
        entry.name.toLowerCase().includes(excluded.toLowerCase())
      );
      
      if (!shouldExclude) {
        findUserRelevantFiles(fullPath, baseDir, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (!containsSensitiveInfo(relativePath, entry.name)) {
        files.push(relativePath);
      }
    }
  }
  
  return files;
}

/**
 * Hauptfunktion: Zeigt Vorschau der zu importierenden Dateien
 */
function previewUserRelevantDocs() {
  try {
    console.log('🔍 Vorschau: Nutzerrelevante Dokumente\n');
    
    const repoRoot = path.resolve(__dirname, '../../');
    const relevantFiles = findUserRelevantFiles(repoRoot, repoRoot);
    
    console.log(`📊 Gefunden: ${relevantFiles.length} nutzerrelevante Dokumente\n`);
    
    // Gruppiere nach Verzeichnis
    const grouped: Record<string, string[]> = {};
    
    for (const file of relevantFiles) {
      const dir = path.dirname(file) || '.';
      if (!grouped[dir]) {
        grouped[dir] = [];
      }
      grouped[dir].push(file);
    }
    
    // Sortiere Verzeichnisse
    const sortedDirs = Object.keys(grouped).sort();
    
    console.log('📋 Zu importierende Dokumente:\n');
    for (const dir of sortedDirs) {
      console.log(`\n📁 ${dir}/`);
      for (const file of grouped[dir].sort()) {
        const fileName = path.basename(file);
        console.log(`   ✓ ${fileName}`);
      }
    }
    
    console.log(`\n\n📊 Zusammenfassung:`);
    console.log(`   - Gesamt: ${relevantFiles.length} Dokumente`);
    console.log(`   - Verzeichnisse: ${sortedDirs.length}`);
    
    console.log(`\n✅ Diese Dokumente würden importiert werden.`);
    console.log(`⚠️  Sensible Dokumente (Admin-Zugänge, Server-Setup, etc.) werden ausgeschlossen.`);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

previewUserRelevantDocs();
