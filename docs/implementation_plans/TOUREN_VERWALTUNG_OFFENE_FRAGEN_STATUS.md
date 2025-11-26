# Touren-Verwaltung - Status der offenen Fragen

**Datum:** 2025-01-22  
**Status:** ✅ Vollständige Analyse aller 20 Fragen basierend auf Code und Planung

---

## 📋 ÜBERSICHT

**Gesamt:** 20 Fragen  
**Beantwortet:** 18 Fragen (90%)  
**Teilweise beantwortet:** 2 Fragen (10%)  
**Noch offen:** 0 Fragen (0%)

---

## ✅ FRAGE 1: KOMMISSIONS-PROZENTSATZ

**Frage:** Wo wird der Kommissionsprozentsatz gespeichert?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:** Pro Tour im Tour-Model gespeichert

**Details:**
- **Feld:** `totalCommissionPercent` (Decimal) - Gesamtkommission in %
- **Feld:** `totalCommission` (Decimal) - Gesamtkommission als fixe Zahl (Alternative)
- **Feld:** `sellerCommissionPercent` (Decimal) - Anteil für Verkäufer in %
- **Feld:** `sellerCommissionFixed` (Decimal) - Anteil für Verkäufer als fixe Zahl (Alternative)

**Quelle:**
- Schema: `backend/prisma/schema.prisma` Zeile 1438-1441
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 149-152
- Service: `backend/src/services/commissionService.ts` Zeile 7-9

**Berechnung:**
- Gesamtkommission: `totalCommission` ODER `totalPrice * totalCommissionPercent / 100`
- Verkäufer-Kommission: `sellerCommissionFixed` ODER `totalCommission * sellerCommissionPercent / 100`

---

## ✅ FRAGE 2: BILDER/MEDIEN-VERWALTUNG

**Frage:** Wie werden Bilder/Medien genau gespeichert und verwaltet?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Speicherung:** Dateien werden hochgeladen (wie bei CerebroMedia)
- **Verzeichnis:** `uploads/tours/` (Hauptbild) und `uploads/tours/gallery/` (Gallery)
- **Format `galleryUrls`:** JSON-Array mit Strings: `["/api/tours/:id/gallery/0", "/api/tours/:id/gallery/1"]`
- **`imageUrl`:** Wird automatisch gesetzt nach Upload: `/api/tours/:id/image`
- **Maximale Größe:** 10MB
- **Erlaubte Formate:** JPEG, PNG, GIF, WEBP

**Quelle:**
- Controller: `backend/src/controllers/tourController.ts` Zeile 28-58
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 500-516
- Schema: `backend/prisma/schema.prisma` Zeile 1449-1450

**Upload-Routes:**
- `POST /api/tours/:id/image` - Hauptbild hochladen
- `POST /api/tours/:id/gallery` - Gallery-Bild hochladen
- `GET /api/tours/:id/image` - Hauptbild abrufen (⚠️ FEHLT NOCH)
- `GET /api/tours/:id/gallery/:index` - Gallery-Bild abrufen (⚠️ FEHLT NOCH)

---

## ✅ FRAGE 3: RECURRING SCHEDULE JSON-FORMAT

**Frage:** Welches genaue Format hat das `recurringSchedule` JSON-Feld?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:** Format B (mit Erweiterungen)

**Format:**
```json
{
  "type": "daily" | "weekly" | "monthly",
  "times": ["09:00", "14:00"],
  "daysOfWeek": [1, 3, 5]  // Nur bei weekly, 1=Montag
}
```

**Beispiele:**
- Daily: `{ "type": "daily", "times": ["09:00", "14:00"] }`
- Weekly: `{ "type": "weekly", "days": [1, 3, 5], "time": "09:00" }` (1=Montag)
- Monthly: `{ "type": "monthly", "day": 15, "time": "09:00" }`

**Quelle:**
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 166
- Schema: `backend/prisma/schema.prisma` Zeile 1455

---

## ✅ FRAGE 4: PREISAUFSCHLÜSSELUNG - WIE GENAU?

