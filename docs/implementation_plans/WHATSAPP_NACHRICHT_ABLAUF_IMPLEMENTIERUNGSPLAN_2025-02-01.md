# WhatsApp-Nachricht Ablauf Implementierungsplan

**Datum:** 2025-02-01  
**Zweck:** Implementierungsplan für die 3 identifizierten Probleme im WhatsApp-Nachrichten-Ablauf

---

## Übersicht der zu implementierenden Änderungen

### Problem 1: Keine Prüfung auf "aktuelle Reservation"
- **Datei:** `backend/src/controllers/whatsappController.ts`
- **Priorität:** Hoch
- **Aufwand:** Niedrig

### Problem 2: Keine Notification-Erstellung für User
- **Datei:** `backend/src/services/whatsappMessageHandler.ts`
- **Priorität:** Hoch
- **Aufwand:** Mittel

### Problem 3: Keine Zusammenführung mit LobbyPMS-Reservationen
- **Datei:** `backend/src/services/lobbyPmsService.ts`
- **Priorität:** Hoch
- **Aufwand:** Mittel-Hoch

---

## 1. Problem 1: Aktuelle Reservation-Prüfung

### 1.1 Problem-Beschreibung

**Aktuell:**
- `whatsappController.ts` sucht nach Reservation, aber ohne Datum-Prüfung
- Nimmt einfach die neueste Reservation (checkInDate: 'desc')
- Verknüpft Nachricht auch mit Reservationen, die nicht aktuell sind

**Sollte:**
- Nur Reservationen im Zeitraum verknüpfen: `heute >= checkInDate && heute <= checkOutDate`
- Nur dann `reservationId` in WhatsApp-Nachricht setzen

### 1.2 Implementierung

**Datei:** `backend/src/controllers/whatsappController.ts`  
**Zeile:** 157-166

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
```

**Neuer Code:**
```typescript
// Prüfe ob es eine AKTUELLE Reservation zu dieser Telefonnummer gibt
// Aktuell = heute >= checkInDate && heute <= checkOutDate
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

### 1.3 Test-Szenarien

1. **Reservation mit Check-in heute, Check-out morgen:**
   - ✅ Nachricht sollte mit Reservation verknüpft werden

2. **Reservation mit Check-in gestern, Check-out heute:**
   - ✅ Nachricht sollte mit Reservation verknüpft werden

3. **Reservation mit Check-in morgen, Check-out übermorgen:**
   - ❌ Nachricht sollte NICHT mit Reservation verknüpft werden

4. **Reservation mit Check-in vor 2 Wochen, Check-out vor 1 Woche:**
   - ❌ Nachricht sollte NICHT mit Reservation verknüpft werden

5. **Keine Reservation:**
   - ✅ Nachricht sollte ohne reservationId gespeichert werden

---

## 2. Problem 2: Notification-Erstellung für User

### 2.1 Problem-Beschreibung

**Aktuell:**
- Wenn User gefunden wird, wird keine Notification erstellt
- User sieht WhatsApp-Konversationen nicht im Intranet

**Sollte:**
- Wenn User gefunden wird: Erstelle Notification
- Notification sollte Konversation anzeigen
- Notification sollte auf WhatsApp-Konversation verlinken (falls Frontend-Link existiert)

### 2.2 Implementierung

**Datei:** `backend/src/services/whatsappMessageHandler.ts`  
**Zeile:** Nach User-Identifikation (ca. Zeile 46-127)

**Neuer Code (nach Zeile 127, nach `conversation` erstellt):**
```typescript
// 2.5. Erstelle Notification für User (wenn User gefunden)
if (user) {
  try {
    const { createNotificationIfEnabled } = await import('../controllers/notificationController');
    
    // Erstelle Notification
    await createNotificationIfEnabled({
      userId: user.id,
      title: language === 'de' 
        ? 'Neue WhatsApp-Nachricht' 
        : language === 'en'
        ? 'New WhatsApp message'
        : 'Nuevo mensaje de WhatsApp',
      message: messageText.length > 100 
        ? messageText.substring(0, 100) + '...' 
        : messageText,
      type: 'info', // Oder neuer Type 'whatsapp' (siehe Offene Fragen)
      relatedEntityId: conversation.id,
      relatedEntityType: 'whatsapp_conversation'
    });
    
    logger.log('[WhatsApp Message Handler] Notification für User erstellt:', {
      userId: user.id,
      conversationId: conversation.id
    });
  } catch (notificationError) {
    // Fehler nicht weiterwerfen, nur loggen (Notification ist nicht kritisch)
    logger.error('[WhatsApp Message Handler] Fehler beim Erstellen der Notification:', notificationError);
  }
}
```

**WICHTIG:** 
- Notification-Erstellung sollte **NICHT** den Ablauf abbrechen, wenn sie fehlschlägt
- Nur loggen, nicht weiterwerfen

### 2.3 Notification-Type Entscheidung

**Option 1: Bestehender Type `'info'`**
- ✅ Einfach, keine Schema-Änderung nötig
- ⚠️ Weniger spezifisch

**Option 2: Neuer Type `'whatsapp'`**
- ✅ Spezifisch, besser filterbar
- ⚠️ Schema-Änderung nötig (`NotificationType` Enum)

**Empfehlung:** Start mit `'info'`, später auf `'whatsapp'` erweitern wenn gewünscht

### 2.4 Frontend-Integration (später)

**Optional:** Frontend-Link für Notification
- Notification sollte auf WhatsApp-Konversations-Seite verlinken
- Falls Frontend-Route existiert: `/whatsapp/conversations/${conversation.id}`
- Falls nicht: Nur Notification anzeigen, ohne Link

### 2.5 Test-Szenarien

1. **User schreibt WhatsApp-Nachricht:**
   - ✅ Notification sollte erstellt werden
   - ✅ Notification sollte User-ID haben
   - ✅ Notification sollte conversationId haben

2. **User schreibt mehrere Nachrichten:**
   - ✅ Jede Nachricht sollte eigene Notification erstellen
   - ⚠️ Eventuell später: Nur eine Notification pro Conversation (nicht pro Nachricht)

3. **User hat Notifications deaktiviert:**
   - ✅ `createNotificationIfEnabled` prüft Settings
   - ✅ Keine Notification erstellt

4. **Kein User gefunden:**
   - ✅ Keine Notification erstellt

---

## 3. Problem 3: LobbyPMS-Zusammenführung mit "potential" Reservationen

### 3.1 Problem-Beschreibung

**Aktuell:**
- `lobbyPmsService.ts` sucht nur nach `lobbyReservationId` beim Import
- "potential" Reservationen haben kein `lobbyReservationId` (wird erst bei Bestätigung gesetzt)
- Wenn LobbyPMS-Reservation importiert wird, wird neue Reservation erstellt, statt "potential" Reservation zu aktualisieren

**Sollte:**
- Beim LobbyPMS-Import: Prüfe auch nach "potential" Reservationen mit gleicher Telefonnummer
- Wenn gefunden: Übernehme `lobbyReservationId`, aktualisiere Status von "potential" auf "confirmed"
- Verknüpfe alle WhatsApp-Nachrichten mit aktualisierter Reservation

### 3.2 Implementierung

**Datei:** `backend/src/services/lobbyPmsService.ts`  
**Methode:** `syncReservation()`  
**Zeile:** Vor `upsert` (ca. Zeile 1167)

**Aktueller Code:**
```typescript
// Upsert: Erstelle oder aktualisiere Reservierung
let reservation = await prisma.reservation.upsert({
  where: {
    lobbyReservationId: bookingId
  },
  create: reservationData,
  update: reservationData
});
```

**Neuer Code:**
```typescript
// 1. Prüfe ob bereits Reservation mit lobbyReservationId existiert
const existingByLobbyId = await prisma.reservation.findUnique({
  where: { lobbyReservationId: bookingId }
});

if (existingByLobbyId) {
  // Normale Logik: Update bestehende Reservation
  reservation = await prisma.reservation.update({
    where: { id: existingByLobbyId.id },
    data: reservationData
  });
} else {
  // 2. Prüfe ob "potential" Reservation mit gleicher Telefonnummer existiert
  if (guestPhone) {
    const normalizedPhone = guestPhone.replace(/[\s\-\(\)]/g, '').trim();
    
    // Suche "potential" Reservationen mit gleicher Telefonnummer
    // Optional: Prüfe auch Datum-Überlappung (für bessere Zuordnung)
    const potentialReservations = await prisma.reservation.findMany({
      where: {
        guestPhone: {
          contains: normalizedPhone
        },
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
          },
          {
            checkInDate: { gte: checkInDate },
            checkOutDate: { lte: checkOutDate }
          }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (potentialReservations.length > 0) {
      // Verwende die neueste "potential" Reservation
      const potentialReservation = potentialReservations[0];
      
      logger.log(`[LobbyPMS] Zusammenführung: "potential" Reservation ${potentialReservation.id} mit LobbyPMS-Reservation ${bookingId}`);
      
      // Zusammenführung: Aktualisiere "potential" Reservation
      reservation = await prisma.reservation.update({
        where: { id: potentialReservation.id },
        data: {
          ...reservationData,
          lobbyReservationId: bookingId, // WICHTIG: Setze lobbyReservationId
          status: ReservationStatus.confirmed, // Status von "potential" auf "confirmed"
          // Behalte vorhandene Daten, falls LobbyPMS-Daten fehlen
          guestName: guestName || potentialReservation.guestName,
          guestEmail: guestEmail || potentialReservation.guestEmail,
          guestPhone: guestPhone || potentialReservation.guestPhone
        }
      });

      // Verknüpfe WhatsApp-Nachrichten (falls noch nicht verknüpft)
      try {
        const { LanguageDetectionService } = await import('./languageDetectionService');
        const normalizedPhoneForMessages = LanguageDetectionService.normalizePhoneNumber(guestPhone || potentialReservation.guestPhone || '');
        
        if (normalizedPhoneForMessages) {
          await prisma.whatsAppMessage.updateMany({
            where: {
              phoneNumber: normalizedPhoneForMessages,
              branchId: branchId,
              reservationId: null // Nur Nachrichten ohne Reservation
            },
            data: {
              reservationId: reservation.id
            }
          });
          
          logger.log(`[LobbyPMS] WhatsApp-Nachrichten mit Reservation ${reservation.id} verknüpft`);
        }
      } catch (messageError) {
        logger.error('[LobbyPMS] Fehler beim Verknüpfen der WhatsApp-Nachrichten:', messageError);
        // Fehler nicht weiterwerfen, nur loggen
      }

      // Erstelle Sync-History-Eintrag mit Hinweis auf Zusammenführung
      await prisma.reservationSyncHistory.create({
        data: {
          reservationId: reservation.id,
          syncType: 'merged_from_potential',
          syncData: {
            ...lobbyReservation as any,
            mergedFromPotentialReservationId: potentialReservation.id
          }
        }
      });

      logger.log(`[LobbyPMS] ✅ Zusammenführung abgeschlossen: Reservation ${reservation.id} (vorher "potential" ${potentialReservation.id})`);
      
      // Weiter mit Gruppierung (wie normal)
      // ...
      return reservation;
    }
  }
  
  // 3. Normale Logik: Erstelle neue Reservation
  reservation = await prisma.reservation.upsert({
    where: {
      lobbyReservationId: bookingId
    },
    create: reservationData,
    update: reservationData
  });
}
```

### 3.3 Telefonnummer-Normalisierung

**WICHTIG:** Telefonnummer-Vergleich muss normalisiert werden
- LobbyPMS kann verschiedene Formate haben: `+57 300 123 4567`, `573001234567`, etc.
- "potential" Reservation hat normalisierte Telefonnummer (via `LanguageDetectionService.normalizePhoneNumber`)
- Vergleich sollte normalisiert erfolgen

**Lösung:**
```typescript
// Normalisiere beide Telefonnummern für Vergleich
const normalizedLobbyPhone = LanguageDetectionService.normalizePhoneNumber(guestPhone);
const normalizedPotentialPhone = potentialReservation.guestPhone 
  ? LanguageDetectionService.normalizePhoneNumber(potentialReservation.guestPhone)
  : null;

// Vergleich mit verschiedenen Formaten
const phoneMatches = normalizedLobbyPhone === normalizedPotentialPhone ||
  normalizedLobbyPhone.replace(/^\+/, '') === normalizedPotentialPhone?.replace(/^\+/, '') ||
  // Weitere Formate...
```

**ODER:** Verwende `contains` in Prisma-Query (wie im Code oben), aber das ist weniger präzise.

**Besser:** Normalisiere Telefonnummern beim Speichern (sowohl in "potential" Reservation als auch in LobbyPMS-Import)

### 3.4 Datum-Überlappung-Prüfung

**Optional, aber empfohlen:**
- Prüfe auch Datum-Überlappung zwischen "potential" Reservation und LobbyPMS-Reservation
- Verhindert falsche Zuordnungen (z.B. wenn gleiche Telefonnummer, aber unterschiedliche Zeiträume)

**Logik:**
- Überlappung wenn:
  - `potential.checkInDate <= lobby.checkInDate <= potential.checkOutDate` ODER
  - `potential.checkInDate <= lobby.checkOutDate <= potential.checkOutDate` ODER
  - `lobby.checkInDate <= potential.checkInDate && lobby.checkOutDate >= potential.checkOutDate`

