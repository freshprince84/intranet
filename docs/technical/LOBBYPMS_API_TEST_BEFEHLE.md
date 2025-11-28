# LobbyPMS API Test - Befehle für Server

**Datum:** 2025-01-26  
**Status:** Schritt-für-Schritt Befehle

---

## 📋 BEFEHLE DER REIHE NACH

### Schritt 1: Ins richtige Verzeichnis wechseln

```bash
cd /var/www/intranet/backend
```

### Schritt 2: API-Key Länge prüfen

```bash
npx ts-node scripts/check-api-key-length.ts
```

**Was passiert:**
- Zeigt Länge des API-Keys
- Zeigt Länge des Authorization Headers
- Warnt wenn > 4KB

### Schritt 3: Verfügbarkeits-API testen

```bash
npx ts-node scripts/test-lobbypms-availability.ts
```

**Was passiert:**
- Testet `/api/v2/available-rooms` Endpunkt
- Verschiedene Parameter-Kombinationen
- Speichert Ergebnisse in `lobbypms-availability-test-results.json`

### Schritt 4: Reservierungserstellungs-API testen

```bash
npx ts-node scripts/test-lobbypms-create-booking.ts
```

**Was passiert:**
- Testet verschiedene Endpunkte zum Erstellen von Reservierungen
- Verschiedene Payload-Strukturen
- Speichert Ergebnisse in `lobbypms-create-booking-test-results.json`

### Schritt 5: Stornierungs-API testen

```bash
npx ts-node scripts/test-lobbypms-cancel-booking.ts
```

**Was passiert:**
- Testet Stornierungs-Endpunkte
- Verwendet erste Reservierung aus DB (falls vorhanden)
- Oder: `npx ts-node scripts/test-lobbypms-cancel-booking.ts [booking_id]`

### Schritt 6: Ergebnisse prüfen

```bash
# Verfügbarkeits-Ergebnisse anzeigen
cat lobbypms-availability-test-results.json | jq .

# Reservierungserstellungs-Ergebnisse anzeigen
cat lobbypms-create-booking-test-results.json | jq .
```

**Falls jq nicht installiert:**
```bash
# Ohne jq (einfach anzeigen):
cat lobbypms-availability-test-results.json
cat lobbypms-create-booking-test-results.json
```

---

## 🔍 OPTIONAL: API direkt mit curl testen

**Falls die Tests weiterhin "400 Request Header Or Cookie Too Large" geben:**

### Schritt 7: API-Key aus Script holen

```bash
# API-Key wird im Script ausgegeben, kopiere ihn
# Dann teste direkt mit curl:
```

```bash
# Ersetze {API_KEY} mit dem tatsächlichen API-Key
curl -X GET "https://api.lobbypms.com/api/v2/available-rooms?start_date=2025-02-01" \
  -H "Authorization: Bearer {API_KEY}" \
  -H "Content-Type: application/json" \
  -v
```

**Was passiert:**
- Testet API direkt (ohne unser System)
- Zeigt vollständige Request/Response
- Wenn auch hier "400" → Problem bei LobbyPMS API selbst
- Wenn funktioniert → Problem in unserem Code

---

## 📝 ZUSAMMENFASSUNG ALLER BEFEHLE

```bash
# 1. Verzeichnis wechseln
cd /var/www/intranet/backend

# 2. API-Key Länge prüfen
npx ts-node scripts/check-api-key-length.ts

# 3. Verfügbarkeits-API testen
npx ts-node scripts/test-lobbypms-availability.ts

# 4. Reservierungserstellungs-API testen
npx ts-node scripts/test-lobbypms-create-booking.ts

# 5. Stornierungs-API testen
npx ts-node scripts/test-lobbypms-cancel-booking.ts

# 6. Ergebnisse anzeigen
cat lobbypms-availability-test-results.json
cat lobbypms-create-booking-test-results.json
```

---

**Erstellt:** 2025-01-26

