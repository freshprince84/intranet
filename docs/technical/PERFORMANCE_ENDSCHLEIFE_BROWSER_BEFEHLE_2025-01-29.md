# Performance: Endlosschleife - Browser-Console-Befehle (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE - Browser-Console-Befehle  
**Zweck:** Problem messen und analysieren

---

## 🔍 BROWSER-CONSOLE-BEFEHLE

### 1. Log-Count messen (pro Sekunde)

**Befehl:**
```javascript
// Log-Counter initialisieren
let logCount = 0;
let errorCount = 0;
let warnCount = 0;
const startTime = Date.now();

// Console-Methoden überschreiben (temporär)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  logCount++;
  originalLog.apply(console, args);
};

console.error = function(...args) {
  errorCount++;
  originalError.apply(console, args);
};

console.warn = function(...args) {
  warnCount++;
  originalWarn.apply(console, args);
};

// Nach 10 Sekunden ausgeben
setTimeout(() => {
  const duration = (Date.now() - startTime) / 1000;
  console.log('📊 LOG-STATISTIK (10 Sekunden):');
  console.log(`  Logs: ${logCount} (${(logCount/duration).toFixed(1)}/s)`);
  console.log(`  Errors: ${errorCount} (${(errorCount/duration).toFixed(1)}/s)`);
  console.log(`  Warnings: ${warnCount} (${(warnCount/duration).toFixed(1)}/s)`);
  console.log(`  Total: ${logCount + errorCount + warnCount} (${((logCount + errorCount + warnCount)/duration).toFixed(1)}/s)`);
  
  // Zurücksetzen
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
}, 10000);
```

**Erwartetes Ergebnis:**
- Wenn > 100 Logs/Sekunde → Problem bestätigt
- Wenn > 1000 Logs/Sekunde → KRITISCH

---

### 2. API-Request-Count messen

**Befehl:**
```javascript
// API-Request-Counter
let apiRequestCount = 0;
let apiRequestUrls = new Map();

// Axios-Interceptor hinzufügen (temporär)
const axios = window.axios || require('axios');
const originalRequest = axios.defaults.adapter || axios.Axios.prototype.request;

// Request-Interceptor
axios.interceptors.request.use((config) => {
  apiRequestCount++;
  const url = config.url || config.baseURL + config.url;
  apiRequestUrls.set(url, (apiRequestUrls.get(url) || 0) + 1);
  return config;
});

// Nach 10 Sekunden ausgeben
setTimeout(() => {
  console.log('📊 API-REQUEST-STATISTIK (10 Sekunden):');
  console.log(`  Total Requests: ${apiRequestCount}`);
  console.log(`  Requests/Sekunde: ${(apiRequestCount/10).toFixed(1)}`);
  console.log('  Top 10 Endpoints:');
  const sorted = Array.from(apiRequestUrls.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  sorted.forEach(([url, count]) => {
    console.log(`    ${url}: ${count} (${(count/10).toFixed(1)}/s)`);
  });
}, 10000);
```

**Alternative (einfacher):**
```javascript
// Network-Tab auslesen (wenn möglich)
const entries = performance.getEntriesByType('resource');
const apiRequests = entries.filter(e => e.name.includes('/api/'));
console.log(`API-Requests (letzte ${entries.length} Requests):`, apiRequests.length);
```

---

### 3. DEBUGAUSGABE-Logs zählen

**Befehl:**
```javascript
// DEBUGAUSGABE-Log-Counter
let debugLogCount = 0;
const debugLogs = [];

const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  if (message.includes('DEBUGAUSGABE')) {
    debugLogCount++;
    debugLogs.push({
      time: Date.now(),
      message: message.substring(0, 100) // Erste 100 Zeichen
    });
  }
  originalLog.apply(console, args);
};

// Nach 10 Sekunden ausgeben
setTimeout(() => {
  console.log('📊 DEBUGAUSGABE-STATISTIK (10 Sekunden):');
  console.log(`  Total: ${debugLogCount} (${(debugLogCount/10).toFixed(1)}/s)`);
  console.log('  Letzte 10 Logs:');
  debugLogs.slice(-10).forEach((log, i) => {
    console.log(`    ${i+1}. ${log.message}`);
  });
  
  // Zurücksetzen
  console.log = originalLog;
}, 10000);
```

