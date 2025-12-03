# Plan: Reservation Room Description - Verbesserungen

**Datum**: 2025-01-30  
**Status**: 📋 Planung  
**Ziel**: Verbesserungen an Reservation-Nachrichten und Zimmer-Beschreibungen

---

## 📋 Anforderungen

### 1. "- App: {{doorAppName}}" entfernen
- **Problem**: Der Teil "- App: {{doorAppName}}" ist unnötig in der TTLock-Nachricht
- **Lösung**: Aus allen Nachrichten entfernen

### 2. Bei Dorms: Zimmername zu Habitación, Beschreibung zu Descripción
- **Problem**: 
  - Aktuell: `roomNumber` = Bettnummer, `roomDescription` = Zimmername
  - Bei Dorms soll: `roomNumber` = Zimmername + Bettnummer, `roomDescription` = Beschreibung (Text/Bild/Video) wie man zum Zimmer kommt
- **Lösung**: 
  - Beim Import: `roomNumber` = "Zimmername (Bettnummer)" für Dorms
  - `roomDescription` = Beschreibung aus Branch-Settings (Text/Bild/Video)

### 3. Zimmer-Beschreibungen im Branch-Management verwalten
- **Problem**: Beschreibungen (Text/Bild/Video) wie man zum Zimmer kommt fehlen
- **Lösung**: 
  - Neue Struktur in Branch-Settings für Zimmer-Beschreibungen
  - Frontend-UI zum Verwalten dieser Beschreibungen
  - Verknüpfung mit importierten Zimmern aus LobbyPMS (categoryId)

---

## 🔍 Aktueller Stand - Analyse

### 1. TTLock-Nachricht mit "- App: {{doorAppName}}"

**Gefundene Stellen:**
1. `backend/src/services/reservationNotificationService.ts` Zeile 1222 (Englisch)
2. `backend/src/services/reservationNotificationService.ts` Zeile 1234 (Spanisch)
3. `backend/src/services/reservationNotificationService.ts` Zeile 1345 (Englisch, Template-Parameter)
4. `backend/src/services/reservationNotificationService.ts` Zeile 1347 (Spanisch, Template-Parameter)
5. `frontend/src/components/reservations/SendPasscodeSidepane.tsx` Zeile 62, 80 (Vorschau)

**Aktueller Code:**
```typescript
// Englisch
const contentText = `Your check-in has been completed successfully! Your room information: - Room: ${roomNumber} - Description: ${roomDescription} Access: - Door PIN: ${doorPin || 'N/A'} - App: ${doorAppName || 'TTLock'}`;

// Spanisch
const contentText = `¡Tu check-in se ha completado exitosamente! Información de tu habitación: - Habitación: ${roomNumber} - Descripción: ${roomDescription} Acceso: - PIN de la puerta: ${doorPin || 'N/A'} - App: ${doorAppName || 'TTLock'}`;
```

**Zu entfernen:** `- App: ${doorAppName || 'TTLock'}`

---

### 2. Aktuelle Struktur: roomNumber und roomDescription

**Datenbank-Schema:**
```prisma
model Reservation {
  roomNumber       String?  // Aktuell: Bettnummer für Dorms, Zimmername für Privatzimmer
  roomDescription  String?  // Aktuell: Zimmername für Dorms, Typ/Kategorie für Privatzimmer
}
```

**Import-Logik (lobbyPmsService.ts, Zeile 871-881):**
```typescript
if (isDorm) {
  // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
  const dormName = lobbyReservation.category?.name || null;
  const bedNumber = assignedRoom?.name || null;
  roomNumber = bedNumber; // Bettnummer (z.B. "Cama 5")
  roomDescription = dormName; // Zimmername (z.B. "La tia artista")
} else {
  // Für Privatzimmer: assigned_room.name = Zimmername
  roomNumber = assignedRoom?.name || lobbyReservation.room_number || null;
  roomDescription = assignedRoom?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
}
```

**Verwendung in Nachrichten:**
- `roomNumber` wird als "Habitación" angezeigt
- `roomDescription` wird als "Descripción" angezeigt

**Problem:**
- Bei Dorms: `roomDescription` zeigt Zimmername, sollte aber Beschreibung zeigen
- Bei Dorms: `roomNumber` zeigt nur Bettnummer, sollte Zimmername + Bettnummer zeigen

