# WhatsApp-Nachricht Ablauf Analyse

**Datum:** 2025-02-01  
**Zweck:** Analyse des aktuellen Ablaufs bei eingehenden WhatsApp-Nachrichten und Vergleich mit gewünschtem Verhalten

---

## 1. Gewünschter Ablauf (Anforderung)

### 1.1 Schritt 1: User-Profil-Prüfung
**Wenn Nummer einem User-Profil angehört:**
- ✅ User mit Intranet-Daten Auskunft geben (funktioniert mehr schlecht als recht)
- ❌ Konversation dem User als Notifications anzeigen (**funktioniert NICHT**)
- ✅ Nicht in Reservations schauen (sollte nicht passieren)

### 1.2 Schritt 2: Aktuelle Reservation-Prüfung
**Falls Nummer NICHT in User-Profil:**
- Prüfe ob Nummer in **aktueller Reservation** (aktuelles Datum >= checkIn && <= checkOut)
- ✅ Falls ja: Konversation dort speichern & anzeigen (**funktioniert teilweise**)

### 1.3 Schritt 3: Potential Reservation-Erstellung
**Falls weder User noch aktuelle Reservation:**
- ✅ Neue Reservation mit Status "potential" anlegen
- ✅ Konversation darin speichern

### 1.4 Schritt 4: LobbyPMS-Zusammenführung
**Wenn solche Nummer per WhatsApp Reservation erstellt:**
- Diese Reservation mit LobbyPMS-importierter Reservation (gleiche Nummer) zusammenführen

---

## 2. Aktueller Ablauf (Code-Analyse)

### 2.1 Entry Point: `whatsappController.ts`

**Datei:** `backend/src/controllers/whatsappController.ts`  
**Zeile:** 134-180

**Aktueller Code:**
```typescript
// 1.5. Speichere eingehende Nachricht in Datenbank
try {
  const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(fromNumber);
  const messageId = message.id;
  
  // Hole oder erstelle Conversation für conversationId
  let conversationId: number | null = null;
  try {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: {
        phoneNumber_branchId: {
          phoneNumber: normalizedPhone,
          branchId: branchId
        }
      },
      select: { id: true }
    });
    conversationId = conversation?.id || null;
  } catch (convError) {
    logger.error('[WhatsApp Webhook] Fehler beim Laden der Conversation:', convError);
  }
  
  // Prüfe ob es eine Reservation zu dieser Telefonnummer gibt
  const reservation = await prisma.reservation.findFirst({
    where: {
      guestPhone: normalizedPhone,
      branchId: branchId
    },
    orderBy: {
      checkInDate: 'desc'
    }
  });
  
  // Speichere Nachricht
  await prisma.whatsAppMessage.create({
    data: {
      direction: 'incoming',
      phoneNumber: normalizedPhone,
      message: messageText,
      messageId: messageId,
      branchId: branchId,
      conversationId: conversationId,
      reservationId: reservation?.id || null,
      sentAt: new Date(parseInt(message.timestamp) * 1000)
    }
  });
```

**Probleme:**
1. ❌ **Keine Prüfung auf "aktuelle Reservation"** (nur checkInDate: 'desc', keine Datum-Prüfung)
2. ❌ **Keine Prüfung ob User existiert** (wird erst später in `whatsappMessageHandler.ts` gemacht)
3. ❌ **Keine Erstellung von "potential" Reservation** wenn weder User noch Reservation

---

### 2.2 Message Handler: `whatsappMessageHandler.ts`

**Datei:** `backend/src/services/whatsappMessageHandler.ts`  
**Zeile:** 30-392

**Aktueller Ablauf:**

#### Schritt 1: User-Identifikation (Zeile 46)
```typescript
const user = await this.identifyUser(normalizedPhone, branchId);
```

**Status:** ✅ **IMPLEMENTIERT**
- Sucht User via Telefonnummer
- Prüft verschiedene Telefonnummer-Formate
- Filtert nach Branch

**Problem:**
- ❌ **Keine Notification-Erstellung** für User (siehe Abschnitt 2.5)

#### Schritt 2: Conversation laden/erstellen (Zeile 127)
```typescript
const conversation = await this.getOrCreateConversation(normalizedPhone, branchId, user?.id);
```

**Status:** ✅ **IMPLEMENTIERT**
- Erstellt/lädt Conversation
- Verknüpft mit User wenn vorhanden

#### Schritt 3: Nachricht verarbeiten (Zeile 129-164)
```typescript
// Normalisiere Nachricht & aktualisiere Kontext
const normalizedMessage = WhatsAppMessageNormalizer.normalize(messageText);
const coreContext = await ContextService.getContext(conversation.id, 'WhatsAppConversation');
// ... weitere Verarbeitung
```

**Status:** ✅ **IMPLEMENTIERT**
- Verarbeitet Nachricht über Core Services
- Aktualisiert Context

#### Schritt 4: KI-Antwort generieren (Zeile 221-228)
```typescript
const aiResult = await WhatsAppAiService.generateResponse(
  normalizedMessage,
  branchId,
  normalizedPhone,
  mergedContext,
  conversation.id
);
return aiResult.message;
```

**Status:** ✅ **IMPLEMENTIERT**
- Generiert KI-Antwort
- Unterstützt Function Calling

**Probleme:**
1. ❌ **Keine Prüfung auf "aktuelle Reservation"** (nur in `whatsappController.ts`, aber ohne Datum-Prüfung)
2. ❌ **Keine automatische Erstellung von "potential" Reservation** wenn weder User noch Reservation
3. ❌ **Keine Notification-Erstellung** für User

---

### 2.3 Reservation-Verknüpfung in `whatsappController.ts`

**Datei:** `backend/src/controllers/whatsappController.ts`  
**Zeile:** 157-180

**Aktueller Code:**
```typescript
// Prüfe ob es eine Reservation zu dieser Telefonnummer gibt
const reservation = await prisma.reservation.findFirst({
  where: {
    guestPhone: normalizedPhone,
    branchId: branchId
  },
  orderBy: {
    checkInDate: 'desc'
  }
});

// Speichere Nachricht
await prisma.whatsAppMessage.create({
  data: {
    // ...
    reservationId: reservation?.id || null,
  }
});
```

**Probleme:**
1. ❌ **Keine Prüfung auf "aktuelle Reservation"** (aktuelles Datum >= checkIn && <= checkOut)
   - Aktuell: Nimmt einfach die neueste Reservation (checkInDate: 'desc')
   - Sollte: Nur Reservationen im Zeitraum (heute >= checkIn && heute <= checkOut)

2. ❌ **Keine automatische Erstellung von "potential" Reservation** wenn keine Reservation gefunden

---

### 2.4 Potential Reservation-Erstellung

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`  
**Zeile:** 1513-1738

**Status:** ✅ **FUNKTION EXISTIERT** (`create_potential_reservation`)

**Aktueller Ablauf:**
- ✅ **KI Function Calling ist die automatische Erstellung**
- Die KI erkennt Buchungs-Intent in der Nachricht
- Wenn User erste Buchungsinformationen gibt (Check-in, Check-out, Zimmer) ABER noch nicht ALLE Daten hat → ruft KI `create_potential_reservation()` auf
- System Prompt enthält klare Anweisungen (siehe `PromptBuilder.ts` Zeile 329-339)
- Funktioniert bereits korrekt über KI Function Calling

**Status:** ✅ **IMPLEMENTIERT UND FUNKTIONIERT**

---

### 2.5 Notification-Erstellung für User

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Status:** ❌ **NICHT IMPLEMENTIERT**

**Gewünschtes Verhalten:**
- Wenn User gefunden: Erstelle Notification für User
- Notification sollte Konversation anzeigen
- Notification sollte auf WhatsApp-Konversation verlinken

**Aktueller Code:**
- Keine Notification-Erstellung vorhanden
- Keine Verknüpfung zwischen WhatsApp-Nachricht und User-Notification

**Benötigte Änderungen:**
1. Nach User-Identifikation (Zeile 46): Prüfe ob User gefunden
2. Wenn User gefunden: Erstelle Notification
3. Notification sollte enthalten:
   - Title: "Neue WhatsApp-Nachricht"
   - Message: Erste 100 Zeichen der Nachricht
   - Type: `'info'` oder neuer Type `'whatsapp'`
   - relatedEntityId: `conversation.id`
   - relatedEntityType: `'whatsapp_conversation'`

---

### 2.6 LobbyPMS-Zusammenführung

**Datei:** `backend/src/services/lobbyPmsService.ts`  
**Zeile:** 946-1309

**Aktueller Code:**
```typescript
async syncReservation(lobbyReservation: LobbyPmsReservation): Promise<Reservation> {
  // ...
  // Upsert: Erstelle oder aktualisiere Reservierung
  let reservation = await prisma.reservation.upsert({
    where: {
      lobbyReservationId: bookingId
    },
    create: reservationData,
    update: reservationData
  });
  // ...
}
```

**Probleme:**
1. ❌ **Keine Zusammenführung mit "potential" Reservationen**
   - Aktuell: Sucht nur nach `lobbyReservationId` (wird bei "potential" Reservationen nicht gesetzt)
   - Sollte: Prüfe auch nach `guestPhone` + Datum-Überlappung
   - Wenn "potential" Reservation gefunden:
     - Übernehme `lobbyReservationId` von LobbyPMS
     - Aktualisiere Status von "potential" auf "confirmed"
     - Übernehme weitere Daten von LobbyPMS (roomNumber, roomDescription, etc.)
     - Verknüpfe WhatsApp-Nachrichten mit aktualisierter Reservation

---

## 3. Kritische Probleme & Lücken

### 3.1 Problem 1: Keine Prüfung auf "aktuelle Reservation"

**Aktuell:**
- `whatsappController.ts` (Zeile 158-166): Sucht nach Reservation, aber ohne Datum-Prüfung
- Nimmt einfach die neueste Reservation (checkInDate: 'desc')

**Sollte:**
- Prüfe ob Reservation im Zeitraum liegt: `heute >= checkInDate && heute <= checkOutDate`
- Nur dann verknüpfe Nachricht mit Reservation

**Code-Änderung benötigt:**
```typescript
// In whatsappController.ts, Zeile 157-166
const today = new Date();
today.setHours(0, 0, 0, 0);

const reservation = await prisma.reservation.findFirst({
  where: {
    guestPhone: normalizedPhone,
    branchId: branchId,
    checkInDate: { lte: today }, // Check-in ist heute oder früher
    checkOutDate: { gte: today }  // Check-out ist heute oder später
  },
  orderBy: {
    checkInDate: 'desc'
  }
});
```

---

### 3.2 Problem 2: Keine automatische "potential" Reservation-Erstellung

**Aktuell:**
- Wenn weder User noch Reservation: Keine automatische Erstellung
- `create_potential_reservation` existiert, wird aber nur über KI Function Calling aufgerufen

**Sollte:**
- Wenn weder User noch aktuelle Reservation:
  - Prüfe ob Nachricht Buchungs-Intent enthält (z.B. "reservieren", "buchung", "zimmer", etc.)
  - Wenn ja: Erstelle automatisch "potential" Reservation
  - Verknüpfe alle WhatsApp-Nachrichten mit dieser Reservation

**Code-Änderung benötigt:**
- In `whatsappMessageHandler.ts`, nach User-Identifikation und Reservation-Prüfung:
  - Wenn kein User && keine aktuelle Reservation:
    - Prüfe Buchungs-Intent (via MessageParserService oder Keyword-Erkennung)
    - Wenn Intent erkannt: Rufe `create_potential_reservation` auf (oder erstelle direkt)

---

### 3.3 Problem 3: Keine Notification-Erstellung für User

**Aktuell:**
- Keine Notification-Erstellung vorhanden

**Sollte:**
- Wenn User gefunden: Erstelle Notification
- Notification sollte Konversation anzeigen

**Code-Änderung benötigt:**
```typescript
// In whatsappMessageHandler.ts, nach User-Identifikation (Zeile 46)
if (user) {
  // Erstelle Notification für User
  const { createNotificationIfEnabled } = await import('../controllers/notificationController');
  await createNotificationIfEnabled({
    userId: user.id,
    title: 'Neue WhatsApp-Nachricht',
    message: messageText.substring(0, 100) + (messageText.length > 100 ? '...' : ''),
    type: 'info', // oder neuer Type 'whatsapp'
    relatedEntityId: conversation.id,
    relatedEntityType: 'whatsapp_conversation'
  });
}
```

---

### 3.4 Problem 4: Keine Zusammenführung mit LobbyPMS-Reservationen

**Aktuell:**
- `lobbyPmsService.ts` sucht nur nach `lobbyReservationId`
- "potential" Reservationen haben kein `lobbyReservationId`

**Sollte:**
- Beim LobbyPMS-Import: Prüfe auch nach "potential" Reservationen mit gleicher Telefonnummer
- Wenn gefunden: Übernehme `lobbyReservationId`, aktualisiere Status, verknüpfe Nachrichten

**Code-Änderung benötigt:**
```typescript
// In lobbyPmsService.ts, syncReservation(), vor upsert (Zeile 1167)
// 1. Prüfe ob bereits Reservation mit lobbyReservationId existiert
const existingByLobbyId = await prisma.reservation.findUnique({
  where: { lobbyReservationId: bookingId }
});

