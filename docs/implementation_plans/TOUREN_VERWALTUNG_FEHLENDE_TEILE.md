# Touren-Verwaltung - Fehlende Teile - Vollständiger Plan

## Status: PLANUNG - NICHTS UMSETZEN

**Datum:** 2025-11-25  
**Zweck:** Vollständige Auflistung ALLER fehlenden Teile der Tour-Verwaltung

---

## 1. SYSTEMATISCHE ANALYSE

### 1.1 Was wurde implementiert (Backend)

✅ **Datenbank:**
- Tour, TourBooking, TourReservation, TourProvider, TourWhatsAppMessage Models
- Enums: TourType, TourBookingStatus, MessageDirection, MessageStatus
- Migration ausgeführt

✅ **Backend-Controller:**
- `tourController.ts` - CRUD für Touren
- `tourBookingController.ts` - CRUD für Buchungen
- `tourReservationController.ts` - Verknüpfung Tour-Reservation
- `tourProviderController.ts` - CRUD für Provider

✅ **Backend-Services:**
- `tourNotificationService.ts` - Notifications
- `tourWhatsAppService.ts` - WhatsApp-Integration
- `commissionService.ts` - Kommissions-Berechnung

✅ **Backend-Routes:**
- `/api/tours` - Registriert
- `/api/tour-bookings` - Registriert
- `/api/tour-reservations` - Registriert
- `/api/tour-providers` - Registriert

### 1.2 Was wurde implementiert (Frontend)

✅ **Komponenten:**
- `CreateTourModal.tsx` - Tour erstellen
- `EditTourModal.tsx` - Tour bearbeiten
- `TourDetailsModal.tsx` - Tour-Details anzeigen
- `TourBookingsModal.tsx` - Buchungen einer Tour anzeigen
- `TourExportDialog.tsx` - Export-Dialog
- `TourReservationLinkModal.tsx` - Tour-Reservation verknüpfen
- `TourBookingsTab.tsx` - Tab für alle Buchungen
- `TourImageUpload.tsx` - Hauptbild-Upload
- `TourGalleryUpload.tsx` - Gallery-Upload

✅ **Integration:**
- Tours-Tab in Worktracker (nicht Settings!)
- Table-View und Card-View
- Filter-System
- Sortierung
- Export-Button

✅ **API-Client:**
- `TOURS` Endpoints definiert
- `TOUR_BOOKINGS` Endpoints definiert
- `TOUR_RESERVATIONS` Endpoints definiert
- `TOUR_PROVIDERS` Endpoints definiert

✅ **Typen:**
- `tour.ts` - Alle TypeScript-Typen

✅ **Übersetzungen:**
- `de.json` - Tour-Übersetzungen
- `en.json` - Tour-Übersetzungen
- `es.json` - Tour-Übersetzungen

### 1.3 Was FEHLT (kritisch)

❌ **Frontend - TourProvider-Verwaltung:**
- KEINE Komponente zum Erstellen von TourProvidern
- KEINE Komponente zum Bearbeiten von TourProvidern
- KEINE Komponente zum Löschen von TourProvidern
- KEINE Liste/Übersicht von TourProvidern
- KEIN Tab/Seite für TourProvider-Verwaltung
- KEINE Integration in Tour-Modals (nur Dropdown, kein "Neu erstellen"-Button)

❌ **Frontend - Tour-Buchungen:**
- KEINE Komponente zum Erstellen von Buchungen (nur Modal für einzelne Tour)
- KEINE Komponente zum Bearbeiten von Buchungen
- KEINE Komponente zum Stornieren von Buchungen (nur Endpoint vorhanden)
- KEINE Komponente zum Abschließen von Buchungen (nur Endpoint vorhanden)

❌ **Frontend - Validierungen:**
- Validierung `externalProviderId` wenn `type = 'external'` fehlt in CreateTourModal
- Validierung `maxParticipants >= minParticipants` fehlt im Frontend
- Validierung `availableFrom <= availableTo` fehlt im Frontend
- Validierung `numberOfParticipants` zwischen min/max fehlt bei Buchungserstellung

