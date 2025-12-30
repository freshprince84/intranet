/**
 * Prüft den Status der Gemini API im Google Cloud Projekt
 * 
 * Dieses Script hilft zu identifizieren, ob:
 * 1. Die API wirklich aktiviert ist
 * 2. Es ein Projekt-Mismatch gibt
 * 3. Der API-Schlüssel das richtige Format hat
 */

import axios from 'axios';

async function checkApiStatus(apiKey: string) {
  console.log('\n🔍 Detaillierte API-Diagnose\n');
  console.log(`API-Schlüssel Format:`);
  console.log(`  Länge: ${apiKey.length} Zeichen`);
  console.log(`  Erste 10: ${apiKey.substring(0, 10)}`);
  console.log(`  Letzte 10: ${apiKey.substring(apiKey.length - 10)}`);
  console.log(`  Enthält Leerzeichen: ${apiKey.includes(' ')}`);
  console.log(`  Enthält Zeilenumbrüche: ${apiKey.includes('\n') || apiKey.includes('\r')}`);
  console.log(`  Trimmed Länge: ${apiKey.trim().length}\n`);

  // Test 1: Prüfe ob API-Schlüssel überhaupt erkannt wird
  console.log('📋 Test 1: API-Schlüssel-Format-Prüfung...');
  const cleanKey = apiKey.trim();
  
  // Google API Keys haben normalerweise ein bestimmtes Format
  // Sie beginnen oft mit "AIza" und sind ~39 Zeichen lang
  if (!cleanKey.startsWith('AIza')) {
    console.log('⚠️  WARNUNG: API-Schlüssel beginnt nicht mit "AIza"');
    console.log('   Google API Keys beginnen normalerweise mit "AIza"');
  } else {
    console.log('✅ API-Schlüssel beginnt mit "AIza" (korrekt)');
  }

  if (cleanKey.length !== 39) {
    console.log(`⚠️  WARNUNG: API-Schlüssel Länge ist ${cleanKey.length}, erwartet: 39`);
  } else {
    console.log('✅ API-Schlüssel Länge ist korrekt (39 Zeichen)');
  }

  console.log('\n');

  // Test 2: Prüfe Models-Endpoint (sollte funktionieren wenn API aktiviert ist)
  console.log('📋 Test 2: Models-Endpoint (prüft ob API aktiviert ist)...');
  try {
    const modelsResponse = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
    );
    console.log('✅ Models-Endpoint funktioniert!');
    console.log(`   Gefundene Models: ${modelsResponse.data.models?.length || 0}`);
    if (modelsResponse.data.models) {
      const imageModels = modelsResponse.data.models.filter((m: any) => 
        m.name?.includes('image') || m.name?.includes('flash-image')
      );
      console.log(`   Bildgenerierungs-Models: ${imageModels.length}`);
      if (imageModels.length > 0) {
        console.log(`   Model: ${imageModels[0].name}`);
      }
    }
  } catch (error: any) {
    console.log('❌ Models-Endpoint Fehler:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error?.code === 400) {
      console.log('\n💡 DIAGNOSE:');
      console.log('   Der API-Schlüssel wird von der Generative Language API abgelehnt.');
      console.log('   Mögliche Ursachen:');
      console.log('   1. Generative Language API ist NICHT für das Projekt aktiviert');
      console.log('   2. API-Schlüssel gehört zu einem anderen Projekt');
      console.log('   3. API-Schlüssel wurde in Google AI Studio erstellt,');
      console.log('      aber das Projekt in Google Cloud Console ist anders');
      console.log('   4. API braucht noch Zeit zum Aktivieren (Propagation Delay)');
      console.log('\n   LÖSUNG:');
      console.log('   1. Prüfe in Google Cloud Console:');
      console.log('      https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
      console.log('   2. Stelle sicher, dass Projekt "Intranet" (995700162212) ausgewählt ist');
      console.log('   3. Klicke auf "AKTIVIEREN" (auch wenn es schon aktiviert scheint)');
      console.log('   4. Warte 2-3 Minuten nach Aktivierung');
      console.log('   5. Erstelle API-Schlüssel in Google Cloud Console (nicht AI Studio):');
      console.log('      https://console.cloud.google.com/apis/credentials');
    }
  }

  console.log('\n');

  // Test 3: Prüfe mit Header statt Query-Parameter
  console.log('📋 Test 3: Models-Endpoint mit Header-Authentifizierung...');
  try {
    const headerResponse = await axios.get(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        headers: {
          'x-goog-api-key': cleanKey
        }
      }
    );
    console.log('✅ Header-Authentifizierung funktioniert!');
  } catch (error: any) {
    console.log('❌ Header-Authentifizierung Fehler:', error.response?.data?.error?.message || error.message);
  }

  console.log('\n');
}

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Bitte API-Schlüssel als Parameter angeben:');
  console.error('   npx ts-node backend/scripts/checkGeminiApiStatus.ts <api-key>');
  process.exit(1);
}

checkApiStatus(apiKey);

