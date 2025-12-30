# Analyse-Plan: WhatsApp-Versand funktioniert nicht bei manuellem Versand

**Datum**: 2025-01-XX  
**Status**: 📋 Analyse (nichts ändern)

---

## Problem

Email funktioniert, WhatsApp nicht. Keine Nachricht wird empfangen, wenn manuell versendet wird aus der Reservation per Button (Nachricht mit Zahlungslink & Checkinlink).

---

## Analyse: Was wurde gefunden

### 1. `sendReservationInvitation` prüft NICHT `notificationChannels`

**Problem:**
- In `sendReservationInvitation` (Zeile 567-1361) wird `notificationChannels` NICHT geladen oder geprüft
- WhatsApp wird versendet, wenn `guestPhone` vorhanden ist (Zeile 802), unabhängig von `notificationChannels`
- Email wird versendet, wenn `guestEmail` vorhanden ist (Zeile 1057), ebenfalls ohne `notificationChannels`-Prüfung

**Vergleich mit anderen Methoden:**
- `sendLateCheckInInvitations` (Zeile 428-558) lädt `notificationChannels` (Zeile 452) und prüft sie (Zeile 508, 516)
- `generatePinAndSendNotification` (deprecated, delegiert an `sendPasscodeNotification`) lädt `notificationChannels` (Zeile 1158)
- `sendPasscodeNotification` lädt `notificationChannels` (Zeile 1552)

**Fazit:**
- `sendReservationInvitation` ist die einzige Methode, die `notificationChannels` NICHT prüft
- Dies könnte das Problem sein, wenn WhatsApp in `notificationChannels` nicht aktiviert ist

### 2. WhatsApp-Versand-Logik in `sendReservationInvitation`

**Aktueller Code (Zeile 802-1037):**
```typescript
if (guestPhone && hasValidPaymentLink) {
  // WhatsApp-Versand
  // KEINE Prüfung auf notificationChannels!
}
```

**Was passiert:**
1. Prüft ob `guestPhone` vorhanden ist
2. Prüft ob `paymentLink` vorhanden ist
3. Versendet WhatsApp direkt, ohne `notificationChannels` zu prüfen

**Mögliche Probleme:**
- Wenn `notificationChannels` = `['email']` ist, sollte WhatsApp NICHT versendet werden
- Aktuell wird WhatsApp trotzdem versendet (wenn `guestPhone` vorhanden ist)
- Dies könnte zu Fehlern führen, wenn WhatsApp-Service nicht konfiguriert ist

### 3. Email-Versand-Logik in `sendReservationInvitation`

**Aktueller Code (Zeile 1057-1150):**
```typescript
if (guestEmail && checkInLink && paymentLink) {
  // Email-Versand
  // KEINE Prüfung auf notificationChannels!
}
```

**Was passiert:**
1. Prüft ob `guestEmail` vorhanden ist
2. Prüft ob `checkInLink` vorhanden ist
3. Prüft ob `paymentLink` vorhanden ist
4. Versendet Email direkt, ohne `notificationChannels` zu prüfen

**Interessant:**
- Email funktioniert laut User
- Email wird auch ohne `notificationChannels`-Prüfung versendet
- Das bedeutet, dass das Fehlen der `notificationChannels`-Prüfung nicht das Hauptproblem ist

### 4. Mögliche Ursachen für WhatsApp-Fehler

**Option A: WhatsApp-Service nicht konfiguriert**
- Wenn `notificationChannels` = `['email']` ist, könnte WhatsApp-Service nicht konfiguriert sein
- Versuch, WhatsApp zu versenden, schlägt fehl
- Fehler wird abgefangen (Zeile 1012-1037), aber Nachricht kommt nicht an

**Option B: WhatsApp-API-Fehler**
- `sendMessageWithFallback` (Zeile 975) könnte fehlschlagen
- Fehler wird geloggt (Zeile 1013), aber nicht weitergegeben
- `whatsappSuccess` bleibt `false` (Zeile 647)

**Option C: Template-Problem**
- Template-Name oder Parameter könnten falsch sein
- `sendMessageWithFallback` versucht Session Message, dann Template Message
- Beide könnten fehlschlagen

**Option D: 24h-Fenster-Problem**
- Session Messages funktionieren nur im 24h-Fenster
- Wenn kein 24h-Fenster aktiv ist, wird Template Message verwendet
- Template Message könnte fehlschlagen

### 5. Fehlerbehandlung

