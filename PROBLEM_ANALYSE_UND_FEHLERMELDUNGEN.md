# Problem-Analyse: API-Ausfälle und Frontend-Fehlermeldungen

## 📋 Scripts erstellt in den letzten 48h (25.11.2025 - 26.11.2025)

### Diagnose-Scripts (26.11.2025):
1. `check-all-env-vars.ts` (18:02) - Prüft alle Environment-Variablen
2. `check-database-url.ts` (18:02) - Prüft DATABASE_URL Connection Pool Parameter
3. `diagnose-request-interceptor.ts` (17:29) - Diagnostiziert warum Request-Interceptor nicht ausgeführt wird
4. `check-code-compilation-and-logs.ts` (17:18) - Prüft ob Code kompiliert wurde und Debug-Logs vorhanden sind
5. `analyze-merchantid-in-logs.ts` (17:08) - Analysiert Server-Logs auf merchantId-Werte
6. `test-header-setting-method.ts` (17:07) - Testet Header-Setting-Methode

### Branch Settings & Encryption Scripts (26.11.2025):
7. `test-branch-decryption.ts` (15:21) - Testet Branch Settings Entschlüsselung
8. `verify-branch-decryption.ts` (15:21) - Verifiziert Branch Settings Entschlüsselung
9. `check-current-settings-readonly.ts` (15:18) - Prüft aktuelle Settings (readonly)
10. `debug-service-load-settings.ts` (15:18) - Debuggt Settings-Loading
11. `test-services-direct.ts` (15:18) - Testet Services direkt
12. `test-encryption-on-server.ts` (15:18) - Testet Entschlüsselung auf Server
13. `check-used-lock-ids.ts` (15:18) - Prüft verwendete Lock IDs
14. `check-what-was-lost.ts` (15:18) - Prüft was verloren ging
15. `fix-missing-settings-fields.ts` (15:18) - Fix für fehlende Settings-Felder
16. `re-encrypt-all-api-settings.ts` (15:18) - Verschlüsselt alle API-Settings neu
17. `check-all-api-settings-decryption.ts` (15:18) - Prüft alle API-Settings Entschlüsselung
18. `debug-axios-headers-comparison.ts` (15:18) - Debuggt Axios-Header-Vergleich
19. `verify-branch-encryption.ts` (15:18) - Verifiziert Branch-Verschlüsselung
20. `debug-bold-payment-request.ts` (15:18) - Debuggt Bold Payment Requests
21. `debug-bold-payment-service-load.ts` (15:18) - Debuggt Bold Payment Service Loading

### Bold Payment Test-Scripts (26.11.2025):
22. `test-bold-payment-direct.ts` (15:18) - Testet Bold Payment direkt
23. `test-bold-payment-with-logs.ts` (15:18) - Testet Bold Payment mit Logs
24. `create-payment-link-10000.ts` (15:18) - Erstellt Payment-Link für 10000
25. `debug-bold-payment-headers.ts` (15:18) - Debuggt Bold Payment Headers
26. `fix-manila-bold-payment-settings.ts` (15:18) - Fix für Manila Bold Payment Settings
27. `show-bold-payment-keys.ts` (15:18) - Zeigt Bold Payment Keys
28. `test-branch-payment-link.ts` (15:18) - Testet Branch Payment-Link
29. `check-reservation-bold-payment-settings.ts` (15:18) - Prüft Reservation Bold Payment Settings
30. `debug-bold-payment-service-exact.ts` (13:32) - Debuggt Bold Payment Service exakt
31. `test-bold-payment-branch-settings.ts` (13:19) - Testet Bold Payment Branch Settings
32. `test-bold-payment-settings-load.ts` (13:15) - Testet Bold Payment Settings Loading
33. `check-raw-db-values.ts` (13:05) - Prüft rohe DB-Werte
34. `prove-branch-encryption-bug.ts` (12:29) - Beweist Branch-Verschlüsselungs-Bug