**Code (bereits im Beispiel oben enthalten):**
```typescript
OR: [
  {
    checkInDate: { lte: checkInDate },
    checkOutDate: { gte: checkInDate }
  },
  {
    checkInDate: { lte: checkOutDate },
    checkOutDate: { gte: checkOutDate }
  },
  {
    checkInDate: { gte: checkInDate },
    checkOutDate: { lte: checkOutDate }
  }
]
```

### 3.5 Test-Szenarien

1. **"potential" Reservation existiert, LobbyPMS-Reservation wird importiert:**
   - ✅ "potential" Reservation wird aktualisiert
   - ✅ `lobbyReservationId` wird gesetzt
   - ✅ Status ändert sich von "potential" auf "confirmed"
   - ✅ WhatsApp-Nachrichten werden verknüpft

2. **"potential" Reservation existiert, aber andere Telefonnummer:**
   - ❌ Keine Zusammenführung
   - ✅ Neue Reservation wird erstellt

3. **"potential" Reservation existiert, aber andere Daten (keine Überlappung):**
   - ⚠️ Abhängig von Implementierung (mit/ohne Datum-Prüfung)
   - Empfehlung: Mit Datum-Prüfung → keine Zusammenführung

4. **Keine "potential" Reservation:**
   - ✅ Normale Logik: Neue Reservation wird erstellt

5. **Mehrere "potential" Reservationen mit gleicher Telefonnummer:**
   - ✅ Neueste wird verwendet (orderBy: createdAt: 'desc')

---

## 4. Implementierungsreihenfolge

### Phase 1: Problem 1 (Aktuelle Reservation-Prüfung)
**Aufwand:** Niedrig  
**Risiko:** Niedrig  
**Priorität:** Hoch

**Grund:** Einfache Änderung, sofortiger Nutzen, keine Abhängigkeiten

### Phase 2: Problem 2 (Notification-Erstellung)
**Aufwand:** Mittel  
**Risiko:** Niedrig  
**Priorität:** Hoch

**Grund:** Wichtig für User-Experience, aber nicht kritisch für Funktionalität

### Phase 3: Problem 3 (LobbyPMS-Zusammenführung)
**Aufwand:** Mittel-Hoch  
**Risiko:** Mittel  
**Priorität:** Hoch

**Grund:** Komplexer, aber wichtig für Datenintegrität. Sollte nach Phase 1 & 2 implementiert werden.

---

## 5. Offene Fragen

### 5.1 Notification-Type
**Frage:** Soll ein neuer Type `'whatsapp'` erstellt werden, oder reicht `'info'`?

**Empfehlung:** Start mit `'info'`, später erweitern wenn gewünscht

### 5.2 Notification-Häufigkeit
**Frage:** Soll für jede WhatsApp-Nachricht eine Notification erstellt werden, oder nur eine pro Conversation?

**Empfehlung:** Start mit "jede Nachricht", später optimieren (z.B. nur wenn User nicht aktiv in Conversation)

### 5.3 Datum-Überlappung bei LobbyPMS-Zusammenführung
**Frage:** Soll auch Datum-Überlappung geprüft werden, oder reicht Telefonnummer?

**Empfehlung:** Mit Datum-Prüfung (verhindert falsche Zuordnungen)

### 5.4 Telefonnummer-Normalisierung
**Frage:** Sollen Telefonnummern beim Speichern normalisiert werden (sowohl "potential" als auch LobbyPMS)?

**Empfehlung:** Ja, für konsistenten Vergleich

---

## 6. Testing-Strategie

### 6.1 Unit-Tests
- Reservation-Prüfung mit verschiedenen Datum-Szenarien
- Notification-Erstellung mit verschiedenen User-Szenarien
- LobbyPMS-Zusammenführung mit verschiedenen "potential" Reservation-Szenarien

### 6.2 Integration-Tests
- Vollständiger Ablauf: WhatsApp-Nachricht → User-Identifikation → Notification
- Vollständiger Ablauf: WhatsApp-Nachricht → "potential" Reservation → LobbyPMS-Import → Zusammenführung

### 6.3 Manuelle Tests
- Test mit echten WhatsApp-Nachrichten
- Test mit verschiedenen Reservation-Zeiträumen
- Test mit LobbyPMS-Import

---

## 7. Rollout-Plan

1. **Phase 1 implementieren** (Problem 1)
2. **Testen** (manuell + automatisiert)
3. **Phase 2 implementieren** (Problem 2)
4. **Testen** (manuell + automatisiert)
5. **Phase 3 implementieren** (Problem 3)
6. **Testen** (manuell + automatisiert)
7. **Produktiv-Deployment**

---

**Ende des Implementierungsplans**