❌ **Frontend - Soft Delete:**
- KEIN Toggle-Button für `isActive` in der Tour-Liste
- KEIN Toggle-Endpoint-Aufruf (`PUT /api/tours/:id/toggle-active`)

❌ **Frontend - Bild-Upload:**
- `GET /api/tours/:id/image` - Route fehlt im Backend
- `GET /api/tours/:id/gallery/:index` - Route fehlt im Backend
- Bild-Anzeige in TourDetailsModal funktioniert nicht (keine Route)

❌ **Frontend - Notifications:**
- Notification-Texts fehlen in Übersetzungen
- Notification-Events werden nicht getriggert (TODO-Kommentare im Backend)

❌ **Frontend - WhatsApp-Integration:**
- `get_tours` Function fehlt in `whatsappFunctionHandlers.ts`
- `book_tour` Function fehlt in `whatsappFunctionHandlers.ts`
- Tour-Keyword-Erkennung fehlt in `whatsappMessageHandler.ts`

❌ **Frontend - Kommissions-Tracking:**
- WorktimeStats Kommissionen-Tab fehlt (nur teilweise implementiert)
- Kommissions-Statistiken fehlen
- Kommissions-Liste fehlt

❌ **Frontend - Export:**
- CSV-Export fehlt (nur JSON)

---

## 2. FEHLENDE IMPLEMENTIERUNGEN - DETAILLIERT

### 2.1 TourProvider-Verwaltung (Frontend)

**Problem:** Backend existiert, Frontend fehlt komplett.

**Benötigte Komponenten:**

#### 2.1.1 `TourProvidersTab.tsx`
**Datei:** `frontend/src/components/tours/TourProvidersTab.tsx`

**Funktionalität:**
1. Liste aller TourProvider anzeigen (Table-View)
2. Neue TourProvider erstellen (Modal)
3. TourProvider bearbeiten (Modal)
4. TourProvider löschen (mit Bestätigung, nur wenn keine Touren verknüpft)
5. Filter/Suche (nach Name, Phone, Email, Branch)
6. Spalten: Name, Phone, Email, Contact Person, Branch, Actions

**Berechtigungen:**
- `hasPermission('tour_provider_create', 'write', 'button')` - Erstellen
- `hasPermission('tour_provider_edit', 'write', 'button')` - Bearbeiten
- `hasPermission('tour_provider_delete', 'write', 'button')` - Löschen

#### 2.1.2 `CreateTourProviderModal.tsx`
**Datei:** `frontend/src/components/tours/CreateTourProviderModal.tsx`

**Felder:**
- Name (required)
- Phone (optional)
- Email (optional)
- Contact Person (optional)
- Notes (optional)
- Branch (optional, Dropdown)

**Validierung:**
- Name: Required, min 2 Zeichen
- Email: Wenn gesetzt, muss gültige E-Mail sein
- Phone: Wenn gesetzt, muss gültige Telefonnummer sein

#### 2.1.3 `EditTourProviderModal.tsx`
**Datei:** `frontend/src/components/tours/EditTourProviderModal.tsx`

**Gleiche Felder wie CreateTourProviderModal, aber mit vorausgefüllten Werten**

#### 2.1.4 Integration in Tour-Modals

**In `CreateTourModal.tsx` und `EditTourModal.tsx`:**
- Button "Neuer Provider" neben Provider-Dropdown (wenn `type === 'external'`)
- Button öffnet `CreateTourProviderModal`
- Nach Erstellung: Provider wird automatisch ausgewählt
- Provider-Liste wird neu geladen

**Platzierung:**
- Option 1: Eigener Tab in Worktracker (neben "Touren", "Buchungen")
- Option 2: Unterabschnitt in Tours-Tab (Sub-Tab)
- Option 3: Modal von Tour-Modals aus öffnen (empfohlen)

