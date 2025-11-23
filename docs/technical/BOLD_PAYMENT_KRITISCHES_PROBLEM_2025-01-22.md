# Bold Payment - Kritisches Problem identifiziert

**Datum**: 2025-01-22  
**Status**: 🔴 KRITISCH - Root Cause identifiziert

## Problembeschreibung

Payment-Link-Erstellung schlägt plötzlich wieder fehl, obwohl Keys unverändert sind. Dies ist ein wiederkehrendes Problem.

## 🔴 KRITISCHES PROBLEM IDENTIFIZIERT

### Problem: Falsche baseURL wird verwendet wenn loadSettings fehlschlägt

**Code-Stelle**: `backend/src/services/boldPaymentService.ts`

**Problem-Flow**:

1. **Constructor** (Zeile 48-59):
   ```typescript
   constructor(organizationId?: number, branchId?: number) {
     // ...
     this.axiosInstance = axios.create({
       baseURL: 'https://sandbox.bold.co', // ❌ FALSCH: Diese URL existiert nicht!
       timeout: 30000
     });
   }
   ```
   - Erstellt `axiosInstance` mit **falscher URL** `https://sandbox.bold.co`
   - Diese URL existiert nicht (DNS-Fehler: `ENOTFOUND`)

2. **loadSettings()** (Zeile 65-132):
   - Setzt `this.apiUrl = 'https://integrations.api.bold.co'` (Zeile 85, 126)
   - Ruft `this.axiosInstance = this.createAxiosInstance()` auf (Zeile 86, 127)
   - **ABER**: Wenn `loadSettings()` fehlschlägt, wird `this.apiUrl` **NICHT** gesetzt

3. **createPaymentLink()** (Zeile 217-378):
   - Ruft `loadSettings()` auf (Zeile 224-225)
   - **ABER**: Wenn `loadSettings()` fehlschlägt, bleibt die **falsche axiosInstance** aus dem Constructor
   - Request geht an `https://sandbox.bold.co` → **DNS-Fehler**

4. **createAxiosInstance()** (Zeile 154-203):
   - Verwendet `baseURL: this.apiUrl` (Zeile 156)
   - **ABER**: Wenn `this.apiUrl` nicht gesetzt ist (weil `loadSettings()` fehlgeschlagen ist), ist `this.apiUrl` **undefined**
   - Das führt zu `baseURL: undefined` → **Fehler**

### Warum schlägt loadSettings() möglicherweise fehl?

**Mögliche Ursachen**:

1. **Datenbank-Verbindungsproblem**:
   - `prisma.branch.findUnique()` oder `prisma.organization.findUnique()` schlägt fehl
   - Connection Pool ausgeschöpft
   - Timeout

2. **Verschlüsselungsproblem**:
   - `decryptBranchApiSettings()` oder `decryptApiSettings()` schlägt fehl
   - `ENCRYPTION_KEY` fehlt oder ist falsch
   - Settings sind nicht verschlüsselt, aber Code versucht zu entschlüsseln

3. **Settings fehlen**:
   - `boldPaymentSettings` fehlt in Branch oder Organization
   - `apiKey` oder `merchantId` fehlt
   - Error wird geworfen (Zeile 113, 120, 131)

4. **Race Condition**:
   - `loadSettings()` wird mehrfach parallel aufgerufen
   - `this.apiUrl` wird nicht atomar gesetzt

## Code-Analyse - Konkrete Probleme

### Problem 1: apiUrl wird nicht initialisiert

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 38)

```typescript
private apiUrl: string; // ❌ NICHT initialisiert!
```

**Problem**: Wenn `loadSettings()` fehlschlägt, ist `this.apiUrl` `undefined`. Wenn dann `createAxiosInstance()` aufgerufen wird, wird `baseURL: undefined` verwendet.

### Problem 2: Falsche baseURL im Constructor

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 55-58)

```typescript
this.axiosInstance = axios.create({
  baseURL: 'https://sandbox.bold.co', // ❌ Diese URL existiert nicht!
  timeout: 30000
});
```

**Problem**: Diese URL existiert nicht (DNS-Fehler: `ENOTFOUND`). Wenn `loadSettings()` fehlschlägt, bleibt diese falsche Instanz.

### Problem 3: loadSettings() kann fehlschlagen ohne dass es bemerkt wird

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 65-132)

**Mögliche Fehler**:
- Zeile 113: `throw new Error('Bold Payment ist nicht für Organisation ${this.organizationId} konfiguriert')`
- Zeile 120: `throw new Error('Bold Payment API Key ist nicht für Organisation ${this.organizationId} konfiguriert')`
- Zeile 131: `throw new Error('Bold Payment Settings nicht gefunden (weder Branch noch Organization)')`

**Problem**: Wenn einer dieser Fehler geworfen wird, wird `this.apiUrl` **NICHT** gesetzt, aber die falsche `axiosInstance` aus dem Constructor bleibt bestehen.

### Problem 4: createPaymentLink() verwendet möglicherweise falsche axiosInstance

