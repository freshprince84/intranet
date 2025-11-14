const fs = require('fs');
const path = require('path');

// Lade alle Übersetzungsdateien
const dePath = path.join(__dirname, '../src/i18n/locales/de.json');
const enPath = path.join(__dirname, '../src/i18n/locales/en.json');
const esPath = path.join(__dirname, '../src/i18n/locales/es.json');

const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

// Verwendete Keys aus dem Code (aus Terminal-Output)
const usedCommonKeys = [
  'actions', 'active', 'all', 'back', 'cancel', 'clearFilters', 'close', 'collapse', 
  'confirm', 'create', 'delete', 'description', 'done', 'edit', 'error', 'expand', 
  'filter', 'force', 'generating', 'loading', 'loadingFilters', 'loadingOrganization', 
  'loadingPermissions', 'loadingScreen', 'loadingScreenSubtitle', 'loadingStatistics', 
  'nextDay', 'notAuthenticated', 'open', 'pleaseSelect', 'previousDay', 'processing', 
  'refresh', 'remaining', 'reset', 'retry', 'save', 'saving', 'search', 'searchPlaceholder', 
  'select', 'sending', 'showFilter', 'showMore', 'today', 'unknown', 'update', 'uploading', 
  'viewAsCards', 'viewAsTable', 'week'
];

// Funktion zum rekursiven Sammeln aller Keys
function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Funktion zum Finden von TODO-Markern
function findTODOs(obj, prefix = '') {
  const todos = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      todos.push(...findTODOs(obj[key], fullKey));
    } else if (typeof obj[key] === 'string' && (obj[key].includes('[TODO:') || obj[key].includes('[TODO:'))) {
      todos.push(fullKey);
    }
  }
  return todos;
}

// Funktion zum Finden doppelter Keys (nur in common)
function findDuplicates(obj, section = 'common') {
  const duplicates = [];
  if (obj[section]) {
    const keys = Object.keys(obj[section]);
    const seen = new Set();
    for (const key of keys) {
      if (seen.has(key)) {
        duplicates.push(key);
      }
      seen.add(key);
    }
  }
  return duplicates;
}

// Analysiere
const deCommon = de.common || {};
const enCommon = en.common || {};
const esCommon = es.common || {};

// Fehlende Keys (nur die, die wirklich fehlen)
const missingInDE = usedCommonKeys.filter(k => !deCommon.hasOwnProperty(k));
const missingInEN = usedCommonKeys.filter(k => !enCommon.hasOwnProperty(k));
const missingInES = usedCommonKeys.filter(k => !esCommon.hasOwnProperty(k));

// TODO-Marker
const todosDE = findTODOs(de);
const todosEN = findTODOs(en);
const todosES = findTODOs(es);

// Doppelte Keys
const duplicatesDE = findDuplicates(de);
const duplicatesEN = findDuplicates(en);
const duplicatesES = findDuplicates(es);

// Ausgabe
console.log('='.repeat(80));
console.log('ANALYSE: FEHLENDE SCHLÜSSEL');
console.log('='.repeat(80));
console.log(`\nFEHLENDE IN DE (${missingInDE.length}):`);
missingInDE.forEach(k => console.log(`  - common.${k}`));

console.log(`\nFEHLENDE IN EN (${missingInEN.length}):`);
missingInEN.forEach(k => console.log(`  - common.${k}`));

console.log(`\nFEHLENDE IN ES (${missingInES.length}):`);
missingInES.forEach(k => console.log(`  - common.${k}`));

console.log('\n' + '='.repeat(80));
console.log('ANALYSE: TODO-MARKER (FEHLENDE ÜBERSETZUNGEN)');
console.log('='.repeat(80));
console.log(`\nTODO IN DE (${todosDE.length}):`);
todosDE.forEach(k => console.log(`  - ${k}`));

console.log(`\nTODO IN EN (${todosEN.length}):`);
todosEN.forEach(k => console.log(`  - ${k}`));

console.log(`\nTODO IN ES (${todosES.length}):`);
todosES.forEach(k => console.log(`  - ${k}`));

console.log('\n' + '='.repeat(80));
console.log('ANALYSE: DOPPELTE SCHLÜSSEL');
console.log('='.repeat(80));
console.log(`\nDOPPELTE IN DE (${duplicatesDE.length}):`);
duplicatesDE.forEach(k => console.log(`  - common.${k}`));

console.log(`\nDOPPELTE IN EN (${duplicatesEN.length}):`);
duplicatesEN.forEach(k => console.log(`  - common.${k}`));

console.log(`\nDOPPELTE IN ES (${duplicatesES.length}):`);
duplicatesES.forEach(k => console.log(`  - common.${k}`));

console.log('\n' + '='.repeat(80));
console.log('ZUSAMMENFASSUNG');
console.log('='.repeat(80));
console.log(`Fehlende Keys in DE: ${missingInDE.length}`);
console.log(`Fehlende Keys in EN: ${missingInEN.length}`);
console.log(`Fehlende Keys in ES: ${missingInES.length}`);
console.log(`TODO-Marker in DE: ${todosDE.length}`);
console.log(`TODO-Marker in EN: ${todosEN.length}`);
console.log(`TODO-Marker in ES: ${todosES.length}`);
console.log(`Doppelte Keys in DE: ${duplicatesDE.length}`);
console.log(`Doppelte Keys in EN: ${duplicatesEN.length}`);
console.log(`Doppelte Keys in ES: ${duplicatesES.length}`);