**Empfehlung:** Option 3 - Button in Tour-Modals, zusätzlich eigener Tab für Verwaltung

---

### 2.2 Tour-Buchungen (Frontend)

**Problem:** `TourBookingsTab.tsx` existiert, aber Create/Edit/Delete fehlen.

#### 2.2.1 `CreateTourBookingModal.tsx`
**Datei:** `frontend/src/components/tours/CreateTourBookingModal.tsx`

**Felder:**
- Tour (required, Dropdown)
- Tour-Datum (required, DatePicker, muss >= heute)
- Anzahl Teilnehmer (required, Number, muss zwischen min/max der Tour)
- Kundenname (required)
- Kunden-E-Mail (optional)
- Kunden-Telefon (optional)
- Kunden-Notizen (optional)
- Mitarbeiter (optional, Dropdown, Standard: aktueller User)

**Validierung:**
- Tour muss existieren und `isActive = true`
- Tour-Datum muss in Zukunft sein
- Anzahl Teilnehmer muss zwischen `tour.minParticipants` und `tour.maxParticipants` sein
- Kundenname: Required, min 2 Zeichen
- Kunden-Telefon ODER Kunden-E-Mail: Mindestens eines muss gesetzt sein

**Automatisch:**
- `totalPrice` wird berechnet: `tour.price * numberOfParticipants`
- Payment Link wird generiert (via Backend)
- Bei externer Tour: WhatsApp-Nachricht wird gesendet

#### 2.2.2 `EditTourBookingModal.tsx`
**Datei:** `frontend/src/components/tours/EditTourBookingModal.tsx`

**Gleiche Felder wie CreateTourBookingModal, aber mit vorausgefüllten Werten**

**Zusätzlich:**
- Zahlungsstatus anzeigen
- Bereits bezahlt anzeigen
- Ausstehend anzeigen
- Payment Link anzeigen/kopieren

#### 2.2.3 Stornieren-Button in `TourBookingsTab.tsx`
**Funktionalität:**
- Button "Stornieren" bei jeder Buchung
- Modal öffnen: Grund eingeben, `cancelledBy` wählen ('customer' oder 'provider')
- API-Call: `POST /api/tour-bookings/:id/cancel`
- WhatsApp-Nachricht wird gesendet (via Backend)

#### 2.2.4 Abschließen-Button in `TourBookingsTab.tsx`
**Funktionalität:**
- Button "Als abgeschlossen markieren"
- API-Call: `POST /api/tour-bookings/:id/complete`
- Status wird auf `completed` gesetzt

---

### 2.3 Validierungen (Frontend)

#### 2.3.1 `CreateTourModal.tsx` - Validierungen hinzufügen

**Fehlende Validierungen:**
- `externalProviderId`: Wenn `type === 'external'`, muss gesetzt sein
- `maxParticipants >= minParticipants`: Wenn beide gesetzt
- `availableFrom <= availableTo`: Wenn beide gesetzt
- `price >= 0`: Wenn gesetzt
- `minParticipants >= 1`: Wenn gesetzt

**Implementierung:**
- Validierung beim Submit
- Fehlermeldungen anzeigen
- Felder rot markieren bei Fehler

#### 2.3.2 `EditTourModal.tsx` - Gleiche Validierungen

#### 2.3.3 `CreateTourBookingModal.tsx` - Validierungen

**Fehlende Validierungen:**
- `tourDate >= heute`
- `numberOfParticipants` zwischen `tour.minParticipants` und `tour.maxParticipants`
- `customerPhone` ODER `customerEmail` muss gesetzt sein

---

### 2.4 Soft Delete (Frontend)

#### 2.4.1 Toggle-Button in Tour-Liste

