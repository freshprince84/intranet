# Test-Befehle für "primo deportista" Problem

**Datum:** 2025-01-26  
**Ziel:** Prüfen ob "primo deportista" von der API zurückgegeben wird

---

## 📋 BEFEHLE FÜR DEN SERVER

### Schritt 1: Test-Script ausführen

```bash
cd /var/www/intranet/backend
npx ts-node scripts/test-check-all-categories.ts 3 2025-11-28 2025-11-29
```

**Parameter:**
- `3` = Branch ID (Manila)
- `2025-11-28` = Start Date (heute)
- `2025-11-29` = End Date (morgen)

**Alternative für andere Branches:**
```bash
# Branch 4 (Parque Poblado)
npx ts-node scripts/test-check-all-categories.ts 4 2025-11-28 2025-11-29
```

### Schritt 2: Logs prüfen (während WhatsApp-Test)

**In einem neuen Terminal-Fenster:**
```bash
cd /var/www/intranet/backend
pm2 logs intranet-backend --lines 200 --nostream | grep -E "check_room_availability|primo deportista|categoryId|Kategorien"
```

### Schritt 3: WhatsApp-Test durchführen

**Sende via WhatsApp:**
- "Haben wir Zimmer frei heute?"
- Oder: "¿tienen habitaciones disponibles para hoy?"

**Dann prüfe:**
- Wird "primo deportista" in der Antwort angezeigt?
- Wird es in den Logs geloggt?

---

## 📊 WAS ZU PRÜFEN IST

### 1. API Response
- ✅ Gibt die API "primo deportista" zurück?
- ✅ Welche `category_id` hat es?
- ✅ Welche `roomType` wird zugewiesen?
- ✅ Wie viele Zimmer sind verfügbar?

### 2. Function Response
- ✅ Wird "primo deportista" in der Function-Response zurückgegeben?
- ✅ Wird es in den Logs geloggt?
- ✅ Wird es an die KI übergeben?

### 3. KI Response
- ✅ Zeigt die KI "primo deportista" in der Antwort an?
- ✅ Oder filtert die KI es aus?

---

## 🔍 MÖGLICHE PROBLEME & FIXES

### Problem 1: API gibt es nicht zurück
**Fix:**
- API-Parameter prüfen
- Property-ID prüfen
- Datum prüfen
- Branch-Settings prüfen

### Problem 2: Filterung schließt es aus
**Fix:**
- `roomType`-Bestimmung anpassen (Zeile 368-372 in `lobbyPmsService.ts`)
- Hardcoded `category_id`-Checks erweitern
- Filterung entfernen/anpassen

### Problem 3: KI zeigt es nicht an
**Fix:**
- System Prompt noch expliziter machen
- Function-Response-Format prüfen
- KI-Response prüfen

---

**Erstellt:** 2025-01-26


