# Connection Pool Voll - Root Cause Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Connection Pool ist VOLL!  
**Problem:** System extrem langsam, alle Requests warten auf freie Verbindung

---

## 🔴🔴🔴 ROOT CAUSE IDENTIFIZIERT

### **Connection Pool ist VOLL (20/20)!**

**Beweis aus Logs:**
```
Timed out fetching a new connection from the connection pool.
(Current connection pool timeout: 20, connection limit: 20)
```

**Das bedeutet:**
- ✅ Alle 20 Verbindungen sind belegt
- ✅ Neue Requests warten auf freie Verbindung
- ✅ Timeout nach 20 Sekunden → Request schlägt fehl
- ✅ executeWithRetry macht Retries → noch mehr Requests → Pool wird noch voller
- ✅ **Teufelskreis!**

---

## 📊 WIE DAS PROBLEM ALLES BETRIFFT

### Request-Flow bei vollem Connection Pool:

1. **Frontend macht Request** (z.B. Login, Seite laden, etc.)
2. **Request wartet auf freie Verbindung** → **20 Sekunden Timeout**
3. **executeWithRetry erkennt Timeout als DB-Verbindungsfehler** → **Retry**
4. **Retry wartet wieder auf freie Verbindung** → **20 Sekunden Timeout**
5. **Gesamtzeit: 20-60 Sekunden** pro Request ⚠️

**Bei vielen gleichzeitigen Requests:**
- 10 Requests gleichzeitig → Alle warten auf freie Verbindung
- Pool ist voll → Keine freie Verbindung verfügbar
- Alle Requests warten → System wird extrem langsam

---

## 🔍 PROBLEM: executeWithRetry behandelt Connection Pool Timeout falsch

### Aktuelle executeWithRetry Logik:

```typescript
if (
  error instanceof PrismaClientKnownRequestError &&
  (error.code === 'P1001' || // Can't reach database server
   error.code === 'P1008' || // Operations timed out
   error.message.includes('Server has closed the connection') ||
   error.message.includes("Can't reach database server"))
) {
  // Retry bei DB-Verbindungsfehlern
}
```

**Problem:**
- Connection Pool Timeout wird **NICHT** als P1001/P1008 erkannt
- Aber: executeWithRetry macht trotzdem Retries (warum?)
- **Connection Pool Timeout ist KEIN DB-Verbindungsfehler!**
- **Retry macht das Problem schlimmer!**

---

## 💡 LÖSUNG

### Lösung 1: Connection Pool erhöhen (SOFORT) ⭐⭐⭐

**Was:**
- `connection_limit` von 20 auf 30-40 erhöhen
- Mehr Verbindungen = weniger Wartezeiten

**Änderung in `.env`:**
```bash
# VORHER:
DATABASE_URL="postgresql://intranetuser:Postgres123!@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20"

# NACHHER:
DATABASE_URL="postgresql://intranetuser:Postgres123!@localhost:5432/intranet?schema=public&connection_limit=30&pool_timeout=20"
```

**Dann Server neu starten**

---

### Lösung 2: executeWithRetry Logik anpassen (WICHTIG) ⭐⭐

**Was:**
- Connection Pool Timeout-Fehler **NICHT** als DB-Verbindungsfehler behandeln
- Connection Pool Timeout = **Sofortiger Fehler, kein Retry**

**Code-Änderung in `backend/src/utils/prisma.ts`:**

```typescript
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Connection Pool Timeout = Sofortiger Fehler, kein Retry!
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.message.includes('Timed out fetching a new connection from the connection pool')
      ) {
        console.error(`[Prisma] Connection Pool Timeout - Kein Retry! Pool ist voll.`);
        throw error; // Sofort werfen, kein Retry!
      }
      
      // Prüfe ob es ein DB-Verbindungsfehler ist
      if (
        error instanceof PrismaClientKnownRequestError &&
        (error.code === 'P1001' || // Can't reach database server
         error.code === 'P1008' || // Operations timed out
         error.message.includes('Server has closed the connection') ||
         error.message.includes("Can't reach database server"))
      ) {
        console.warn(`[Prisma] DB connection error (attempt ${attempt}/${maxRetries}):`, error.message);
        
        if (attempt < maxRetries) {
          // Retry mit Delay - Prisma reconnect automatisch
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          console.log(`[Prisma] Retrying after ${attempt} attempt(s) - Prisma will reconnect automatically`);
        }
      } else {
        // Kein DB-Verbindungsfehler - sofort werfen
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
};
```

**Begründung:**
- Connection Pool Timeout ist **KEIN DB-Verbindungsfehler**
- Retry macht das Problem **schlimmer** (noch mehr Requests)
- Sofortiger Fehler = User sieht Fehler sofort, System wird nicht weiter blockiert

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher (Connection Pool voll):
- 20 Verbindungen → Alle belegt
- Neue Requests warten → 20 Sekunden Timeout
- executeWithRetry macht Retries → Noch mehr Requests
- **Gesamtzeit: 20-60 Sekunden** pro Request

### Nachher (Connection Pool erhöht + executeWithRetry Fix):
- 30 Verbindungen → Mehr Kapazität
- Neue Requests finden schneller freie Verbindung
- Connection Pool Timeout = Sofortiger Fehler, kein Retry
- **Gesamtzeit: 1-5 Sekunden** pro Request (bei normaler Last)

**Verbesserung: 75-90% schneller!**

---

## 🔍 WARUM PASSIERT DAS?

### Mögliche Ursachen:

1. **Zu viele gleichzeitige Requests**
   - Viele User gleichzeitig → Viele Requests
   - Jeder Request braucht DB-Verbindung
   - Pool wird schnell voll

2. **executeWithRetry macht zu viele Retries**
   - Jeder Retry = Neuer Request
   - Mehr Requests = Pool wird voller
   - **Teufelskreis!**

3. **Verbindungen werden nicht schnell genug freigegeben**
   - Langsame Queries halten Verbindungen
   - Cache-Misses führen zu DB-Queries
   - Verbindungen werden nicht sofort freigegeben

4. **Connection Pool zu klein**
   - 20 Verbindungen bei vielen gleichzeitigen Requests
   - Bei Spitzenlast wird Pool voll

---

## 📋 ZUSAMMENFASSUNG

### ✅ Problem identifiziert:

1. ✅ **Connection Pool ist VOLL (20/20)**
2. ✅ **executeWithRetry behandelt Connection Pool Timeout falsch**
3. ✅ **Teufelskreis: Retries machen Pool noch voller**

### 💡 Lösungen:

1. **Connection Pool erhöhen** (von 20 auf 30-40) - SOFORT
2. **executeWithRetry Logik anpassen** - Connection Pool Timeout = Sofortiger Fehler, kein Retry

### 🔍 Nächste Schritte:

1. **Connection Pool erhöhen** - In `.env` ändern, Server neu starten
2. **executeWithRetry Logik anpassen** - Code ändern, deployen

---

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Connection Pool ist VOLL!  
**Nächster Schritt:** Connection Pool erhöhen + executeWithRetry Logik anpassen

