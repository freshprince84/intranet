import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testAllFieldsAndFilters() {
  console.log('🔍 Analysiere LobbyPMS API: Alle Felder und Filter-Parameter\n');
  
  const branch4 = await prisma.branch.findUnique({
    where: { id: 4 },
    select: { lobbyPmsSettings: true }
  });

  if (!branch4?.lobbyPmsSettings) {
    console.log('❌ Keine LobbyPMS Settings für Branch 4 gefunden');
    await prisma.$disconnect();
    return;
  }

  const settings = decryptBranchApiSettings(branch4.lobbyPmsSettings as any);
  const apiKey = settings.apiKey;
  let apiUrl = settings.apiUrl || 'https://api.lobbypms.com';
  
  if (apiUrl.includes('app.lobbypms.com')) {
    apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
  }
  if (apiUrl.endsWith('/api')) {
    apiUrl = apiUrl.replace(/\/api$/, '');
  }

  const axiosInstance = axios.create({
    baseURL: apiUrl,
    timeout: 30000,
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  // Schritt 1: Hole eine Beispiel-Reservierung und analysiere ALLE Felder
  console.log('📋 Schritt 1: Analysiere alle Felder in einer Reservierung...\n');
  
  try {
    const response = await axiosInstance.get('/api/v1/bookings', {
      params: {
        per_page: 1,
        page: 1
      }
    });

    const data = Array.isArray(response.data) 
      ? response.data 
      : (response.data.data && Array.isArray(response.data.data) ? response.data.data : null);
    
    if (data && data.length > 0) {
      const reservation = data[0];
      console.log('✅ Beispiel-Reservierung gefunden\n');
      console.log('📊 ALLE FELDER in der Reservierung:');
      console.log('─'.repeat(80));
      
      // Analysiere alle Felder rekursiv
      function analyzeFields(obj: any, prefix: string = '', depth: number = 0): void {
        if (depth > 3) return; // Max 3 Ebenen tief
        
        for (const key in obj) {
          const value = obj[key];
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (value === null || value === undefined) {
            console.log(`  ${fullKey}: null/undefined`);
          } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            console.log(`  ${fullKey}: {`);
            analyzeFields(value, fullKey, depth + 1);
            console.log(`  }`);
          } else if (Array.isArray(value)) {
            console.log(`  ${fullKey}: Array[${value.length}]`);
            if (value.length > 0 && typeof value[0] === 'object') {
              console.log(`    └─ Erstes Element:`);
              analyzeFields(value[0], `${fullKey}[0]`, depth + 1);
            }
          } else {
            const displayValue = typeof value === 'string' && value.length > 50 
              ? value.substring(0, 50) + '...' 
              : value;
            console.log(`  ${fullKey}: ${displayValue} (${typeof value})`);
          }
        }
      }
      
      analyzeFields(reservation);
      console.log('─'.repeat(80));
      
      // Extrahiere alle Datums-Felder
      console.log('\n📅 DATUMS-FELDER gefunden:');
      const dateFields: string[] = [];
      
      function findDateFields(obj: any, prefix: string = ''): void {
        for (const key in obj) {
          const value = obj[key];
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'string') {
            // Prüfe ob es wie ein Datum aussieht
            if (/^\d{4}-\d{2}-\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value)) {
              if (!dateFields.includes(fullKey)) {
                dateFields.push(fullKey);
                console.log(`  ✅ ${fullKey}: "${value}"`);
              }
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            findDateFields(value, fullKey);
          }
        }
      }
      
      findDateFields(reservation);
      
      // Schritt 2: Teste Filter-Parameter basierend auf gefundenen Feldern
      console.log('\n\n🔍 Schritt 2: Teste Filter-Parameter basierend auf gefundenen Feldern...\n');
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayDateTime = yesterday.toISOString();
      const yesterdayDateTimeShort = yesterday.toISOString().replace('T', ' ').substring(0, 19); // "2025-01-25 10:30:00"
      
      console.log(`Test-Zeitraum: ${yesterdayStr} (letzte 24h)\n`);
      
      // Erstelle Parameter-Liste basierend auf gefundenen Feldern
      const paramsToTest: Array<{ name: string; value: string; description: string }> = [];
      
      // Basierend auf creation_date Feld
      if (dateFields.some(f => f.includes('creation') || f.includes('created'))) {
        paramsToTest.push(
          { name: 'created_after', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'created_since', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'creation_date_from', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'creation_date_after', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'created_at_from', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'created_at_after', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'date_created_from', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'date_created_after', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'created_after', value: yesterdayDateTime, description: 'DateTime-String (ISO 8601)' },
          { name: 'created_since', value: yesterdayDateTime, description: 'DateTime-String (ISO 8601)' },
          { name: 'creation_date_from', value: yesterdayDateTimeShort, description: 'DateTime-String (YYYY-MM-DD HH:mm:ss)' },
          { name: 'created_after', value: yesterdayDateTimeShort, description: 'DateTime-String (YYYY-MM-DD HH:mm:ss)' },
        );
      }
      
      // Basierend auf booking_date oder reservation_date
      if (dateFields.some(f => f.includes('booking') || f.includes('reservation'))) {
        paramsToTest.push(
          { name: 'booking_date_from', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'booking_date_after', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'reservation_date_from', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'reservation_date_after', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
        );
      }
      
      // Basierend auf start_date (Check-in)
      if (dateFields.some(f => f.includes('start') || f.includes('check_in'))) {
        paramsToTest.push(
          { name: 'start_date_from', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
          { name: 'check_in_date_from', value: yesterdayStr, description: 'Date-String (YYYY-MM-DD)' },
        );
      }
      
      // Weitere mögliche Parameter
      paramsToTest.push(
        { name: 'filter[created_after]', value: yesterdayStr, description: 'Filter-Format (Date)' },
        { name: 'filter[creation_date][gte]', value: yesterdayStr, description: 'Filter-Format (gte = greater than or equal)' },
        { name: 'where[creation_date][gte]', value: yesterdayStr, description: 'Where-Format (gte)' },
        { name: 'created[gte]', value: yesterdayStr, description: 'GTE-Format' },
        { name: 'created[from]', value: yesterdayStr, description: 'From-Format' },
      );
      
      console.log(`Teste ${paramsToTest.length} verschiedene Parameter-Kombinationen...\n`);
      
      let successCount = 0;
      
      for (const param of paramsToTest) {
        try {
          const response = await axiosInstance.get('/api/v1/bookings', {
            params: {
              [param.name]: param.value,
              per_page: 10 // Nur 10 für schnelleren Test
            },
            validateStatus: () => true
          });

          if (response.status === 200 && response.data) {
            const data = Array.isArray(response.data) 
              ? response.data 
              : (response.data.data && Array.isArray(response.data.data) ? response.data.data : null);
            
            if (data && data.length > 0) {
              // Prüfe ob wirklich gefiltert wurde
              const allFiltered = data.every((r: any) => {
                // Prüfe verschiedene mögliche creation_date Felder
                const creationDate = r.creation_date || r.created_at || r.date_created || r.booking_date || r.reservation_date;
                if (!creationDate) return false;
                const created = new Date(creationDate);
                return created >= yesterday;
              });
              
              if (allFiltered) {
                console.log(`✅ ${param.name}=${param.value}`);
                console.log(`   ${data.length} Reservierungen (FUNKTIONIERT - alle in letzten 24h!)`);
                if (data[0].creation_date || data[0].created_at) {
                  const firstDate = data[0].creation_date || data[0].created_at;
                  console.log(`   Erste creation_date: ${firstDate}`);
                }
                console.log(`   Format: ${param.description}`);
                console.log('');
                successCount++;
              } else {
                console.log(`⚠️  ${param.name}=${param.value}: ${data.length} Reservierungen (Parameter wird ignoriert)`);
              }
            } else {
              // 0 Reservierungen könnte bedeuten: Filter funktioniert, aber keine Daten
              // Oder: Filter funktioniert nicht
              console.log(`❓ ${param.name}=${param.value}: 0 Reservierungen (könnte funktionieren, aber keine Daten)`);
            }
          } else {
            console.log(`❌ ${param.name}=${param.value}: Status ${response.status}`);
          }
        } catch (e: any) {
          console.log(`❌ ${param.name}=${param.value}: Fehler - ${e.message}`);
        }
      }
      
      console.log(`\n📊 Zusammenfassung: ${successCount} funktionierende Parameter gefunden\n`);
      
      // Schritt 3: Vergleich ohne Filter
      console.log('─'.repeat(80));
      console.log('📊 Schritt 3: Vergleich - Normale Abfrage ohne Filter...\n');
      
      try {
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const response = await axiosInstance.get('/api/v1/bookings', {
          params: {
            start_date: lastWeek.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
            per_page: 100
          }
        });
        
        const data = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data && Array.isArray(response.data.data) ? response.data.data : []);
        
        const inLast24h = data.filter((r: any) => {
          const creationDate = r.creation_date || r.created_at || r.date_created || r.booking_date || r.reservation_date;
          if (!creationDate) return false;
          const created = new Date(creationDate);
          return created >= yesterday;
        });
        
        console.log(`Normale Abfrage (Check-in letzte 7 Tage): ${data.length} Reservierungen`);
        console.log(`Davon in letzten 24h ERSTELLT: ${inLast24h.length}`);
        console.log(`Davon in letzten 24h ERSTELLT (%): ${((inLast24h.length / data.length) * 100).toFixed(1)}%`);
      } catch (e: any) {
        console.log(`Fehler bei Vergleich: ${e.message}`);
      }
      
    } else {
      console.log('❌ Keine Reservierungen gefunden');
    }
  } catch (error: any) {
    console.error('Fehler beim Abrufen der Reservierungen:', error.message);
  }

  await prisma.$disconnect();
}

testAllFieldsAndFilters().catch(console.error);

