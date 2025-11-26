/**
 * Test-Script: Prüft ob config.headers.Authorization = vs config.headers.set() funktioniert
 * 
 * ZIEL: Beweisen, ob die Header-Setting-Methode das Problem ist
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Hauptfunktion (async)
async function main() {
  console.log('🔍 Test: Header-Setting-Methode in Axios\n');

  // Test 1: config.headers.Authorization = (AKTUELLE METHODE)
  console.log('📋 TEST 1: config.headers.Authorization = (AKTUELLE METHODE)');
  const instance1 = axios.create({
    baseURL: 'https://integrations.api.bold.co',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  instance1.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const testMerchantId = 'test-merchant-id-12345';
      
      // AKTUELLE METHODE (seit 25.11.2025 17:53:19)
      config.headers.Authorization = `x-api-key ${testMerchantId}`;
      
      console.log('  ✅ Header gesetzt mit: config.headers.Authorization =');
      console.log(`  📝 Header-Wert: ${config.headers.Authorization}`);
      console.log(`  📝 Header-Typ: ${typeof config.headers.Authorization}`);
      console.log(`  📝 Headers-Objekt:`, JSON.stringify(config.headers, null, 2));
      console.log(`  📝 Headers hat Authorization?: ${'Authorization' in config.headers}`);
      console.log(`  📝 Headers.get('Authorization'): ${(config.headers as any).get?.('Authorization') || 'N/A (keine get-Methode)'}`);
      
      return config;
    }
  );

  // Test 2: config.headers.set() (ALTERNATIVE METHODE)
  console.log('\n📋 TEST 2: config.headers.set() (ALTERNATIVE METHODE)');
  const instance2 = axios.create({
    baseURL: 'https://integrations.api.bold.co',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  instance2.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const testMerchantId = 'test-merchant-id-12345';
      
      // ALTERNATIVE METHODE (wie vorher)
      config.headers.set('Authorization', `x-api-key ${testMerchantId}`);
      
      console.log('  ✅ Header gesetzt mit: config.headers.set()');
      console.log(`  📝 Header-Wert: ${config.headers.Authorization}`);
      console.log(`  📝 Header-Typ: ${typeof config.headers.Authorization}`);
      console.log(`  📝 Headers-Objekt:`, JSON.stringify(config.headers, null, 2));
      console.log(`  📝 Headers hat Authorization?: ${'Authorization' in config.headers}`);
      console.log(`  📝 Headers.get('Authorization'): ${(config.headers as any).get?.('Authorization') || 'N/A (keine get-Methode)'}`);
      
      return config;
    }
  );

  // Test 3: Direkter Vergleich - Beide Methoden auf derselben Instanz
  console.log('\n📋 TEST 3: Direkter Vergleich - Beide Methoden');
  const instance3 = axios.create({
    baseURL: 'https://integrations.api.bold.co',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  instance3.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const testMerchantId = 'test-merchant-id-12345';
      
      console.log('  🔄 Teste beide Methoden nacheinander:');
      
      // Methode 1: config.headers.Authorization =
      config.headers.Authorization = `x-api-key ${testMerchantId}`;
      console.log(`  📝 Nach config.headers.Authorization =: ${config.headers.Authorization}`);
      
      // Methode 2: config.headers.set()
      config.headers.set('Authorization', `x-api-key ${testMerchantId}-set`);
      console.log(`  📝 Nach config.headers.set(): ${config.headers.Authorization}`);
      
      // Prüfe welche Methode "gewinnt"
      console.log(`  🎯 Finaler Header-Wert: ${config.headers.Authorization}`);
      console.log(`  📝 Headers-Objekt:`, JSON.stringify(config.headers, null, 2));
      
      return config;
    }
  );

  // Test 4: Prüfe ob Header wirklich im Request ankommt (ohne echten API-Call)
  console.log('\n📋 TEST 4: Prüfe Request-Konfiguration (ohne echten API-Call)');
  const instance4 = axios.create({
    baseURL: 'https://integrations.api.bold.co',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  instance4.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const testMerchantId = 'test-merchant-id-12345';
      
      // AKTUELLE METHODE
      config.headers.Authorization = `x-api-key ${testMerchantId}`;
      
      // Prüfe Request-Konfiguration
      console.log('  📝 Request-Konfiguration:');
      console.log(`    URL: ${config.url}`);
      console.log(`    Method: ${config.method}`);
      console.log(`    Headers:`, JSON.stringify(config.headers, null, 4));
      console.log(`    Authorization Header vorhanden?: ${!!config.headers.Authorization}`);
      console.log(`    Authorization Header Wert: "${config.headers.Authorization}"`);
      
      // Prüfe ob Header in verschiedenen Formaten verfügbar ist
      console.log('\n  🔍 Header-Zugriffsmethoden:');
      console.log(`    config.headers.Authorization: ${config.headers.Authorization}`);
      console.log(`    config.headers['Authorization']: ${(config.headers as any)['Authorization']}`);
      console.log(`    config.headers.get?.('Authorization'): ${(config.headers as any).get?.('Authorization') || 'N/A'}`);
      console.log(`    Object.keys(config.headers):`, Object.keys(config.headers));
      
      return config;
    }
  );

  // Helper-Funktion: Erstellt Mock-Config und führt Interceptor aus
  async function testInterceptor(instance: AxiosInstance, testName: string) {
    const mockConfig: InternalAxiosRequestConfig = {
      url: '/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      } as any,
      baseURL: 'https://integrations.api.bold.co',
      timeout: 30000,
    } as InternalAxiosRequestConfig;

    try {
      // Führe alle Request-Interceptors aus
      let config = mockConfig;
      const interceptors = (instance.interceptors.request as any).handlers || [];
      for (const handler of interceptors) {
        if (handler.fulfilled) {
          config = await handler.fulfilled(config);
        }
      }
      
      console.log(`\n✅ ${testName} abgeschlossen`);
      return config;
    } catch (error) {
      console.error(`❌ ${testName} fehlgeschlagen:`, error);
      return null;
    }
  }

  // Führe Tests aus (mit Mock-Request-Konfiguration)
  console.log('\n🚀 Führe Tests aus...\n');

  // Test 1: config.headers.Authorization =
  console.log('📋 Führe TEST 1 aus...');
  const result1 = await testInterceptor(instance1, 'TEST 1: config.headers.Authorization =');
  if (result1) {
    console.log(`  📝 Finaler Authorization Header: ${result1.headers.Authorization || 'UNDEFINED!'}`);
    console.log(`  📝 Header vorhanden?: ${!!result1.headers.Authorization}`);
  }

  // Test 2: config.headers.set()
  console.log('\n📋 Führe TEST 2 aus...');
  const result2 = await testInterceptor(instance2, 'TEST 2: config.headers.set()');
  if (result2) {
    console.log(`  📝 Finaler Authorization Header: ${result2.headers.Authorization || 'UNDEFINED!'}`);
    console.log(`  📝 Header vorhanden?: ${!!result2.headers.Authorization}`);
  }

  // Test 3: Direkter Vergleich
  console.log('\n📋 Führe TEST 3 aus...');
  const result3 = await testInterceptor(instance3, 'TEST 3: Direkter Vergleich');
  if (result3) {
    console.log(`  📝 Finaler Authorization Header: ${result3.headers.Authorization || 'UNDEFINED!'}`);
    console.log(`  📝 Header vorhanden?: ${!!result3.headers.Authorization}`);
  }

  // Test 4: Request-Konfiguration
  console.log('\n📋 Führe TEST 4 aus...');
  const result4 = await testInterceptor(instance4, 'TEST 4: Request-Konfiguration');
  if (result4) {
    console.log(`  📝 Finaler Authorization Header: ${result4.headers.Authorization || 'UNDEFINED!'}`);
    console.log(`  📝 Header vorhanden?: ${!!result4.headers.Authorization}`);
    console.log(`  📝 Alle Headers:`, JSON.stringify(result4.headers, null, 2));
  }

  console.log('\n✅ Alle Tests abgeschlossen!');
  console.log('\n📋 FAZIT:');
  console.log('  - Prüfe ob beide Methoden den Header setzen');
  console.log('  - Prüfe ob der Header-Wert korrekt ist');
  console.log('  - Prüfe ob es Unterschiede gibt');
  console.log('\n💡 NÄCHSTER SCHRITT:');
  console.log('  - Wenn config.headers.Authorization = NICHT funktioniert: Ändere zu config.headers.set()');
  console.log('  - Wenn BEIDE funktionieren: Problem liegt woanders');
}

// Führe Tests aus
main().catch(console.error);