### LobbyPMS Test-Scripts (26.11.2025):
35. `test-lobbypms-payment-update.ts` (15:18) - Testet LobbyPMS Payment Update
36. `test-lobbypms-with-db-reservation.ts` (15:18) - Testet LobbyPMS mit DB-Reservation
37. `test-lobbypms-with-api-token-param.ts` (15:18) - Testet LobbyPMS mit API Token Param
38. `test-lobbypms-v2-payment-endpoints.ts` (15:18) - Testet LobbyPMS v2 Payment Endpoints
39. `test-lobbypms-v2-booking-structure.ts` (15:18) - Testet LobbyPMS v2 Booking Structure
40. `test-lobbypms-status-endpoint.ts` (15:18) - Testet LobbyPMS Status Endpoint
41. `test-lobbypms-post-endpoints.ts` (15:18) - Testet LobbyPMS POST Endpoints
42. `test-lobbypms-endpoints-with-booking-id.ts` (15:18) - Testet LobbyPMS Endpoints mit Booking ID
43. `test-lobbypms-all-endpoints.ts` (15:18) - Testet alle LobbyPMS Endpoints
44. `test-lobbypms-payment-endpoints-detailed.ts` (15:18) - Testet LobbyPMS Payment Endpoints detailliert

**Gesamt: 44 Scripts in den letzten 48h erstellt**

---

## 🔴 PROBLEM-ERKLÄRUNG

### Hauptproblem: Request-Interceptor wird nicht ausgeführt

**Root Cause (aus Analyse-Datei):**

1. **Code-Flow-Problem in `boldPaymentService.ts`:**
   - Im Constructor wird `this.axiosInstance` OHNE Interceptor erstellt (Zeile 55-58)
   - `loadSettings()` ruft `createAxiosInstance()` auf und überschreibt `this.axiosInstance` (Zeile 86 oder 127)
   - **ABER:** `loadSettings()` wird nur aufgerufen, wenn `this.merchantId` NICHT gesetzt ist (Zeile 232-234)
   - **Wenn `this.merchantId` bereits gesetzt ist:** `loadSettings()` wird nicht aufgerufen → `createAxiosInstance()` wird nicht aufgerufen → Alte Axios-Instance (ohne Interceptor) wird verwendet

2. **Fix wurde implementiert (26.11.2025 23:15 UTC):**
   - Zeile 231-234 in `boldPaymentService.ts`: Zusätzliche Prüfung für `apiUrl` und `axiosInstance`
   - **ABER:** Problem besteht weiterhin, weil Settings unverschlüsselt sind und Fix nicht greift

3. **Aktueller Stand:**
   - ✅ Request-Interceptor wird JETZT ausgeführt (Logs zeigen Debug-Ausgaben)
   - ✅ Header wird korrekt gesetzt
   - ❌ **ABER:** API gibt weiterhin 403 Forbidden zurück

### Warum alle APIs betroffen sind:

**Gemeinsame Ursache:**
- Alle Services (Bold Payment, TTLock, WhatsApp, LobbyPMS) verwenden denselben Code-Flow:
  1. Settings aus DB laden (`loadSettings()`)
  2. Axios-Instance mit Interceptor erstellen (`createAxiosInstance()`)
  3. Request mit gesetztem Header senden
- **Wenn `createAxiosInstance()` nicht aufgerufen wird:** Alle Services verwenden Axios-Instance OHNE Interceptor → Header wird nicht gesetzt → API gibt 403 Forbidden zurück

---

## 📍 CODE-STELLEN: FEHLERMELDUNGEN IM FRONTEND

### 1. Bold Payment API: 403 Forbidden

**Fehlermeldung im Frontend:**
```
"Payment-Link konnte nicht erstellt werden: Bold Payment API Fehler (403 Forbidden): Forbidden"
```

**Wo wird sie erzeugt:**

#### a) `boldPaymentService.ts` - Zeile 396-405:
```typescript
// Spezifische Fehlermeldung für 403 Forbidden
if (status === 403) {
  throw new Error(
    `Bold Payment API Fehler (403 Forbidden): ${errorMessage}\n` +
    `Bitte prüfen Sie im Bold Payment Dashboard:\n` +
    `1. Ist die "API Link de pagos" aktiviert?\n` +
    `2. Haben die Keys (Llave de identidad) die richtigen Berechtigungen?\n` +
    `3. Sind die Keys für die richtige Umgebung (Sandbox/Production) aktiviert?\n` +
    `4. Wird die "Llave de identidad" (Identity Key) korrekt verwendet?`
  );
}
```

