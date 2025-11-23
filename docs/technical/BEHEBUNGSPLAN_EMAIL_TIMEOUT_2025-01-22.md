# Behebungsplan: Email Connection Timeout

**Datum**: 2025-01-22  
**Status**: Plan erstellt

## Identifizierte Probleme

### Problem 1: Port 465 antwortet nicht
- **Fakt**: Branch 3 verwendet Port 465, Port 465 antwortet nicht auf Telnet-Test
- **Fakt**: Port 587 ist erreichbar und Server antwortet

### Problem 2: Keine Timeout-Konfiguration
- **Fakt**: Code hat keine `connectionTimeout`, `greetingTimeout`, `socketTimeout` Parameter
- **Fakt**: Nodemailer verwendet Standard-Timeout (2 Sekunden), was zu kurz sein kann

### Problem 3: Frontend hat kein Timeout
- **Fakt**: `frontend/src/config/axios.ts` hat keinen `timeout` Parameter
- **Fakt**: Frontend wartet unbegrenzt auf Response

### Problem 4: Email-Versand blockiert Response
- **Fakt**: Email-Versand ist synchron (await), blockiert bis Timeout
- **Fakt**: Response wird erst nach Email-Timeout gesendet

## Behebungsplan

### Schritt 1: Timeout-Konfiguration hinzufügen

**Datei**: `backend/src/services/emailService.ts`  
**Zeile**: 109-117

**Änderung**: Timeout-Parameter zu `nodemailer.createTransport()` hinzufügen

```typescript
return nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  connectionTimeout: 10000, // 10 Sekunden
  greetingTimeout: 10000, // 10 Sekunden
  socketTimeout: 10000, // 10 Sekunden
});
```

**Grund**: Standard-Timeout (2 Sekunden) ist zu kurz, 10 Sekunden gibt Server mehr Zeit zum Antworten

### Schritt 2: Port 465 Problem beheben

**Option A: Port auf 587 ändern (empfohlen)**

**Datei**: Datenbank - Branch 3 Settings  
**Änderung**: `smtpPort` von `465` auf `587` ändern

**Grund**: Port 587 funktioniert (Telnet-Test erfolgreich), Port 465 antwortet nicht

**Option B: Port 465 reparieren**

**Prüfung erforderlich**:
- Firewall-Regeln für Port 465 prüfen
- SMTP-Server-Konfiguration für Port 465 prüfen
- SSL/TLS-Konfiguration für Port 465 prüfen

**Grund**: Port 465 sollte funktionieren, aber antwortet nicht

### Schritt 3: Frontend Timeout hinzufügen

**Datei**: `frontend/src/config/axios.ts`  
**Zeile**: 8-26

**Änderung**: `timeout` Parameter zu `axios.create()` hinzufügen

```typescript
const instance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 60000, // 60 Sekunden
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});
```

**Grund**: Frontend wartet unbegrenzt, 60 Sekunden Timeout verhindert hängende Requests

### Schritt 4: Email-Versand nicht-blockierend machen (optional)

**Datei**: `backend/src/services/reservationNotificationService.ts`  
**Zeile**: 459-641

**Option A: Email-Versand in Background-Queue verschieben**

**Änderung**: Email-Versand nicht mehr synchron ausführen, sondern in Queue verschieben

**Grund**: Email-Versand blockiert Response, Queue macht es asynchron

**Option B: Email-Versand mit Timeout versehen**

**Änderung**: Email-Versand mit Promise.race() und Timeout versehen

```typescript
const emailPromise = sendEmail(...);
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Email timeout')), 10000)
);

try {
  await Promise.race([emailPromise, timeoutPromise]);
} catch (error) {
  // Email-Fehler loggen, aber Prozess fortsetzen
}
```

**Grund**: Email-Versand blockiert nicht mehr als 10 Sekunden

## Empfohlene Reihenfolge

1. **Schritt 1**: Timeout-Konfiguration hinzufügen (schnell, geringes Risiko)
2. **Schritt 2**: Port auf 587 ändern (löst Port-Problem)
3. **Schritt 3**: Frontend Timeout hinzufügen (verhindert hängende Requests)
4. **Schritt 4**: Email-Versand nicht-blockierend machen (optional, größere Änderung)

## Erwartete Ergebnisse

### Nach Schritt 1 + 2
- Email-Versand sollte funktionieren (Port 587 funktioniert)
- Timeout ist länger (10 Sekunden statt 2 Sekunden)

### Nach Schritt 3
- Frontend wartet nicht mehr unbegrenzt
- Timeout-Fehler werden korrekt angezeigt

### Nach Schritt 4
- Response wird sofort gesendet (nicht nach Email-Timeout)
- Email-Versand blockiert nicht mehr

## Test-Plan

1. **Test 1**: Email-Versand mit Port 587 testen
   - Reservation-Einladung senden
   - Prüfen ob Email ankommt
   - Prüfen ob Response schnell kommt

2. **Test 2**: Timeout-Verhalten testen
   - SMTP-Server temporär blockieren
   - Prüfen ob Timeout nach 10 Sekunden kommt
   - Prüfen ob Frontend Timeout nach 60 Sekunden kommt

3. **Test 3**: Email-Fehler-Handling testen
   - Prüfen ob WhatsApp trotz Email-Fehler versendet wird
   - Prüfen ob Response trotz Email-Fehler gesendet wird