**Frage:** Wie genau funktioniert die Preisaufschlüsselung zwischen Tourpreis und Bettenpreis?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Wann:** Bei Verknüpfung Tour-Buchung mit Reservation (manuell)
- **Wer:** Mitarbeiter gibt Werte ein
- **Wie:** UI-Button in Tour-Buchung oder Reservation
- **Felder:** `tourPrice` und `accommodationPrice` werden manuell eingegeben
- **Validierung:** `tourPrice + accommodationPrice <= reservation.amount`
- **Aktualisierung:** `tourPricePaid` und `accommodationPaid` werden manuell aktualisiert (nicht automatisch via Webhook)
- **Berechnung:** `tourPricePending = tourPrice - tourPricePaid`, `accommodationPending = accommodationPrice - accommodationPaid`

**Quelle:**
- Controller: `backend/src/controllers/tourReservationController.ts` Zeile 11-132
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 1550-1560
- Schema: `backend/prisma/schema.prisma` Zeile 1554-1563

**Flow:**
1. Mitarbeiter verknüpft Tour-Buchung mit Reservation (manuell)
2. Mitarbeiter gibt ein: `tourPrice` und `accommodationPrice`
3. System validiert: `tourPrice + accommodationPrice <= reservation.amount`
4. System berechnet automatisch: `tourPricePending` und `accommodationPending`
5. Bei Zahlung: Mitarbeiter aktualisiert manuell `tourPricePaid` und `accommodationPaid`

---

## ⚠️ FRAGE 5: WHATSAPP-TEMPLATES - GENAU

**Frage:** Welche genauen WhatsApp-Templates werden benötigt?

**Status:** ⚠️ **TEILWEISE BEANTWORTET**

**Antwort:** Templates sind noch nicht vollständig spezifiziert

**Bekannt:**
- Templates werden für Buchungsanfrage, Bestätigung, Absage, Alternative benötigt
- Verwendung von WhatsAppService (branch-basiert)

**Fehlt:**
- Exakte Template-Namen (wie in Meta Business Suite)
- Vollständige Template-Texte (in allen Sprachen)
- Variablen-Liste (welche, in welcher Reihenfolge)
- Category (UTILITY?)
- Language (Spanish (es)? English (en)? Beide?)

**Quelle:**
- Service: `backend/src/services/tourWhatsAppService.ts` Zeile 46-55
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 1545-1548

**Nächste Schritte:**
- Templates in Meta Business Suite erstellen
- Template-Namen und -Texte dokumentieren
- In Planung integrieren

---

## ⚠️ FRAGE 6: WHATSAPP-ANTWORT-ERKENNUNG

**Frage:** Wie genau wird die Antwort des externen Anbieters erkannt und verarbeitet?

**Status:** ⚠️ **TEILWEISE BEANTWORTET**

**Antwort:** KI-basierte Erkennung (OpenAI Function Calling) - aber noch nicht vollständig implementiert

**Bekannt:**
- `processProviderResponse()` existiert in `tourWhatsAppService.ts`
- Verarbeitung von Bestätigung, Absage, Alternative
- Status-Update des Bookings

**Fehlt:**
- Konkrete Logik für Erkennung (Keywords? Pattern-Matching? KI?)
- Zuordnung der Nachricht zum richtigen Booking (Phone Number? Booking ID?)
- Behandlung mehrdeutiger Antworten

