import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function checkApiPagination() {
  const branch4 = await prisma.branch.findUnique({
    where: { id: 4 },
    select: { lobbyPmsSettings: true }
  });

  const settings = decryptBranchApiSettings(branch4!.lobbyPmsSettings as any);
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

  console.log('Prüfe API Response-Struktur...');
  const response = await axiosInstance.get('/api/v1/bookings', {
    params: {
      creation_date_from: yesterdayStr,
      property_id: '13543'
    }
  });

  console.log('Response-Struktur:');
  console.log('  data ist Array:', Array.isArray(response.data));
  console.log('  data.data ist Array:', response.data.data && Array.isArray(response.data.data));
  console.log('  meta:', response.data.meta ? JSON.stringify(response.data.meta, null, 2) : 'NICHT VORHANDEN');
  console.log('  pagination:', response.data.pagination ? JSON.stringify(response.data.pagination, null, 2) : 'NICHT VORHANDEN');
  console.log('  total:', response.data.total !== undefined ? response.data.total : 'NICHT VORHANDEN');
  console.log('  limit:', response.data.limit !== undefined ? response.data.limit : 'NICHT VORHANDEN');
  console.log('  page:', response.data.page !== undefined ? response.data.page : 'NICHT VORHANDEN');

  const data = Array.isArray(response.data) 
    ? response.data 
    : (response.data.data || []);

  console.log('\nAnzahl Reservierungen in Response:', data.length);

  if (response.data.meta || response.data.pagination || (response.data.total && response.data.total > data.length)) {
    console.log('\n⚠️ PROBLEM: API hat Pagination/Meta - möglicherweise Limit!');
    console.log('  Total:', response.data.total);
    console.log('  Aktuell:', data.length);
    console.log('  Fehlend:', (response.data.total || 0) - data.length);
  }

  await prisma.$disconnect();
}

checkApiPagination().catch(console.error);

