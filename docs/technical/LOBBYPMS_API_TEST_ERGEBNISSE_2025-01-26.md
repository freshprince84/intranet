# LobbyPMS API Test-Ergebnisse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ Verfügbarkeits-API funktioniert! Reservierungserstellung benötigt category_id

---

## 📊 TEST-ERGEBNISSE

### ✅ Verfügbarkeits-API (`/api/v2/available-rooms`) - FUNKTIONIERT!

**Erfolgreiche Tests:**
- ✅ Test 2: `start_date + end_date` - Status 200
- ✅ Test 6: Alle Parameter kombiniert - Status 200

**Erforderliche Parameter:**
- ✅ `start_date` (erforderlich) - Format: "YYYY-MM-DD"
- ✅ `end_date` (erforderlich) - Format: "YYYY-MM-DD"
- ⚠️ `property_id` (optional)
- ⚠️ `room_type` (optional) - Unterstützung unklar (wird ignoriert?)

**Response-Struktur (GETESTET):**
```json
{
  "data": [
    {
      "date": "2025-11-29",
      "categories": [
        {
          "category_id": 34280,
          "name": "El primo aventurero",
          "available_rooms": 7,
          "plans": [
            {
              "id": null,
              "name": "STANDARD_RATE",
              "prices": [
                {
                  "people": 1,
                  "value": 60000
                }
              ]
            }
          ],
          "restrictions": {
            "min_stay": 0,
            "max_stay": 0,
            "lead_days": 0
          }
        }
      ]
    }
  ],
  "meta": {
    "total_records": 2,
    "current_page": 1,
    "records_per_page": 100,
    "total_pages": 1
  }
}
```

**Wichtige Erkenntnisse:**
- ✅ API funktioniert mit `start_date` + `end_date`
- ✅ Response enthält Verfügbarkeit pro Datum und Kategorie
- ✅ Preise sind pro Person (`people`, `value`)
- ✅ `available_rooms` = Anzahl verfügbarer Zimmer
- ✅ `category_id` = ID der Zimmerkategorie
- ✅ `name` = Name der Zimmerkategorie (z.B. "La tia artista", "El primo aventurero")
- ⚠️ `room_type` Parameter wird ignoriert (alle Zimmerarten werden zurückgegeben)

**Beispiel-Daten aus Test:**
- "El primo aventurero" (category_id: 34280) - 7 Zimmer verfügbar, 60.000 COP/Person
- "La tia artista" (category_id: 34281) - 3 Zimmer verfügbar, 50.000 COP/Person
- "El abuelo viajero" (category_id: 34282) - 6 Zimmer verfügbar, 65.000 COP/Person
- "Doble básica" (category_id: 34312) - 1 Zimmer verfügbar, 100.000 COP/Person (1 Person), 120.000 COP (2 Personen)
- "Apartamento doble" (category_id: 34284) - 0 Zimmer verfügbar, 200.000-260.000 COP (1-4 Personen)

### ✅ Reservierungserstellungs-API (`/api/v1/bookings`) - FUNKTIONIERT!

**Datum:** 2025-01-29  
**Status:** ✅ **ERFOLGREICH GETESTET**

**Erfolgreiche Tests:** 3 von 6 Tests erfolgreich (Status 201)

**Erforderliche Felder (GETESTET):**
- ✅ `category_id` (erforderlich) - Zimmerkategorie-ID
- ✅ `start_date` (erforderlich) - Format: "YYYY-MM-DD"
- ✅ `end_date` (erforderlich) - Format: "YYYY-MM-DD"
- ✅ `holder_name` (erforderlich) - Name des Gastes (NICHT `guest_name`!)
- ✅ `total_adults` (erforderlich) - Anzahl Erwachsene (snake_case, NICHT camelCase!)

**Optionale Felder:**
- `guest_email` - E-Mail des Gastes
- `guest_phone` - Telefonnummer des Gastes

