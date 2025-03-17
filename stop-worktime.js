const https = require('http');

// Login des Benutzers "cursor" zuerst, um den Token zu erhalten
const loginData = JSON.stringify({
  username: 'cursor',
  password: 'Cursor123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = https.request(loginOptions, (res) => {
  console.log(`Login Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Login erfolgreich:');
    
    try {
      const loginResponse = JSON.parse(responseData);
      const token = loginResponse.token;
      console.log('Token erhalten:', token);
      
      // Mit dem Token die aktive Zeiterfassung suchen und stoppen
      getAndStopWorktime(token);
    } catch (error) {
      console.error('Fehler beim Parsen der Login-Antwort:', error);
    }
  });
});

loginReq.on('error', (error) => {
  console.error('Login-Fehler:', error);
});

loginReq.write(loginData);
loginReq.end();

// Funktion zum Finden und Stoppen der Zeiterfassung
function getAndStopWorktime(token) {
  // Zuerst alle aktiven Zeiterfassungen abrufen
  const activeOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/worktime/active',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const activeReq = https.request(activeOptions, (res) => {
    console.log(`Aktive Zeiterfassung Status Code: ${res.statusCode}`);
    
    let activeData = '';
    
    res.on('data', (chunk) => {
      activeData += chunk;
    });
    
    res.on('end', () => {
      try {
        // Hier versuchen wir verschiedene Parsingmöglichkeiten, um das Format herauszufinden
        let worktime;
        try {
          worktime = JSON.parse(activeData);
          console.log('Aktive Zeiterfassung gefunden:', worktime);
        } catch (e) {
          console.log('JSON-Parsing fehlgeschlagen, Rohdaten:', activeData);
          return;
        }
        
        if (worktime && worktime.id) {
          const worktimeId = worktime.id;
          console.log('Stoppe Zeiterfassung mit ID:', worktimeId);
          
          // Alle möglichen Endpunkte testen
          tryAllStopEndpoints(token, worktimeId);
        } else {
          console.log('Keine aktive Zeiterfassung gefunden oder Format nicht erkannt.');
        }
      } catch (error) {
        console.error('Fehler beim Verarbeiten der Zeiterfassungsdaten:', error);
      }
    });
  });
  
  activeReq.on('error', (error) => {
    console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
  });
  
  activeReq.end();
}

// Funktion zum Testen aller möglichen Endpunkte
function tryAllStopEndpoints(token, worktimeId) {
  const endTime = new Date().toISOString();
  const stopData = JSON.stringify({ endTime });
  
  // Verschiedene mögliche Endpunkte basierend auf Backend/Frontend-Implementierungen
  const endpoints = [
    { path: `/api/worktime/stop`, method: 'POST' },
    { path: `/api/worktime/${worktimeId}/stop`, method: 'PUT' },
    { path: `/api/worktime/${worktimeId}/stop`, method: 'PATCH' },
    { path: `/api/worktime/${worktimeId}`, method: 'PUT', data: { endTime } },
    { path: `/api/worktime/stop/3`, method: 'PUT' }  // 3 ist die ID für den cursor-Benutzer
  ];
  
  // Jeden Endpunkt testen
  endpoints.forEach((endpoint, index) => {
    setTimeout(() => {
      console.log(`\nTeste Endpunkt ${index + 1}/${endpoints.length}: ${endpoint.method} ${endpoint.path}`);
      
      const data = JSON.stringify(endpoint.data || { endTime });
      
      const stopOptions = {
        hostname: 'localhost',
        port: 5000,
        path: endpoint.path,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'Authorization': `Bearer ${token}`
        }
      };
      
      const stopReq = https.request(stopOptions, (res) => {
        console.log(`Endpunkt ${index + 1} Status Code: ${res.statusCode}`);
        
        let stopResponseData = '';
        
        res.on('data', (chunk) => {
          stopResponseData += chunk;
        });
        
        res.on('end', () => {
          console.log(`Endpunkt ${index + 1} Antwort:`, stopResponseData);
          if (res.statusCode === 200) {
            console.log(`✅ Endpunkt ${index + 1} erfolgreich!`);
          }
        });
      });
      
      stopReq.on('error', (error) => {
        console.error(`Fehler bei Endpunkt ${index + 1}:`, error);
      });
      
      stopReq.write(data);
      stopReq.end();
    }, index * 1000); // Verzögerung zwischen den Anfragen
  });
} 