**In `Worktracker.tsx` (Tours Tab):**
- Button "Aktiv/Inaktiv" bei jeder Tour
- API-Call: `PUT /api/tours/:id/toggle-active` mit `{ isActive: !tour.isActive }`
- Tour-Liste wird neu geladen
- Toast-Nachricht: "Tour wurde [aktiviert/deaktiviert]"

**Platzierung:**
- In Table-View: Spalte "Status" mit Toggle-Button
- In Card-View: Toggle-Button neben Status-Badge

---

### 2.5 Bild-Upload (Backend)

#### 2.5.1 GET-Routes für Bilder

**In `backend/src/routes/tours.ts`:**

```typescript
// GET /api/tours/:id/image - Hauptbild abrufen
router.get('/:id/image', getTourImage);

// GET /api/tours/:id/gallery/:index - Gallery-Bild abrufen
router.get('/:id/gallery/:imageIndex', getTourGalleryImage);
```

**In `backend/src/controllers/tourController.ts`:**

```typescript
// GET /api/tours/:id/image
export const getTourImage = async (req: Request, res: Response) => {
  // Streamt Datei aus uploads/tours/
};

// GET /api/tours/:id/gallery/:imageIndex
export const getTourGalleryImage = async (req: Request, res: Response) => {
  // Streamt Datei aus uploads/tours/gallery/
};
```

---

### 2.6 Notifications (Backend)

#### 2.6.1 Notification-Texts hinzufügen

**In `backend/src/utils/translations.ts`:**
- `getTourNotificationText()` Funktion hinzufügen
- Übersetzungen für alle 5 Events (de, en, es)

**In `frontend/src/i18n/locales/*.json`:**
- Notification-Texte hinzufügen

#### 2.6.2 Notification-Events implementieren

**In `tourController.ts`:**
- Zeile 384: TODO entfernen, Notification erstellen bei Tour-Erstellung

**In `tourBookingController.ts`:**
- Notification bei Buchungserstellung
- Notification bei externer Tour-Anfrage
- Notification bei Stornierung
- Notification bei Abschluss

**In `boldPaymentController.ts` (Webhook):**
- Notification bei Zahlungseingang für Tour-Buchung

---

### 2.7 WhatsApp-Integration (Backend)

#### 2.7.1 Function Handlers

**In `backend/src/services/whatsappFunctionHandlers.ts`:**

```typescript
// Neue Funktion: get_tours
export const get_tours = async (args: any, userId: number, roleId: number, branchId: number) => {
  // Filtert nach isActive = true und availableFrom <= heute <= availableTo
  // Gibt Liste zurück: [{ id, title, price, duration, location }]
};

// Neue Funktion: book_tour
export const book_tour = async (args: any, userId: number, roleId: number, branchId: number) => {
  // Parameter: tourId, tourDate, numberOfParticipants, customerName, customerPhone
  // Erstellt TourBooking
  // Bei externer Tour: Ruft TourWhatsAppService.sendBookingRequestToProvider() auf
  // Gibt Bestätigung zurück
};
```

#### 2.7.2 Message Handler

**In `backend/src/services/whatsappMessageHandler.ts`:**
- Keyword-Erkennung: "tour", "touren", "book tour", "reservar tour"
- Ruft `handleTourBookingRequest()` auf
- Zeigt verfügbare Touren an (via `get_tours` Function)

**Provider-Response-Erkennung:**
- Prüft ob `phoneNumber` einer `TourProvider.phone` entspricht
- Prüft ob Nachricht zu einer offenen Buchungsanfrage gehört
- Ruft `TourWhatsAppService.processProviderResponse()` auf

---

### 2.8 Kommissions-Tracking (Frontend)

#### 2.8.1 WorktimeStats erweitern

**In `frontend/src/components/WorktimeStats.tsx`:**

