#!/usr/bin/env node
/**
 * Test-Script: Testet Preis-Update-Endpoints (PUT/POST/PATCH)
 * 
 * Verwendung:
 * npx ts-node scripts/test-lobbypms-post-endpoints.ts [branchId] [email] [password]
 * 
 * Beispiel:
 * npx ts-node scripts/test-lobbypms-post-endpoints.ts 3
 * npx ts-node scripts/test-lobbypms-post-endpoints.ts 3 email@example.com password123
 * 
 * HINWEIS: Wenn email/password nicht angegeben, wird Session-basierte Auth übersprungen
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testPostEndpoints(branchId: number, lobbyEmail?: string, lobbyPassword?: string) {
  console.log('\n🔍 LobbyPMS Preis-Update-Endpoint Test');
  console.log('='.repeat(60));

  try {
    // Lade Branch mit Settings
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        organization: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    if (!branch) {
      console.error(`❌ Branch ${branchId} nicht gefunden`);
      process.exit(1);
    }

    // Entschlüssele Settings
    const branchSettings = branch.lobbyPmsSettings as any;
    const orgSettings = branch.organization?.settings as any;
    
    const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
    const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
    
    const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

    if (!lobbyPmsSettings?.apiKey) {
      console.error('❌ LobbyPMS API Key nicht gefunden');
      process.exit(1);
    }

    // Base URL bestimmen
    let apiUrl = lobbyPmsSettings.apiUrl;
    if (!apiUrl) {
      apiUrl = 'https://api.lobbypms.com';
    }
    if (apiUrl.includes('app.lobbypms.com')) {
      apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
    }
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.replace(/\/api$/, '');
    }

    const apiKey = lobbyPmsSettings.apiKey;

    console.log(`\n📋 Konfiguration:`);
    console.log(`   Branch: ${branch.name} (ID: ${branchId})`);
    console.log(`   API URL: ${apiUrl}`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...\n`);

    // Erstelle Axios-Instanz für API-Endpoints
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // ⚠️ WICHTIG: Erstelle zusätzliche Axios-Instanz für app.lobbypms.com (für /calendario/setCustomRate)
    // Screenshot zeigt: https://app.lobbypms.com/calendario/setCustomRate
    const appAxiosInstance: AxiosInstance = axios.create({
      baseURL: 'https://app.lobbypms.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // Hole Verfügbarkeitsdaten, um categoryId und Datum zu bekommen
    const { LobbyPmsService } = await import('../src/services/lobbyPmsService');
    const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Nächste 7 Tage
    
    console.log('📋 Hole Verfügbarkeitsdaten...');
    const availabilityData = await lobbyPmsService.checkAvailability(startDate, endDate);
    
    if (availabilityData.length === 0) {
      console.log('⚠️  Keine Verfügbarkeitsdaten gefunden\n');
      return;
    }

    // Nimm erste Kategorie und Datum
    const testEntry = availabilityData[0];
    const categoryId = testEntry.categoryId;
    const testDate = testEntry.date;
    const currentPrice = testEntry.pricePerNight;
    
    console.log(`📋 Test-Daten:`);
    console.log(`   Kategorie ID: ${categoryId}`);
    console.log(`   Datum: ${testDate}`);
    console.log(`   Aktueller Preis: ${currentPrice}\n`);

    // Definiere propertyId früh (wird später benötigt)
    const propertyId = lobbyPmsSettings.propertyId;

    // Zuerst: Prüfe welche Endpoints überhaupt existieren (GET-Requests)
    console.log('🔍 Prüfe verfügbare Endpoints (GET-Requests)...\n');
    const discoveryEndpoints = [
      `/api/v2/categories/${categoryId}`,
      `/api/v2/categories/${categoryId}/prices`,
      `/api/v2/categories/${categoryId}/prices/${testDate}`,
      `/api/v2/prices`,
      `/api/v2/rooms`,
      `/api/v2/rooms/${categoryId}`,
      `/api/v2/rate-plans`,
      `/api/v2/rate-plans/${categoryId}`,
      `/api/v1/categories/${categoryId}`,
      `/api/v1/categories/${categoryId}/prices`,
      `/api/v1/categories`, // Liste aller Kategorien
    ];
    
    const existingEndpoints: string[] = [];
    let categoryData: any = null;
    
    for (const endpoint of discoveryEndpoints) {
      try {
        const response = await axiosInstance.get(endpoint, { validateStatus: (s) => s < 500 });
        if (response.status !== 404) {
          existingEndpoints.push(endpoint);
          console.log(`   ✅ ${endpoint} existiert (Status: ${response.status})`);
          
          // Speichere Kategorie-Daten für weitere Analyse
          if (endpoint === `/api/v2/categories/${categoryId}` || endpoint === `/api/v1/categories/${categoryId}`) {
            categoryData = response.data;
            console.log(`   📋 Kategorie-Daten-Struktur:`, JSON.stringify(categoryData, null, 2).substring(0, 500));
          }
        }
      } catch (error) {
        // Ignoriere Fehler
      }
    }
    console.log('');
    
    // Prüfe verfügbare Räume/Verfügbarkeit für dieses Datum (um Struktur zu sehen)
    console.log('🔍 Prüfe verfügbare Räume-Struktur für Preis-Updates...\n');
    let exactStructure: any = null;
    try {
      const availabilityResponse = await axiosInstance.get('/api/v2/available-rooms', {
        params: {
          start_date: testDate,
          end_date: testDate,
          property_id: lobbyPmsSettings.propertyId
        },
        validateStatus: (s) => s < 500
      });
      
      if (availabilityResponse.status === 200 && availabilityResponse.data) {
        console.log(`   ✅ /api/v2/available-rooms existiert`);
        const availData = availabilityResponse.data.data || availabilityResponse.data;
        if (Array.isArray(availData) && availData.length > 0) {
          const firstEntry = availData[0];
          console.log(`   📋 Struktur-Beispiel:`, JSON.stringify(firstEntry, null, 2).substring(0, 800));
          
          // Speichere exakte Struktur für Update-Tests
          exactStructure = firstEntry;
          
          // Prüfe ob Kategorien Preise enthalten
          if (firstEntry.categories && Array.isArray(firstEntry.categories) && firstEntry.categories.length > 0) {
            const firstCategory = firstEntry.categories.find((c: any) => c.category_id === categoryId);
            if (firstCategory) {
              console.log(`   📋 Kategorie-Struktur mit Preisen:`, JSON.stringify(firstCategory, null, 2).substring(0, 800));
            }
          }
        }
      }
    } catch (error) {
      // Ignoriere Fehler
    }
    console.log('');

    // ⚠️ WICHTIG: Rate Plans abrufen (laut Dokumentation benötigt!)
    // Screenshot zeigt: GET /api/v1/rates (WICHTIG!)
    console.log('🔍 Hole Rate Plans (laut Screenshots: GET /api/v1/rates)...\n');
    let ratePlans: any[] = [];
    let rateId: number | null = null;
    let roomTypeId: number | null = null;
    
    // PRIORITÄT: Teste /api/v1/rates zuerst (wie in Screenshots gezeigt!)
    const ratePlanEndpoints = ['/api/v1/rates', '/api/v1/rate-plans', '/api/v2/rates', '/api/v2/rate-plans'];
    
    for (const endpoint of ratePlanEndpoints) {
      try {
        // Teste ohne Parameter
        let ratesResponse = await axiosInstance.get(endpoint, {
          validateStatus: (s) => s < 500
        });
        
        if (ratesResponse.status === 200 && ratesResponse.data) {
          console.log(`   ✅ ${endpoint} existiert`);
          const ratesData = ratesResponse.data.data || ratesResponse.data;
          
          // Logge vollständige Struktur, auch wenn leer
          console.log(`   📋 Vollständige Response:`, JSON.stringify(ratesResponse.data, null, 2).substring(0, 1000));
          
          if (Array.isArray(ratesData) && ratesData.length > 0) {
            ratePlans = ratesData;
            console.log(`   📋 ${ratesData.length} Rate Plan(s) gefunden`);
            
            const firstRate = ratesData[0];
            console.log(`   📋 Erster Rate Plan:`, JSON.stringify(firstRate, null, 2).substring(0, 500));
            
            if (firstRate.id) {
              rateId = firstRate.id;
            } else if (firstRate.rate_id) {
              rateId = firstRate.rate_id;
            }
            
            if (firstRate.room_type_id) {
              roomTypeId = firstRate.room_type_id;
            } else if (firstRate.roomTypeId) {
              roomTypeId = firstRate.roomTypeId;
            }
            
            console.log(`   📋 Extrahierte IDs: rate_id=${rateId}, room_type_id=${roomTypeId}`);
            break;
          } else if (Array.isArray(ratesData) && ratesData.length === 0) {
            console.log(`   ⚠️  ${endpoint} gibt leeres Array zurück - teste mit Parametern...`);
            
            // Teste mit ERWEITERTEN Query-Parametern (vielleicht braucht /api/v1/rates spezielle Parameter?)
            const testParams = [
              { property_id: propertyId },
              { category_id: categoryId },
              { room_type_id: categoryId },
              { property_id: propertyId, category_id: categoryId },
              { property_id: propertyId, room_type_id: categoryId },
              { property: propertyId }, // Vielleicht "property" statt "property_id"?
              { property: propertyId, category: categoryId },
              { property: propertyId, room_type: categoryId },
            ];
            
            for (const params of testParams) {
              try {
                const paramResponse = await axiosInstance.get(endpoint, {
                  params,
                  validateStatus: (s) => s < 500
                });
                
                if (paramResponse.status === 200 && paramResponse.data) {
                  const paramData = paramResponse.data.data || paramResponse.data;
                  if (Array.isArray(paramData) && paramData.length > 0) {
                    console.log(`   ✅ ${endpoint} mit Parametern ${JSON.stringify(params)}: ${paramData.length} Rate Plan(s) gefunden`);
                    ratePlans = paramData;
                    const firstRate = paramData[0];
                    if (firstRate.id) rateId = firstRate.id;
                    else if (firstRate.rate_id) rateId = firstRate.rate_id;
                    if (firstRate.room_type_id) roomTypeId = firstRate.room_type_id;
                    else if (firstRate.roomTypeId) roomTypeId = firstRate.roomTypeId;
                    console.log(`   📋 Extrahierte IDs: rate_id=${rateId}, room_type_id=${roomTypeId}`);
                    break;
                  } else {
                    console.log(`   📋 ${endpoint} mit Parametern ${JSON.stringify(params)}: Status ${paramResponse.status}, Data:`, JSON.stringify(paramData, null, 2).substring(0, 300));
                  }
                } else {
                  console.log(`   📋 ${endpoint} mit Parametern ${JSON.stringify(params)}: Status ${paramResponse.status}`);
                }
              } catch (e) {
                // Ignoriere
              }
            }
          } else if (typeof ratesData === 'object') {
            console.log(`   📋 Rate Plans Struktur:`, JSON.stringify(ratesData, null, 2).substring(0, 500));
            break;
          }
        } else {
          console.log(`   ⚠️  ${endpoint} Status: ${ratesResponse.status}`);
          if (ratesResponse.status === 404) {
            console.log(`   ⚠️  ${endpoint} gibt 404 - Endpoint existiert nicht oder benötigt Parameter`);
          }
        }
      } catch (error) {
        console.log(`   ⚠️  ${endpoint} Fehler:`, (error as any).message);
      }
    }
    
    // Fallback: Verwende categoryId als room_type_id (laut Dokumentation könnte das funktionieren)
    if (!roomTypeId && categoryId) {
      roomTypeId = categoryId;
      console.log(`   📋 Verwende categoryId (${categoryId}) als room_type_id (Fallback)`);
    }
    
    // Fallback: Versuche verschiedene rate_id Werte (1, categoryId, etc.)
    if (!rateId) {
      console.log(`   ⚠️  Keine rate_id gefunden - werde verschiedene Werte testen`);
    }
    
    console.log('');

    // Erweiterte Suche nach dem Preis-Endpoint
    const testPrice = currentPrice + 1000; // Kleine Änderung für Test

    // ⚠️ PRIORITÄT: /calendario/setCustomRate (aus Screenshot!)
    // Screenshot zeigt: POST https://app.lobbypms.com/calendario/setCustomRate
    // PROBLEM: 302 Redirect zu /entrar (Login) = Authentifizierung funktioniert nicht!
    // LÖSUNG: Teste verschiedene Authentifizierungsmethoden (wie bei Bold Payment: x-api-key, etc.)
    console.log('🎯 Teste /calendario/setCustomRate mit verschiedenen Authentifizierungsmethoden...\n');
    
    // Basis-Payload (wird für alle Auth-Methoden verwendet)
    const basePayload = {
      categoryId: categoryId,
      date: testDate,
      price: testPrice
    };
    
    // Verschiedene Authentifizierungsmethoden (basierend auf Code-Analyse)
    // 1. Bearer Token (aktuell - funktioniert für /api/v1/bookings)
    // 2. X-API-Key Header (wie bei Bold Payment)
    // 3. X-API-Token Header
    // 4. Query Parameter
    // 5. Form-encoded statt JSON
    const authMethods = [
      {
        name: 'Authorization: Bearer (aktuell - funktioniert für /api/v1/bookings)',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        payload: basePayload
      },
      {
        name: 'X-API-Key Header (wie Bold Payment)',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        payload: basePayload
      },
      {
        name: 'X-API-Token Header',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': apiKey
        },
        payload: basePayload
      },
      {
        name: 'Authorization: x-api-key (Bold Payment Format)',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `x-api-key ${apiKey}`
        },
        payload: basePayload
      },
      {
        name: 'Query Parameter ?api_key=...',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: basePayload,
        params: { api_key: apiKey }
      },
      {
        name: 'Query Parameter ?token=...',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: basePayload,
        params: { token: apiKey }
      },
      {
        name: 'Form-encoded (application/x-www-form-urlencoded)',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${apiKey}`
        },
        payload: new URLSearchParams({
          categoryId: categoryId.toString(),
          date: testDate,
          price: testPrice.toString()
        }).toString()
      },
      {
        name: 'Form-encoded + X-API-Key',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Key': apiKey
        },
        payload: new URLSearchParams({
          categoryId: categoryId.toString(),
          date: testDate,
          price: testPrice.toString()
        }).toString()
      },
      {
        name: 'JSON + category_id statt categoryId',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        payload: {
          category_id: categoryId,
          date: testDate,
          price: testPrice
        }
      },
      {
        name: 'JSON + value statt price',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        payload: {
          categoryId: categoryId,
          date: testDate,
          value: testPrice
        }
      },
    ];

    for (const authMethod of authMethods) {
      try {
        console.log(`   🔐 Teste Auth-Methode: ${authMethod.name}`);
        console.log(`   📋 Payload: ${typeof authMethod.payload === 'string' ? authMethod.payload : JSON.stringify(authMethod.payload)}`);
        
        const config: any = {
          validateStatus: (s: number) => s < 500,
          maxRedirects: 0, // Screenshot zeigt 302 Redirect
          headers: authMethod.headers
        };
        
        if (authMethod.params) {
          config.params = authMethod.params;
        }
        
        const response = await appAxiosInstance.post('/calendario/setCustomRate', authMethod.payload, config);
        
        console.log(`   📋 Status: ${response.status}`);
        
        // Prüfe ob Redirect zu /entrar (Login) = Auth fehlgeschlagen
        const location = response.headers.location || '';
        if (response.status === 302 && location.includes('/entrar')) {
          console.log(`   ⚠️  Status 302 → /entrar (Login) = Authentifizierung fehlgeschlagen`);
        } else if (response.status === 200) {
          console.log(`   ✅ ✅ ✅ ERFOLG! Status 200 - Authentifizierung funktioniert! ✅ ✅ ✅`);
          console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
          console.log(`   📋 Response Headers:`, JSON.stringify(response.headers, null, 2).substring(0, 500));
        } else if (response.status === 302 && !location.includes('/entrar')) {
          console.log(`   ✅ ✅ ✅ ERFOLG! Status 302 (aber nicht zu /entrar) - möglicherweise erfolgreich! ✅ ✅ ✅`);
          console.log(`   📋 Location: ${location}`);
          console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
        } else {
          console.log(`   ⚠️  Status ${response.status}:`, JSON.stringify(response.data, null, 2).substring(0, 300));
          if (location) {
            console.log(`   📋 Location: ${location}`);
          }
        }
      } catch (error: any) {
        if (error.response) {
          const location = error.response.headers?.location || '';
          console.log(`   ⚠️  Status ${error.response.status}:`, JSON.stringify(error.response.data, null, 2).substring(0, 300));
          if (location && !location.includes('/entrar')) {
            console.log(`   📋 Location: ${location} (nicht /entrar - möglicherweise erfolgreich!)`);
          }
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('ENOTFOUND')) {
          console.log(`   ❌ Verbindungsfehler: ${error.message}`);
        } else {
          console.log(`   ⚠️  Fehler: ${error.message}`);
        }
      }
      console.log('');
    }

    // ⚠️ NEU: /tarifas/guardar (aus Screenshot!)
    // Screenshot zeigt: POST https://app.lobbypms.com/tarifas/guardar
    // Möglicherweise benötigt es zuerst eine Temporada (Saison)!
    console.log('🎯 Teste /tarifas/guardar (aus Screenshot!) + Temporada-Endpoints...\n');
    
    if (lobbyEmail && lobbyPassword) {
      // Verwende Session-Cookies falls vorhanden
      const sessionAxiosInstance = axios.create({
        baseURL: 'https://app.lobbypms.com',
        timeout: 30000,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });

      // Versuche Login und speichere Cookies
      let sessionCookies: string[] = [];
      try {
        const loginResponse = await sessionAxiosInstance.post('/entrar', 
          new URLSearchParams({ email: lobbyEmail, password: lobbyPassword }).toString(),
          { validateStatus: (s) => s < 500, maxRedirects: 5 }
        );
        sessionCookies = loginResponse.headers['set-cookie'] || [];
        if (sessionCookies.length > 0) {
          const cookieString = sessionCookies.map(c => c.split(';')[0]).join('; ');
          sessionAxiosInstance.defaults.headers.common['Cookie'] = cookieString;
          console.log(`   ✅ Login erfolgreich! Cookies: ${cookieString.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log(`   ⚠️  Login-Fehler: ${(e as any).message}`);
      }
      
      // WICHTIG: Verwende Cookie-Jar für alle Requests
      // Axios sendet Cookies automatisch mit withCredentials: true, aber wir setzen sie auch manuell
      const cookieInterceptor = (config: any) => {
        if (sessionCookies.length > 0) {
          const cookieString = sessionCookies.map(c => c.split(';')[0]).join('; ');
          config.headers['Cookie'] = cookieString;
        }
        return config;
      };
      sessionAxiosInstance.interceptors.request.use(cookieInterceptor);

      // SCHRITT 1: Prüfe Temporada-Endpoints (vielleicht muss zuerst eine Temporada erstellt werden)
      console.log('   🔍 SCHRITT 1: Prüfe Temporada-Endpoints...\n');
      const temporadaEndpoints = [
        '/temporadas',
        '/temporadas/crear',
        '/temporadas/guardar',
        '/api/temporadas',
        '/api/v1/temporadas',
        '/seasons',
        '/seasons/create',
      ];

      let temporadaId: number | null = null;
      let temporadaName: string | null = null;

      for (const endpoint of temporadaEndpoints) {
        try {
          // Teste GET (um existierende Temporadas zu finden)
          const getResponse = await sessionAxiosInstance.get(endpoint, {
            validateStatus: (s) => s < 500,
            maxRedirects: 0,
          });

          if (getResponse.status === 200 && getResponse.data) {
            console.log(`   ✅ ${endpoint} (GET) existiert`);
            // Versuche Temporada-ID aus Response zu extrahieren
            const data = getResponse.data;
            if (Array.isArray(data) && data.length > 0) {
              const firstTemporada = data[0];
              temporadaId = firstTemporada.id || firstTemporada.temporada_id || null;
              temporadaName = firstTemporada.nombre || firstTemporada.name || null;
              console.log(`   📋 Gefundene Temporada: id=${temporadaId}, name=${temporadaName}`);
            }
          }

          // Teste POST (um neue Temporada zu erstellen)
          const createPayload = {
            nombre: 'Test Temporada',
            fecha_inicio: testDate,
            fecha_fin: testDate,
          };

          const postResponse = await sessionAxiosInstance.post(endpoint,
            new URLSearchParams(createPayload as any).toString(),
            {
              validateStatus: (s) => s < 500,
              maxRedirects: 0,
            }
          );

          if (postResponse.status === 200 || (postResponse.status === 302 && !postResponse.headers.location?.includes('/entrar'))) {
            console.log(`   ✅ ${endpoint} (POST) funktioniert - Temporada kann erstellt werden`);
            // Versuche ID aus Response zu extrahieren
            if (postResponse.data && typeof postResponse.data === 'object') {
              temporadaId = postResponse.data.id || postResponse.data.temporada_id || temporadaId;
            }
            // Prüfe auch Location-Header für ID (z.B. /temporadas/123)
            const location = postResponse.headers.location || '';
            const locationMatch = location.match(/\/(\d+)/);
            if (locationMatch && !temporadaId) {
              temporadaId = parseInt(locationMatch[1], 10);
              console.log(`   📋 Temporada-ID aus Location extrahiert: ${temporadaId}`);
            }
          }
        } catch (e) {
          // Ignoriere
        }
      }

      // SCHRITT 1.5: Versuche explizit eine Temporada zu erstellen (falls noch keine gefunden)
      if (!temporadaId) {
        console.log('\n   🔍 SCHRITT 1.5: Versuche explizit Temporada zu erstellen...\n');
        const createEndpoints = ['/temporadas/guardar', '/temporadas/crear', '/api/temporadas'];
        
        for (const endpoint of createEndpoints) {
          try {
            const createPayload = {
              nombre: `Test Temporada ${Date.now()}`,
              fecha_inicio: testDate,
              fecha_fin: testDate,
            };

            const createResponse = await sessionAxiosInstance.post(endpoint,
              new URLSearchParams(createPayload as any).toString(),
              {
                validateStatus: (s) => s < 500,
                maxRedirects: 5, // Erlaube Redirects
              }
            );

            console.log(`   📋 ${endpoint} Response Status: ${createResponse.status}`);
            console.log(`   📋 ${endpoint} Response Location: ${createResponse.headers.location || 'keine'}`);
            
            // Prüfe Location-Header für ID
            const location = createResponse.headers.location || '';
            const locationMatch = location.match(/\/(\d+)/);
            if (locationMatch) {
              temporadaId = parseInt(locationMatch[1], 10);
              console.log(`   ✅ Temporada erstellt! ID aus Location: ${temporadaId}`);
              break;
            }
            
            // Prüfe Response-Body
            if (createResponse.data && typeof createResponse.data === 'object') {
              temporadaId = createResponse.data.id || createResponse.data.temporada_id || null;
              if (temporadaId) {
                console.log(`   ✅ Temporada erstellt! ID aus Response: ${temporadaId}`);
                break;
              }
            }
          } catch (e: any) {
            console.log(`   ⚠️  ${endpoint} Fehler: ${e.message}`);
          }
        }
      }

      // SCHRITT 2: Teste /tarifas/guardar mit verschiedenen Payload-Strukturen
      console.log('\n   🔍 SCHRITT 2: Teste /tarifas/guardar...\n');
      const tarifasPayloads = [
        // Einfache Struktur (ohne Temporada)
        { categoryId: categoryId, date: testDate, price: testPrice },
        { category_id: categoryId, date: testDate, price: testPrice },
        { categoryId: categoryId, date: testDate, value: testPrice },
        { habitacion_id: categoryId, fecha: testDate, precio: testPrice },
        
        // Mit Temporada (falls gefunden)
        ...(temporadaId ? [
          { 
            temporada_id: temporadaId,
            categoryId: categoryId,
            date: testDate,
            price: testPrice
          },
          { 
            temporada_id: temporadaId,
            habitacion_id: categoryId,
            fecha: testDate,
            precio: testPrice
          },
        ] : []),
        
        // Mit Temporada-Name (falls gefunden)
        ...(temporadaName ? [
          { 
            temporada: temporadaName,
            categoryId: categoryId,
            date: testDate,
            price: testPrice
          },
        ] : []),
        
        // Neue Temporada + Preis in einem Request
        { 
          temporada_nombre: 'Test Temporada',
          temporada_inicio: testDate,
          temporada_fin: testDate,
          categoryId: categoryId,
          date: testDate,
          price: testPrice
        },
      ];

      for (const payload of tarifasPayloads) {
        try {
          const response = await sessionAxiosInstance.post('/tarifas/guardar', 
            new URLSearchParams(payload as any).toString(),
            {
              validateStatus: (s) => s < 500,
              maxRedirects: 0,
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              }
            }
          );

          console.log(`   📋 Status: ${response.status}`);
          const location = response.headers.location || '';
          
          if (response.status === 200) {
            console.log(`   ✅ ✅ ✅ ERFOLG! Status 200 - /tarifas/guardar funktioniert! ✅ ✅ ✅`);
            console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
            console.log(`   📋 Payload: ${JSON.stringify(payload)}`);
          } else if (response.status === 302 && !location.includes('/entrar')) {
            console.log(`   ✅ ✅ ✅ ERFOLG! Status 302 (nicht zu /entrar) - möglicherweise erfolgreich! ✅ ✅ ✅`);
            console.log(`   📋 Location: ${location}`);
            console.log(`   📋 Payload: ${JSON.stringify(payload)}`);
          } else {
            console.log(`   ⚠️  Status ${response.status}, Location: ${location}`);
          }
        } catch (error: any) {
          if (error.response) {
            const location = error.response.headers?.location || '';
            console.log(`   ⚠️  Status ${error.response.status}, Location: ${location}`);
          }
        }
      }
      console.log('');
    } else {
      console.log('⚠️  /tarifas/guardar benötigt Session-Cookies - Login-Daten erforderlich\n');
    }

    // ⚠️ SESSION-BASIERTE AUTHENTIFIZIERUNG (falls Login-Daten vorhanden)
    // /calendario/setCustomRate benötigt Session-Cookies, nicht API-Key!
    if (lobbyEmail && lobbyPassword) {
      console.log('🔐 Teste Session-basierte Authentifizierung (Login + Cookies)...\n');
      
      // Erstelle Axios-Instanz mit Cookie-Unterstützung
      const sessionAxiosInstance = axios.create({
        baseURL: 'https://app.lobbypms.com',
        timeout: 30000,
        withCredentials: true, // WICHTIG: Cookies senden/empfangen
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Login-Formulare verwenden meist Form-encoded
        }
      });

      // Teste verschiedene Login-Endpoints
      const loginEndpoints = [
        '/entrar',
        '/login',
        '/api/login',
        '/auth/login',
        '/iniciar-sesion',
      ];

      let loginSuccessful = false;
      let cookies: string[] = [];

      for (const loginEndpoint of loginEndpoints) {
        try {
          console.log(`   🔐 Teste Login-Endpoint: ${loginEndpoint}`);
          
          // Teste verschiedene Login-Payload-Formate
          const loginPayloads = [
            { email: lobbyEmail, password: lobbyPassword },
            { username: lobbyEmail, password: lobbyPassword },
            { user: lobbyEmail, pass: lobbyPassword },
            { login: lobbyEmail, password: lobbyPassword },
          ];

          for (const payload of loginPayloads) {
            try {
              const loginResponse = await sessionAxiosInstance.post(loginEndpoint, 
                new URLSearchParams(payload as any).toString(),
                {
                  validateStatus: (s) => s < 500,
                  maxRedirects: 5, // Erlaube Redirects (nach erfolgreichem Login)
                }
              );

              // Prüfe ob Cookies gesetzt wurden
              const setCookieHeaders = loginResponse.headers['set-cookie'] || [];
              if (setCookieHeaders.length > 0) {
                cookies = setCookieHeaders;
                console.log(`   ✅ Login erfolgreich! Cookies erhalten: ${cookies.length}`);
                console.log(`   📋 Cookies: ${cookies.map(c => c.split(';')[0]).join(', ')}`);
                loginSuccessful = true;
                break;
              } else if (loginResponse.status === 200 || loginResponse.status === 302) {
                // Möglicherweise erfolgreich, aber keine expliziten Cookies
                const location = loginResponse.headers.location || '';
                if (!location.includes('/entrar') && !location.includes('/login')) {
                  console.log(`   ✅ Login möglicherweise erfolgreich (Status ${loginResponse.status}, Location: ${location})`);
                  loginSuccessful = true;
                  break;
                }
              }
            } catch (error: any) {
              // Ignoriere Fehler, teste nächste Payload
            }
          }

          if (loginSuccessful) break;
        } catch (error: any) {
          // Ignoriere Fehler, teste nächsten Endpoint
        }
      }

      // Wenn Login erfolgreich, teste /calendario/setCustomRate mit Cookies
      if (loginSuccessful && cookies.length > 0) {
        console.log('\n   🎯 Teste /calendario/setCustomRate mit Session-Cookies...\n');
        
        // Setze Cookies für weitere Requests
        const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
        sessionAxiosInstance.defaults.headers.common['Cookie'] = cookieHeader;

        try {
          const payload = {
            categoryId: categoryId,
            date: testDate,
            price: testPrice
          };

          const response = await sessionAxiosInstance.post('/calendario/setCustomRate', payload, {
            validateStatus: (s) => s < 500,
            maxRedirects: 0,
          });

          console.log(`   📋 Status: ${response.status}`);
          const location = response.headers.location || '';
          
          if (response.status === 200) {
            console.log(`   ✅ ✅ ✅ ERFOLG! Status 200 - Preis-Update funktioniert mit Session-Cookies! ✅ ✅ ✅`);
            console.log(`   📋 Response:`, JSON.stringify(response.data, null, 2).substring(0, 500));
          } else if (response.status === 302 && !location.includes('/entrar')) {
            console.log(`   ✅ ✅ ✅ ERFOLG! Status 302 (nicht zu /entrar) - möglicherweise erfolgreich! ✅ ✅ ✅`);
            console.log(`   📋 Location: ${location}`);
          } else {
            console.log(`   ⚠️  Status ${response.status}, Location: ${location}`);
          }
        } catch (error: any) {
          if (error.response) {
            const location = error.response.headers?.location || '';
            console.log(`   ⚠️  Status ${error.response.status}, Location: ${location}`);
          } else {
            console.log(`   ⚠️  Fehler: ${error.message}`);
          }
        }
      } else {
        console.log('   ⚠️  Login fehlgeschlagen - Session-basierte Auth nicht möglich');
      }
      
      console.log('');
    } else {
      console.log('⚠️  Keine Login-Daten angegeben - Session-basierte Auth wird übersprungen');
      console.log('   💡 Hinweis: Um Session-basierte Auth zu testen, führen Sie aus:');
      console.log(`   npx ts-node scripts/test-lobbypms-post-endpoints.ts ${branchId} email@example.com password123\n`);
    }

    // Erstelle Testfälle basierend auf der GET-Struktur
    const testCases: Array<{ path: string; method: string; body: any; desc: string; useAppBase?: boolean }> = [
      // ⚠️ PRIORITÄT: Rate Plans Endpoint (laut Dokumentation!)
      // Teste mit verschiedenen rate_id Werten, auch wenn wir keine gefunden haben
      // WICHTIG: Teste sowohl /api/v1/rates/{id}/prices als auch /api/v1/rate-plans/{id}/prices
      ...(roomTypeId ? (() => {
        const possibleRateIds = rateId ? [rateId] : [categoryId, 1, 'STANDARD_RATE', 'default'];
        const cases: Array<{ path: string; method: string; body: any; desc: string }> = [];
        
        for (const testRateId of possibleRateIds) {
          // Teste /api/v1/rates/{id}/prices (aus Dokumentation)
          // Date Range Variante
          cases.push({
            path: `/api/v1/rates/${testRateId}/prices`,
            method: 'POST',
            body: {
              room_type_id: roomTypeId,
              date_from: testDate,
              date_to: testDate,
              price: testPrice,
              currency: 'USD'
            },
            desc: `v1 Rates Prices POST (Date Range - rate_id=${testRateId} - laut Dokumentation!)`
          });
          
          // Daily Pricing Variante
          cases.push({
            path: `/api/v1/rates/${testRateId}/prices`,
            method: 'POST',
            body: {
              room_type_id: roomTypeId,
              prices: [{ date: testDate, price: testPrice }]
            },
            desc: `v1 Rates Prices POST (Daily Pricing - rate_id=${testRateId} - laut Dokumentation!)`
          });
          
          // Teste /api/v1/rate-plans/{id}/prices (da /api/v1/rate-plans existiert!)
          // Date Range Variante
          cases.push({
            path: `/api/v1/rate-plans/${testRateId}/prices`,
            method: 'POST',
            body: {
              room_type_id: roomTypeId,
              date_from: testDate,
              date_to: testDate,
              price: testPrice,
              currency: 'USD'
            },
            desc: `v1 Rate-Plans Prices POST (Date Range - rate_id=${testRateId} - ALTERNATIVE!)`
          });
          
          // Daily Pricing Variante
          cases.push({
            path: `/api/v1/rate-plans/${testRateId}/prices`,
            method: 'POST',
            body: {
              room_type_id: roomTypeId,
              prices: [{ date: testDate, price: testPrice }]
            },
            desc: `v1 Rate-Plans Prices POST (Daily Pricing - rate_id=${testRateId} - ALTERNATIVE!)`
          });
          
          // PUT Varianten für /api/v1/rates/{id}/prices
          cases.push({
            path: `/api/v1/rates/${testRateId}/prices`,
            method: 'PUT',
            body: {
              room_type_id: roomTypeId,
              date_from: testDate,
              date_to: testDate,
              price: testPrice,
              currency: 'USD'
            },
            desc: `v1 Rates Prices PUT (Date Range - rate_id=${testRateId})`
          });
          
          cases.push({
            path: `/api/v1/rates/${testRateId}/prices`,
            method: 'PUT',
            body: {
              room_type_id: roomTypeId,
              prices: [{ date: testDate, price: testPrice }]
            },
            desc: `v1 Rates Prices PUT (Daily Pricing - rate_id=${testRateId})`
          });
          
          // PUT Varianten für /api/v1/rate-plans/{id}/prices
          cases.push({
            path: `/api/v1/rate-plans/${testRateId}/prices`,
            method: 'PUT',
            body: {
              room_type_id: roomTypeId,
              date_from: testDate,
              date_to: testDate,
              price: testPrice,
              currency: 'USD'
            },
            desc: `v1 Rate-Plans Prices PUT (Date Range - rate_id=${testRateId})`
          });
          
          cases.push({
            path: `/api/v1/rate-plans/${testRateId}/prices`,
            method: 'PUT',
            body: {
              room_type_id: roomTypeId,
              prices: [{ date: testDate, price: testPrice }]
            },
            desc: `v1 Rate-Plans Prices PUT (Daily Pricing - rate_id=${testRateId})`
          });
          
          // PATCH Varianten für /api/v1/rates/{id}/prices
          cases.push({
            path: `/api/v1/rates/${testRateId}/prices`,
            method: 'PATCH',
            body: {
              room_type_id: roomTypeId,
              date_from: testDate,
              date_to: testDate,
              price: testPrice,
              currency: 'USD'
            },
            desc: `v1 Rates Prices PATCH (Date Range - rate_id=${testRateId})`
          });
          
          cases.push({
            path: `/api/v1/rates/${testRateId}/prices`,
            method: 'PATCH',
            body: {
              room_type_id: roomTypeId,
              prices: [{ date: testDate, price: testPrice }]
            },
            desc: `v1 Rates Prices PATCH (Daily Pricing - rate_id=${testRateId})`
          });
          
          // PATCH Varianten für /api/v1/rate-plans/{id}/prices
          cases.push({
            path: `/api/v1/rate-plans/${testRateId}/prices`,
            method: 'PATCH',
            body: {
              room_type_id: roomTypeId,
              date_from: testDate,
              date_to: testDate,
              price: testPrice,
              currency: 'USD'
            },
            desc: `v1 Rate-Plans Prices PATCH (Date Range - rate_id=${testRateId})`
          });
          
          cases.push({
            path: `/api/v1/rate-plans/${testRateId}/prices`,
            method: 'PATCH',
            body: {
              room_type_id: roomTypeId,
              prices: [{ date: testDate, price: testPrice }]
            },
            desc: `v1 Rate-Plans Prices PATCH (Daily Pricing - rate_id=${testRateId})`
          });
        }
        
        return cases;
      })() : []),
      
      // Teste direkte Updates auf Rate Plans (ohne /prices Suffix)
      ...(roomTypeId ? (() => {
        const possibleRateIds = rateId ? [rateId] : [categoryId, 1];
        const directCases: Array<{ path: string; method: string; body: any; desc: string }> = [];
        
        for (const testRateId of possibleRateIds) {
          // PUT direkt auf Rate Plan
          directCases.push({
            path: `/api/v1/rate-plans/${testRateId}`,
            method: 'PUT',
            body: {
              prices: [{
                room_type_id: roomTypeId,
                date: testDate,
                price: testPrice
              }]
            },
            desc: `v1 Rate-Plans PUT (direkt - rate_id=${testRateId})`
          });
          
          directCases.push({
            path: `/api/v1/rate-plans/${testRateId}`,
            method: 'PATCH',
            body: {
              prices: [{
                room_type_id: roomTypeId,
                date: testDate,
                price: testPrice
              }]
            },
            desc: `v1 Rate-Plans PATCH (direkt - rate_id=${testRateId})`
          });
          
          // Mit Date Range im Body
          directCases.push({
            path: `/api/v1/rate-plans/${testRateId}`,
            method: 'PUT',
            body: {
              room_type_id: roomTypeId,
              date_from: testDate,
              date_to: testDate,
              price: testPrice,
              currency: 'USD'
            },
            desc: `v1 Rate-Plans PUT (Date Range - rate_id=${testRateId})`
          });
        }
        
        return directCases;
      })() : []),
      
      // Teste Preis-Endpoints ohne rate_id, aber mit category_id
      {
        path: `/api/v1/prices`,
        method: 'POST',
        body: {
          category_id: categoryId,
          room_type_id: categoryId,
          date: testDate,
          price: testPrice
        },
        desc: 'v1 Prices POST (mit category_id und room_type_id)'
      },
      {
        path: `/api/v1/prices`,
        method: 'POST',
        body: {
          category_id: categoryId,
          date: testDate,
          price: testPrice
        },
        desc: 'v1 Prices POST (nur category_id)'
      },
      {
        path: `/api/v2/prices`,
        method: 'POST',
        body: {
          category_id: categoryId,
          date: testDate,
          price: testPrice
        },
        desc: 'v2 Prices POST (mit category_id)'
      },
      
      // Fallback: Versuche auch ohne rate_id im Pfad (falls es anders strukturiert ist)
      ...(roomTypeId ? [
        {
          path: `/api/v1/rates/prices`,
          method: 'POST',
          body: {
            rate_id: rateId || categoryId,
            room_type_id: roomTypeId,
            date_from: testDate,
            date_to: testDate,
            price: testPrice,
            currency: 'USD'
          },
          desc: 'v1 Rates Prices POST (ohne rate_id im Pfad, im Body)'
        },
        {
          path: `/api/v1/rates/prices`,
          method: 'POST',
          body: {
            rate_id: rateId || categoryId,
            room_type_id: roomTypeId,
            prices: [{ date: testDate, price: testPrice }]
          },
          desc: 'v1 Rates Prices POST (Daily, ohne rate_id im Pfad, im Body)'
        },
      ] : []),
      
      // 1. Die wahrscheinlichsten v1 Varianten (da v1 für Bookings funktioniert)
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v1 Category Prices POST' },
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 Category Prices PUT' },
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'PATCH', body: { date: testDate, price: testPrice }, desc: 'v1 Category Prices PATCH' },
      { path: `/api/v1/categories/${categoryId}`, method: 'PUT', body: { prices: [{ date: testDate, value: testPrice }] }, desc: 'v1 Category PUT (nested)' },
      
      // 2. Verfügbarkeit/Inventory (oft für Bulk-Updates genutzt)
      { path: `/api/v1/availability`, method: 'POST', body: { property_id: propertyId, category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Availability POST' },
      { path: `/api/v1/inventory`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Inventory POST' },
      
      // 3. Preis-spezifische Endpoints
      { path: `/api/v1/prices/update`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Prices Update POST' },
      { path: `/api/v1/prices/set`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Prices Set POST' },
      
      // 4. Struktur-Varianten (manchmal ist es plural/singular)
      { path: `/api/v1/category/${categoryId}/price`, method: 'POST', body: { date: testDate, value: testPrice }, desc: 'v1 Category Price POST' },
      
      // 5. Mit property_id im Pfad
      { path: `/api/v1/properties/${propertyId}/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v1 Prop/Cat Prices POST' },
      { path: `/api/v1/properties/${propertyId}/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 Prop/Cat Prices PUT' },
      
      // 6. Teste ob PUT über POST mit _method simuliert werden muss
      { path: `/api/v1/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice, _method: 'PUT' }, desc: 'v1 PUT via POST _method' },
      
      // 7. Teste v2 Varianten ohne "api/" Präfix (falls baseURL anders ist)
      { path: `/v2/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 directly PUT' },
      { path: `/v1/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 directly PUT' },
      
      // 8. v2 Endpoints (da available-rooms v2 funktioniert)
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v2 Category Prices POST' },
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Category Prices PUT' },
      { path: `/api/v2/categories/${categoryId}/prices`, method: 'PATCH', body: { date: testDate, price: testPrice }, desc: 'v2 Category Prices PATCH' },
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PUT', body: { price: testPrice }, desc: 'v2 Category Prices PUT (mit Datum im Pfad)' },
      { path: `/api/v2/categories/${categoryId}/prices/${testDate}`, method: 'PATCH', body: { price: testPrice }, desc: 'v2 Category Prices PATCH (mit Datum im Pfad)' },
      
      // 9. v2 mit property_id
      { path: `/api/v2/properties/${propertyId}/categories/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v2 Prop/Cat Prices POST' },
      { path: `/api/v2/properties/${propertyId}/categories/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Prop/Cat Prices PUT' },
      
      // 10. Plan-basierte Endpoints (da available-rooms plans enthält)
      { path: `/api/v1/plans/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v1 Plans Prices POST' },
      { path: `/api/v1/plans/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 Plans Prices PUT' },
      { path: `/api/v2/plans/${categoryId}/prices`, method: 'POST', body: { date: testDate, price: testPrice }, desc: 'v2 Plans Prices POST' },
      { path: `/api/v2/plans/${categoryId}/prices`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Plans Prices PUT' },
      { path: `/api/v1/plans/STANDARD_RATE/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Plans STANDARD_RATE Prices POST' },
      { path: `/api/v2/plans/STANDARD_RATE/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v2 Plans STANDARD_RATE Prices POST' },
      
      // 10. v2 available-rooms basierend auf GET-Struktur
      { path: `/api/v2/available-rooms`, method: 'PUT', body: { date: testDate, property_id: propertyId, categories: [{ category_id: categoryId, plans: [{ name: 'STANDARD_RATE', prices: [{ people: 1, value: testPrice }] }] }] }, desc: 'v2 Available Rooms PUT (vereinfacht)' },
      { path: `/api/v2/available-rooms`, method: 'POST', body: { date: testDate, property_id: propertyId, categories: [{ category_id: categoryId, plans: [{ name: 'STANDARD_RATE', prices: [{ people: 1, value: testPrice }] }] }] }, desc: 'v2 Available Rooms POST (vereinfacht)' },
      { path: `/api/v2/available-rooms`, method: 'PATCH', body: { date: testDate, property_id: propertyId, categories: [{ category_id: categoryId, plans: [{ name: 'STANDARD_RATE', prices: [{ people: 1, value: testPrice }] }] }] }, desc: 'v2 Available Rooms PATCH (vereinfacht)' },
      
      // 11. v2 prices Endpoint
      { path: `/api/v2/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v2 Prices POST' },
      { path: `/api/v2/prices`, method: 'PUT', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v2 Prices PUT' },
      { path: `/api/v2/prices/${categoryId}`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Prices PUT (mit category_id im Pfad)' },
      
      // 12. v2 rate-plans
      { path: `/api/v2/rate-plans`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v2 Rate Plans POST' },
      { path: `/api/v2/rate-plans/${categoryId}`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v2 Rate Plans PUT' },
      
      // 13. Teste mit exakter available-rooms Struktur (wenn vorhanden)
      ...(exactStructure ? [
        { 
          path: `/api/v2/available-rooms`, 
          method: 'PUT', 
          body: {
            ...exactStructure,
            categories: exactStructure.categories.map((cat: any) => 
              cat.category_id === categoryId 
                ? {
                    ...cat,
                    plans: cat.plans.map((plan: any) => ({
                      ...plan,
                      prices: plan.prices.map((p: any) => 
                        p.people === 1 ? { ...p, value: testPrice } : p
                      )
                    }))
                  }
                : cat
            )
          }, 
          desc: 'PUT /api/v2/available-rooms (exakte GET-Struktur)' 
        },
        { 
          path: `/api/v2/available-rooms`, 
          method: 'POST', 
          body: {
            ...exactStructure,
            categories: exactStructure.categories.map((cat: any) => 
              cat.category_id === categoryId 
                ? {
                    ...cat,
                    plans: cat.plans.map((plan: any) => ({
                      ...plan,
                      prices: plan.prices.map((p: any) => 
                        p.people === 1 ? { ...p, value: testPrice } : p
                      )
                    }))
                  }
                : cat
            )
          }, 
          desc: 'POST /api/v2/available-rooms (exakte GET-Struktur)' 
        },
        { 
          path: `/api/v2/available-rooms`, 
          method: 'PATCH', 
          body: {
            ...exactStructure,
            categories: exactStructure.categories.map((cat: any) => 
              cat.category_id === categoryId 
                ? {
                    ...cat,
                    plans: cat.plans.map((plan: any) => ({
                      ...plan,
                      prices: plan.prices.map((p: any) => 
                        p.people === 1 ? { ...p, value: testPrice } : p
                      )
                    }))
                  }
                : cat
            )
          }, 
          desc: 'PATCH /api/v2/available-rooms (exakte GET-Struktur)' 
        },
      ] : []),
      
      // 14. Weitere v1 Varianten mit verschiedenen Payload-Strukturen
      { path: `/api/v1/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Prices POST (einfach)' },
      { path: `/api/v1/prices`, method: 'POST', body: { category_id: categoryId, date: testDate, prices: [{ people: 1, value: testPrice }] }, desc: 'v1 Prices POST (mit prices array)' },
      { path: `/api/v1/prices`, method: 'POST', body: { category_id: categoryId, start_date: testDate, end_date: testDate, price: testPrice }, desc: 'v1 Prices POST (mit start/end_date)' },
      
      // 15. Rate Plans Varianten v1
      { path: `/api/v1/rate-plans`, method: 'POST', body: { category_id: categoryId, date: testDate, price: testPrice }, desc: 'v1 Rate Plans POST' },
      { path: `/api/v1/rate-plans/${categoryId}`, method: 'PUT', body: { date: testDate, price: testPrice }, desc: 'v1 Rate Plans PUT' },
    ];

    const successful: any[] = [];
    const failed: any[] = [];

    console.log('🧪 Teste Preis-Update-Endpoints (ERWEITERT)...\n');

    for (const test of testCases) {
      try {
        console.log(`📤 Teste: ${test.desc}`);
        console.log(`   ${test.method} ${test.path}`);
        
        const response = await axiosInstance.request({
          method: test.method as any,
          url: test.path,
          data: test.body,
          validateStatus: (status) => status < 500
        });

        if (response.status >= 200 && response.status < 300) {
          successful.push({
            path: test.path,
            method: test.method,
            status: response.status,
            response: response.data
          });
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        } else {
          failed.push({
            path: test.path,
            method: test.method,
            status: response.status,
            error: response.data
          });
          console.log(`   ⚠️  Status ${response.status}`);
          if (response.status !== 404) {
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          failed.push({
            path: test.path,
            method: test.method,
            status: axiosError.response?.status,
            error: axiosError.response?.data
          });
          if (axiosError.response?.status === 404) {
            console.log(`   ❌ 404 - Resource Not Found`);
          } else {
            console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
            console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
          }
        }
      }
      console.log('');
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60) + '\n');

    if (successful.length > 0) {
      console.log(`✅ ${successful.length} ERFOLGREICHE PREIS-UPDATE-ENDPOINTS:\n`);
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response:`, JSON.stringify(result.response, null, 2));
        console.log('');
      });
      
      // Prüfe ob Preis wirklich aktualisiert wurde
      console.log('\n🔍 Prüfe ob Preis wirklich aktualisiert wurde...');
      const updatedAvailability = await lobbyPmsService.checkAvailability(new Date(testDate), new Date(testDate));
      const updatedEntry = updatedAvailability.find(a => a.categoryId === categoryId && a.date === testDate);
      if (updatedEntry) {
        console.log(`   Aktueller Preis nach Update: ${updatedEntry.pricePerNight}`);
        if (updatedEntry.pricePerNight === testPrice) {
          console.log(`   ✅ Preis wurde erfolgreich aktualisiert!`);
        } else {
          console.log(`   ⚠️  Preis wurde nicht aktualisiert (erwartet: ${testPrice}, aktuell: ${updatedEntry.pricePerNight})`);
        }
      }
      console.log('');
    } else {
      console.log('❌ KEINE ERFOLGREICHEN PREIS-UPDATE-ENDPOINTS GEFUNDEN\n');
    }

    if (failed.length > 0 && failed.some(f => f.status !== 404)) {
      console.log(`⚠️  ENDPOINTS MIT NICHT-404 FEHLERN:\n`);
      failed.filter(f => f.status !== 404).forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Error:`, JSON.stringify(result.error, null, 2));
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const branchId = process.argv[2] ? parseInt(process.argv[2], 10) : 3;
const lobbyEmail = process.argv[3];
const lobbyPassword = process.argv[4];

if (isNaN(branchId)) {
  console.error('❌ Ungültige Branch-ID');
  process.exit(1);
}

testPostEndpoints(branchId, lobbyEmail, lobbyPassword)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });
