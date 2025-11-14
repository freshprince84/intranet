# Manuelle Reservierungserstellung - Implementierungsplan

**Datum**: 2025-01-20  
**Status**: 📋 Planung

## Übersicht

Anpassung des manuellen Reservierungserstellungsprozesses: Nach manueller Erstellung wird automatisch eine WhatsApp-Nachricht mit Zahlungslink und Aufforderung zum Online-Check-in versendet. Nach erfolgreicher Zahlung wird der TTLock-Code in einer separaten Nachricht versendet.

## Aktueller Stand

### ✅ Bereits implementiert:
1. **Manuelle Reservierungserstellung** (`CreateReservationModal.tsx`)
   - Felder: `guestName`, `contact` (Telefonnummer oder Email), `amount`, `currency`
   - Automatische Erkennung ob `contact` Telefonnummer oder Email ist
   
2. **Backend: Reservierungserstellung** (`reservationController.ts` → `createReservation`)
   - Erstellt Reservierung mit Status `confirmed`
   - Erstellt automatisch Bold Payment Link
   - Sendet WhatsApp-Nachricht mit Zahlungslink (wenn Telefonnummer vorhanden)
   - Setzt Status auf `notification_sent` nach Versand

3. **Bold Payment Webhook** (`boldPaymentService.ts` → `handleWebhook`)
   - Nach erfolgreicher Zahlung: Erstellt automatisch TTLock-Code
   - Sendet WhatsApp-Nachricht mit TTLock-Code

### ❌ Fehlt noch:
1. **Check-in-Link in WhatsApp-Nachricht nach Erstellung**
   - Aktuell wird nur Zahlungslink gesendet
   - Check-in-Aufforderung fehlt
   - Check-in-Link muss generiert werden

## Prozessablauf (Ziel)

1. **Manuelle Reservierungserstellung**
   - User erstellt Reservierung über `CreateReservationModal`
   - Eingabe: `guestName`, `contact` (Telefonnummer oder Email), `amount`, `currency`
   - Backend erstellt Reservierung mit Status `confirmed`

2. **Automatische WhatsApp-Nachricht nach Erstellung** (wenn Telefonnummer vorhanden)
   - Erstellt Bold Payment Link
   - Generiert Check-in-Link
   - Sendet WhatsApp-Nachricht mit:
     - Willkommensnachricht
     - Zahlungslink
     - Aufforderung zum Online-Check-in + Check-in-Link
   - Setzt Status auf `notification_sent`
   - Speichert versendete Nachricht in DB

3. **Nach Zahlung** (Bold Payment Webhook)
   - Erstellt TTLock-Code
   - Sendet separate WhatsApp-Nachricht mit TTLock-Code
   - Aktualisiert Reservierung (speichert TTLock-Code)

## Technische Details

### 1. Check-in-Link-Generierung

**Datei**: `backend/src/controllers/reservationController.ts` (erweitern)

**Funktion**: Check-in-Link generieren (analog zu `reservationNotificationService.ts`)