**Aktueller Code (Zeile 1012-1037):**
```typescript
catch (error) {
  logger.error(`[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht:`, error);
  errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
  // WhatsApp-Fehler ist nicht kritisch - Links wurden bereits erstellt
  // Wir speichern die Links trotzdem, aber Status bleibt auf 'confirmed'
  
  // Log fehlgeschlagene Notification
  await this.logNotification(...);
}
```

**Problem:**
- Fehler wird abgefangen und geloggt
- `whatsappSuccess` bleibt `false`
- Aber `success` könnte trotzdem `true` sein, wenn Email erfolgreich war (Zeile 1120-1130)
- User sieht möglicherweise "Erfolgreich", obwohl WhatsApp fehlgeschlagen ist

---

## Prüfungsergebnisse (Durchgeführt)

### 1. ✅ Datenbank geprüft (`reservation_notification_log`)

**Ergebnis:**
- **KEINE invitation-Logs gefunden** in der Datenbank
- Das bedeutet: Entweder wurde `sendReservationInvitation` nicht aufgerufen, oder die Logs wurden nicht erstellt

**Gefundene Reservierungen:**
- Reservation 94: `Zahlungslink Test`
  - Phone: `+573001234567` ✅
  - Email: `test@example.com` ✅
  - Payment Link: ✅ vorhanden
  - Sent At: ❌ NICHT GESENDET
  - Branch ID: N/A (kein Branch zugeordnet)
  - Organization ID: 1

### 2. ✅ `notificationChannels`-Einstellung geprüft

**Organization Settings:**
- **Organization 1 (La Familia Hostel)**: `notificationChannels = ["email"]` ❌ WhatsApp NICHT aktiviert
- **Organization 4 (Mosaik)**: `notificationChannels = ["email"]` ❌ WhatsApp NICHT aktiviert
- **Organization 5**: `notificationChannels = ["email"]` ❌ WhatsApp NICHT aktiviert

**Branch Settings:**
- **KEINE Branches** haben `lobbyPmsSettings.notificationChannels` gesetzt
- Alle Branches verwenden Organization-Fallback → `["email"]`
- WhatsApp ist in **KEINER** Organization aktiviert

**Fazit:**
- WhatsApp ist in `notificationChannels` **NICHT** aktiviert
- Nur Email ist aktiviert: `["email"]`

### 3. ✅ WhatsApp-Service-Konfiguration geprüft

**Branch WhatsApp-Settings:**
- **Branch 1 (Hauptsitz)**: ❌ WhatsApp Settings NICHT GESETZT
- **Branch 2 (Manila)**: ✅ WhatsApp API Key VORHANDEN, aktiviert
- **Branch 3 (Parque Poblado)**: ✅ WhatsApp API Key VORHANDEN, aktiviert
- **Branch 4 (Alianza Paisa)**: ❌ WhatsApp Settings NICHT GESETZT
- **Branch 8 (Sonnenhalden)**: ❌ WhatsApp Settings NICHT GESETZT

**Fazit:**
- Einige Branches haben WhatsApp API Keys konfiguriert
- Aber `notificationChannels` enthält WhatsApp nicht → WhatsApp sollte nicht versendet werden

### 4. ⚠️ Problem identifiziert

**Hauptproblem:**
1. `sendReservationInvitation` prüft **NICHT** `notificationChannels`
2. WhatsApp wird versendet, wenn `guestPhone` vorhanden ist (Zeile 802), **unabhängig** von `notificationChannels`
3. Aber `notificationChannels = ["email"]` → WhatsApp sollte **NICHT** versendet werden
4. Da WhatsApp nicht aktiviert ist, könnte der Versand fehlschlagen oder der Service nicht verfügbar sein

**Warum Email funktioniert:**
- Email wird versendet (Zeile 1057), auch ohne `notificationChannels`-Prüfung
- Email-Service ist konfiguriert und funktioniert
- `notificationChannels = ["email"]` → Email ist aktiviert

**Warum WhatsApp nicht funktioniert:**
- WhatsApp wird versucht zu versenden (Zeile 802), obwohl `notificationChannels` WhatsApp nicht enthält
- Fehler wird abgefangen (Zeile 1012-1037), aber Nachricht kommt nicht an
- **KEINE Notification-Logs** → Entweder wurde der Versand nicht versucht, oder die Logs wurden nicht erstellt

---

## Mögliche Lösungen (NUR PLANUNG, NOCH NICHT UMSETZEN)

### Lösung 1: `notificationChannels`-Prüfung hinzufügen

**Was:**
- `notificationChannels` in `sendReservationInvitation` laden (analog zu anderen Methoden)
- Prüfen, ob `'whatsapp'` in `notificationChannels` enthalten ist, bevor WhatsApp versendet wird
- Prüfen, ob `'email'` in `notificationChannels` enthalten ist, bevor Email versendet wird

**Wo:**
- Nach Zeile 598 (nach Reservation-Laden)
- Vor Zeile 802 (vor WhatsApp-Versand)
- Vor Zeile 1057 (vor Email-Versand)

**Code-Struktur:**
```typescript
// Lade notificationChannels (analog zu anderen Methoden)
const { decryptApiSettings, decryptBranchApiSettings } = await import('../utils/encryption');
let decryptedSettings: any = null;

if (reservation.branchId && reservation.branch?.lobbyPmsSettings) {
  const branchSettings = decryptBranchApiSettings(reservation.branch.lobbyPmsSettings as any);
  // Für notificationChannels: Fallback auf Organisation
  decryptedSettings = decryptApiSettings(reservation.organization.settings as any);
} else {
  decryptedSettings = decryptApiSettings(reservation.organization.settings as any);
}

const notificationChannels = decryptedSettings?.lobbyPms?.notificationChannels || ['email'];

// Dann prüfen:
if (notificationChannels.includes('whatsapp') && guestPhone && hasValidPaymentLink) {
  // WhatsApp-Versand
}

if (notificationChannels.includes('email') && guestEmail && checkInLink && paymentLink) {
  // Email-Versand
}
```

### Lösung 2: Fehlerbehandlung verbessern

**Was:**
- Fehler nicht stillschweigend abfangen
- `success` nur auf `true` setzen, wenn tatsächlich mindestens eine Nachricht versendet wurde
- Klarere Fehlermeldungen zurückgeben

**Wo:**
- Zeile 1012-1037 (WhatsApp-Fehlerbehandlung)
- Zeile 1120-1130 (Success-Bestimmung)

### Lösung 3: Logging verbessern

**Was:**
- Mehr Logging hinzufügen, um zu verstehen, was passiert
- Loggen, ob `notificationChannels` WhatsApp enthält
- Loggen, ob WhatsApp-Service verfügbar ist

**Wo:**
- Vor WhatsApp-Versand (Zeile 802)
- Vor Email-Versand (Zeile 1057)

---

## Zusammenfassung der Prüfungsergebnisse

### ✅ Was geprüft wurde:
1. ✅ Datenbank (`reservation_notification_log`) - KEINE invitation-Logs gefunden
2. ✅ `notificationChannels` Settings - WhatsApp NICHT aktiviert (`["email"]`)
3. ✅ WhatsApp-Service-Konfiguration - Einige Branches haben API Keys, aber nicht alle

### 🔍 Problem identifiziert:

**Hauptursache:**
- `sendReservationInvitation` prüft **NICHT** `notificationChannels` vor dem WhatsApp-Versand
- WhatsApp wird versucht zu versenden, obwohl `notificationChannels = ["email"]` ist
- Da WhatsApp nicht aktiviert ist, schlägt der Versand fehl oder wird nicht ausgeführt
- **KEINE Notification-Logs** → Entweder wurde der Versand nicht versucht, oder die Logs wurden nicht erstellt

**Warum Email funktioniert:**
- Email wird versendet, auch ohne `notificationChannels`-Prüfung
- Email-Service ist konfiguriert und funktioniert
- `notificationChannels = ["email"]` → Email ist aktiviert

**Warum WhatsApp nicht funktioniert:**
- WhatsApp wird versucht zu versenden, obwohl `notificationChannels` WhatsApp nicht enthält
- Fehler wird abgefangen, aber Nachricht kommt nicht an
- **KEINE Notification-Logs** → Problem beim Versand oder Logging

### 📋 Nächste Schritte (NUR PLANUNG, NOCH NICHT UMSETZEN):

1. **Lösung 1 umsetzen**: `notificationChannels`-Prüfung in `sendReservationInvitation` hinzufügen
   - WhatsApp nur versenden, wenn `notificationChannels.includes('whatsapp')`
   - Email nur versenden, wenn `notificationChannels.includes('email')`
   - Analog zu anderen Methoden (`sendLateCheckInInvitations`, `sendPasscodeNotification`)

2. **Optional**: Server-Logs prüfen (falls verfügbar)
   - Backend-Logs auf dem Server prüfen
   - Nach `[ReservationNotification] ❌ Fehler beim Versenden der WhatsApp-Nachricht` suchen
   - Konkreten Fehler identifizieren

---

## WICHTIG: Regeln beachten

- **NICHT ändern**: `notificationChannels` bleibt unverändert (User-Anweisung)
- **NUR prüfen**: Ob `notificationChannels` WhatsApp enthält, bevor versendet wird
- **NICHT entfernen**: Bestehende Funktionalität
- **NUR hinzufügen**: Prüfung, ob WhatsApp in `notificationChannels` enthalten ist

