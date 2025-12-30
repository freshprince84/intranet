import axios from 'axios';

/**
 * Script: Testet TTLock OAuth direkt mit den Credentials
 */

async function testTTLockOAuthDirect() {
  try {
    console.log('🔍 Teste TTLock OAuth direkt...\n');

    const clientId = 'c0128d6b496a4f848d06970a65210e8a';
    const clientSecret = '6cd592b8076fb40cdd14fca5dd18b1';
    const username = '+573024498991';
    const password = '36942b24802cfdbb2c9d6e5d3bc944c6'; // MD5 von DigitalAccess123!
    const oauthUrl = 'https://api.sciener.com/oauth2/token';

    console.log('📋 OAuth-Parameter:');
    console.log(`   URL: ${oauthUrl}`);
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Client Secret: ${clientSecret}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password (MD5): ${password}\n`);

    console.log('🔐 Sende OAuth-Request...');
    
    try {
      const response = await axios.post(
        oauthUrl,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          username: username,
          password: password,
          grant_type: 'password'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      console.log('✅ OAuth-Request erfolgreich!');
      console.log('📋 Response:');
      console.log(JSON.stringify(response.data, null, 2));

      if (response.data.access_token) {
        console.log(`\n✅ Access Token erhalten: ${response.data.access_token.substring(0, 20)}...`);
      } else if (response.data.data?.access_token) {
        console.log(`\n✅ Access Token erhalten: ${response.data.data.access_token.substring(0, 20)}...`);
      }

    } catch (error: any) {
      console.error('❌ OAuth-Request fehlgeschlagen:');
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Status Text: ${error.response.statusText}`);
        console.error(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error(`   Request Error: ${error.message}`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  }
}

testTTLockOAuthDirect()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

