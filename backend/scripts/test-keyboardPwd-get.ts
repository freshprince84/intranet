import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();

/**
 * Test-Script: Erstellt einen automatisch generierten Passcode
 * über den /v3/keyboardPwd/get Endpunkt (Random Passcode)
 * 
 * Dieser Endpunkt funktioniert OHNE Gateway und OHNE App-Sync!
 * Die API generiert automatisch einen Passcode - keyboardPwd wird NICHT gesetzt!
 */

interface TTLockResponse<T = any> {
  errcode?: number;
  errmsg?: string;
  data?: T;
  keyboardPwdId?: string;
  keyboardPwd?: string;
  passcode?: string;
}

async function testKeyboardPwdGet(lockIdArg?: string) {
  try {
    console.log('🚀 Teste /v3/keyboardPwd/get Endpunkt (automatisch generierter Passcode)...\n');

    // Lade Organisation 1
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation: ${organization.displayName}`);

    const settings = decryptApiSettings(organization.settings as any);
    const doorSystem = settings?.doorSystem;

    if (!doorSystem?.clientId || !doorSystem?.clientSecret) {
      throw new Error('TTLock ist nicht konfiguriert! Bitte zuerst Client ID und Secret einfügen.');
    }

    if (!doorSystem?.username || !doorSystem?.password) {
      throw new Error('TTLock Username/Password ist nicht konfiguriert!');
    }

    // Prüfe ob Client Secret verschlüsselt ist und entschlüssele es
    let clientSecret = doorSystem.clientSecret;
    if (clientSecret && clientSecret.includes(':')) {
      const { decryptSecret } = await import('../src/utils/encryption');
      try {
        clientSecret = decryptSecret(clientSecret);
        console.log('[TTLock] Client Secret erfolgreich entschlüsselt');
      } catch (error) {
        console.error('[TTLock] Fehler beim Entschlüsseln des Client Secrets:', error);
        throw new Error('Client Secret konnte nicht entschlüsselt werden');
      }
    }

    console.log(`✅ TTLock konfiguriert`);
    console.log(`   API URL: ${doorSystem.apiUrl || 'https://euopen.ttlock.com'}`);

    // Prüfe Lock IDs
    let lockIds = doorSystem.lockIds || [];
    let lockId: string;
    
    if (lockIds.length === 0) {
      console.log('\n⚠️  KEINE LOCK IDs IN DB GEFUNDEN!');
      if (lockIdArg) {
        console.log(`\n   ✅ Verwende übergebene Lock ID: ${lockIdArg}`);
        lockId = lockIdArg;
      } else {
        throw new Error('Keine Lock IDs verfügbar. Bitte Lock ID als Argument übergeben: npx ts-node scripts/test-keyboardPwd-get.ts <lock-id>');
      }
    } else {
      lockId = lockIds[0];
    }
    
    if (lockIdArg) {
      lockId = lockIdArg;
      console.log(`\n   ℹ️  Verwende übergebene Lock ID (überschreibt DB): ${lockId}`);
    }
    console.log(`\n🔑 Verwende Lock ID: ${lockId}`);

    // Erstelle Axios-Instanz für API-Calls
    const apiUrl = doorSystem.apiUrl || 'https://euopen.ttlock.com';
    const baseApiUrl = apiUrl.includes('euopen') ? 'https://euapi.ttlock.com' : 'https://api.sciener.com';
    
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: baseApiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // 1. OAuth: Hole Access Token
    console.log('\n🔐 Hole Access Token...');
    const passwordHash = doorSystem.password; // Bereits MD5-gehasht
    
    const oauthUrl = apiUrl.includes('euopen.ttlock.com')
      ? 'https://api.sciener.com'
      : apiUrl;
    
    const oauthResponse = await axios.post<TTLockResponse>(
      `${oauthUrl}/oauth2/token`,
      new URLSearchParams({
        client_id: doorSystem.clientId,
        client_secret: clientSecret,
        username: doorSystem.username,
        password: passwordHash
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const oauthData = oauthResponse.data as any;
    let accessToken: string;
    
    if (oauthData.errcode === 0 && oauthData.data) {
      accessToken = oauthData.data.access_token;
    } else if (oauthData.access_token) {
      accessToken = oauthData.access_token;
    } else {
      throw new Error(oauthData.errmsg || `OAuth Error: ${oauthData.errcode}`);
    }

    console.log('✅ Access Token erhalten');

    // 2. Verwende /v3/keyboardPwd/get für automatisch generierten Passcode
    console.log('\n🔢 Erstelle automatisch generierten Passcode via /v3/keyboardPwd/get...');
    console.log('   WICHTIG: keyboardPwd wird NICHT gesetzt - API generiert automatisch!');
    
    const currentTimestamp = Date.now(); // Millisekunden
    
    // Zeitraum: Jetzt bis in 7 Tagen
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Heute 00:00:00
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    console.log(`\n📅 Zeitraum:`);
    console.log(`   Start: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Ende:  ${endDate.toLocaleString('de-DE')}`);

    // Payload für /v3/keyboardPwd/get
    const payload = new URLSearchParams();
    payload.append('clientId', doorSystem.clientId);
    payload.append('accessToken', accessToken);
    payload.append('lockId', lockId.toString());
    // WICHTIG: keyboardPwd NICHT setzen - API generiert automatisch!
    payload.append('keyboardPwdName', 'Test /v3/keyboardPwd/get');
    payload.append('keyboardPwdType', '3'); // 3 = period (temporärer Passcode)
    payload.append('startDate', startDate.getTime().toString()); // Millisekunden
    payload.append('endDate', endDate.getTime().toString()); // Millisekunden
    payload.append('addType', '1'); // 1 = via phone bluetooth
    payload.append('date', currentTimestamp.toString()); // Millisekunden

    console.log('\n📤 Sende Request an TTLock API...');
    console.log(`   URL: ${baseApiUrl}/v3/keyboardPwd/get`);
    console.log(`   Payload:`, Object.fromEntries(payload));

    const response = await axiosInstance.post<TTLockResponse>(
      '/v3/keyboardPwd/get',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const responseData = response.data as any;

    // Response-Verarbeitung
    let finalPasscode: string | null = null;
    
    if (responseData.errcode === 0) {
      if (responseData.data?.keyboardPwd) {
        finalPasscode = responseData.data.keyboardPwd.toString();
      } else if (responseData.data?.passcode) {
        finalPasscode = responseData.data.passcode.toString();
      } else if (responseData.keyboardPwd) {
        finalPasscode = responseData.keyboardPwd.toString();
      } else if (responseData.passcode) {
        finalPasscode = responseData.passcode.toString();
      }
    } else if (responseData.keyboardPwdId) {
      if (responseData.keyboardPwd) {
        finalPasscode = responseData.keyboardPwd.toString();
      } else if (responseData.passcode) {
        finalPasscode = responseData.passcode.toString();
      }
    } else if (responseData.data?.passcode) {
      finalPasscode = responseData.data.passcode.toString();
    } else if (responseData.data?.keyboardPwd) {
      finalPasscode = responseData.data.keyboardPwd.toString();
    } else if (responseData.passcode) {
      finalPasscode = responseData.passcode.toString();
    } else if (responseData.keyboardPwd) {
      finalPasscode = responseData.keyboardPwd.toString();
    } else {
      const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
      throw new Error(errorMsg);
    }

    if (!finalPasscode) {
      throw new Error('API hat keinen Passcode zurückgegeben');
    }

    console.log(`\n✅ PASSCODE ERFOLGREICH GENERIERT!`);
    console.log(`\n📋 Details:`);
    console.log(`   Lock ID: ${lockId}`);
    console.log(`   Name: Test /v3/keyboardPwd/get`);
    console.log(`   Passcode: ${finalPasscode}`);
    console.log(`   Typ: Period (keyboardPwdType: 3)`);
    console.log(`   Gültig von: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Gültig bis: ${endDate.toLocaleString('de-DE')}`);
    console.log(`   addType: 1 (via phone bluetooth)`);
    console.log(`   Endpunkt: /v3/keyboardPwd/get (automatisch generiert)`);
    console.log(`\n🧪 Du kannst diesen Code jetzt an der Tür testen!`);

  } catch (error) {
    console.error('\n❌ Fehler beim Generieren des Passcodes:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      
      if (error.message.includes('Lock IDs')) {
        console.log('\n💡 Lösung:');
        console.log('   1. Öffne die TTLock-App oder das TTLock-Dashboard');
        console.log('   2. Finde deine Lock ID(s)');
        console.log('   3. Setze sie in der DB: organization.settings.doorSystem.lockIds = ["deine-lock-id"]');
        console.log('   4. Oder verwende das Frontend: Organisation → API Tab → TTLock');
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Lock ID als Kommandozeilenargument
const lockIdArg = process.argv[2];

testKeyboardPwdGet(lockIdArg)
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

