/**
 * Script: Debuggt den loadSettings() Prozess Schritt für Schritt
 */

import { PrismaClient } from '@prisma/client';
import { BoldPaymentService } from '../src/services/boldPaymentService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugBoldPaymentServiceLoad() {
  try {
    console.log('🔍 Debug: BoldPaymentService.loadSettings() Prozess...\n');

    // Erstelle Service für Branch 3
    console.log('1️⃣ Erstelle BoldPaymentService für Branch 3...');
    const service = new BoldPaymentService(undefined, 3);
    console.log('   ✅ Service erstellt');
    console.log(`   organizationId: ${(service as any).organizationId}`);
    console.log(`   branchId: ${(service as any).branchId}`);
    console.log(`   merchantId (vor loadSettings): ${(service as any).merchantId || 'NICHT GESETZT'}`);
    console.log('');

    // Lade Settings manuell (simuliere loadSettings)
    console.log('2️⃣ Lade Branch Settings...');
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        boldPaymentSettings: true,
        organizationId: true
      }
    });

    if (!branch) {
      throw new Error('Branch 3 nicht gefunden!');
    }

    console.log(`   Branch organizationId: ${branch.organizationId}`);
    console.log(`   Branch boldPaymentSettings vorhanden: ${!!branch.boldPaymentSettings}`);
    console.log('');

    if (branch.boldPaymentSettings) {
      console.log('3️⃣ Entschlüssele Branch Settings...');
      const { decryptBranchApiSettings } = await import('../src/utils/encryption');
      const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
      const boldPaymentSettings = settings?.boldPayment || settings;

      console.log(`   API Key vorhanden: ${!!boldPaymentSettings?.apiKey}`);
      console.log(`   Merchant ID: ${boldPaymentSettings?.merchantId || 'NICHT GESETZT'}`);
      console.log(`   Environment: ${boldPaymentSettings?.environment || 'sandbox'}`);
      console.log('');

      if (boldPaymentSettings?.apiKey) {
        console.log('4️⃣ Settings würden verwendet werden (Branch Settings)');
        console.log(`   Merchant ID: ${boldPaymentSettings.merchantId}`);
      } else {
        console.log('4️⃣ API Key fehlt → Fallback auf Organization Settings');
      }
    } else {
      console.log('3️⃣ Keine Branch Settings → Fallback auf Organization Settings');
    }

    console.log('');

    // Jetzt lade Settings über Service
    console.log('5️⃣ Lade Settings über Service.loadSettings()...');
    await (service as any).loadSettings();
    console.log('   ✅ Settings geladen');
    console.log(`   merchantId (nach loadSettings): ${(service as any).merchantId || 'NICHT GESETZT'}`);
    console.log(`   apiKey (nach loadSettings): ${(service as any).apiKey ? String((service as any).apiKey).substring(0, 20) + '...' : 'NICHT GESETZT'}`);
    console.log(`   environment (nach loadSettings): ${(service as any).environment || 'sandbox'}`);
    console.log(`   apiUrl (nach loadSettings): ${(service as any).apiUrl || 'NICHT GESETZT'}`);
    console.log('');

    // Teste ob axiosInstance korrekt konfiguriert ist
    console.log('6️⃣ Teste axiosInstance Konfiguration...');
    const axiosInstance = (service as any).axiosInstance;
    if (axiosInstance) {
      console.log('   ✅ axiosInstance vorhanden');
      console.log(`   baseURL: ${axiosInstance.defaults.baseURL || 'NICHT GESETZT'}`);
      
      // Teste Request Interceptor
      console.log('   Teste Request Interceptor...');
      try {
        const testConfig: any = {
          method: 'POST',
          url: '/online/link/v1',
          headers: {}
        };
        
        // Rufe Interceptor manuell auf
        const interceptors = axiosInstance.interceptors.request as any;
        if (interceptors && interceptors.handlers && interceptors.handlers.length > 0) {
          const handler = interceptors.handlers[0].fulfilled;
          if (handler) {
            const modifiedConfig = await handler(testConfig);
            console.log(`   Authorization Header: ${modifiedConfig.headers.Authorization || 'NICHT GESETZT'}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Fehler beim Testen des Interceptors: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('   ❌ axiosInstance NICHT vorhanden!');
    }
    console.log('');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack.split('\n').slice(0, 10).join('\n'));
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugBoldPaymentServiceLoad()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });












