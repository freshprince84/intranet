# Queue-System: Analyse aller profitierenden Stellen

## Status: Analyse-Phase - 18 Stellen identifiziert

---

## Kategorisierung

### Kategorie A: User-Interaktion (Frontend blockiert) - 8 Stellen
**Problem**: User wartet auf langsame Operationen
**Vorteil**: Sofortiges Feedback, keine Blockierung

### Kategorie B: Scheduled Jobs (Sequentiell) - 4 Stellen
**Problem**: Verarbeitet viele Items sequentiell, blockiert Scheduler
**Vorteil**: Parallele Verarbeitung, 10x schneller

### Kategorie C: Webhooks (Timeout-Risiko) - 2 Stellen
**Problem**: Webhook muss schnell antworten, aber Operationen sind langsam
**Vorteil**: Sofortige Webhook-Antwort, Verarbeitung im Hintergrund

### Kategorie D: Task/Lifecycle-Automatisierung - 4 Stellen
**Problem**: Blockiert Hauptprozess (User-Erstellung, etc.)
**Vorteil**: Hauptprozess nicht blockiert, Tasks im Hintergrund

---

## KATEGORIE A: User-Interaktion (Frontend blockiert)

### 1. ✅ Reservation-Erstellung (IMPLEMENTIERT)
**Datei**: `backend/src/controllers/reservationController.ts` → `createReservation()` (Zeile 206-426)
**Frontend**: `CreateReservationModal.tsx`

**Aktuell:**
- Payment-Link: ~1-3s
- WhatsApp: ~1-3s
- **Gesamt: 2-6 Sekunden blockiert**

**Mit Queue:**
- Response: <100ms
- **99% schneller**

**Status**: ✅ Implementiert

---

### 2. Reservation Update (Guest Contact)
**Datei**: `backend/src/controllers/reservationController.ts` → `updateGuestContact()` (Zeile 26-200)

**Aktuell:**
- Payment-Link: ~1-3s (Zeile 89)
- TTLock Passcode: ~1-2s (Zeile 105)
- WhatsApp: ~1-3s (Zeile 161)
- **Gesamt: 3-8 Sekunden blockiert**

**Mit Queue:**
- Response: <100ms
- **95% schneller**

**Konkreter Vorteil:**
- User kann sofort weiterarbeiten
- TTLock-Fehler blockieren nicht mehr
- Automatische Retries bei API-Fehlern

**Job-Typ**: `update-guest-contact`

---

### 3. Check-in-Bestätigung (Online Check-in)
**Datei**: `backend/src/controllers/lobbyPmsController.ts` → `checkInReservation()` (Zeile 201-283)

**Aktuell:**
- SIRE-Registrierung: ~2-5s (Zeile 250) - optional
- Check-in-Bestätigung: ~3-6s (Zeile 266)
  - TTLock Passcode: ~1-2s
  - WhatsApp/E-Mail: ~1-3s
- **Gesamt: 3-11 Sekunden blockiert**

**Mit Queue:**
- Check-in sofort abgeschlossen: <100ms
- SIRE + Bestätigung im Hintergrund
- **90% schneller**

**Konkreter Vorteil:**
- Gast kann sofort weiterarbeiten
- Check-in-Prozess nicht blockiert
- Retry bei TTLock-Fehlern

**Job-Typ**: `send-check-in-confirmation`

---

### 4. PIN-Generierung und Versand
**Datei**: `backend/src/controllers/reservationController.ts` → `generatePinAndSendNotification()` (Zeile 479-561)
**Service**: `backend/src/services/reservationNotificationService.ts` → `generatePinAndSendNotification()` (Zeile 132-285)

**Aktuell:**
- TTLock Passcode: ~1-2s (Zeile 196)
- WhatsApp/E-Mail: ~1-3s (Zeile 246)
- **Gesamt: 2-5 Sekunden blockiert**

**Mit Queue:**
- Response: <100ms
- **95% schneller**

**Job-Typ**: `generate-pin-and-send`

---

### 5. SIRE-Registrierung (Manuell)
**Datei**: `backend/src/controllers/lobbyPmsController.ts` → `registerSire()` (Zeile 410-456)

**Aktuell:**
- SIRE-API-Call: ~2-5s (Zeile 434)
- **Gesamt: 2-5 Sekunden blockiert**

**Mit Queue:**
- Response: <100ms
- **95% schneller**

