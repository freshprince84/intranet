import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { decryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function testTTLockOAuth() {
  try {
    console.log('🔍 Teste TTLock OAuth...\n');

    // Hole Organisation
    const organization = await prisma.organization.findFirst({
      where: { id: 1 }
    });

    if (!organization) {
      console.error('❌ Organisation nicht gefunden');
      return;
    }

    console.log(`✅ Organisation: ${organization.displayName || organization.name}\n`);

    // Entschlüssele Settings
    const settings = decryptApiSettings(organization.settings as any);
    const doorSystemSettings = settings?.doorSystem;

    if (!doorSystemSettings) {
      console.error('❌ Door System Settings nicht gefunden');
      return;
    }

    console.log('📋 Door System Settings:');
    console.log(`   Provider: ${doorSystemSettings.provider}`);
    console.log(`   API URL: ${doorSystemSettings.apiUrl || 'https://euopen.ttlock.com'}`);
    console.log(`   Client ID vorhanden: ${!!doorSystemSettings.clientId}`);
    console.log(`   Client ID Länge: ${doorSystemSettings.clientId?.length || 0}`);
    console.log(`   Client Secret vorhanden: ${!!doorSystemSettings.clientSecret}`);
    console.log(`   Client Secret Länge: ${doorSystemSettings.clientSecret?.length || 0}`);
    console.log(`   Username vorhanden: ${!!doorSystemSettings.username}`);
    console.log(`   Password vorhanden: ${!!doorSystemSettings.password}`);
    console.log(`   Password Länge: ${doorSystemSettings.password?.length || 0}`);
    console.log('');

    if (!doorSystemSettings.clientId || !doorSystemSettings.clientSecret) {
      console.error('❌ Client ID oder Client Secret fehlen');
      return;
    }

    if (!doorSystemSettings.username || !doorSystemSettings.password) {
      console.error('❌ Username oder Password fehlen');
      return;
    }

    // Teste OAuth
    const oauthUrl = doorSystemSettings.apiUrl?.includes('euopen.ttlock.com') 
      ? 'https://api.sciener.com' 
      : (doorSystemSettings.apiUrl || 'https://api.sciener.com');

    console.log(`🌐 OAuth URL: ${oauthUrl}/oauth2/token\n`);

    try {
      const response = await axios.post(
        `${oauthUrl}/oauth2/token`,
        new URLSearchParams({
          client_id: doorSystemSettings.clientId,
          client_secret: doorSystemSettings.clientSecret,
          username: doorSystemSettings.username,
          password: doorSystemSettings.password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const responseData = response.data as any;

      if (responseData.errcode === 0 && responseData.data) {
        console.log('✅ OAuth erfolgreich!');
        console.log(`   Access Token: ${responseData.data.access_token?.substring(0, 20)}...`);
        console.log(`   Expires In: ${responseData.data.expires_in} Sekunden`);
      } else if (responseData.access_token) {
        console.log('✅ OAuth erfolgreich!');
        console.log(`   Access Token: ${responseData.access_token.substring(0, 20)}...`);
        console.log(`   Expires In: ${responseData.expires_in} Sekunden`);
      } else {
        console.error('❌ OAuth Fehler:');
        console.error(`   ErrCode: ${responseData.errcode}`);
        console.error(`   ErrMsg: ${responseData.errmsg}`);
        console.error(`   Data: ${JSON.stringify(responseData, null, 2)}`);
      }
    } catch (error: any) {
      console.error('❌ OAuth Request Fehler:');
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.message) {
        console.error(`   Message: ${error.message}`);
      } else {
        console.error(`   Error: ${JSON.stringify(error, null, 2)}`);
      }
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTTLockOAuth();

