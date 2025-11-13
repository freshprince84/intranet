#!/usr/bin/env node

/**
 * Validierungsscript für Übersetzungen
 * Prüft, ob alle Übersetzungsschlüssel in allen Sprachen vorhanden sind
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const languages = ['de', 'en', 'es'];
const localeFiles = languages.map(lang => ({
  lang,
  path: path.join(localesDir, `${lang}.json`),
  data: null
}));

// Lade alle Übersetzungsdateien
localeFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file.path, 'utf8');
    file.data = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Fehler beim Laden von ${file.path}:`, error.message);
    process.exit(1);
  }
});

// Funktion zum Extrahieren aller Schlüssel aus einem Objekt
function extractKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...extractKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Extrahiere alle Schlüssel aus allen Sprachen
const allKeys = {};
languages.forEach(lang => {
  const file = localeFiles.find(f => f.lang === lang);
  if (file && file.data) {
    allKeys[lang] = new Set(extractKeys(file.data));
  }
});

// Finde fehlende Schlüssel
const missingKeys = {};
const allUniqueKeys = new Set();
languages.forEach(lang => {
  allKeys[lang].forEach(key => allUniqueKeys.add(key));
});

allUniqueKeys.forEach(key => {
  languages.forEach(lang => {
    if (!allKeys[lang].has(key)) {
      if (!missingKeys[lang]) {
        missingKeys[lang] = [];
      }
      missingKeys[lang].push(key);
    }
  });
});

// Ausgabe der Ergebnisse
console.log('\n📋 Übersetzungs-Validierung\n');
console.log('='.repeat(60));

// Zeige Statistiken
languages.forEach(lang => {
  const count = allKeys[lang]?.size || 0;
  const missing = missingKeys[lang]?.length || 0;
  const status = missing === 0 ? '✅' : '❌';
  console.log(`${status} ${lang.toUpperCase()}: ${count} Schlüssel, ${missing} fehlend`);
});

console.log('='.repeat(60));

// Zeige fehlende Schlüssel
let hasErrors = false;
languages.forEach(lang => {
  if (missingKeys[lang] && missingKeys[lang].length > 0) {
    hasErrors = true;
    console.log(`\n❌ Fehlende Schlüssel in ${lang.toUpperCase()}:`);
    missingKeys[lang].sort().forEach(key => {
      console.log(`   - ${key}`);
    });
  }
});

if (!hasErrors) {
  console.log('\n✅ Alle Übersetzungen sind vollständig!');
  process.exit(0);
} else {
  console.log('\n⚠️  Es fehlen Übersetzungen. Bitte ergänzen Sie die fehlenden Schlüssel.');
  process.exit(1);
}