---

### 4. Memory-Usage messen

**Befehl:**
```javascript
// Memory-Usage-Tracker
const memoryReadings = [];

function measureMemory() {
  if (performance.memory) {
    memoryReadings.push({
      time: Date.now(),
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    });
  }
}

// Alle 2 Sekunden messen
const interval = setInterval(measureMemory, 2000);

// Nach 20 Sekunden ausgeben
setTimeout(() => {
  clearInterval(interval);
  console.log('📊 MEMORY-STATISTIK (20 Sekunden):');
  if (memoryReadings.length > 0) {
    const first = memoryReadings[0];
    const last = memoryReadings[memoryReadings.length - 1];
    const growth = last.used - first.used;
    const growthMB = (growth / 1024 / 1024).toFixed(2);
    const growthPerSec = (growth / 20 / 1024 / 1024).toFixed(2);
    
    console.log(`  Start: ${(first.used / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Ende: ${(last.used / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Wachstum: ${growthMB} MB (${growthPerSec} MB/s)`);
    console.log(`  Limit: ${(first.limit / 1024 / 1024).toFixed(2)} MB`);
    
    if (growth > 10 * 1024 * 1024) { // > 10MB Wachstum
      console.warn('⚠️ KRITISCH: Memory wächst zu schnell!');
    }
  } else {
    console.warn('⚠️ performance.memory nicht verfügbar');
  }
}, 20000);
```

---

### 5. React Re-Render-Count (mit React DevTools)

**Befehl (nur wenn React DevTools installiert):**
```javascript
// React DevTools Profiler API (experimentell)
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  console.log('React DevTools gefunden');
  // Weitere Analyse möglich
} else {
  console.warn('React DevTools nicht gefunden - bitte manuell prüfen');
}
```

**Alternative: Manuell mit React DevTools:**
1. React DevTools öffnen
2. Profiler-Tab → Record starten
3. 10 Sekunden warten
4. Record stoppen
5. Re-Render-Count prüfen

---

### 6. useEffect-Hook-Analyse

**Befehl:**
```javascript
// useEffect-Counter (experimentell)
let useEffectCount = 0;
const useEffectCalls = [];

// React internes Hook-System (nur für Analyse)
const React = window.React || require('react');
if (React && React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  console.log('React internals gefunden');
} else {
  console.warn('React internals nicht verfügbar - manuelle Code-Analyse nötig');
}
```

**Alternative: Code-Analyse**
- Alle `useEffect` Hooks in `Worktracker.tsx` prüfen
- Alle `useEffect` Hooks in `SavedFilterTags.tsx` prüfen
- Dependencies prüfen

---

### 7. WebSocket-Verbindung prüfen

**Befehl:**
```javascript
// WebSocket-Verbindungen prüfen
const wsConnections = [];
let wsMessageCount = 0;

// WebSocket-Prototyp überschreiben (temporär)
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(...args) {
  const ws = new OriginalWebSocket(...args);
  wsConnections.push({
    url: args[0],
    readyState: ws.readyState,
    createdAt: Date.now()
  });
  
  const originalSend = ws.send;
  ws.send = function(data) {
    wsMessageCount++;
    originalSend.apply(ws, arguments);
  };
  
  return ws;
};

// Nach 10 Sekunden ausgeben
setTimeout(() => {
  console.log('📊 WEBSOCKET-STATISTIK (10 Sekunden):');
  console.log(`  Verbindungen: ${wsConnections.length}`);
  console.log(`  Nachrichten: ${wsMessageCount} (${(wsMessageCount/10).toFixed(1)}/s)`);
  wsConnections.forEach((conn, i) => {
    console.log(`  ${i+1}. ${conn.url} (State: ${conn.readyState})`);
  });
}, 10000);
```

---

## 📊 VOLLSTÄNDIGE ANALYSE (Alle Befehle kombiniert)

**Befehl:**
```javascript
// Vollständige Analyse starten
console.log('🔍 Starte vollständige Performance-Analyse...');

// 1. Log-Counter
let logCount = 0, errorCount = 0, warnCount = 0, debugCount = 0;
const startTime = Date.now();
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  logCount++;
  const msg = args.join(' ');
  if (msg.includes('DEBUGAUSGABE')) debugCount++;
  originalLog.apply(console, args);
};

console.error = function(...args) {
  errorCount++;
  originalError.apply(console, args);
};

console.warn = function(...args) {
  warnCount++;
  originalWarn.apply(console, args);
};

// 2. Memory-Tracker
const memoryReadings = [];
if (performance.memory) {
  const memInterval = setInterval(() => {
    memoryReadings.push({
      time: Date.now(),
      used: performance.memory.usedJSHeapSize
    });
  }, 2000);
  
  setTimeout(() => clearInterval(memInterval), 20000);
}

// 3. WebSocket-Tracker
let wsCount = 0, wsMsgCount = 0;
const OriginalWS = window.WebSocket;
window.WebSocket = function(...args) {
  wsCount++;
  const ws = new OriginalWS(...args);
  const origSend = ws.send;
  ws.send = function(...args) {
    wsMsgCount++;
    origSend.apply(ws, args);
  };
  return ws;
};

// Nach 20 Sekunden: Ergebnisse ausgeben
setTimeout(() => {
  const duration = 20;
  console.log('\n📊 VOLLSTÄNDIGE PERFORMANCE-ANALYSE:');
  console.log('═'.repeat(50));
  
  // Logs
  console.log(`\n📝 LOGS (${duration}s):`);
  console.log(`  Total: ${logCount + errorCount + warnCount} (${((logCount + errorCount + warnCount)/duration).toFixed(1)}/s)`);
  console.log(`  Logs: ${logCount} (${(logCount/duration).toFixed(1)}/s)`);
  console.log(`  Errors: ${errorCount} (${(errorCount/duration).toFixed(1)}/s)`);
  console.log(`  Warnings: ${warnCount} (${(warnCount/duration).toFixed(1)}/s)`);
  console.log(`  DEBUGAUSGABE: ${debugCount} (${(debugCount/duration).toFixed(1)}/s)`);
  
  // Memory
  if (memoryReadings.length > 0) {
    const first = memoryReadings[0];
    const last = memoryReadings[memoryReadings.length - 1];
    const growth = last.used - first.used;
    console.log(`\n💾 MEMORY (${duration}s):`);
    console.log(`  Start: ${(first.used / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Ende: ${(last.used / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Wachstum: ${(growth / 1024 / 1024).toFixed(2)} MB (${(growth / duration / 1024 / 1024).toFixed(2)} MB/s)`);
  }
  
  // WebSocket
  console.log(`\n🔌 WEBSOCKET:`);
  console.log(`  Verbindungen: ${wsCount}`);
  console.log(`  Nachrichten: ${wsMsgCount} (${(wsMsgCount/duration).toFixed(1)}/s)`);
  
  // Bewertung
  console.log('\n⚠️ BEWERTUNG:');
  if (debugCount > 1000) {
    console.error('  🔴 KRITISCH: Zu viele DEBUGAUSGABE-Logs!');
  }
  if (memoryReadings.length > 0 && (memoryReadings[memoryReadings.length - 1].used - memoryReadings[0].used) > 50 * 1024 * 1024) {
    console.error('  🔴 KRITISCH: Memory wächst zu schnell!');
  }
  if (logCount + errorCount + warnCount > 5000) {
    console.error('  🔴 KRITISCH: Zu viele Logs insgesamt!');
  }
  
  // Zurücksetzen
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
  window.WebSocket = OriginalWS;
  
  console.log('\n✅ Analyse abgeschlossen');
}, 20000);
```

---

## 🎯 ERGEBNISSE INTERPRETIEREN

### Kritische Werte:
- **> 100 Logs/Sekunde** → Problem
- **> 1000 Logs/Sekunde** → KRITISCH
- **> 10 MB Memory-Wachstum/20s** → Memory-Leak
- **> 100 API-Requests/10s** → Endlosschleife möglich

### Nächste Schritte:
1. Ergebnisse dokumentieren
2. Root Cause identifizieren
3. Lösungs-Plan erstellen
4. **Auf Bestätigung warten**
5. **Dann erst umsetzen**

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 ANALYSE - Browser-Console-Befehle  
**Nächster Schritt:** Befehle in Browser-Console ausführen

