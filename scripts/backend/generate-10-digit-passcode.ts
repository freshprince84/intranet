import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();

/**
 * Script: Generiere einen 9-stelligen Period-Passcode für TTLock (wie funktionierender Code 149923045)
 * 
 * WICHTIG: TTLock unterstützt nur Passcodes mit 4-9 Ziffern, NICHT 10!
 * Der funktionierende Code 149923045 war 9-stellig.
 * 
 * Konfiguration:
 * - 9-stelliger Passcode: Math.floor(100000000 + Math.random() * 900000000)
 * - keyboardPwdType: 3 (period/temporär)
 * - startDate/endDate: Millisekunden
 * - addType: 1 (via phone bluetooth)
 * 
 * Für Tests auf Hetzner Server
 */

interface TTLockResponse<T = any> {
  errcode?: number;
  errmsg?: string;
  data?: T;
  keyboardPwdId?: string;
  keyboardPwd?: string;
  passcode?: string;
}

async function generate10DigitPasscode(lockIdArg?: string) {
  try {
    console.log('🚀 Generiere 9-stelligen Period-Passcode für TTLock (wie funktionierender Code 149923045)...\n');

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
      // Verschlüsselt - entschlüssele
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
        throw new Error('Keine Lock IDs verfügbar. Bitte Lock ID als Argument übergeben: npx ts-node scripts/generate-10-digit-passcode.ts <lock-id>');
      }
    } else {
      lockId = lockIds[0];
    }
    
    // Falls Lock ID als Argument übergeben wurde, überschreibe
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
    
    // OAuth-Endpunkt ist auf api.sciener.com, nicht auf euopen.ttlock.com
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
        // WICHTIG: grant_type NICHT setzen - wie im funktionierenden Code b8b0fe9!
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

    // 2. Generiere 9-stelligen Passcode (wie funktionierender Code 149923045)
    // WICHTIG: TTLock unterstützt nur 4-9 Ziffern, NICHT 10!
    console.log('\n🔢 Generiere 9-stelligen Passcode...');
    const generatedPasscode = Math.floor(100000000 + Math.random() * 900000000).toString(); // 9-stellig
    console.log(`✅ Generierter Passcode: ${generatedPasscode}`);

    // 3. Erstelle Period-Passcode (keyboardPwdType: 3)
    const currentTimestamp = Date.now(); // Millisekunden
    
    // Zeitraum: Jetzt bis in 7 Tagen
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    console.log(`\n📅 Zeitraum:`);
    console.log(`   Start: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Ende:  ${endDate.toLocaleString('de-DE')}`);
    console.log(`   Name:  Test 9-stellig`);

    // Payload wie im Commit b8b0fe9
    const payload = new URLSearchParams();
    payload.append('clientId', doorSystem.clientId);
    payload.append('accessToken', accessToken);
    payload.append('lockId', lockId.toString());
    payload.append('keyboardPwd', generatedPasscode); // ✅ 9-stelliger Passcode (TTLock unterstützt nur 4-9 Ziffern!)
    payload.append('keyboardPwdName', 'Test 9-stellig');
    payload.append('keyboardPwdType', '3'); // ✅ 3 = period (temporärer Passcode) - WIE IM FUNKTIONIERENDEN CODE!
    payload.append('startDate', startDate.getTime().toString()); // ✅ Millisekunden! - WICHTIG FÜR PERIOD PASSCODES!
    payload.append('endDate', endDate.getTime().toString()); // ✅ Millisekunden! - WICHTIG FÜR PERIOD PASSCODES!
    // addType: 1=via phone bluetooth (APP SDK), 2=via gateway/WiFi
    // WICHTIG: addType: 1 erstellt den Passcode, aber er muss über die TTLock App synchronisiert werden!
    // Der Passcode wird in der API erstellt, aber erst nach Bluetooth-Synchronisation aktiv
    payload.append('addType', '1'); // ✅ 1 = via phone bluetooth (erfordert App-Synchronisation) - WIE IM FUNKTIONIERENDEN CODE!
    payload.append('date', currentTimestamp.toString()); // ✅ Millisekunden

    console.log('\n📤 Sende Request an TTLock API...');
    console.log(`   URL: ${baseApiUrl}/v3/keyboardPwd/add`);
    console.log(`   Payload:`, Object.fromEntries(payload));

    const response = await axiosInstance.post<TTLockResponse>(
      '/v3/keyboardPwd/add',
      payload,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const responseData = response.data as any;

    // Response-Verarbeitung (wie im Commit b8b0fe9)
    let finalPasscode: string | null = null;
    
    if (responseData.errcode === 0) {
      if (responseData.data?.keyboardPwd) {
        finalPasscode = responseData.data.keyboardPwd.toString();
      } else if (responseData.data?.passcode) {
        finalPasscode = responseData.data.passcode.toString();
      } else if (responseData.keyboardPwd) {
        finalPasscode = responseData.keyboardPwd.toString();
      } else {
        finalPasscode = generatedPasscode;
      }
    } else if (responseData.keyboardPwdId) {
      // Erfolg: API gibt keyboardPwdId zurück
      console.log(`✅ Passcode erfolgreich erstellt! keyboardPwdId: ${responseData.keyboardPwdId}`);
      if (responseData.keyboardPwd) {
        finalPasscode = responseData.keyboardPwd.toString();
      } else if (responseData.passcode) {
        finalPasscode = responseData.passcode.toString();
      } else {
        finalPasscode = generatedPasscode;
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
      // Fehlerfall
      const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
      throw new Error(errorMsg);
    }

    console.log(`\n✅ PASSCODE ERFOLGREICH GENERIERT!`);
    console.log(`\n📋 Details:`);
    console.log(`   Lock ID: ${lockId}`);
    console.log(`   Name: Test 9-stellig`);
    console.log(`   Passcode: ${finalPasscode}`);
    console.log(`   Typ: Period (keyboardPwdType: 3)`);
    console.log(`   Gültig von: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Gültig bis: ${endDate.toLocaleString('de-DE')}`);
    console.log(`   addType: 1 (via phone bluetooth)`);
    console.log(`\n🧪 Du kannst diesen Code jetzt an der Tür testen!`);
    console.log(`\n⚠️  WICHTIG: 9-stellige period Passcodes (wie funktionierender Code 149923045)!`);
    console.log(`   TTLock unterstützt nur Passcodes mit 4-9 Ziffern, NICHT 10!`);

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

generate10DigitPasscode(lockIdArg)
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

