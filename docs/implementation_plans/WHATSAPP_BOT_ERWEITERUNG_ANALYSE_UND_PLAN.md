# WhatsApp KI-Bot Erweiterung - Analyse und Implementierungsplan

**Datum:** 2025-01-22  
**Status:** Analyse & Plan - NICHTS UMSETZEN  
**Ziel:** Erweiterung des bestehenden WhatsApp KI-Bots um drei neue Use Cases

---

## 📋 Zusammenfassung der Anforderungen

1. **Gast-Code-Versand (ERWEITERT):** 
   - Bot soll Gästen (aus Reservationen) ihren Code zusenden, wenn sie am Eingang stehen und keinen Code haben
   - **NEU:** Gast-Identifikation auch ohne Telefonnummer (via Vorname, Nachname, Land, Geburtsdatum)
   - **NEU:** Status-Abfrage (Zahlungsstatus & Check-in-Status)
   - **NEU:** Link-Versand falls Zahlung oder Check-in nicht erledigt ist
   
2. **WhatsApp-Gruppe für Gäste:** Bot soll in einer WhatsApp-Gruppe für Gäste über Touren, Events, Aktionen, Services informieren und Hilfestellung für Reisende in Medellin bieten
   
3. **Mitarbeiter-Integration:** Bot soll für Mitarbeitende (User mit Telefonnummer im Profil) über Requests, To-Do's, Arbeitszeiten, Cerebro-Inhalte Bescheid wissen und je nach Rolle/Berechtigung antworten

---

## 🔍 Analyse: Was besteht bereits?

### 1. Bestehender WhatsApp KI-Bot

**Dateien:**
- `backend/src/services/whatsappMessageHandler.ts` - Hauptlogik für Nachrichtenverarbeitung
- `backend/src/services/whatsappAiService.ts` - OpenAI GPT-4o Integration
- `backend/src/controllers/whatsappController.ts` - Webhook-Endpoint
- `backend/src/services/whatsappService.ts` - WhatsApp Business API Service

**Bereits vorhandene Features:**
- ✅ Keyword-Erkennung: "requests", "todos", "request", "todo"
- ✅ User-Identifikation via Telefonnummer (`phoneNumber` im User Model)
- ✅ Conversation State Management (`WhatsAppConversation` Model)
- ✅ KI-Antworten mit OpenAI GPT-4o
- ✅ Branch-basierte Konfiguration (`whatsappSettings` im Branch Model)
- ✅ Sprach-Erkennung (aus Nachricht oder Telefonnummer)
- ✅ Konfigurierbare System Prompts, Regeln, Quellen pro Branch
- ✅ Interaktive Request/Task-Erstellung (teilweise implementiert)

**Datenbank-Schema:**
- ✅ `User.phoneNumber` - Telefonnummer im User-Profil vorhanden
- ✅ `Branch.whatsappSettings` - JSON-Feld für WhatsApp-Konfiguration
- ✅ `WhatsAppConversation` - Conversation State Management
- ✅ `WhatsAppPhoneNumberMapping` - Mapping für mehrere Branches pro Nummer

### 2. Reservationen und Codes

**Datenbank-Schema (`Reservation` Model):**
```prisma
model Reservation {
  id                       Int
  lobbyReservationId       String?  // LobbyPMS Booking ID (kann als Code verwendet werden)
  guestName                String    // ⭐ WICHTIG: Vollständiger Name (z.B. "Vorname Nachname")
  guestEmail               String?
  guestPhone               String?  // ⭐ WICHTIG: Telefonnummer des Gastes (kann fehlen!)
  guestNationality         String?  // ⭐ WICHTIG: Land für Identifikation
  guestBirthDate           DateTime? // ⭐ WICHTIG: Geburtsdatum für Identifikation (optional)
  doorPin                  String?  // PIN für Türsystem
  ttlLockPassword          String?  // TTLock Passcode/Password
  paymentStatus            PaymentStatus  // ⭐ WICHTIG: pending, paid, partially_paid, refunded
  status                   ReservationStatus  // ⭐ WICHTIG: confirmed, notification_sent, checked_in, etc.
  onlineCheckInCompleted   Boolean  // ⭐ WICHTIG: Check-in-Status
  paymentLink              String?  // ⭐ WICHTIG: Payment Link (Bold Payment)
  branchId                 Int?     // Branch-Zuordnung vorhanden
  // ... weitere Felder
}
```

