import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testCreationDateFilter() {
  console.log('Prüfe LobbyPMS API Parameter für creation_date Filter...\n');
  
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

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayDateTime = yesterday.toISOString();

  console.log(`Test-Zeitraum: ${yesterdayStr} (letzte 24h)\n`);

  const paramsToTest = [
    { name: 'created_after', value: yesterdayStr },
    { name: 'created_since', value: yesterdayStr },
    { name: 'creation_date_from', value: yesterdayStr },
    { name: 'creation_date_after', value: yesterdayStr },
    { name: 'created_at_from', value: yesterdayStr },
    { name: 'created_at_after', value: yesterdayStr },
    { name: 'date_created_from', value: yesterdayStr },
    { name: 'date_created_after', value: yesterdayStr },
    { name: 'created_after', value: yesterdayDateTime },
    { name: 'created_since', value: yesterdayDateTime },
  ];

  for (const param of paramsToTest) {
    try {
      const response = await axiosInstance.get('/api/v1/bookings', {
        params: {
          [param.name]: param.value
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
            if (!r.creation_date) return false;
            const created = new Date(r.creation_date);
            return created >= yesterday;
          });
          
          if (allFiltered) {
            console.log(`✅ ${param.name}=${param.value}: ${data.length} Reservierungen (FUNKTIONIERT - alle in letzten 24h!)`);
            if (data[0].creation_date) {
              console.log(`   Erste creation_date: ${data[0].creation_date}`);
            }
          } else {
            console.log(`⚠️  ${param.name}=${param.value}: ${data.length} Reservierungen (Parameter wird ignoriert, keine Filterung)`);
          }
        } else {
          console.log(`❌ ${param.name}=${param.value}: 0 Reservierungen (Parameter wird nicht unterstützt oder keine Daten)`);
        }
      } else {
        console.log(`❌ ${param.name}=${param.value}: Status ${response.status} (wird nicht unterstützt)`);
      }
    } catch (e: any) {
      console.log(`❌ ${param.name}=${param.value}: Fehler - ${e.message}`);
    }
  }

  // Test: Normale Abfrage ohne Filter zum Vergleich
  console.log('\n--- Vergleich: Normale Abfrage (letzte 7 Tage Check-in) ---');
  try {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const response = await axiosInstance.get('/api/v1/bookings', {
      params: {
        start_date: lastWeek.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      }
    });
    
    const data = Array.isArray(response.data) 
      ? response.data 
      : (response.data.data && Array.isArray(response.data.data) ? response.data.data : []);
    
    const inLast24h = data.filter((r: any) => {
      if (!r.creation_date) return false;
      const created = new Date(r.creation_date);
      return created >= yesterday;
    });
    
    console.log(`Normale Abfrage: ${data.length} Reservierungen (Check-in letzte 7 Tage)`);
    console.log(`Davon in letzten 24h ERSTELLT: ${inLast24h.length}`);
  } catch (e: any) {
    console.log(`Fehler bei Vergleich: ${e.message}`);
  }

  await prisma.$disconnect();
}

testCreationDateFilter().catch(console.error);