**Response-Struktur (GETESTET):**
```json
{
  "booking": {
    "booking_id": 18251865,
    "room_id": 807372
  }
}
```

**Erfolgreiche Payload-Beispiele:**
```json
{
  "category_id": 34280,
  "start_date": "2025-12-01",
  "end_date": "2025-12-02",
  "holder_name": "Test Gast",
  "total_adults": 1
}
```

**Wichtige Erkenntnisse:**
- ✅ Endpunkt `/api/v1/bookings` funktioniert (Status 201 bei Erfolg)
- ✅ Response enthält `booking_id` (nicht `id`!)
- ✅ `holder_name` ist erforderlich (nicht `guest_name`!)
- ✅ `total_adults` muss snake_case sein (nicht `totalAdults`!)
- ❌ Endpunkte `/api/v2/bookings`, `/api/v1/reservations`, `/api/v2/reservations` existieren nicht (404)

**Fehlerfälle:**
- Status 422: "The holder name field is required when customer document is not present."
- Status 422: "The total adults field is required."
- Status 422: "The customer nationality field is required when customer document is present."
- Status 422: "room not available" (wenn Zimmer bereits belegt)

**Test-Ergebnisse (2025-01-29):**
- ✅ Minimal: `category_id` + `holder_name` + `total_adults` → Status 201
- ✅ Mit Kontakt: `holder_name` + `guest_email` + `guest_phone` + `total_adults` → Status 201
- ❌ Mit `customer_document`: Benötigt `customer_nationality` → Status 422
- ❌ Mit `totalAdults` (camelCase): API erwartet `total_adults` (snake_case) → Status 422

### ❓ Stornierungs-API

**Status:** Nicht getestet (keine Reservierung mit lobbyReservationId gefunden)

**Nächste Schritte:**
- Test mit vorhandener booking_id durchführen

---

## 🎯 WICHTIGE ERKENNTNISSE

### 1. Verfügbarkeitsprüfung

**Funktioniert:**
- ✅ Endpunkt: `GET /api/v2/available-rooms`
- ✅ Parameter: `start_date` (erforderlich), `end_date` (erforderlich)
- ✅ Response-Struktur bekannt

**Response-Mapping:**
- `category_id` → Zimmerkategorie-ID
- `name` → Zimmername (z.B. "La tia artista")
- `available_rooms` → Anzahl verfügbarer Zimmer
- `plans[0].prices[0].value` → Preis pro Person
- `plans[0].prices[0].people` → Anzahl Personen

**Zimmerart-Erkennung:**
- Muss aus `name` oder `category_id` abgeleitet werden
- Oder: Mapping-Tabelle erstellen (category_id → room_type)

### 2. Reservierungserstellung

**Status:** Endpunkt existiert, benötigt `category_id`

**Erforderliche Felder (bekannt):**
- ✅ `category_id` (erforderlich)

**Zu testen:**
- Welche weiteren Felder sind erforderlich?
- Format der Payload
- Response-Struktur

### 3. Stornierung

**Status:** Noch nicht getestet

---

## 📝 NÄCHSTE SCHRITTE

### Schritt 1: Reservierungserstellung mit category_id testen

**Test-Script erweitern:**
- Payload mit `category_id` testen
- Weitere Felder schrittweise hinzufügen

### Schritt 2: Mapping category_id → room_type erstellen

**Problem:** Response enthält keine `room_type` (compartida/privada)

**Lösung:**
- Mapping-Tabelle erstellen
- Oder: Aus Namen ableiten (z.B. "Dorm" = compartida, "Apartamento" = privada)

### Schritt 3: Stornierungs-API testen

- Test mit vorhandener booking_id durchführen

---

**Erstellt:** 2025-01-26  
**Letzte Aktualisierung:** 2025-01-29  
**Status:** ✅ VERFÜGBARKEITS-API & BOOKING-API GETESTET - Beide funktionieren!