**Logik**:
```typescript
const checkInLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/check-in/${reservation.id}`;
```

**Hinweis**: 
- Check-in-Link wird nicht in DB gespeichert (kann jederzeit generiert werden)
- Format: `{FRONTEND_URL}/check-in/{reservationId}`

### 2. WhatsApp-Nachricht erweitern

**Datei**: `backend/src/controllers/reservationController.ts` (erweitern)

**Aktueller Nachrichtentext** (Zeile 274-284):
```
Hola {guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: {amount} {currency}

Por favor, realiza el pago:
{paymentLink}

¡Te esperamos!
```

**Neuer Nachrichtentext**:
```
Hola {guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: {amount} {currency}

Por favor, realiza el pago:
{paymentLink}

Puedes realizar el check-in en línea ahora:
{checkInLink}

¡Te esperamos!
```

**Alternative** (falls Check-in-Link prominent sein soll):
```
Hola {guestName},

¡Bienvenido a La Familia Hostel!

Tu reserva ha sido confirmada.
Cargos: {amount} {currency}

Realiza el check-in en línea:
{checkInLink}

Por favor, realiza el pago:
{paymentLink}

¡Te esperamos!
```

### 3. Check-in-Link in WhatsApp-Nachricht

**Datei**: `backend/src/controllers/reservationController.ts` (erweitern)

**Änderung in `createReservation`**:
- Nach Erstellung des Payment Links: Check-in-Link generieren
- Check-in-Link in WhatsApp-Nachricht einfügen
- Rest bleibt unverändert

## Implementierungsschritte

### Phase 1: Backend - Check-in-Link-Generierung ✅

1. ✅ Check-in-Link-Generierung in `createReservation` hinzufügen
   - Datei: `backend/src/controllers/reservationController.ts`
   - Nach Erstellung des Payment Links
   - Format: `{FRONTEND_URL}/check-in/{reservationId}`
   - Verwende `process.env.FRONTEND_URL` oder Fallback `http://localhost:3000`

### Phase 2: Backend - WhatsApp-Nachricht erweitern ✅

1. ✅ WhatsApp-Nachrichtentext erweitern
   - Datei: `backend/src/controllers/reservationController.ts`
   - Check-in-Aufforderung hinzufügen
   - Check-in-Link einfügen
   - Nachrichtentext anpassen (siehe oben)

### Phase 3: Testing ✅

1. ✅ Manuelle Reservierung erstellen
2. ✅ WhatsApp-Nachricht prüfen (Zahlungslink + Check-in-Link)
3. ✅ Check-in-Link testen (sollte zur Check-in-Seite führen)
4. ✅ Zahlung simulieren (Bold Payment Webhook)
5. ✅ TTLock-Code-Nachricht prüfen

## Dateistruktur

### Backend (erweitern)
- `backend/src/controllers/reservationController.ts` - `createReservation` erweitern:
  - Check-in-Link-Generierung hinzufügen
  - WhatsApp-Nachrichtentext erweitern

### Keine Schema-Änderungen erforderlich
- Check-in-Link wird nicht in DB gespeichert (kann jederzeit generiert werden)
- Alle benötigten Felder existieren bereits

## Entscheidungen

1. **Check-in-Link-Generierung**:
   - ✅ **Dynamisch generiert** (nicht in DB gespeichert)
   - Format: `{FRONTEND_URL}/check-in/{reservationId}`
   - Kann jederzeit neu generiert werden

2. **Nachrichtentext-Reihenfolge**:
   - ✅ **Option 1**: Zahlungslink zuerst, dann Check-in-Link
   - Alternative: Check-in-Link zuerst, dann Zahlungslink
   - **Entscheidung**: Zahlungslink zuerst (wichtiger)

3. **Check-in-Link für Email**:
   - ✅ **Aktuell**: Nur für WhatsApp (Telefonnummer erforderlich)
   - Email-Versand kann später erweitert werden (nicht Teil dieser Aufgabe)

## Abhängigkeiten

- ✅ `FRONTEND_URL` Environment-Variable muss gesetzt sein (oder Fallback)
- ✅ Check-in-Seite muss existieren (`/check-in/{reservationId}`)
- ✅ Bold Payment Service funktioniert
- ✅ WhatsApp Service funktioniert
- ✅ TTLock Service funktioniert (für Nach-Zahlung)

## Testing

1. **Unit Tests**:
   - Check-in-Link-Generierung
   - WhatsApp-Nachrichtentext-Formatierung

2. **Integration Tests**:
   - End-to-End: Reservierung erstellen → WhatsApp-Nachricht → Zahlung → TTLock-Code

3. **Manual Tests**:
   - Reservierung manuell erstellen
   - WhatsApp-Nachricht empfangen (Zahlungslink + Check-in-Link)
   - Check-in-Link öffnen (sollte zur Check-in-Seite führen)
   - Zahlung simulieren
   - TTLock-Code-Nachricht empfangen

## Dokumentation

Nach Implementierung:
- ✅ Prozess dokumentieren
- ✅ API-Endpunkte dokumentieren
- ✅ Check-in-Link-Format dokumentieren
- ✅ Deployment-Hinweise (FRONTEND_URL)

## Nächste Schritte

1. ✅ Backend: Check-in-Link-Generierung implementieren
2. ✅ Backend: WhatsApp-Nachricht erweitern
3. ✅ Testing durchführen
4. ✅ Dokumentation aktualisieren