**Verfügbare Codes:**
- `lobbyReservationId` - LobbyPMS Booking ID (kann als Check-in-Code verwendet werden)
- `doorPin` - PIN für Türsystem
- `ttlLockPassword` - TTLock Passcode/Password

**Status-Felder:**
- `paymentStatus` - Zahlungsstatus: `pending`, `paid`, `partially_paid`, `refunded`
- `status` - Reservierungsstatus: `confirmed`, `notification_sent`, `checked_in`, `checked_out`, `cancelled`, `no_show`
- `onlineCheckInCompleted` - Boolean: Check-in abgeschlossen

**Link-Generierung:**
- `paymentLink` - Payment Link (Bold Payment) - wird in DB gespeichert oder kann neu erstellt werden
- Check-in Link - wird via `generateLobbyPmsCheckInLink()` generiert (benötigt `lobbyReservationId` und `guestEmail`)

**Bestehende Services:**
- `backend/src/services/reservationNotificationService.ts` - Versendet bereits Check-in-Einladungen
- `backend/src/utils/checkInLinkUtils.ts` - Generiert LobbyPMS Check-in-Links
- `backend/src/services/boldPaymentService.ts` - Erstellt Payment Links (Bold Payment)

### 3. Berechtigungssystem

**Bereits vorhanden:**
- ✅ Permission System mit Rollen (`Role`, `Permission`, `UserRole`)
- ✅ Cerebro-Berechtigungen (`entityType: 'cerebro'`)
- ✅ Worktime-Zugriff vorhanden
- ✅ Requests/Tasks-Zugriff vorhanden
- ✅ Middleware: `checkUserPermission(userId, roleId, entity, requiredAccess, entityType)`

**Verfügbare Entity-Types:**
- `'page'` - Seiten-Zugriff
- `'table'` - Tabellen-Zugriff
- `'button'` - Button-Zugriff
- `'cerebro'` - Cerebro-Inhalte

**Verfügbare Access Levels:**
- `'read'` - Nur Lesen
- `'write'` - Schreiben
- `'both'` - Lesen und Schreiben
- `'none'` - Kein Zugriff

### 4. Datenzugriff für Mitarbeiter

**Verfügbare APIs/Models:**
- ✅ `Request` Model - Requests mit `requesterId`, `responsibleId`, `branchId`
- ✅ `Task` Model - Tasks mit `responsibleId`, `qualityControlId`, `branchId`
- ✅ `WorkTime` Model - Arbeitszeiten mit `userId`, `branchId`, `startTime`, `endTime`
- ✅ `Cerebro` Model - Wiki-Inhalte mit Berechtigungen
- ✅ User Model mit `phoneNumber` - Identifikation vorhanden

**Bereits im Bot implementiert:**
- ✅ Keyword "requests" - Liste aller Requests für User
- ✅ Keyword "todos" - Liste aller Tasks für User
- ✅ User-Identifikation via Telefonnummer funktioniert

### 5. WhatsApp-Gruppen

**Aktueller Stand:**
- ❌ Keine spezielle WhatsApp-Gruppen-Konfiguration vorhanden
- ❌ Keine Unterscheidung zwischen Einzel-Chats und Gruppen-Chats
- ✅ WhatsApp Business API unterstützt Gruppen (via `group_id` im Webhook)

**WhatsApp Business API Gruppen-Support:**
- Gruppen-Nachrichten haben `group_id` im Webhook
- Gruppen können über `phoneNumberId` identifiziert werden
- Gruppen-Nachrichten können über `sendMessage()` gesendet werden (mit `group_id`)

---

## 🎯 Use Case 1: Gast-Code-Versand

### Anforderung
Gäste, die am Eingang stehen und keinen Code haben, sollen ihren Code per WhatsApp erhalten können.

### Analyse

**Szenario:**
1. Gast steht am Eingang
2. Gast hat keinen Code (verloren, nicht erhalten, etc.)
3. Gast sendet WhatsApp-Nachricht (z.B. "Ich brauche meinen Code" oder "Code verloren")
4. Bot identifiziert Gast:
   - **Primär:** Via Telefonnummer (`guestPhone` in Reservation) - falls vorhanden
   - **Sekundär:** Via Abfragen (Vorname, Nachname, Land, Geburtsdatum) - falls Telefonnummer nicht vorhanden
5. Bot prüft Zahlungsstatus & Check-in-Status
6. Falls Zahlung oder Check-in nicht erledigt: Bot sendet entsprechende Links
7. Bot sendet Code per WhatsApp

**Erforderliche Komponenten:**