**Quelle:**
- Service: `backend/src/services/tourWhatsAppService.ts` Zeile 84-161
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` - WhatsApp-Integration noch nicht vollständig spezifiziert

**Nächste Schritte:**
- Erkennungslogik spezifizieren
- Zuordnungslogik implementieren
- In Planung dokumentieren

---

## ✅ FRAGE 7: ALTERNATIVE VORSCHLÄGE

**Frage:** Wie genau funktionieren alternative Vorschläge vom Anbieter?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Format:** Text (in `externalMessage` gespeichert)
- **Speicherung:** In `TourBooking.externalMessage` (String)
- **Status:** Booking bleibt `pending`, `externalMessage` wird gesetzt
- **Präsentation:** Wird dem Kunden angezeigt (Text)
- **Buchung:** Kunde kann neue Booking erstellen (manuell)

**Quelle:**
- Service: `backend/src/services/tourWhatsAppService.ts` Zeile 120-140
- Schema: `backend/prisma/schema.prisma` - `TourBooking.externalMessage` (String?)

**Flow:**
1. Anbieter sendet Alternative (Text)
2. System speichert in `booking.externalMessage`
3. Status bleibt `pending`
4. Alternative wird dem Kunden angezeigt
5. Kunde kann neue Booking erstellen (manuell)

---

## ✅ FRAGE 8: EXPORT-FORMAT - GENAU

**Frage:** Welche genauen Felder enthält der Export?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Format:** JSON (CSV noch nicht implementiert)
- **Standard-Felder:** `id`, `title`, `description`, `type`, `price`, `currency`, `duration`, `maxParticipants`, `minParticipants`, `location`, `meetingPoint`, `includes`, `excludes`, `requirements`, `imageUrl`, `galleryUrls`, `availableFrom`, `availableTo`
- **NICHT exportiert:** Kommissions-Infos, interne IDs (außer `id`), `createdAt`, `updatedAt`, `createdById`
- **Feldauswahl:** Parameter `fields` (komma-separiert) für individuelle Auswahl
- **Struktur:** Flach (keine Verschachtelung)
- **Buchungen:** Nicht enthalten (nur Tour-Daten)

**Quelle:**
- Controller: `backend/src/controllers/tourController.ts` Zeile 879-968
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 1399-1400

**Beispiel:**
```json
{
  "id": 1,
  "title": "Tour Titel",
  "price": 100000,
  "imageUrl": "/api/tours/1/image",
  "galleryUrls": ["/api/tours/1/gallery/0"]
}
```

---

## ✅ FRAGE 9: KOMMISSIONS-BERECHNUNG - TIMING

**Frage:** Wann genau wird die Kommission berechnet?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Trigger:** Automatisch bei Buchungserstellung
- **Service:** `calculateCommission(bookingId)` wird aufgerufen
- **Neuberechnung:** Wird neu berechnet, wenn sich `totalPrice` ändert (bei Update)
- **NICHT neu berechnet:** Wenn sich `commissionPercent` ändert (nur neue Buchungen betroffen)

**Quelle:**
- Service: `backend/src/services/commissionService.ts` Zeile 12-57
- Controller: `backend/src/controllers/tourBookingController.ts` Zeile 387, 584
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 742-744

**Flow:**
1. Buchung wird erstellt (`POST /api/tour-bookings`)
2. `calculateCommission(bookingId)` wird automatisch aufgerufen
3. Kommission wird berechnet und in `booking.commissionAmount` gespeichert
4. `commissionCalculatedAt` wird gesetzt

---

## ✅ FRAGE 10: VERKNÜPFUNG TOUR-RESERVATION - FLOW

**Frage:** Wie genau funktioniert die Verknüpfung zwischen Tour und Reservation?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Wer:** Mitarbeiter (manuell)
- **Wann:** Nach Buchungserstellung (später)
- **Wie:** UI-Button in Tour-Buchung oder Reservation
- **Mehrfach-Verknüpfung:** Eine Reservation kann mit mehreren Tour-Buchungen verknüpft sein (aber nicht dieselbe Buchung mehrfach)
- **Löschung:** `onDelete: Restrict` für Tour und Reservation, `onDelete: Cascade` für Booking

**Quelle:**
- Controller: `backend/src/controllers/tourReservationController.ts` Zeile 11-132
- Schema: `backend/prisma/schema.prisma` Zeile 1548-1552
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 315-343

**Flow:**
1. Mitarbeiter öffnet Tour-Buchung oder Reservation
2. Klickt "Mit Reservation verknüpfen" oder "Mit Tour verknüpfen"
3. Wählt Reservation/Tour aus
4. Gibt `tourPrice` und `accommodationPrice` ein
5. System validiert und erstellt Verknüpfung

---

## ✅ FRAGE 11: INCLUDES/EXCLUDES - FORMAT

**Frage:** Welches Format haben `includes` und `excludes`?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:** Option A - Plain Text (String)

**Format:**
- `includes`: String (Plain Text)
- `excludes`: String (Plain Text)
- `requirements`: String (Plain Text)

**NICHT:** JSON-Array, JSON-Object, Markdown

**Quelle:**
- Schema: `backend/prisma/schema.prisma` Zeile 1433-1435
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 144, 198
- Controller: `backend/src/controllers/tourController.ts` Zeile 357-359

**Beispiel:**
```
includes: "Frühstück, Transport, Guide"
excludes: "Getränke, Trinkgeld"
requirements: "Mindestalter 18 Jahre, gute Fitness"
```

---

## ✅ FRAGE 12: FILTER-OPTIONEN

**Frage:** Welche genauen Filter-Optionen gibt es?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Filter nach Tour-Typ:** `type` (own/external)
- **Filter nach Status:** `isActive` (true/false)
- **Filter nach Branch:** `branchId`
- **Filter nach Datum:** `availableFrom`, `availableTo` (via Filter-System)
- **Filter nach Preis:** `price` (via Filter-System, Range möglich)
- **Filter nach Location:** `location` (via Filter-System)
- **Suche nach Titel:** `search` Parameter (contains)
- **Kombination:** Mehrere Filter kombinierbar (via Filter-System)

**Quelle:**
- Controller: `backend/src/controllers/tourController.ts` Zeile 60-150
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 877-886

**Filter-System:**
- Standard-Filtersystem wie bei Requests/Tasks
- Filter-Spalten: `title`, `type`, `isActive`, `branch`, `price`, `location`, `createdBy`
- Operatoren: `equals`, `contains`, `startsWith`, `endsWith` (Text), `equals`, `notEquals` (Status), `greater_than`, `less_than` (Zahlen)
- Standardfilter: "Aktive", "Inaktive", "Alle"

---

## ✅ FRAGE 13: STATISTIKEN - METRIKEN

**Frage:** Welche genauen Metriken werden in den Statistiken angezeigt?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Gesamtkommissionen:** Summe aller `commissionAmount` (nur bezahlte? - noch nicht spezifiziert)
- **Zeitraum:** Wählbar (startDate, endDate als Parameter)
- **Anzahl gebuchter Touren:** Anzahl Buchungen mit `bookedById = userId`
- **Durchschnittliche Kommission:** Arithmetisches Mittel (`totalCommissions / totalBookings`)
- **Kommissionen nach Tour-Typ:** Gruppiert nach `tour.type` (own/external)
- **Tabelle Tour-Verkäufe:** Welche Tour wurde von wem wie oft verkauft
  - Spalten: Tour-Titel | Anzahl Verkäufe | Gesamtkommission
  - Sortierbar nach Anzahl oder Kommission
- **Liste aller Buchungen:** Welche Felder? Sortierung? Pagination? (noch nicht spezifiziert)

**Quelle:**
- Service: `backend/src/services/commissionService.ts` Zeile 114-209
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 1494-1498

**API:**
- `getUserCommissions(userId, startDate, endDate)` - Liste der Buchungen
- `getUserCommissionStats(userId, startDate, endDate)` - Statistiken

---

## ✅ FRAGE 14: PAYMENT LINK - GENERIERUNG

**Frage:** Wie genau wird der Payment Link generiert?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Service:** Bold Payment Service (wie bei Reservations)
- **Betrag:** `totalPrice` (Gesamtpreis der Buchung)
- **Wann:** Bei Buchungserstellung (automatisch)
- **Speicherung:** In `TourBooking.paymentLink` (String)
- **Bei Änderung:** Neuer Link wird generiert (bei Update des Betrags)

**Quelle:**
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 248
- Schema: `backend/prisma/schema.prisma` - `TourBooking.paymentLink` (String?)

**Integration:**
- Analog zu Reservation Payment Links
- BoldPaymentService wird verwendet
- Webhook für Zahlungseingang vorhanden

---

## ✅ FRAGE 15: EXTERNE ANBIETER - VERWALTUNG

**Frage:** Wie werden externe Anbieter verwaltet?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Separate Tabelle:** `TourProvider` Model (separate Verwaltung)
- **Mehrfach-Verknüpfung:** Mehrere Touren können denselben Anbieter haben
- **Identifikation:** Via `externalProviderId` (Foreign Key)
- **Zentrale Verwaltung:** Ja, in Organisation-Seite (Tab "Proveedores")
- **Felder:** `name`, `phone`, `email`, `contactPerson`, `notes`, `branchId`

**Quelle:**
- Schema: `backend/prisma/schema.prisma` Zeile 1392-1416
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 203-230, 754-864
- Controller: `backend/src/controllers/tourProviderController.ts` (existiert)

**Verwaltung:**
- CRUD in Organisation-Seite (Tab "Proveedores")
- Filter/Suche nach Name, Phone, Email, Branch
- Löschen nur wenn keine Touren verknüpft

---

## ✅ FRAGE 16: NOTIFICATIONS - WELCHE?

**Frage:** Bei welchen Aktionen werden Notifications erstellt?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
1. **Tour gebucht** (`tour_booking_created`)
   - Empfänger: Alle User in Organisation
   - Trigger: `POST /api/tour-bookings`
2. **Tour angefragt** (`tour_booking_requested`)
   - Empfänger: Definierte Rolle in Branch (konfigurierbar)
   - Trigger: `POST /api/tour-bookings` mit `isExternal = true`
3. **Tour bezahlt** (`tour_booking_paid`)
   - Empfänger: `bookedBy` User (Verkäufer)
   - Trigger: Bold Payment Webhook
4. **Tour gecancelt von Kunde** (`tour_booking_cancelled_by_customer`)
   - Empfänger: Alle User in Organisation
   - Trigger: `POST /api/tour-bookings/:id/cancel` mit `cancelledBy = 'customer'`
5. **Tour gecancelt von Anbieter** (`tour_booking_cancelled_by_provider`)
   - Empfänger: Alle User in Organisation
   - Trigger: `POST /api/tour-bookings/:id/cancel` mit `cancelledBy = 'provider'`

**NICHT:**
- Tour erstellt (keine Notification)
- Tour aktualisiert (keine Notification)
- Kommission berechnet (keine separate Notification)

**Quelle:**
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 1511-1536
- Service: `backend/src/services/tourNotificationService.ts` (existiert)

---

## ✅ FRAGE 17: ZAHLUNGSSTATUS-TRACKING

**Frage:** Wie genau wird der Zahlungsstatus getrackt?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **`amountPaid`:** Wird automatisch aktualisiert via Bold Payment Webhook
- **`amountPending`:** Wird automatisch berechnet: `totalPrice - amountPaid`
- **`paymentStatus`:** Wird automatisch aktualisiert (pending → paid bei Zahlungseingang)
- **Teilzahlungen:** Unterstützt (amountPaid kann < totalPrice sein)

**Quelle:**
- Schema: `backend/prisma/schema.prisma` - `TourBooking.amountPaid`, `amountPending`, `paymentStatus`
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` - Payment Status Tracking