#### b) `reservationNotificationService.ts` - Zeile 284-304:
```typescript
} catch (error) {
  console.error(`[ReservationNotification] ❌ Fehler beim Erstellen des Payment-Links:`, error);
  errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Erstellen des Payment-Links';
  // Payment-Link-Fehler: Log erstellen, aber nicht abbrechen
  try {
    await this.logNotification(
      reservationId,
      'invitation',
      (guestPhone && guestEmail) ? 'both' : (guestPhone ? 'whatsapp' : (guestEmail ? 'email' : 'both')),
      false,
      {
        sentTo: guestPhone || guestEmail || undefined,
        errorMessage: `Payment-Link konnte nicht erstellt werden: ${errorMessage}`  // ← HIER
      }
    );
  } catch (logError) {
    console.error(`[ReservationNotification] ⚠️ Fehler beim Erstellen des Log-Eintrags für Payment-Link-Fehler:`, logError);
  }
  // Payment-Link-Fehler ist kritisch - ohne Payment-Link können wir keine Notifications versenden
  throw new Error(`Payment-Link konnte nicht erstellt werden: ${errorMessage}`);  // ← HIER
}
```

#### c) `reservationController.ts` - Zeile 729:
```typescript
console.warn(`[Reservation] ⚠️ Einladung teilweise fehlgeschlagen für Reservierung ${reservationId}: ${result.error}`);
// Diese Warnung wird im Frontend als Fehlermeldung angezeigt
```

**Flow:**
1. `boldPaymentService.createPaymentLink()` wirft Error mit "Bold Payment API Fehler (403 Forbidden): ..."
2. `reservationNotificationService.sendReservationInvitation()` fängt Error und wirft neuen Error: "Payment-Link konnte nicht erstellt werden: ..."
3. `reservationController` fängt Error und gibt an Frontend weiter
4. Frontend zeigt Fehlermeldung an

---

### 2. TTLock PIN-Generierung: Fehler

**Fehlermeldung im Frontend:**
```
"PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen"
```

**Wo wird sie erzeugt:**

#### a) `reservationNotificationService.ts` - Zeile 990-998:
```typescript
await this.logNotification(
  reservationId,
  'pin',
  reservation.guestPhone && reservation.guestEmail ? 'both' : (reservation.guestPhone ? 'whatsapp' : (reservation.guestEmail ? 'email' : 'whatsapp')),
  false,
  {
    sentTo: reservation.guestPhone || reservation.guestEmail || undefined,
    errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'  // ← HIER
  }
);
```

#### b) `reservationNotificationService.ts` - Zeile 1393:
```typescript
errorMessage: 'PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen'  // ← HIER
```

#### c) `reservationController.ts` - Zeile 837:
```typescript
message: pinGenerated 
  ? 'PIN-Code generiert und Mitteilung versendet'
  : 'Mitteilung versendet, aber PIN-Code konnte nicht generiert werden (TTLock Fehler)'  // ← HIER
```

#### d) `ttlockService.ts` - Zeile 492-499:
```typescript
// Fehlerfall
const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
console.error('[TTLock] Passcode Creation Error:', {
  errcode: responseData.errcode,
  errmsg: errorMsg,
  data: responseData,
  payload: Object.fromEntries(payload)
});
throw new Error(errorMsg);  // ← HIER
```

**Flow:**
1. `ttlockService.createTemporaryPasscode()` wirft Error
2. `reservationNotificationService.generatePinAndSendNotification()` fängt Error und loggt: "PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen"
3. `reservationController.generatePinAndSendNotification()` gibt Message an Frontend: "Mitteilung versendet, aber PIN-Code konnte nicht generiert werden (TTLock Fehler)"

---

### 3. WhatsApp-Nachricht: Fehler

**Fehlermeldung im Frontend:**
```
"Payment-Link fehlt - WhatsApp-Nachricht konnte nicht versendet werden"
```

**Wo wird sie erzeugt:**

#### a) `reservationNotificationService.ts` - Zeile 453:
```typescript
errorMessage: 'Payment-Link fehlt - WhatsApp-Nachricht konnte nicht versendet werden'  // ← HIER
```