**Job-Typ**: `register-sire`

---

### 6. TTLock Passcode erstellen (Manuell)
**Datei**: `backend/src/controllers/ttlockController.ts` → `createPasscode()` (Zeile 78)

**Aktuell:**
- TTLock API: ~1-2s
- **Gesamt: 1-2 Sekunden blockiert**

**Mit Queue:**
- Response: <100ms
- **90% schneller**

**Job-Typ**: `create-ttlock-passcode`

---

### 7. Email-Reservation Verarbeitung
**Datei**: `backend/src/services/emailReservationService.ts` → `processEmailReservation()` (Zeile 77-140)

**Aktuell:**
- Payment-Link: ~1-3s (Zeile 81)
- WhatsApp: ~1-3s (Zeile 118)
- **Gesamt: 2-6 Sekunden blockiert**

**Mit Queue:**
- Email-Parsing sofort abgeschlossen
- Payment + WhatsApp im Hintergrund
- **95% schneller**

**Job-Typ**: `process-email-reservation`

**Hinweis**: Wird von `EmailReservationScheduler` aufgerufen (könnte auch in Kategorie B)

---

### 8. WhatsApp-Webhook Antworten
**Datei**: `backend/src/controllers/whatsappController.ts` → `handleWebhook()` (Zeile 17-164)

**Aktuell:**
- Message Handler: ~0.5-2s (Zeile 118)
- WhatsApp senden: ~1-3s (Zeile 133)
- **Gesamt: 1.5-5 Sekunden blockiert**

**Mit Queue:**
- Webhook antwortet sofort: <100ms
- Antwort-Nachricht im Hintergrund
- **95% schneller**

**Konkreter Vorteil:**
- Kein Webhook-Timeout mehr
- WhatsApp kann schnell antworten
- Retry bei Fehlern

**Job-Typ**: `send-whatsapp-response`

---

## KATEGORIE B: Scheduled Jobs (Sequentiell)

### 9. Späte Check-in-Einladungen (Täglich 20:00 Uhr)
**Datei**: `backend/src/services/reservationNotificationService.ts` → `sendLateCheckInInvitations()` (Zeile 23-125)
**Scheduler**: `backend/src/services/reservationScheduler.ts`

**Aktuell:**
- Verarbeitet alle Reservierungen **sequentiell** (Zeile 57: `for`-Loop)
- Pro Reservierung: ~3-6s
  - Payment-Link: ~1-3s (Zeile 73)
  - WhatsApp/E-Mail: ~1-3s (Zeile 94)
- **Bei 10 Reservierungen: 30-60 Sekunden**
- **Bei 50 Reservierungen: 2.5-5 Minuten**

**Mit Queue:**
- Jede Reservierung als separater Job
- **Parallele Verarbeitung** (5 Worker)
- **Bei 10 Reservierungen: 3-6 Sekunden** (10x schneller!)
- **Bei 50 Reservierungen: 10-30 Sekunden** (10x schneller!)

**Konkreter Vorteil:**
- Scheduler sofort fertig
- Parallele Verarbeitung
- Einzelne Fehler blockieren nicht alle
- Skalierbar auf 100+ Reservierungen

**Job-Typ**: `send-late-check-in-invitation`

---

### 10. Monatsabrechnungen (Täglich 9:00-10:00 Uhr)
**Datei**: `backend/src/services/monthlyReportScheduler.ts` → `checkAndGenerateMonthlyReports()` (Zeile 23-88)

**Aktuell:**
- Verarbeitet alle User **sequentiell** (Zeile 54: `for`-Loop)
- Pro User: PDF-Generierung ~2-10s (abhängig von Anzahl Consultations)
- **Bei 10 Usern: 20-100 Sekunden**
- **Bei 50 Usern: 1.5-8 Minuten**

**Mit Queue:**
- Jede Abrechnung als separater Job
- **Parallele Verarbeitung** (5 Worker)
- **Bei 10 Usern: 2-10 Sekunden** (10x schneller!)
- **Bei 50 Usern: 10-50 Sekunden** (10x schneller!)

**Konkreter Vorteil:**
- Scheduler sofort fertig
- Parallele PDF-Generierung
- Skalierbar auf viele User

**Job-Typ**: `generate-monthly-report`

---

### 11. Email-Reservation Scheduler
**Datei**: `backend/src/services/emailReservationScheduler.ts`
**Vermutlich ähnlich wie Reservation Scheduler**