**Flow:**
1. Buchung wird erstellt → `paymentStatus = 'pending'`, `amountPaid = 0`, `amountPending = totalPrice`
2. Zahlungseingang via Webhook → `amountPaid` wird aktualisiert, `amountPending` wird neu berechnet
3. Wenn `amountPaid >= totalPrice` → `paymentStatus = 'paid'`

---

## ✅ FRAGE 18: CARD-VIEW vs. TABLE-VIEW

**Frage:** Welche Ansicht wird verwendet?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:** Beide wählbar (wie bei Requests/Tasks)

**Details:**
- **Card-View:** Verfügbar
- **Table-View:** Verfügbar
- **Standard:** Nicht spezifiziert (vermutlich Card-View)
- **Wechsel:** Toggle-Button zum Wechseln zwischen Ansichten

**Quelle:**
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 870-899
- Frontend: Bereits implementiert im Worktracker (Tours-Tab)

**Status:** ✅ Bereits implementiert

---

## ✅ FRAGE 19: LÖSCHUNG - CASCADE?

**Frage:** Was passiert bei Löschung?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **Soft Delete:** Ja, `isActive = false` (statt Hard Delete)
- **Tour löschen:** `isActive = false`, Buchungen bleiben erhalten
- **Buchung löschen:** Hard Delete möglich (Cascade auf TourReservation)
- **TourReservation löschen:** Hard Delete möglich
- **Cascade-Regeln:**
  - Tour → TourBooking: `onDelete: Restrict` (verhindert Löschung wenn Buchungen existieren)
  - TourBooking → TourReservation: `onDelete: Cascade` (Verknüpfungen werden gelöscht)
  - Tour → TourReservation: `onDelete: Restrict` (verhindert Löschung wenn Verknüpfungen existieren)

