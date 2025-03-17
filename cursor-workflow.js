const https = require('http');

// Konfigurationen
const config = {
  hostname: 'localhost',
  port: 5000,
  auth: {
    username: 'cursor',
    password: 'Cursor123!'
  }
};

// Globale Variablen
let authToken = null;
let worktimeId = null;

// Hilfsfunktion für HTTP-Requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (error) {
          reject(new Error(`Fehler beim Parsen der Antwort: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// 1. Benutzeranmeldung
async function login() {
  console.log('1. Starte Login-Prozess...');
  
  const loginData = JSON.stringify({
    username: config.auth.username,
    password: config.auth.password
  });
  
  const loginOptions = {
    hostname: config.hostname,
    port: config.port,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };
  
  try {
    const response = await makeRequest(loginOptions, loginData);
    
    if (response.statusCode === 200 && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login erfolgreich. Token erhalten.');
      return true;
    } else {
      console.error('❌ Login fehlgeschlagen:', response.data.message || 'Unbekannter Fehler');
      return false;
    }
  } catch (error) {
    console.error('❌ Login-Fehler:', error.message);
    return false;
  }
}

// Neue Funktion: Aktive Zeiterfassung prüfen und ID holen
async function getActiveWorktime() {
  console.log('Prüfe auf laufende Zeiterfassung...');
  
  const options = {
    hostname: config.hostname,
    port: config.port,
    path: '/api/worktime/active', // Annahme: Es gibt einen Endpoint für aktive Zeiterfassungen
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 200 && response.data && response.data.id) {
      console.log(`ℹ️ Aktive Zeiterfassung gefunden. ID: ${response.data.id}`);
      return response.data.id;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Fehler beim Prüfen auf aktive Zeiterfassung:', error.message);
    return null;
  }
}

// 2. Zeiterfassung starten
async function startWorktime() {
  console.log('2. Starte Zeiterfassung...');
  
  // Prüfen, ob bereits eine Zeiterfassung läuft
  const activeWorktimeId = await getActiveWorktime();
  
  if (activeWorktimeId) {
    console.log('Eine Zeiterfassung läuft bereits. Verwende die bestehende Zeiterfassung.');
    worktimeId = activeWorktimeId;
    return true;
  }
  
  // Niederlassungen abrufen
  const branchOptions = {
    hostname: config.hostname,
    port: config.port,
    path: '/api/branches',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    // Branches abrufen
    const branchResponse = await makeRequest(branchOptions);
    
    if (branchResponse.statusCode !== 200 || !branchResponse.data.length) {
      console.error('❌ Keine Niederlassungen gefunden oder Fehler beim Abruf');
      return false;
    }
    
    const branchId = branchResponse.data[0].id;
    console.log(`ℹ️ Verwende Niederlassung: ${branchResponse.data[0].name} (ID: ${branchId})`);
    
    // Zeiterfassung starten
    const starttimeData = JSON.stringify({
      branchId: branchId,
      startTime: new Date().toISOString()
    });
    
    const worktimeOptions = {
      hostname: config.hostname,
      port: config.port,
      path: '/api/worktime/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': starttimeData.length,
        'Authorization': `Bearer ${authToken}`
      }
    };
    
    const worktimeResponse = await makeRequest(worktimeOptions, starttimeData);
    
    if (worktimeResponse.statusCode === 201) {
      worktimeId = worktimeResponse.data.id;
      console.log(`✅ Zeiterfassung gestartet. Worktime-ID: ${worktimeId}`);
      return true;
    } else {
      console.error('❌ Fehler beim Starten der Zeiterfassung:', worktimeResponse.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Fehler beim Starten der Zeiterfassung:', error.message);
    return false;
  }
}

// 3. Tasks abrufen, sortiert nach Status und Fälligkeitsdatum
async function getTasks(status) {
  console.log(`3. Rufe Tasks mit Status "${status}" ab...`);
  
  const tasksOptions = {
    hostname: config.hostname,
    port: config.port,
    path: '/api/tasks', // Bestätigter Endpoint aus den Routes
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    const response = await makeRequest(tasksOptions);
    
    if (response.statusCode === 200) {
      // Filtere Tasks für den aktuellen Benutzer und gewünschten Status
      // Wichtig: In der Datenbank ist das Feld "responsibleId" für den zugewiesenen Benutzer
      const myTasks = response.data.filter(task => 
        task.responsibleId === 3 && // responsibleId=3 ist für den 'cursor' Benutzer basierend auf der Registration
        task.status === status
      );
      
      // Sortiere nach Fälligkeitsdatum (aufsteigend)
      const sortedTasks = myTasks.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date(9999, 11, 31);
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date(9999, 11, 31);
        return dateA - dateB;
      });
      
      console.log(`ℹ️ ${sortedTasks.length} Tasks mit Status "${status}" gefunden.`);
      return sortedTasks;
    } else {
      console.error('❌ Fehler beim Abrufen der Tasks:', response.data);
      return [];
    }
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Tasks:', error.message);
    return [];
  }
}

// 4. Task-Status auf "quality_control" setzen
async function updateTaskStatus(taskId) {
  console.log(`4. Setze Status für Task ${taskId} auf "quality_control"...`);
  
  const updateData = JSON.stringify({
    status: 'quality_control' // Korrekter Status aus dem Prisma-Schema
  });
  
  const updateOptions = {
    hostname: config.hostname,
    port: config.port,
    path: `/api/tasks/${taskId}`, // Bestätigter Endpoint aus den Routes
    method: 'PUT', // Methode ist PUT laut Routes
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': updateData.length,
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    const response = await makeRequest(updateOptions, updateData);
    
    if (response.statusCode === 200) {
      console.log(`✅ Status für Task ${taskId} erfolgreich aktualisiert.`);
      return true;
    } else {
      console.error(`❌ Fehler beim Aktualisieren des Task-Status:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`❌ Fehler beim Aktualisieren des Task-Status:`, error.message);
    return false;
  }
}

