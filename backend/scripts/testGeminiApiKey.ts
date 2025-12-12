/**
 * Test-Script zum Prüfen des Gemini API-Schlüssels
 * 
 * Prüft verschiedene mögliche Probleme:
 * 1. API-Schlüssel-Format
 * 2. Projekt-Zuordnung
 * 3. API-Berechtigungen
 */

import axios from 'axios';

async function testApiKey(apiKey: string) {
  console.log('\n🔍 Teste API-Schlüssel...\n');
  console.log(`API-Schlüssel (erste 20 Zeichen): ${apiKey.substring(0, 20)}...`);
  console.log(`API-Schlüssel Länge: ${apiKey.length}\n`);

  // Test 1: Einfache Text-Generierung (ohne Bild)
  console.log('📝 Test 1: Text-Generierung (ohne Bild)...');
  try {
    const textResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        contents: [{
          parts: [{ text: 'Say hello' }]
        }]
      },
      {
        headers: {
          'x-goog-api-key': apiKey.trim(),
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Text-API funktioniert!');
    console.log('Response:', JSON.stringify(textResponse.data, null, 2).substring(0, 200));
  } catch (error: any) {
    console.log('❌ Text-API Fehler:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error?.details) {
      console.log('Details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
  }

  console.log('\n');

  // Test 2: Bildgenerierung
  console.log('🖼️  Test 2: Bildgenerierung...');
  try {
    const imageResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        contents: [{
          parts: [{ text: 'Create a simple test image of a banana' }]
        }]
      },
      {
        headers: {
          'x-goog-api-key': apiKey.trim(),
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Bild-API funktioniert!');
    console.log('Response Keys:', Object.keys(imageResponse.data));
  } catch (error: any) {
    console.log('❌ Bild-API Fehler:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error?.details) {
      console.log('Details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    if (error.response?.data?.error?.code === 400) {
      console.log('\n💡 Mögliche Ursachen:');
      console.log('   1. API-Schlüssel gehört zu einem anderen Projekt');
      console.log('   2. Generative Language API ist nicht für das Projekt aktiviert');
      console.log('   3. API-Schlüssel hat Einschränkungen, die Bildgenerierung blockieren');
      console.log('   4. Bildgenerierungs-API ist nicht verfügbar für dieses Projekt');
    }
  }

  console.log('\n');
}

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Bitte API-Schlüssel als Parameter angeben:');
  console.error('   npx ts-node backend/scripts/testGeminiApiKey.ts <api-key>');
  process.exit(1);
}

testApiKey(apiKey);