#### b) `reservationNotificationService.ts` - Zeile 636:
```typescript
errorMessage: 'Check-in-Link oder Payment-Link fehlt - Email konnte nicht versendet werden'  // ← HIER
```

---

## 🔍 CODE-STELLEN: REQUEST-INTERCEPTOR PROBLEM

### Problem-Stelle 1: `boldPaymentService.ts` - Zeile 154-194

**Request-Interceptor wird registriert:**
```typescript
private createAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: this.apiUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Request Interceptor für API-Key-Authentifizierung
  instance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Lade Settings falls noch nicht geladen
      if (!this.merchantId) {
        await this.loadSettings();
      }

      // Bold Payment "API Link de pagos" verwendet:
      // Authorization Header mit Wert: x-api-key <llave_de_identidad>
      if (!this.merchantId) {
        throw new Error('Bold Payment Merchant ID (Llave de identidad) fehlt');
      }
      config.headers.Authorization = `x-api-key ${this.merchantId}`;  // ← HIER wird Header gesetzt
      
      // Debug-Logs...
      return config;
    },
    (error) => {
      console.error('[Bold Payment] Request Error:', error);
      return Promise.reject(error);
    }
  );
  // ...
}
```

### Problem-Stelle 2: `boldPaymentService.ts` - Zeile 225-315

**`createPaymentLink()` ruft `loadSettings()` auf:**
```typescript
async createPaymentLink(
  reservation: Reservation,
  amount: number,
  currency: string = 'COP',
  description?: string
): Promise<string> {
  // WICHTIG: loadSettings() muss IMMER aufgerufen werden, um createAxiosInstance() aufzurufen
  // Auch wenn merchantId bereits gesetzt ist, muss die Axios-Instance mit Interceptor erstellt werden
  if (!this.merchantId || !this.apiUrl || this.apiUrl === 'https://sandbox.bold.co') {
    await this.loadSettings();
  }

  // KRITISCH: Stelle sicher, dass axiosInstance den Interceptor hat
  // Prüfe ob axiosInstance bereits den Interceptor hat (durch createAxiosInstance erstellt)
  // Wenn nicht, erstelle sie neu
  if (!this.axiosInstance || !this.apiUrl || this.apiUrl === 'https://sandbox.bold.co') {
    // Axios-Instance wurde noch nicht mit Interceptor erstellt
    // Lade Settings erneut, um createAxiosInstance() aufzurufen
    await this.loadSettings();
  }
  
  // ... Rest des Codes
}
```

**Problem:** Diese Prüfungen sind nicht robust genug. Wenn `apiUrl` bereits gesetzt ist, aber `axiosInstance` noch ohne Interceptor, wird `loadSettings()` nicht aufgerufen.

---

## 📊 ZUSAMMENFASSUNG

### Problem:
1. **Request-Interceptor wird nicht ausgeführt** → Header wird nicht gesetzt → API gibt 403 Forbidden zurück
2. **Fix wurde implementiert, aber Problem besteht weiterhin** → Prüfungen sind nicht robust genug
3. **Alle APIs betroffen** → Gleicher Code-Flow in allen Services

### Fehlermeldungen im Frontend:
1. **Bold Payment:** "Payment-Link konnte nicht erstellt werden: Bold Payment API Fehler (403 Forbidden): ..."
   - Erzeugt in: `boldPaymentService.ts:396-405` → `reservationNotificationService.ts:304` → Frontend
2. **TTLock:** "PIN konnte nicht generiert werden - keine Lock IDs konfiguriert oder Fehler beim Erstellen"
   - Erzeugt in: `reservationNotificationService.ts:997` → `reservationController.ts:837` → Frontend
3. **WhatsApp:** "Payment-Link fehlt - WhatsApp-Nachricht konnte nicht versendet werden"
   - Erzeugt in: `reservationNotificationService.ts:453` → Frontend

### Nächste Schritte:
1. Prüfe ob `createAxiosInstance()` wirklich IMMER aufgerufen wird
2. Prüfe ob Header wirklich korrekt gesetzt wird (Debug-Logs zeigen es, aber API gibt 403 zurück)
3. Prüfe ob API-Format wirklich korrekt ist (Header-Format vs. AWS Signature)