---

### 3. Branch-Settings-Struktur

**Aktueller Stand:**
```prisma
model Branch {
  id                    Int
  name                  String
  whatsappSettings      Json?
  lobbyPmsSettings      Json?
  boldPaymentSettings   Json?
  doorSystemSettings    Json?
  emailSettings         Json?
  // ❌ FEHLT: roomDescriptions
}
```

**LobbyPMS-Integration:**
- `checkAvailability()` gibt `categoryId` und `roomName` zurück
- Kategorien werden über `category_id` identifiziert
- Beispiel: `categoryId: 34281, roomName: "La tia artista"`

**Benötigt:**
- Neue Struktur in Branch-Settings: `roomDescriptions`
- Format: `{ "categoryId": { "text": "...", "imageUrl": "...", "videoUrl": "..." } }`

---

## 📊 Plan: Implementierung

### Phase 1: "- App: {{doorAppName}}" entfernen

#### 1.1 Backend: reservationNotificationService.ts
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Stellen**: 
  - Zeile 1222 (Englisch)
  - Zeile 1234 (Spanisch)
  - Zeile 1345 (Englisch, Template-Parameter)
  - Zeile 1347 (Spanisch, Template-Parameter)
- **Änderung**: `- App: ${doorAppName || 'TTLock'}` entfernen

#### 1.2 Frontend: SendPasscodeSidepane.tsx
- **Datei**: `frontend/src/components/reservations/SendPasscodeSidepane.tsx`
- **Stellen**: Zeile 62, 80
- **Änderung**: `- App: {{doorAppName}}` entfernen

---

### Phase 2: Bei Dorms: Zimmername zu Habitación, Beschreibung zu Descripción

#### 2.1 Backend: Import-Logik anpassen (lobbyPmsService.ts)
- **Datei**: `backend/src/services/lobbyPmsService.ts`
- **Zeile**: 871-881
- **Aktuell**:
  ```typescript
  if (isDorm) {
    roomNumber = bedNumber; // "Cama 5"
    roomDescription = dormName; // "La tia artista"
  }
  ```
- **Neu**:
  ```typescript
  if (isDorm) {
    // Kombiniere Zimmername + Bettnummer für roomNumber
    roomNumber = dormName && bedNumber 
      ? `${dormName} (${bedNumber})` 
      : bedNumber || dormName || null;
    // roomDescription wird später aus Branch-Settings geladen (siehe Phase 3)
    roomDescription = null; // Wird beim Versenden der Nachricht aus Branch-Settings geladen
  }
  ```

**Hinweis**: `roomDescription` wird beim Import auf `null` gesetzt und später beim Versenden der Nachricht aus Branch-Settings geladen (siehe Phase 3).

#### 2.2 Backend: Nachrichten-Generierung anpassen
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Stellen**: Zeile 1216-1234, 1341-1347
- **Änderung**: 
  - `roomDescription` aus Branch-Settings laden (falls Dorm)
  - Format: Text, Bild oder Video

---

### Phase 3: Zimmer-Beschreibungen im Branch-Management verwalten

#### 3.1 Datenbank-Schema: Branch-Settings erweitern
- **Keine Migration nötig**: Branch hat bereits `Json?` Felder
- **Neue Struktur in `lobbyPmsSettings` oder separates Feld**:
  ```typescript
  interface BranchLobbyPmsSettings {
    apiUrl: string;
    apiKey: string;
    propertyId: string;
    // ... bestehende Felder ...
    roomDescriptions?: {
      [categoryId: number]: {
        text?: string;
        imageUrl?: string;
        videoUrl?: string;
      };
    };
  }
  ```

**Alternative**: Separates Feld `roomDescriptions` in Branch (würde Migration erfordern)

**Empfehlung**: In `lobbyPmsSettings` speichern (keine Migration nötig)

#### 3.2 Backend: API-Endpunkt zum Laden/Speichern von Zimmer-Beschreibungen
- **Datei**: `backend/src/controllers/branchController.ts`
- **Neue Endpunkte**:
  - `GET /api/branches/:id/room-descriptions` - Lade alle Zimmer-Beschreibungen
  - `PUT /api/branches/:id/room-descriptions` - Speichere Zimmer-Beschreibungen
  - `GET /api/branches/:id/room-descriptions/:categoryId` - Lade Beschreibung für ein Zimmer

**Struktur:**
```typescript
// GET /api/branches/:id/room-descriptions
{
  "34281": {
    "text": "Gehen Sie die Treppe hoch, dann links...",
    "imageUrl": "https://...",
    "videoUrl": "https://..."
  },
  "34280": {
    "text": "...",
    "imageUrl": "..."
  }
}
```

#### 3.3 Backend: Lade Zimmer-Beschreibung beim Versenden der Nachricht
- **Datei**: `backend/src/services/reservationNotificationService.ts`
- **Methode**: `sendPasscodeNotification()`
- **Logik**:
  1. Prüfe ob Reservation ein Dorm ist (z.B. `roomNumber.includes('(')`)
  2. Extrahiere `categoryId` aus Reservation (muss gespeichert werden) ODER
  3. Lade `categoryId` aus LobbyPMS basierend auf `roomName`
  4. Lade Beschreibung aus Branch-Settings
  5. Formatiere Beschreibung für Nachricht (Text, Bild-Link, Video-Link)

**Problem**: `categoryId` ist nicht in Reservation gespeichert!

**Lösung Option A**: `categoryId` in Reservation speichern
- **Migration nötig**: Neues Feld `categoryId` in Reservation
- **Vorteil**: Direkter Zugriff, keine API-Abfrage nötig
- **Nachteil**: Migration erforderlich

**Lösung Option B**: `categoryId` aus LobbyPMS API laden
- **Vorteil**: Keine Migration nötig
- **Nachteil**: API-Abfrage erforderlich, langsamer

**Lösung Option C**: `categoryId` aus `roomName` ableiten
- **Vorteil**: Keine Migration, keine API-Abfrage
- **Nachteil**: Nicht 100% zuverlässig (wenn Zimmername geändert wird)

**Empfehlung**: Option A (categoryId in Reservation speichern)

#### 3.4 Frontend: Branch-Management UI erweitern
- **Datei**: `frontend/src/components/BranchManagementTab.tsx`
- **Neue Sektion**: "Zimmer-Beschreibungen"
- **Funktionen**:
  - Liste aller importierten Zimmer aus LobbyPMS anzeigen
  - Für jedes Zimmer: Text, Bild, Video verwalten
  - Bild/Video-Upload oder URL-Eingabe
  - Vorschau der Beschreibung

**UI-Struktur:**
```
Zimmer-Beschreibungen
├── La tia artista (34281)
│   ├── Text: [Textarea]
│   ├── Bild: [Upload/URL]
│   └── Video: [Upload/URL]
├── El primo aventurero (34280)
│   └── ...
└── El abuelo viajero (34282)
    └── ...
```

**Zimmer-Liste laden:**
- Endpunkt: `GET /api/lobby-pms/availability` (bereits vorhanden)
- Filter: Nur für aktuellen Branch
- Anzeige: `roomName` + `categoryId`

#### 3.5 Backend: categoryId in Reservation speichern
- **Migration**: Neues Feld `categoryId` in Reservation
- **Datei**: `backend/prisma/schema.prisma`
- **Änderung**:
  ```prisma
  model Reservation {
    // ... bestehende Felder ...
    categoryId          Int?     // LobbyPMS category_id (für Zimmer-Beschreibungen)
  }
  ```
- **Import-Logik anpassen**: `categoryId` aus `lobbyReservation.category?.category_id` speichern

---

## 📋 Implementierungsreihenfolge

### Phase 1: "- App: {{doorAppName}}" entfernen ✅ (Einfach)
1. Backend: reservationNotificationService.ts anpassen
2. Frontend: SendPasscodeSidepane.tsx anpassen
3. Testen

### Phase 2: categoryId in Reservation speichern
1. Migration: `categoryId` Feld hinzufügen
2. Import-Logik: `categoryId` speichern
3. Testen

### Phase 3: Bei Dorms: Zimmername zu Habitación
1. Import-Logik: `roomNumber` = "Zimmername (Bettnummer)" für Dorms
2. Testen

### Phase 4: Zimmer-Beschreibungen im Branch-Management
1. Backend: API-Endpunkte für Zimmer-Beschreibungen
2. Backend: Lade Beschreibung beim Versenden der Nachricht
3. Frontend: UI zum Verwalten von Zimmer-Beschreibungen
4. Testen

### Phase 5: roomDescription aus Branch-Settings laden
1. Backend: Lade `roomDescription` aus Branch-Settings beim Versenden
2. Formatierung: Text, Bild, Video in Nachricht einbinden
3. Testen

---

## 🔍 Offene Fragen

### 1. categoryId speichern?
- **Frage**: Soll `categoryId` in Reservation gespeichert werden?
- **Empfehlung**: ✅ Ja, für direkten Zugriff auf Zimmer-Beschreibungen

### 2. Beschreibungs-Format in Nachricht?
- **Frage**: Wie sollen Text, Bild und Video in der Nachricht formatiert werden?
- **Optionen**:
  - Text: Direkt im Text
  - Bild: Als Link oder eingebettet (abhängig von WhatsApp-Format)
  - Video: Als Link oder eingebettet (abhängig von WhatsApp-Format)
- **Empfehlung**: 
  - Text: Direkt im Text
  - Bild: Als Link (WhatsApp unterstützt Bilder in Nachrichten)
  - Video: Als Link (WhatsApp unterstützt Videos in Nachrichten)

### 3. Zimmer-Liste im Frontend?
- **Frage**: Wie werden Zimmer im Frontend geladen?
- **Option A**: Aus LobbyPMS API (`checkAvailability`)
- **Option B**: Aus bestehenden Reservierungen extrahieren
- **Option C**: Manuell eintragen
- **Empfehlung**: Option A (aus LobbyPMS API)

### 4. Beschreibung für Privatzimmer?
- **Frage**: Sollen auch Privatzimmer Beschreibungen haben?
- **Empfehlung**: ✅ Ja, für Konsistenz

---

## 🧪 Test-Plan

### Test 1: "- App: {{doorAppName}}" entfernen
- [ ] TTLock-Nachricht versenden
- [ ] Prüfen: Kein "- App: TTLock" in Nachricht
- [ ] Prüfen: Nachricht ist weiterhin vollständig

### Test 2: categoryId speichern
- [ ] Reservation importieren
- [ ] Prüfen: `categoryId` ist gespeichert
- [ ] Prüfen: Für Dorms und Privatzimmer

### Test 3: Bei Dorms: Zimmername zu Habitación
- [ ] Dorm-Reservation importieren
- [ ] Prüfen: `roomNumber` = "Zimmername (Bettnummer)"
- [ ] Prüfen: Nachricht zeigt korrekt "Habitación: Zimmername (Bettnummer)"

### Test 4: Zimmer-Beschreibungen verwalten
- [ ] Branch öffnen
- [ ] Zimmer-Beschreibungen-Sektion öffnen
- [ ] Zimmer-Liste wird angezeigt
- [ ] Beschreibung für ein Zimmer speichern
- [ ] Prüfen: Beschreibung ist gespeichert

### Test 5: Beschreibung in Nachricht
- [ ] Dorm-Reservation mit Beschreibung
- [ ] TTLock-Nachricht versenden
- [ ] Prüfen: Beschreibung ist in Nachricht enthalten
- [ ] Prüfen: Format (Text, Bild-Link, Video-Link)

---

## 📝 Zusammenfassung

### Änderungen
1. ✅ "- App: {{doorAppName}}" entfernen (5 Stellen)
2. ✅ `categoryId` in Reservation speichern (Migration + Import)
3. ✅ Bei Dorms: `roomNumber` = "Zimmername (Bettnummer)"
4. ✅ Zimmer-Beschreibungen in Branch-Settings speichern
5. ✅ Frontend-UI zum Verwalten von Zimmer-Beschreibungen
6. ✅ `roomDescription` aus Branch-Settings beim Versenden laden

### Datenbank-Änderungen
- **Migration nötig**: `categoryId` Feld in Reservation

### API-Änderungen
- **Neue Endpunkte**: 
  - `GET /api/branches/:id/room-descriptions`
  - `PUT /api/branches/:id/room-descriptions`
  - `GET /api/branches/:id/room-descriptions/:categoryId`

### Frontend-Änderungen
- **Neue UI**: Zimmer-Beschreibungen-Verwaltung in Branch-Management
- **Anpassung**: SendPasscodeSidepane (App-Text entfernen)

---

**Erstellt**: 2025-01-30  
**Version**: 1.0  
**Status**: 📋 Planung (noch nicht implementiert)