1. **Gast-Identifikation (Primär: Telefonnummer):**
   - Suche Reservation via `guestPhone` (normalisiert)
   - Filter: Aktive Reservationen (Status: `confirmed`, `notification_sent`, `checked_in`)
   - Filter: Check-in-Datum heute oder in der Vergangenheit
   - Filter: Check-out-Datum in der Zukunft oder heute

2. **Gast-Identifikation (Sekundär: Abfragen):**
   - Falls keine Telefonnummer vorhanden: Mehrstufige Conversation
   - Schritt 1: Frage nach Vorname
   - Schritt 2: Frage nach Nachname
   - Schritt 3: Frage nach Land (`guestNationality`)
   - Schritt 4: Frage nach Geburtsdatum (`guestBirthDate`) - falls vorhanden
   - Suche Reservation mit diesen Daten
   - Falls mehrere Treffer: Frage nach zusätzlichen Details

3. **Status-Abfrage:**
   - Prüfe `paymentStatus` (pending, paid, partially_paid, refunded)
   - Prüfe `status` (confirmed, notification_sent, checked_in, checked_out, cancelled, no_show)
   - Prüfe `onlineCheckInCompleted` (Boolean)

4. **Link-Generierung:**
   - **Payment Link:** Falls `paymentStatus !== 'paid'` → Verwende `reservation.paymentLink` oder erstelle neuen via `BoldPaymentService.createPaymentLink()`
   - **Check-in Link:** Falls `onlineCheckInCompleted === false` → Generiere via `generateLobbyPmsCheckInLink()` (benötigt `lobbyReservationId` und `guestEmail`)

5. **Code-Auswahl:**
   - Priorität: `lobbyReservationId` (Check-in-Code) → `doorPin` → `ttlLockPassword`
   - Falls kein Code vorhanden: Fehlermeldung

6. **Nachricht-Generierung:**
   - Sprach-Erkennung (aus Telefonnummer oder Nachricht)
   - Formatierte Nachricht mit:
     - Code (falls vorhanden)
     - Payment Link (falls Zahlung ausstehend)
     - Check-in Link (falls Check-in ausstehend)
     - Anweisungen

7. **Integration in Bot:**
   - Keyword-Erkennung: "code", "código", "pin", "password", "verloren", "lost", etc.
   - Oder: KI erkennt Intent "Code anfordern"
   - Conversation State Management für mehrstufige Identifikation

### Implementierungsplan

**Schritt 1: Gast-Identifikation Service**
- Neue Datei: `backend/src/services/whatsappGuestService.ts`
- Funktion: `identifyGuestByPhone(phoneNumber, branchId)` - Primär
- Funktion: `identifyGuestByDetails(firstName, lastName, nationality, birthDate?, branchId)` - Sekundär
- Funktion: `findReservationsByDetails(firstName, lastName, nationality, birthDate?, branchId)` - Suche mit Fuzzy-Matching

**Schritt 2: Conversation State für Gast-Identifikation**
- Erweitere `WhatsAppConversation.state`:
  - `guest_identification_name` - Warte auf Vorname
  - `guest_identification_lastname` - Warte auf Nachname
  - `guest_identification_nationality` - Warte auf Land
  - `guest_identification_birthdate` - Warte auf Geburtsdatum (optional)
  - `guest_identification_confirmation` - Warte auf Bestätigung (falls mehrere Treffer)
- Context speichern: `{ step: string, collectedData: {...}, candidateReservations: [...] }`

**Schritt 3: Status-Prüfung & Link-Generierung**
- Funktion: `checkReservationStatus(reservation)` - Prüft Zahlungs- und Check-in-Status
- Funktion: `getPaymentLink(reservation)` - Holt oder erstellt Payment Link
- Funktion: `getCheckInLink(reservation)` - Generiert Check-in Link
- Funktion: `buildStatusMessage(reservation, language)` - Erstellt Nachricht mit Status und Links

**Schritt 4: Code-Versand Service**
- Funktion: `sendGuestCode(phoneNumber, branchId)` - Mit Telefonnummer
- Funktion: `sendGuestCodeByIdentification(conversation, branchId)` - Mit Identifikation via Abfragen
- Identifiziert Gast
- Prüft Status
- Generiert Links (falls nötig)
- Findet Code
- Sendet Nachricht

**Schritt 5: Keyword-Erkennung erweitern**
- In `whatsappMessageHandler.ts`: Keyword "code", "código", "pin", etc.
- Handler: `handleGuestCodeRequest(phoneNumber, branchId, conversation)`
- Prüft zuerst Telefonnummer, dann startet Identifikation via Abfragen

**Schritt 6: Conversation Flow für Identifikation**
- In `whatsappMessageHandler.ts`: `continueGuestIdentification(phoneNumber, messageText, conversation, branchId)`
- Verarbeitet mehrstufige Abfragen
- Validiert Eingaben
- Sucht Reservationen
- Bei mehreren Treffern: Liste zur Auswahl

**Schritt 7: KI-Prompt erweitern**
- System Prompt: "Wenn ein Gast nach seinem Code fragt, identifiziere ihn zuerst via Telefonnummer. Falls keine Telefonnummer vorhanden ist, frage nach Vorname, Nachname, Land und Geburtsdatum. Prüfe dann Zahlungs- und Check-in-Status und sende entsprechende Links falls nötig."

### Detaillierte Implementierung: Mehrstufige Gast-Identifikation

**Flow-Diagramm:**

```
1. Gast sendet "code" / "código" / etc.
   ↓
2. Bot prüft: Hat Gast Telefonnummer in Reservation?
   ├─ JA → Identifiziere via Telefonnummer → Weiter zu Schritt 5
   └─ NEIN → Starte mehrstufige Identifikation
       ↓
3. Bot fragt: "Bitte gib deinen Vorname ein"
   ↓
4. Gast sendet Vorname
   ↓
5. Bot fragt: "Bitte gib deinen Nachname ein"
   ↓
6. Gast sendet Nachname
   ↓
7. Bot fragt: "Bitte gib dein Land ein"
   ↓
8. Gast sendet Land
   ↓
9. Bot fragt: "Bitte gib dein Geburtsdatum ein (optional, Format: DD.MM.YYYY)"
   ↓
10. Gast sendet Geburtsdatum (oder überspringt)
    ↓
11. Bot sucht Reservationen mit diesen Daten
    ├─ 0 Treffer → Fehlermeldung: "Keine Reservation gefunden"
    ├─ 1 Treffer → Weiter zu Schritt 5
    └─ Mehrere Treffer → Liste zur Auswahl
        ↓
12. Gast wählt Reservation aus
    ↓
13. Weiter zu Schritt 5
    ↓
14. Bot prüft Status:
    ├─ Zahlung ausstehend? → Generiere/Verwende Payment Link
    ├─ Check-in ausstehend? → Generiere Check-in Link
    └─ Beide erledigt? → Nur Code senden
    ↓
15. Bot sendet Nachricht mit:
    - Code (falls vorhanden)
    - Payment Link (falls Zahlung ausstehend)
    - Check-in Link (falls Check-in ausstehend)
    - Anweisungen
```

**Technische Details:**

1. **Name-Parsing:**
   - `guestName` ist ein einzelnes String-Feld (z.B. "Juan Pérez")
   - Parsing: Teile `guestName` am ersten Leerzeichen
   - Vorname: Erster Teil
   - Nachname: Rest (kann mehrere Wörter enthalten)
   - Fuzzy-Matching: Ignoriere Groß-/Kleinschreibung, Akzente

2. **Reservation-Suche:**
   ```typescript
   // Beispiel-Query
   const reservations = await prisma.reservation.findMany({
     where: {
       branchId: branchId,
       checkInDate: { lte: new Date() },  // Heute oder in der Vergangenheit
       checkOutDate: { gte: new Date() },  // Heute oder in der Zukunft
       status: { in: ['confirmed', 'notification_sent', 'checked_in'] },
       // Fuzzy-Matching für Name
       guestName: {
         contains: firstName,  // Enthält Vorname
         mode: 'insensitive'
       },
       guestNationality: nationality,  // Exakt
       guestBirthDate: birthDate ? { equals: birthDate } : undefined  // Optional
     }
   });
   ```

3. **Status-Prüfung:**
   ```typescript
   const needsPayment = reservation.paymentStatus !== 'paid';
   const needsCheckIn = !reservation.onlineCheckInCompleted;
   ```

4. **Link-Generierung:**
   ```typescript
   // Payment Link
   if (needsPayment) {
     if (reservation.paymentLink) {
       paymentLink = reservation.paymentLink;
     } else {
       // Erstelle neuen Payment Link
       const boldPaymentService = await BoldPaymentService.createForBranch(branchId);
       paymentLink = await boldPaymentService.createPaymentLink(
         reservation,
         Number(reservation.amount),
         reservation.currency || 'COP'
       );
     }
   }
   
   // Check-in Link
   if (needsCheckIn && reservation.guestEmail && reservation.lobbyReservationId) {
     checkInLink = generateLobbyPmsCheckInLink({
       id: reservation.id,
       lobbyReservationId: reservation.lobbyReservationId,
       guestEmail: reservation.guestEmail
     });
   }
   ```

5. **Nachricht-Generierung:**
   ```typescript
   let message = `Hola ${reservation.guestName}!\n\n`;
   
   if (needsPayment) {
     message += `Por favor, realiza el pago:\n${paymentLink}\n\n`;
   }
   
   if (needsCheckIn) {
     message += `Realiza el check-in en línea:\n${checkInLink}\n\n`;
   }
   
   if (code) {
     message += `Tu código de acceso: ${code}\n`;
   }
   
   message += `¡Te esperamos!`;
   ```

---

## 🎯 Use Case 2: WhatsApp-Gruppe für Gäste

### Anforderung
Bot soll in einer WhatsApp-Gruppe für Gäste über Touren, Events, Aktionen, Services informieren und Hilfestellung für Reisende in Medellin bieten.

### Analyse

**Szenario:**
1. WhatsApp-Gruppe für Gäste existiert
2. Bot ist Mitglied der Gruppe
3. Bot antwortet auf Fragen zu:
   - Touren
   - Events
   - Aktionen
   - Services
   - Hilfestellung für Reisende in Medellin

**Erforderliche Komponenten:**

1. **Gruppen-Erkennung:**
   - Webhook erkennt Gruppen-Nachrichten (via `group_id`)
   - Konfiguration: Welche `group_id` ist die Gäste-Gruppe?
   - Mapping: `group_id` → Branch → Konfiguration

2. **Gruppen-Konfiguration:**
   - Neue Felder in `Branch.whatsappSettings`:
     - `guestGroupId` - WhatsApp Group ID für Gäste
     - `guestGroupAiConfig` - Separate KI-Konfiguration für Gäste-Gruppe

3. **KI-Prompt für Gäste:**
   - System Prompt: "Du bist ein hilfreicher Assistent für Gäste in Medellin. Du informierst über Touren, Events, Aktionen, Services und bietest Hilfestellung für Reisende."
   - Quellen: Links zu Touren, Events, Services (können in `sources` konfiguriert werden)

4. **Datenbank-Erweiterung:**
   - Optional: Neue Tabelle `WhatsAppGroup` für Gruppen-Konfiguration
   - Oder: In `Branch.whatsappSettings` als JSON

### Implementierungsplan

**Schritt 1: Gruppen-Erkennung im Webhook**
- In `whatsappController.ts`: Prüfe `group_id` in Webhook
- Identifiziere Branch via `group_id` → Mapping

**Schritt 2: Gruppen-Konfiguration**
- Erweitere `Branch.whatsappSettings`:
  ```typescript
  {
    // ... bestehende Settings ...
    guestGroup?: {
      groupId: string;  // WhatsApp Group ID
      ai?: {
        enabled: boolean;
        systemPrompt: string;
        rules: string[];
        sources: string[];  // Links zu Touren, Events, Services
        // ... weitere AI-Config
      }
    }
  }
  ```

**Schritt 3: KI-Prompt für Gäste**
- Separate KI-Konfiguration für Gäste-Gruppe
- System Prompt: "Du bist ein hilfreicher Assistent für Gäste in Medellin..."
- Quellen: Links zu Touren, Events, Services

**Schritt 4: Message Handler erweitern**
- In `whatsappMessageHandler.ts`: Prüfe ob Nachricht aus Gruppe kommt
- Verwende Gäste-KI-Konfiguration statt Mitarbeiter-KI-Konfiguration

---

## 🎯 Use Case 3: Mitarbeiter-Integration (erweitert)

### Anforderung
Bot soll für Mitarbeitende über Requests, To-Do's, Arbeitszeiten, Cerebro-Inhalte Bescheid wissen und je nach Rolle/Berechtigung antworten.

### Analyse

**Bereits vorhanden:**
- ✅ Keyword "requests" - Liste aller Requests
- ✅ Keyword "todos" - Liste aller Tasks
- ✅ User-Identifikation via Telefonnummer
- ✅ Berechtigungssystem vorhanden

**Erforderliche Erweiterungen:**

1. **Arbeitszeiten-Integration:**
   - Keyword: "arbeitszeit", "worktime", "horas", etc.
   - Zeige aktuelle Arbeitszeit
   - Zeige Arbeitszeiten der letzten Tage/Woche
   - Zeige Überstunden

2. **Cerebro-Integration:**
   - KI soll auf Cerebro-Inhalte zugreifen können
   - Berechtigungen prüfen (via `checkUserPermission`)
   - Cerebro-Inhalte als Context für KI-Antworten

3. **Erweiterte KI-Prompts:**
   - System Prompt: "Du hast Zugriff auf Requests, Tasks, Arbeitszeiten und Cerebro-Inhalte. Verwende diese Informationen beim Antworten."
   - Context-Injection: Füge relevante Daten in System Prompt ein

4. **Berechtigungsprüfung:**
   - Prüfe Berechtigungen vor Datenzugriff
   - Zeige nur Daten, die User sehen darf

### Implementierungsplan

**Schritt 1: Arbeitszeiten-Keyword**
- In `whatsappMessageHandler.ts`: Keyword "arbeitszeit", "worktime", "horas"
- Funktion: `handleWorktimeKeyword(userId, branchId)`
- Zeige aktuelle Arbeitszeit, letzte Arbeitszeiten, Überstunden

**Schritt 2: Cerebro-Integration**
- Neue Funktion: `getCerebroContentForUser(userId, roleId, branchId)`
- Prüfe Berechtigungen via `checkUserPermission`
- Lade Cerebro-Inhalte, die User sehen darf
- Füge als Context in KI-Prompt ein

**Schritt 3: KI-Prompt erweitern**
- System Prompt: "Du hast Zugriff auf folgende Informationen:"
  - Requests: [Liste]
  - Tasks: [Liste]
  - Arbeitszeiten: [Aktuelle Arbeitszeit]
  - Cerebro: [Relevante Inhalte]
- Context wird dynamisch generiert basierend auf User-Berechtigungen

**Schritt 4: Context-Generierung**
- Neue Funktion: `buildUserContext(userId, branchId)`
- Lädt:
  - Offene Requests (mit Berechtigung)
  - Offene Tasks (mit Berechtigung)
  - Aktuelle Arbeitszeit
  - Cerebro-Inhalte (mit Berechtigung)
- Fügt in System Prompt ein

---

## 📊 Datenbank-Änderungen

### 1. Branch WhatsApp Settings erweitern

**Aktuell:**
```typescript
Branch.whatsappSettings: {
  provider: string;
  apiKey: string;
  phoneNumberId: string;
  ai: {
    enabled: boolean;
    systemPrompt: string;
    rules: string[];
    sources: string[];
    // ...
  }
}
```

**Erweitert:**
```typescript
Branch.whatsappSettings: {
  // ... bestehende Settings ...
  guestGroup?: {
    groupId: string;  // WhatsApp Group ID für Gäste-Gruppe
    ai?: {
      enabled: boolean;
      systemPrompt: string;
      rules: string[];
      sources: string[];  // Links zu Touren, Events, Services
      temperature?: number;
      maxTokens?: number;
    }
  }
}
```

**Migration:** Keine Migration erforderlich (JSON-Feld, erweitert sich automatisch)

### 2. WhatsApp Group Mapping (optional)

**Neue Tabelle (optional):**
```prisma
model WhatsAppGroup {
  id              Int       @id @default(autoincrement())
  groupId         String    @unique  // WhatsApp Group ID
  branchId        Int
  groupType       String    // "guest", "staff", etc.
  name            String?
  description     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  branch          Branch    @relation(fields: [branchId], references: [id])

  @@index([branchId])
  @@index([groupId])
}
```

**Relation in Branch:**
```prisma
model Branch {
  // ... bestehende Felder ...
  whatsappGroups  WhatsAppGroup[]
}
```

**Migration:** Optional, kann auch in JSON gespeichert werden

---

## 🔧 Implementierungs-Schritte

### Phase 1: Gast-Code-Versand

1. **Gast-Identifikation Service**
   - Datei: `backend/src/services/whatsappGuestService.ts` (neu)
   - Funktion: `identifyGuestByPhone(phoneNumber, branchId)` - Primär
   - Funktion: `identifyGuestByDetails(firstName, lastName, nationality, birthDate?, branchId)` - Sekundär
   - Funktion: `findReservationsByDetails(firstName, lastName, nationality, birthDate?, branchId)` - Suche mit Fuzzy-Matching
   - Funktion: `checkReservationStatus(reservation)` - Prüft Zahlungs- und Check-in-Status
   - Funktion: `getPaymentLink(reservation)` - Holt oder erstellt Payment Link
   - Funktion: `getCheckInLink(reservation)` - Generiert Check-in Link
   - Funktion: `buildStatusMessage(reservation, language)` - Erstellt Nachricht mit Status und Links

2. **Conversation State Management**
   - Erweitere `WhatsAppConversation.state` um Gast-Identifikation States:
     - `guest_identification_name`
     - `guest_identification_lastname`
     - `guest_identification_nationality`
     - `guest_identification_birthdate`
     - `guest_identification_confirmation`
   - Context speichern: `{ step: string, collectedData: {...}, candidateReservations: [...] }`

3. **Keyword-Erkennung erweitern**
   - Datei: `backend/src/services/whatsappMessageHandler.ts`
   - Keywords: "code", "código", "pin", "password", "verloren", "lost"
   - Handler: `handleGuestCodeRequest(phoneNumber, branchId, conversation)`
   - Prüft zuerst Telefonnummer, dann startet Identifikation via Abfragen

4. **Conversation Flow für Identifikation**
   - Datei: `backend/src/services/whatsappMessageHandler.ts`
   - Funktion: `continueGuestIdentification(phoneNumber, messageText, conversation, branchId)`
   - Verarbeitet mehrstufige Abfragen
   - Validiert Eingaben
   - Sucht Reservationen
   - Bei mehreren Treffern: Liste zur Auswahl

5. **Code-Versand Service**
   - Funktion: `sendGuestCode(phoneNumber, branchId)` - Mit Telefonnummer
   - Funktion: `sendGuestCodeByIdentification(conversation, branchId)` - Mit Identifikation via Abfragen
   - Identifiziert Gast
   - Prüft Status
   - Generiert Links (falls nötig)
   - Findet Code
   - Sendet Nachricht

6. **KI-Prompt erweitern**
   - Datei: `backend/src/services/whatsappAiService.ts`
   - System Prompt: "Wenn ein Gast nach seinem Code fragt, identifiziere ihn zuerst via Telefonnummer. Falls keine Telefonnummer vorhanden ist, frage nach Vorname, Nachname, Land und Geburtsdatum. Prüfe dann Zahlungs- und Check-in-Status und sende entsprechende Links falls nötig."

### Phase 2: WhatsApp-Gruppe für Gäste

1. **Gruppen-Erkennung im Webhook**
   - Datei: `backend/src/controllers/whatsappController.ts`
   - Prüfe `group_id` in Webhook
   - Identifiziere Branch via `group_id`

2. **Gruppen-Konfiguration**
   - Erweitere `Branch.whatsappSettings` um `guestGroup`
   - Frontend: UI für Gruppen-Konfiguration (optional)

3. **Message Handler erweitern**
   - Datei: `backend/src/services/whatsappMessageHandler.ts`
   - Prüfe ob Nachricht aus Gruppe kommt
   - Verwende Gäste-KI-Konfiguration

### Phase 3: Mitarbeiter-Integration (erweitert)

1. **Arbeitszeiten-Keyword**
   - Datei: `backend/src/services/whatsappMessageHandler.ts`
   - Keywords: "arbeitszeit", "worktime", "horas"
   - Handler: `handleWorktimeKeyword(userId, branchId)`

2. **Cerebro-Integration**
   - Datei: `backend/src/services/whatsappCerebroService.ts` (neu)
   - Funktion: `getCerebroContentForUser(userId, roleId, branchId)`
   - Prüfe Berechtigungen

3. **Context-Generierung**
   - Datei: `backend/src/services/whatsappAiService.ts`
   - Funktion: `buildUserContext(userId, branchId)`
   - Lädt Requests, Tasks, Arbeitszeiten, Cerebro-Inhalte

4. **KI-Prompt erweitern**
   - System Prompt: "Du hast Zugriff auf folgende Informationen..."
   - Context wird dynamisch generiert

---

## 📝 Konfiguration

### Branch WhatsApp Settings (erweitert)

```json
{
  "provider": "whatsapp-business-api",
  "apiKey": "...",
  "phoneNumberId": "...",
  "ai": {
    "enabled": true,
    "model": "gpt-4o",
    "systemPrompt": "Du bist ein hilfreicher Assistent für Mitarbeiter...",
    "rules": [
      "Antworte auf Spanisch",
      "Sei freundlich"
    ],
    "sources": [],
    "temperature": 0.7,
    "maxTokens": 500
  },
  "guestGroup": {
    "groupId": "120363123456789012@g.us",
    "ai": {
      "enabled": true,
      "model": "gpt-4o",
      "systemPrompt": "Du bist ein hilfreicher Assistent für Gäste in Medellin. Du informierst über Touren, Events, Aktionen, Services und bietest Hilfestellung für Reisende.",
      "rules": [
        "Antworte auf Spanisch",
        "Sei freundlich und hilfreich",
        "Informiere über verfügbare Touren, Events und Services"
      ],
      "sources": [
        "https://example.com/tours",
        "https://example.com/events",
        "https://example.com/services"
      ],
      "temperature": 0.7,
      "maxTokens": 500
    }
  }
}
```

---

## ✅ Checkliste

### Use Case 1: Gast-Code-Versand ✅ FERTIG
- [x] Gast-Identifikation Service erstellen (Telefonnummer + Abfragen)
- [x] Conversation State Management für mehrstufige Identifikation
- [x] Status-Prüfung & Link-Generierung (Payment & Check-in)
- [x] Code-Versand Service erstellen
- [x] Keyword-Erkennung erweitern
- [x] Conversation Flow für Identifikation implementieren
- [x] KI-Prompt erweitern
- [ ] Testen: Gast sendet "code" → Bot identifiziert → Bot sendet Code + Links (falls nötig)
- [ ] Testen: Gast ohne Telefonnummer → Bot fragt nach Name, Land, Geburtsdatum → Bot identifiziert → Bot sendet Code + Links

### Use Case 2: WhatsApp-Gruppe für Gäste ✅ FERTIG
- [x] Gruppen-Erkennung im Webhook
- [x] Gruppen-Konfiguration in Branch Settings
- [x] Message Handler für Gruppen erweitern
- [x] KI-Prompt für Gäste konfigurieren
- [ ] Testen: Bot antwortet in Gäste-Gruppe

### Use Case 3: Mitarbeiter-Integration (Function Calling) ⏳ PLAN BEREIT
- [ ] Function Definitions erstellen (get_requests, get_todos, get_worktime, get_cerebro_articles, get_user_info)
- [ ] Function Handlers implementieren (mit Berechtigungsprüfung)
- [ ] OpenAI API erweitern (tools Parameter, tool_calls verarbeiten)
- [ ] User Context erweitern (Rollen für Berechtigungen)
- [ ] Hybrid-Ansatz implementieren (Keywords + Function Calling)
- [ ] System Prompt erweitern
- [ ] Testing (einfache + komplexe Anfragen, Berechtigungen, Fehlerbehandlung)
- [ ] Monitoring & Kosten-Tracking

### Use Case 3: Mitarbeiter-Integration (erweitert)
- [ ] Arbeitszeiten-Keyword implementieren
- [ ] Cerebro-Integration implementieren
- [ ] Context-Generierung implementieren
- [ ] KI-Prompt erweitern
- [ ] Berechtigungsprüfung implementieren
- [ ] Testen: Mitarbeiter fragt nach Arbeitszeit → Bot zeigt Arbeitszeit

---

## 🚨 Wichtige Hinweise

1. **Keine Migration erforderlich:** Alle Erweiterungen nutzen bestehende JSON-Felder
2. **Rückwärtskompatibilität:** Bestehende Funktionalität bleibt erhalten
3. **Berechtigungen:** Immer Berechtigungen prüfen vor Datenzugriff
4. **Sprach-Erkennung:** Bereits vorhanden, kann weiterverwendet werden
5. **KI-Kosten:** Mehr Context = mehr Tokens = höhere Kosten

---

## 📚 Referenzen

- `backend/src/services/whatsappMessageHandler.ts` - Hauptlogik
- `backend/src/services/whatsappAiService.ts` - KI-Integration
- `backend/src/controllers/whatsappController.ts` - Webhook
- `backend/prisma/schema.prisma` - Datenbank-Schema
- `docs/technical/WHATSAPP_AI_KONFIGURATION.md` - KI-Konfiguration
- `docs/implementation_plans/WHATSAPP_BRANCH_INTEGRATION.md` - Bestehende Integration

---

## 🎯 Nächste Schritte

1. ✅ Analyse abgeschlossen
2. ⏳ Plan vom User bestätigen lassen
3. ⏳ Phase 1: Gast-Code-Versand implementieren
4. ⏳ Phase 2: WhatsApp-Gruppe für Gäste implementieren
5. ⏳ Phase 3: Mitarbeiter-Integration erweitern
6. ⏳ Testing & Dokumentation

