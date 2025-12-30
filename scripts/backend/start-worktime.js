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
      
      // Mit dem Token die Zeiterfassung starten
      startWorktime(token);
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

// Funktion zum Starten der Zeiterfassung
function startWorktime(token) {
  // Hole zuerst alle Niederlassungen, um eine verfügbare zu verwenden
  const branchOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/branches',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const branchReq = https.request(branchOptions, (res) => {
    console.log(`Niederlassungs-Abruf Status Code: ${res.statusCode}`);
    
    let branchData = '';
    
    res.on('data', (chunk) => {
      branchData += chunk;
    });
    
    res.on('end', () => {
      try {
        const branches = JSON.parse(branchData);
        console.log('Niederlassungen erhalten:', branches.length);
        
        if (branches.length > 0) {
          // Die erste Niederlassung verwenden
          const branchId = branches[0].id;
          console.log('Verwende Niederlassung:', branches[0].name, '(ID:', branchId, ')');
          
          // Zeiterfassung starten
          const starttimeData = JSON.stringify({
            branchId: branchId,
            startTime: new Date()
          });
          
          const worktimeOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/worktime/start',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': starttimeData.length,
              'Authorization': `Bearer ${token}`
            }
          };
          
          const worktimeReq = https.request(worktimeOptions, (res) => {
            console.log(`Zeiterfassung Status Code: ${res.statusCode}`);
            
            let worktimeResponseData = '';
            
            res.on('data', (chunk) => {
              worktimeResponseData += chunk;
            });
            
            res.on('end', () => {
              console.log('Zeiterfassung Antwort:');
              console.log(worktimeResponseData);
            });
          });
          
          worktimeReq.on('error', (error) => {
            console.error('Fehler beim Starten der Zeiterfassung:', error);
          });
          
          worktimeReq.write(starttimeData);
          worktimeReq.end();
        } else {
          console.error('Keine Niederlassungen gefunden!');
        }
      } catch (error) {
        console.error('Fehler beim Parsen der Niederlassungsdaten:', error);
      }
    });
  });
  
  branchReq.on('error', (error) => {
    console.error('Fehler beim Abrufen der Niederlassungen:', error);
  });
  
  branchReq.end();
} 