if (existingByLobbyId) {
  // Normale Logik: Update
} else {
  // 2. Prüfe ob "potential" Reservation mit gleicher Telefonnummer existiert
  if (guestPhone) {
    const potentialReservation = await prisma.reservation.findFirst({
      where: {
        guestPhone: guestPhone,
        branchId: branchId,
        status: ReservationStatus.potential,
        // Optional: Prüfe auch Datum-Überlappung
        OR: [
          {
            checkInDate: { lte: checkInDate },
            checkOutDate: { gte: checkInDate }
          },
          {
            checkInDate: { lte: checkOutDate },
            checkOutDate: { gte: checkOutDate }
          }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (potentialReservation) {
      // Zusammenführung: Aktualisiere "potential" Reservation
      reservation = await prisma.reservation.update({
        where: { id: potentialReservation.id },
        data: {
          ...reservationData,
          lobbyReservationId: bookingId, // WICHTIG: Setze lobbyReservationId
          status: ReservationStatus.confirmed // Status von "potential" auf "confirmed"
        }
      });

      // Verknüpfe WhatsApp-Nachrichten (falls noch nicht verknüpft)
      await prisma.whatsAppMessage.updateMany({
        where: {
          phoneNumber: guestPhone,
          branchId: branchId,
          reservationId: null
        },
        data: {
          reservationId: reservation.id
        }
      });

      return reservation;
    }
  }
  
  // 3. Normale Logik: Erstelle neue Reservation
  reservation = await prisma.reservation.upsert({...});
}
```

---

## 4. Zusammenfassung: Gewünschter vs. Aktueller Ablauf

### 4.1 Schritt 1: User-Profil-Prüfung

| Gewünscht | Aktuell | Status |
|-----------|---------|--------|
| Prüfe ob Nummer User-Profil angehört | ✅ Implementiert (Zeile 46) | ✅ |
| User mit Intranet-Daten Auskunft geben | ✅ Implementiert (via KI Function Calling) | ⚠️ "mehr schlecht als recht" |
| Konversation als Notifications anzeigen | ❌ Nicht implementiert | ❌ |
| Nicht in Reservations schauen | ⚠️ Wird trotzdem gemacht (Zeile 157-166) | ❌ |

---

### 4.2 Schritt 2: Aktuelle Reservation-Prüfung

| Gewünscht | Aktuell | Status |
|-----------|---------|--------|
| Prüfe ob Nummer in aktueller Reservation (heute >= checkIn && <= checkOut) | ❌ Nur neueste Reservation (ohne Datum-Prüfung) | ❌ |
| Konversation dort speichern & anzeigen | ⚠️ Teilweise (nur wenn Reservation gefunden) | ⚠️ "teilweise" |

---

### 4.3 Schritt 3: Potential Reservation-Erstellung

| Gewünscht | Aktuell | Status |
|-----------|---------|--------|
| Neue Reservation mit Status "potential" anlegen | ✅ KI Function Calling ruft `create_potential_reservation` auf | ✅ |
| Konversation darin speichern | ✅ Implementiert (Zeile 1685-1721) | ✅ |

---

### 4.4 Schritt 4: LobbyPMS-Zusammenführung

| Gewünscht | Aktuell | Status |
|-----------|---------|--------|
| Reservation mit LobbyPMS-importierter Reservation zusammenführen | ❌ Sucht nur nach `lobbyReservationId` | ❌ |

---

## 5. Implementierungsplan

### 5.1 Priorität 1: Kritische Lücken schließen

#### 5.1.1 Aktuelle Reservation-Prüfung
**Datei:** `backend/src/controllers/whatsappController.ts`  
**Zeile:** 157-166

**Änderung:**
- Füge Datum-Prüfung hinzu (heute >= checkIn && heute <= checkOut)
- Nur dann verknüpfe Nachricht mit Reservation

#### 5.1.2 Notification-Erstellung für User
**Datei:** `backend/src/services/whatsappMessageHandler.ts`  
**Zeile:** Nach User-Identifikation (ca. Zeile 46-127)

**Änderung:**
- Wenn User gefunden: Erstelle Notification
- Notification sollte Konversation anzeigen

---

### 5.2 Priorität 2: LobbyPMS-Zusammenführung

#### 5.2.1 Zusammenführung mit "potential" Reservationen
**Datei:** `backend/src/services/lobbyPmsService.ts`  
**Zeile:** `syncReservation()` (ca. Zeile 946-1309)

**Änderung:**
- Prüfe auch nach "potential" Reservationen mit gleicher Telefonnummer
- Wenn gefunden: Übernehme `lobbyReservationId`, aktualisiere Status, verknüpfe Nachrichten

---

## 6. Nächste Schritte

1. ✅ **Analyse abgeschlossen** (dieses Dokument)
2. ⏳ **Implementierungsplan erstellen** (separates Dokument)
3. ⏳ **Code-Änderungen umsetzen** (nach Freigabe)
4. ⏳ **Tests durchführen** (manuell + automatisiert)
5. ⏳ **Dokumentation aktualisieren**

---

## 7. Offene Fragen

1. **Notification-Type:** Soll ein neuer Type `'whatsapp'` erstellt werden, oder reicht `'info'`?
2. **Buchungs-Intent-Erkennung:** Wie genau soll Buchungs-Intent erkannt werden?
   - Via Keyword-Erkennung (z.B. "reservieren", "buchung", "zimmer")?
   - Via KI (MessageParserService)?
   - Via Context-Analyse?
3. **Datum-Überlappung bei LobbyPMS-Zusammenführung:** Soll auch Datum-Überlappung geprüft werden, oder reicht Telefonnummer?
4. **User-Notification-Filter:** Sollen User-Notifications nur für bestimmte Rollen erstellt werden, oder für alle User?

---

**Ende der Analyse**

