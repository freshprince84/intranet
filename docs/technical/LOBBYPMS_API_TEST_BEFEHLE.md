# LobbyPMS API Test - Befehle für Server

**Datum:** 2025-01-26  
**Status:** Schritt-für-Schritt Befehle

---

## 📋 BEFEHLE DER REIHE NACH

### Schritt 1: Ins richtige Verzeichnis wechseln

```bash
cd /var/www/intranet/backend
```

### Schritt 2: API-Key Länge prüfen (optional)

```bash
npx ts-node scripts/check-api-key-length.ts
```

**Was passiert:**
- Zeigt Länge des API-Keys
- Zeigt Länge des Authorization Headers
- Warnt wenn > 4KB

### Schritt 3: Verfügbarkeits-API testen (bereits getestet ✅)

```bash
npx ts-node scripts/test-lobbypms-availability.ts
```

**Status:** ✅ Bereits erfolgreich getestet - API funktioniert!

### Schritt 4: Reservierungserstellungs-API testen (mit category_id)

```bash
npx ts-node scripts/test-lobbypms-create-booking-with-category.ts
```

**Was passiert:**
- Testet `/api/v1/bookings` mit `category_id` (erforderlich)
- Verschiedene Payload-Strukturen
- Speichert Ergebnisse in `lobbypms-create-booking-with-category-test-results.json`

**WICHTIG:** Dies ist der nächste kritische Test!

### Schritt 5: Bot-Funktionalität testen (check_room_availability)

```bash
npx ts-node scripts/test-check-room-availability-function.ts
```

**Was passiert:**
- Testet die WhatsApp Bot Function direkt
- Testet verschiedene Filter (alle, compartida, privada)
- Zeigt Verfügbarkeit und Preise

**Status:** ✅ Implementiert - Jetzt testen!

### Schritt 6: Stornierungs-API testen (optional)

```bash
npx ts-node scripts/test-lobbypms-cancel-booking.ts
```

**Was passiert:**
- Testet Stornierungs-Endpunkte
- Verwendet erste Reservierung aus DB (falls vorhanden)
- Oder: `npx ts-node scripts/test-lobbypms-cancel-booking.ts [booking_id]`

### Schritt 7: Ergebnisse prüfen

```bash
# Verfügbarkeits-Ergebnisse anzeigen
cat lobbypms-availability-test-results.json | jq .

# Reservierungserstellungs-Ergebnisse anzeigen
cat lobbypms-create-booking-with-category-test-results.json | jq .
```

**Falls jq nicht installiert:**
```bash
# Ohne jq (einfach anzeigen):
cat lobbypms-availability-test-results.json
cat lobbypms-create-booking-with-category-test-results.json
```

---

## 🧪 BOT-FUNKTIONALITÄT TESTEN

### Über WhatsApp testen

**Nachdem der Server läuft:**
1. Sende WhatsApp-Nachricht an den Bot:
   - "Haben wir Zimmer frei vom 1.2. bis 3.2.?"
   - "Gibt es Dorm-Zimmer frei?"
   - "Zeige mir verfügbare Zimmer für morgen"

2. Bot sollte automatisch `check_room_availability` Function aufrufen

3. Antwort sollte Verfügbarkeit und Preise zeigen

### Direkt über Script testen

```bash
cd /var/www/intranet/backend
npx ts-node scripts/test-check-room-availability-function.ts
```

---

## 📝 ZUSAMMENFASSUNG ALLER BEFEHLE

```bash
# 1. Verzeichnis wechseln
cd /var/www/intranet/backend

# 2. API-Key Länge prüfen (optional)
npx ts-node scripts/check-api-key-length.ts

# 3. Verfügbarkeits-API testen (bereits getestet ✅)
npx ts-node scripts/test-lobbypms-availability.ts

# 4. Reservierungserstellungs-API testen (KRITISCH!)
npx ts-node scripts/test-lobbypms-create-booking-with-category.ts

# 5. Bot-Funktionalität testen (NEU!)
npx ts-node scripts/test-check-room-availability-function.ts

# 6. Stornierungs-API testen (optional)
npx ts-node scripts/test-lobbypms-cancel-booking.ts

# 7. Ergebnisse anzeigen
cat lobbypms-availability-test-results.json
cat lobbypms-create-booking-with-category-test-results.json
```

---

## 🎯 PRIORITÄTEN

1. **HOCH:** Reservierungserstellungs-API testen (Schritt 4)
2. **HOCH:** Bot-Funktionalität testen (Schritt 5)
3. **NIEDRIG:** Stornierungs-API testen (Schritt 6)

---

**Erstellt:** 2025-01-26  
**Aktualisiert:** 2025-01-26 (Bot-Funktionalität hinzugefügt)
