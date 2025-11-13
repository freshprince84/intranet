#!/usr/bin/env node

/**
 * Script zum automatischen Ergänzen fehlender Übersetzungen
 * Kopiert fehlende Schlüssel aus DE und erstellt Platzhalter für EN/ES
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');

// Lade alle Übersetzungsdateien
const de = JSON.parse(fs.readFileSync(path.join(localesDir, 'de.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const es = JSON.parse(fs.readFileSync(path.join(localesDir, 'es.json'), 'utf8'));

// Funktion zum Extrahieren aller Schlüssel aus einem Objekt
function extractKeys(obj, prefix = '') {
  const keys = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(keys, extractKeys(obj[key], fullKey));
    } else {
      keys[fullKey] = obj[key];
    }
  }
  return keys;
}

// Funktion zum Setzen eines Werts in einem verschachtelten Objekt
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object' || Array.isArray(current[keys[i]])) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Extrahiere alle Schlüssel
const deKeys = extractKeys(de);
const enKeys = extractKeys(en);
const esKeys = extractKeys(es);

// Finde fehlende Schlüssel
const missingInEn = [];
const missingInEs = [];

Object.keys(deKeys).forEach(key => {
  if (!enKeys[key]) {
    missingInEn.push(key);
  }
  if (!esKeys[key]) {
    missingInEs.push(key);
  }
});

console.log(`\n📋 Fehlende Übersetzungen gefunden:`);
console.log(`EN: ${missingInEn.length} Schlüssel`);
console.log(`ES: ${missingInEs.length} Schlüssel\n`);

// Ergänze fehlende Schlüssel in EN (mit DE-Wert als Platzhalter)
let addedEn = 0;
missingInEn.forEach(key => {
  setNestedValue(en, key, deKeys[key] + ' [TODO: Translate]');
  addedEn++;
});

// Ergänze fehlende Schlüssel in ES (mit DE-Wert als Platzhalter)
let addedEs = 0;
missingInEs.forEach(key => {
  setNestedValue(es, key, deKeys[key] + ' [TODO: Traducir]');
  addedEs++;
});

// Speichere Dateien
fs.writeFileSync(
  path.join(localesDir, 'en.json'),
  JSON.stringify(en, null, 2) + '\n',
  'utf8'
);

fs.writeFileSync(
  path.join(localesDir, 'es.json'),
  JSON.stringify(es, null, 2) + '\n',
  'utf8'
);

console.log(`✅ Ergänzt:`);
console.log(`   EN: ${addedEn} Schlüssel`);
console.log(`   ES: ${addedEs} Schlüssel`);
console.log(`\n⚠️  Bitte übersetzen Sie die [TODO: Translate/Traducir] Markierungen!`);

