/**
 * Prüft und korrigiert API-Schlüssel-Format
 */

const apiKey = 'AlzaSyCH7KCmWJo0QgD7RKD52-9BjL1-v71AU0Q';

console.log('🔍 API-Schlüssel-Analyse:\n');
console.log(`Original: ${apiKey}`);
console.log(`Länge: ${apiKey.length}`);
console.log(`Beginnt mit: ${apiKey.substring(0, 4)}`);
console.log(`\n💡 MÖGLICHE KORREKTUR:`);
console.log(`   Wenn der Schlüssel "AIza" beginnen sollte:`);
console.log(`   Korrigiert: AIza${apiKey.substring(4)}`);
console.log(`\n   Teste beide Varianten...\n`);

// Teste beide Varianten
const correctedKey = 'AIza' + apiKey.substring(4);
console.log(`Original: ${apiKey.substring(0, 20)}...`);
console.log(`Korrigiert: ${correctedKey.substring(0, 20)}...`);