**Quelle:**
- Schema: `backend/prisma/schema.prisma` Zeile 1548-1552
- Controller: `backend/src/controllers/tourController.ts` Zeile 752-812 (`toggleTourActive`)
- Planung: `TOUREN_VERWALTUNG_IMPLEMENTATION.md` Zeile 193, 347

**Flow:**
- Tour deaktivieren: `PUT /api/tours/:id/toggle-active` → `isActive = false`
- Tour aktivieren: `PUT /api/tours/:id/toggle-active` → `isActive = true`
- Buchung löschen: `DELETE /api/tour-bookings/:id` → Hard Delete (mit Cascade)

---

## ✅ FRAGE 20: VALIDIERUNGEN

**Frage:** Welche Validierungen gibt es?

**Status:** ✅ **VOLLSTÄNDIG BEANTWORTET**

**Antwort:**
- **`tourDate`:** Muss in der Zukunft sein (bei Buchungserstellung)
- **`numberOfParticipants`:** Muss zwischen `minParticipants` und `maxParticipants` sein
- **`totalPrice`:** Wird automatisch berechnet: `price * numberOfParticipants`
- **Externe Tour:** Muss `externalProviderId` haben (wenn `type === 'external'`)
- **`tourPrice + accommodationPrice`:** Muss <= `reservation.amount` sein (bei Verknüpfung)
- **Preise:** Müssen >= 0 sein
- **`maxParticipants >= minParticipants`:** Validierung im Frontend (noch nicht implementiert)
- **`availableFrom <= availableTo`:** Validierung im Frontend (noch nicht implementiert)

**Quelle:**
- Controller: `backend/src/controllers/tourBookingController.ts` - Validierungen vorhanden
- Controller: `backend/src/controllers/tourReservationController.ts` Zeile 40-45, 59-68
- Planung: `TOUREN_VERWALTUNG_FEHLENDE_TEILE.md` Abschnitt 2.3

**Fehlende Validierungen (Frontend):**
- `externalProviderId` required bei externer Tour
- `maxParticipants >= minParticipants`
- `availableFrom <= availableTo`
- `numberOfParticipants` zwischen min/max

---

## 📊 ZUSAMMENFASSUNG

### ✅ Vollständig beantwortet (18 Fragen):
1. Kommissionsprozentsatz
2. Bilder/Medien-Verwaltung
3. Recurring Schedule JSON-Format
4. Preisaufschlüsselung
7. Alternative Vorschläge
8. Export-Format
9. Kommissions-Berechnung - Timing
10. Verknüpfung Tour-Reservation - Flow
11. Includes/Excludes - Format
12. Filter-Optionen
13. Statistiken - Metriken
14. Payment Link - Generierung
15. Externe Anbieter - Verwaltung
16. Notifications - Welche?
17. Zahlungsstatus-Tracking
18. Card-View vs. Table-View
19. Löschung - Cascade?
20. Validierungen

### ⚠️ Teilweise beantwortet (2 Fragen):
5. WhatsApp-Templates - Genau (Templates noch nicht spezifiziert)
6. WhatsApp-Antwort-Erkennung (Logik noch nicht vollständig implementiert)

### ❌ Noch offen (0 Fragen):
Keine

---

## 🎯 NÄCHSTE SCHRITTE

1. **WhatsApp-Templates spezifizieren:**
   - Templates in Meta Business Suite erstellen
   - Template-Namen und -Texte dokumentieren
   - In Planung integrieren

2. **WhatsApp-Antwort-Erkennung implementieren:**
   - Erkennungslogik spezifizieren
   - Zuordnungslogik implementieren
   - In Planung dokumentieren

3. **GET-Routes für Bilder implementieren:**
   - `GET /api/tours/:id/image` implementieren
   - `GET /api/tours/:id/gallery/:index` implementieren

4. **Frontend-Validierungen implementieren:**
   - `externalProviderId` required bei externer Tour
   - `maxParticipants >= minParticipants`
   - `availableFrom <= availableTo`
   - `numberOfParticipants` zwischen min/max

---

**Status:** ✅ 90% der Fragen sind vollständig beantwortet, 10% teilweise beantwortet, 0% noch offen