// 5. Zeiterfassung stoppen
async function stopWorktime() {
  console.log('5. Stoppe Zeiterfassung...');
  
  if (!worktimeId) {
    console.error('❌ Keine aktive Zeiterfassung gefunden.');
    return false;
  }
  
  const stopData = JSON.stringify({
    endTime: new Date().toISOString()
  });
  
  // Basierend auf unseren Tests verwenden wir den Endpunkt PUT /api/worktime/{id}
  const stopOptions = {
    hostname: config.hostname,
    port: config.port,
    path: `/api/worktime/${worktimeId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': stopData.length,
      'Authorization': `Bearer ${authToken}`
    }
  };
  
  try {
    const response = await makeRequest(stopOptions, stopData);
    
    if (response.statusCode === 200) {
      console.log('✅ Zeiterfassung erfolgreich gestoppt.');
      return true;
    } else {
      console.error('❌ Fehler beim Stoppen der Zeiterfassung:', response.data);
      
      // Versuch mit alternativem Endpunkt
      if (response.statusCode === 404) {
        console.log('Versuche alternativen Endpunkt...');
        
        const altStopOptions = {
          hostname: config.hostname,
          port: config.port,
          path: '/api/worktime/stop',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': stopData.length,
            'Authorization': `Bearer ${authToken}`
          }
        };
        
        const altResponse = await makeRequest(altStopOptions, stopData);
        
        if (altResponse.statusCode === 200) {
          console.log('✅ Zeiterfassung erfolgreich mit alternativem Endpunkt gestoppt.');
          return true;
        } else {
          console.error('❌ Fehler auch beim alternativen Endpunkt:', altResponse.data);
          return false;
        }
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Fehler beim Stoppen der Zeiterfassung:', error.message);
    return false;
  }
}

// Hauptfunktion zur Ausführung des Workflows
async function runWorkflow() {
  console.log('🚀 Starte Cursor-Workflow...');
  
  // 1. Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('⛔ Workflow abgebrochen: Login fehlgeschlagen.');
    return;
  }
  
  // 2. Zeiterfassung starten
  const worktimeStarted = await startWorktime();
  if (!worktimeStarted) {
    console.error('⛔ Workflow abgebrochen: Zeiterfassung konnte nicht gestartet werden.');
    return;
  }
  
  // 3. Tasks bearbeiten
  // Zuerst "in_progress" Tasks (korrekter Status aus dem Prisma-Schema)
  const inProgressTasks = await getTasks('in_progress');
  for (const task of inProgressTasks) {
    console.log(`\n📋 Bearbeite Task: ${task.id} - ${task.title}`);
    console.log(`Beschreibung: ${task.description || 'Keine Beschreibung vorhanden'}`);
    console.log(`Fälligkeitsdatum: ${task.dueDate || 'Nicht gesetzt'}`);
    
    // Hier würde normalerweise die eigentliche Task-Bearbeitung stattfinden
    console.log('⚙️ Task wird ausgeführt...');
    
    // Nach Bearbeitung Status aktualisieren
    await updateTaskStatus(task.id);
  }
  
  // Dann "open" Tasks, wenn keine "in_progress" mehr vorhanden sind
  if (inProgressTasks.length === 0) {
    console.log('\nKeine "in_progress" Tasks mehr vorhanden. Prüfe auf "open" Tasks...');
    
    const openTasks = await getTasks('open');
    for (const task of openTasks) {
      console.log(`\n📋 Bearbeite Task: ${task.id} - ${task.title}`);
      console.log(`Beschreibung: ${task.description || 'Keine Beschreibung vorhanden'}`);
      console.log(`Fälligkeitsdatum: ${task.dueDate || 'Nicht gesetzt'}`);
      
      // Hier würde normalerweise die eigentliche Task-Bearbeitung stattfinden
      console.log('⚙️ Task wird ausgeführt...');
      
      // Nach Bearbeitung Status aktualisieren
      await updateTaskStatus(task.id);
    }
    
    if (openTasks.length === 0) {
      console.log('Keine "open" Tasks gefunden.');
    }
  }
  
  // 4. Zeiterfassung stoppen, wenn alle Tasks erledigt sind
  await stopWorktime();
  
  console.log('\n✨ Workflow abgeschlossen!');
}

// Skript ausführen
runWorkflow().catch(error => {
  console.error('❌ Unerwarteter Fehler:', error);
  
  // Bei Fehler versuchen, die Zeiterfassung zu stoppen, falls gestartet
  if (authToken && worktimeId) {
    console.log('Versuche Zeiterfassung zu stoppen...');
    stopWorktime().catch(err => {
      console.error('Fehler beim Stoppen der Zeiterfassung:', err.message);
    });
  }
}); 