**Code-Stelle**: `backend/src/services/boldPaymentService.ts` (Zeile 223-226, 283)

**Flow**:
1. `createPaymentLink()` ruft `loadSettings()` auf (Zeile 224-225)
2. Wenn `loadSettings()` fehlschlägt, wird Error geworfen
3. **ABER**: Wenn `loadSettings()` erfolgreich ist, aber `this.axiosInstance` nicht korrekt aktualisiert wurde, wird die falsche Instanz verwendet

**Problem**: Es gibt keine Garantie, dass `this.axiosInstance` korrekt aktualisiert wurde, wenn `loadSettings()` erfolgreich war.

## Mögliche Root Causes

### Root Cause 1: loadSettings() schlägt fehl wegen Datenbank-Problem

**Beweis**:
- Datenbank-Verbindungsprobleme sind bekannt (siehe `PERFORMANCE_ANALYSE_ERGEBNIS.md`)
- Connection Pool könnte ausgeschöpft sein
- Timeout könnte überschritten werden

**Prüfung erforderlich**:
- Server-Logs prüfen auf Prisma-Fehler
- Prüfen ob `prisma.branch.findUnique()` oder `prisma.organization.findUnique()` fehlschlägt

### Root Cause 2: loadSettings() schlägt fehl wegen Verschlüsselungsproblem

**Beweis**:
- `decryptBranchApiSettings()` oder `decryptApiSettings()` könnte fehlschlagen
- `ENCRYPTION_KEY` könnte fehlen oder falsch sein

**Prüfung erforderlich**:
- Server-Logs prüfen auf Verschlüsselungsfehler
- Prüfen ob `ENCRYPTION_KEY` gesetzt ist

### Root Cause 3: Settings fehlen in Datenbank

**Beweis**:
- Error wird geworfen wenn Settings fehlen (Zeile 113, 120, 131)
- Settings könnten gelöscht oder nicht gespeichert worden sein

**Prüfung erforderlich**:
- Datenbank prüfen ob `boldPaymentSettings` vorhanden sind
- Prüfen ob `apiKey` und `merchantId` vorhanden sind

### Root Cause 4: Race Condition bei parallel loadSettings() Aufrufen

**Beweis**:
- `loadSettings()` wird in `createPaymentLink()` aufgerufen (Zeile 224-225)
- `loadSettings()` wird auch im Request-Interceptor aufgerufen (Zeile 167-168)
- Wenn beide parallel laufen, könnte es zu Race Conditions kommen

**Prüfung erforderlich**:
- Prüfen ob `loadSettings()` mehrfach parallel aufgerufen wird
- Prüfen ob `this.apiUrl` atomar gesetzt wird

## Code-Probleme - Zusammenfassung

1. **apiUrl nicht initialisiert**: `private apiUrl: string;` - keine Initialisierung
2. **Falsche baseURL im Constructor**: `baseURL: 'https://sandbox.bold.co'` - existiert nicht
3. **Keine Garantie für korrekte axiosInstance**: Wenn `loadSettings()` fehlschlägt, bleibt falsche Instanz
4. **Keine Fehlerbehandlung wenn loadSettings() fehlschlägt**: Error wird geworfen, aber falsche axiosInstance bleibt

## Empfohlene Prüfungen (Produktivserver)

### 1. Server-Logs prüfen

Suche nach:
- `[BoldPayment] Fehler beim Laden der Branch Settings:`
- `[BoldPayment] Fehler beim Laden der Organization Settings:`
- `[Bold Payment] API Error Details:`
- `[Bold Payment] Request Error:`
- `[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`
- Prisma-Fehler (Connection, Timeout)
- Verschlüsselungsfehler

### 2. Datenbank prüfen

- Sind `boldPaymentSettings` in Branch vorhanden?
- Sind `boldPaymentSettings` in Organization vorhanden?
- Sind `apiKey` und `merchantId` vorhanden?
- Sind Settings verschlüsselt?

### 3. Environment-Variablen prüfen

- Ist `ENCRYPTION_KEY` gesetzt?
- Ist `ENCRYPTION_KEY` korrekt?

### 4. Code-Status prüfen

- Wurde Code auf Produktivserver deployed?
- Läuft alter oder neuer Code?
- Ist `createAxiosInstance()` korrekt implementiert?

## Zusammenfassung

**Root Cause**: `loadSettings()` schlägt möglicherweise fehl, wodurch `this.apiUrl` nicht gesetzt wird und die falsche `axiosInstance` aus dem Constructor (mit `baseURL: 'https://sandbox.bold.co'`) verwendet wird. Diese URL existiert nicht, was zu DNS-Fehlern führt.

**Warum wiederkehrend**: Wenn Datenbank-Verbindungsprobleme auftreten oder Settings temporär nicht verfügbar sind, schlägt `loadSettings()` fehl und das Problem tritt auf.

**Nächste Schritte**:
1. Server-Logs prüfen auf konkrete Fehlermeldungen
2. Datenbank prüfen ob Settings vorhanden sind
3. Prüfen ob `loadSettings()` fehlschlägt