**Aktuell:**
- Verarbeitet Emails sequentiell
- Pro Email: ~2-6s (Payment + WhatsApp)

**Mit Queue:**
- Parallele Verarbeitung
- **10x schneller**

**Job-Typ**: `process-email-reservation` (bereits in #7 erwähnt)

---

### 12. Reservation Synchronisation (LobbyPMS)
**Datei**: `backend/src/controllers/lobbyPmsController.ts` → `syncReservations()` (Zeile 148-195)

**Aktuell:**
- Verarbeitet Reservierungen sequentiell (Zeile 158: `for`-Loop)
- Pro Reservierung: ~1-3s (LobbyPMS API + DB)

**Mit Queue:**
- Parallele Synchronisation
- **5-10x schneller**

**Job-Typ**: `sync-lobby-reservation`

---

## KATEGORIE C: Webhooks (Timeout-Risiko)

### 13. WhatsApp-Webhook (bereits in #8 erwähnt)
**Datei**: `backend/src/controllers/whatsappController.ts` → `handleWebhook()` (Zeile 17-164)

**Besonderheit**: Webhook muss schnell antworten (<5s), sonst Timeout

**Mit Queue:**
- Webhook antwortet sofort (<100ms)
- Verarbeitung im Hintergrund
- **Kein Timeout-Risiko mehr**

---

### 14. Bold Payment Webhook
**Datei**: `backend/src/services/boldPaymentService.ts` → `handleWebhook()` (Zeile 384)

**Aktuell:**
- Webhook verarbeitet Zahlungsstatus
- Kann langsam sein bei vielen Updates

**Mit Queue:**
- Webhook antwortet sofort
- Verarbeitung im Hintergrund
- **Kein Timeout-Risiko**

**Job-Typ**: `process-payment-webhook`

---

## KATEGORIE D: Task/Lifecycle-Automatisierung

### 15. User-Erstellung mit Lifecycle
**Datei**: `backend/src/controllers/userController.ts` → `createUser()` (Zeile 1535-1734)
**Service**: `backend/src/services/lifecycleService.ts` → `createLifecycle()` (Zeile 67)

**Aktuell:**
- Lifecycle-Erstellung: ~1-3s (Zeile 1711)
- Task-Automatisierung: ~0.5-2s
- **Gesamt: 1.5-5 Sekunden blockiert**

**Mit Queue:**
- User sofort erstellt: <100ms
- Lifecycle + Tasks im Hintergrund
- **95% schneller**

**Konkreter Vorteil:**
- User kann sofort weiterarbeiten
- Lifecycle-Erstellung blockiert nicht

**Job-Typ**: `create-user-lifecycle`

---

### 16. Join Request Approval (Task-Automatisierung)
**Datei**: `backend/src/controllers/joinRequestController.ts` → `approveJoinRequest()` (Zeile 310, 318)

**Aktuell:**
- Task-Erstellung: ~0.5-2s pro Task (Zeile 310, 318)
- Mehrere Tasks sequentiell
- **Gesamt: 1-4 Sekunden blockiert**

**Mit Queue:**
- Approval sofort: <100ms
- Tasks im Hintergrund
- **90% schneller**

**Job-Typ**: `create-user-tasks`

---

### 17. Identification Document Upload (Task-Automatisierung)
**Datei**: `backend/src/controllers/identificationDocumentController.ts` → `addDocument()` (Zeile 242)

**Aktuell:**
- Task-Erstellung: ~0.5-2s (Zeile 242)
- **Gesamt: 0.5-2 Sekunden blockiert**

**Mit Queue:**
- Upload sofort abgeschlossen
- Task im Hintergrund
- **90% schneller**

**Job-Typ**: `create-document-task`

---

### 18. Lifecycle-Erstellung (Manuell)
**Datei**: `backend/src/controllers/lifecycleController.ts` → `createLifecycle()` (mehrere Stellen: Zeile 67, 269, 495)

**Aktuell:**
- Lifecycle-Erstellung: ~1-3s
- Task-Automatisierung: ~0.5-2s
- **Gesamt: 1.5-5 Sekunden blockiert**

**Mit Queue:**
- Response sofort: <100ms
- Lifecycle + Tasks im Hintergrund
- **95% schneller**

**Job-Typ**: `create-lifecycle`

---

## Zusammenfassung: Alle 18 Stellen

| # | Stelle | Kategorie | Aktuell | Mit Queue | Verbesserung | Priorität |
|---|--------|-----------|---------|-----------|--------------|-----------|
| 1 | Reservation-Erstellung | A | 2-6s | <100ms | 99% | ✅ **IMPLEMENTIERT** |
| 2 | Guest Contact Update | A | 3-8s | <100ms | 95% | 🔴 Hoch |
| 3 | Check-in-Bestätigung | A | 3-11s | <100ms | 90% | 🔴 Hoch |
| 4 | PIN-Generierung | A | 2-5s | <100ms | 95% | 🟡 Mittel |
| 5 | SIRE-Registrierung | A | 2-5s | <100ms | 95% | 🟡 Mittel |
| 6 | TTLock Passcode | A | 1-2s | <100ms | 90% | 🟢 Niedrig |
| 7 | Email-Reservation | A | 2-6s | <100ms | 95% | 🟡 Mittel |
| 8 | WhatsApp-Webhook | C | 1.5-5s | <100ms | 95% | 🔴 Hoch |
| 9 | Späte Check-in-Einladungen | B | 30-60s (10) | 3-6s (10) | **10x** | 🔴 Hoch |
| 10 | Monatsabrechnungen | B | 20-100s (10) | 2-10s (10) | **10x** | 🟡 Mittel |
| 11 | Email-Reservation Scheduler | B | Sequentiell | Parallel | **10x** | 🟡 Mittel |
| 12 | LobbyPMS Sync | B | Sequentiell | Parallel | **5-10x** | 🟡 Mittel |
| 13 | WhatsApp-Webhook | C | 1.5-5s | <100ms | 95% | 🔴 Hoch |
| 14 | Bold Payment Webhook | C | Variabel | <100ms | 95% | 🟡 Mittel |
| 15 | User-Erstellung | D | 1.5-5s | <100ms | 95% | 🟡 Mittel |
| 16 | Join Request Approval | D | 1-4s | <100ms | 90% | 🟢 Niedrig |
| 17 | Document Upload | D | 0.5-2s | <100ms | 90% | 🟢 Niedrig |
| 18 | Lifecycle-Erstellung | D | 1.5-5s | <100ms | 95% | 🟡 Mittel |

---

## Top-Prioritäten (nächste Schritte)

### Priorität 1: User-Interaktion (Frontend blockiert)
1. ✅ **Reservation-Erstellung** (IMPLEMENTIERT)
2. 🔴 **Guest Contact Update** - 95% schneller, sehr häufig genutzt
3. 🔴 **Check-in-Bestätigung** - 90% schneller, kritischer Prozess
4. 🔴 **WhatsApp-Webhook** - 95% schneller, verhindert Timeouts

### Priorität 2: Scheduled Jobs (Sequentiell)
5. 🔴 **Späte Check-in-Einladungen** - 10x schneller, täglich ausgeführt
6. 🟡 **Monatsabrechnungen** - 10x schneller, täglich ausgeführt

### Priorität 3: Weitere User-Interaktionen
7. 🟡 **PIN-Generierung** - 95% schneller
8. 🟡 **Email-Reservation** - 95% schneller

---

## Geschätzter Gesamt-Impact

### Performance-Verbesserungen
- **User-Interaktionen**: 90-99% schneller (8 Stellen)
- **Scheduled Jobs**: 5-10x schneller (4 Stellen)
- **Webhooks**: 95% schneller + kein Timeout-Risiko (2 Stellen)
- **Automatisierung**: 90-95% schneller (4 Stellen)

### Skalierbarkeit
- **Vorher**: Sequentiell, max. 1 Operation gleichzeitig
- **Nachher**: Parallel, 5+ Operationen gleichzeitig
- **Durchsatz**: 5-10x höher

### Zuverlässigkeit
- Automatische Retries bei allen 18 Stellen
- Dead Letter Queue für Fehleranalyse
- Rate Limiting für externe APIs

---

## Nächste Schritte

1. ✅ **Reservation-Erstellung** (FERTIG)
2. 🔴 **Guest Contact Update** (nächste Priorität)
3. 🔴 **Check-in-Bestätigung** (hohe Priorität)
4. 🔴 **Späte Check-in-Einladungen** (großer Impact)
5. 🔴 **WhatsApp-Webhook** (verhindert Timeouts)

**Gesamt**: 18 Stellen identifiziert, 1 implementiert, 17 noch zu migrieren