**Neuer Tab "Kommissionen":**
- Gesamtkommissionen (Zeitraum) - Summe aller `commissionAmount`
- Anzahl gebuchter Touren - Anzahl Buchungen mit `bookedById = userId`
- Durchschnittliche Kommission pro Tour - `totalCommissions / totalBookings`
- Kommissionen pro Tour-Typ - Gruppiert nach `tour.type`
- Tabelle: Welche Tour wurde von wem wie oft verkauft
  - Spalten: Tour-Titel | Anzahl Verkäufe | Gesamtkommission
  - Sortierbar nach Anzahl oder Kommission
- Liste aller Buchungen mit Kommissionen
  - Spalten: Tour-Titel, Buchungsdatum, Tour-Datum, Anzahl Teilnehmer, Gesamtpreis, Kommission, Status
  - Filter: Zeitraum, Tour-Typ, Status
  - Sortierbar

**API-Call:**
- `GET /api/tour-bookings/user/:userId/commissions?startDate=...&endDate=...`

---

### 2.9 Export (Backend)

#### 2.9.1 CSV-Export implementieren

**In `backend/src/controllers/tourController.ts`:**
- `exportTours` erweitern: CSV-Format unterstützen
- Parameter: `format` ('json' | 'csv')
- CSV-Generierung (analog zu anderen Export-Funktionen)

---

## 3. INTEGRATIONSPUNKTE

### 3.1 TourProvider-Verwaltung

**Option A: Eigener Tab in Worktracker (empfohlen)**
- Neuer Tab "Provider" neben "Touren", "Buchungen"
- Vollständige CRUD-Verwaltung
- Filter/Suche

**Option B: Modal von Tour-Modals aus**
- Button "Neuer Provider" in CreateTourModal/EditTourModal
- Nur Erstellen möglich
- Keine Verwaltung

**Option C: Beides**
- Tab für Verwaltung
- Button in Modals für schnelles Erstellen

**Empfehlung:** Option C

### 3.2 Tour-Buchungen

**Integration in `TourBookingsTab.tsx`:**
- Create-Button hinzufügen
- Edit-Button bei jeder Buchung
- Cancel-Button bei jeder Buchung
- Complete-Button bei jeder Buchung

---

## 4. PRIORISIERUNG

### Kritisch (muss sofort implementiert werden):
1. **TourProvider-Verwaltung** - Ohne Provider können keine externen Touren erstellt werden
2. **Bild-Upload GET-Routes** - Bilder werden nicht angezeigt
3. **Validierungen im Frontend** - Datenintegrität

### Wichtig (sollte bald implementiert werden):
4. **Tour-Buchungen Create/Edit** - Kernfunktionalität
5. **Soft Delete Toggle** - Benutzerfreundlichkeit
6. **Notifications** - Benachrichtigungen

### Optional (kann später implementiert werden):
7. **WhatsApp-Integration** - Automatisierung
8. **Kommissions-Tracking erweitern** - Statistiken
9. **CSV-Export** - Zusätzliches Format

---

## 5. IMPLEMENTIERUNGS-REIHENFOLGE

### Schritt 1: TourProvider-Verwaltung
1. `CreateTourProviderModal.tsx` erstellen
2. `EditTourProviderModal.tsx` erstellen
3. `TourProvidersTab.tsx` erstellen
4. Tab in Worktracker hinzufügen
5. "Neuer Provider"-Button in Tour-Modals hinzufügen

### Schritt 2: Bild-Upload GET-Routes
1. `getTourImage` in `tourController.ts` implementieren
2. `getTourGalleryImage` in `tourController.ts` implementieren
3. Routes in `tours.ts` hinzufügen
4. Bild-Anzeige in `TourDetailsModal.tsx` testen

### Schritt 3: Validierungen
1. Validierungen in `CreateTourModal.tsx` hinzufügen
2. Validierungen in `EditTourModal.tsx` hinzufügen
3. Validierungen in `CreateTourBookingModal.tsx` hinzufügen

### Schritt 4: Tour-Buchungen
1. `CreateTourBookingModal.tsx` erstellen
2. `EditTourBookingModal.tsx` erstellen
3. Buttons in `TourBookingsTab.tsx` hinzufügen
4. Cancel/Complete-Funktionalität implementieren

### Schritt 5: Soft Delete
1. Toggle-Button in Tour-Liste hinzufügen
2. API-Call implementieren
3. Toast-Nachrichten hinzufügen

### Schritt 6: Notifications
1. Notification-Texts in `translations.ts` hinzufügen
2. TODO-Kommentare im Backend entfernen
3. Notification-Events implementieren

### Schritt 7: WhatsApp-Integration
1. `get_tours` Function implementieren
2. `book_tour` Function implementieren
3. Keyword-Erkennung in Message Handler
4. Provider-Response-Erkennung

### Schritt 8: Kommissions-Tracking
1. WorktimeStats Tab erweitern
2. API-Integration
3. Statistiken anzeigen

### Schritt 9: CSV-Export
1. CSV-Generierung implementieren
2. Format-Parameter hinzufügen
3. Frontend erweitern

---

## 6. TESTING-CHECKLISTE (Erweitert)

### TourProvider:
- [ ] TourProvider erstellen
- [ ] TourProvider bearbeiten
- [ ] TourProvider löschen (mit/ohne verknüpfte Touren)
- [ ] TourProvider in Tour-Modal auswählen
- [ ] "Neuer Provider"-Button öffnet Modal
- [ ] Nach Erstellung wird Provider automatisch ausgewählt

### Tour-Buchungen:
- [ ] Buchung erstellen (eigene Tour)
- [ ] Buchung erstellen (externe Tour)
- [ ] Buchung bearbeiten
- [ ] Buchung stornieren (Kunde)
- [ ] Buchung stornieren (Provider)
- [ ] Buchung abschließen
- [ ] Validierungen funktionieren

### Validierungen:
- [ ] `externalProviderId` required bei externer Tour
- [ ] `maxParticipants >= minParticipants`
- [ ] `availableFrom <= availableTo`
- [ ] `tourDate >= heute`
- [ ] `numberOfParticipants` zwischen min/max

### Soft Delete:
- [ ] Tour aktivieren
- [ ] Tour deaktivieren
- [ ] Deaktivierte Touren werden ausgeblendet
- [ ] Filter "Inaktive" zeigt deaktivierte Touren

### Bild-Upload:
- [ ] Hauptbild wird angezeigt
- [ ] Gallery-Bilder werden angezeigt
- [ ] Bilder werden korrekt geladen

### Notifications:
- [ ] Tour gebucht - Notification wird erstellt
- [ ] Tour angefragt - Notification wird erstellt
- [ ] Tour bezahlt - Notification wird erstellt
- [ ] Tour gecancelt - Notification wird erstellt

### WhatsApp:
- [ ] `get_tours` Function funktioniert
- [ ] `book_tour` Function funktioniert
- [ ] Keyword-Erkennung funktioniert
- [ ] Provider-Response wird verarbeitet

### Kommissionen:
- [ ] Kommissionen-Tab wird angezeigt
- [ ] Statistiken werden korrekt angezeigt
- [ ] Liste der Buchungen wird angezeigt

### Export:
- [ ] JSON-Export funktioniert
- [ ] CSV-Export funktioniert
- [ ] Feldauswahl funktioniert

---

## 7. ZUSAMMENFASSUNG

**Kritische Fehler:**
1. TourProvider-Verwaltung fehlt komplett im Frontend
2. Bild-Upload GET-Routes fehlen im Backend
3. Validierungen fehlen im Frontend
4. Tour-Buchungen Create/Edit fehlen
5. Soft Delete Toggle fehlt

**Wichtige Fehler:**
6. Notifications werden nicht getriggert
7. WhatsApp-Integration fehlt
8. Kommissions-Tracking unvollständig

**Kleinere Fehler:**
9. CSV-Export fehlt

**Gesamt:** 9 fehlende Implementierungen, davon 5 kritisch

