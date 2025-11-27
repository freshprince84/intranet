# LobbyPMS API-Filter Test - Anleitung (2025-01-26)

**Datum:** 2025-01-26  
**Zweck:** Test-Script ausführen um zu prüfen, welche API-Parameter für creation_date Filter funktionieren

---

## 🚀 BEFEHLE FÜR DEN SERVER

### Schritt 1: Zum Backend-Verzeichnis wechseln

```bash
cd /var/www/intranet/backend
```

### Schritt 2: Test-Script ausführen

```bash
npx ts-node scripts/testLobbyPmsCreationDateFilter.ts
```

### Schritt 3: Ergebnisse speichern

**Option A: In Datei speichern**
```bash
npx ts-node scripts/testLobbyPmsCreationDateFilter.ts > /tmp/lobbypms_filter_test_results.txt 2>&1
```

**Option B: In Datei speichern UND auf Bildschirm anzeigen**
```bash
npx ts-node scripts/testLobbyPmsCreationDateFilter.ts | tee /tmp/lobbypms_filter_test_results.txt
```

### Schritt 4: Ergebnisse anzeigen

```bash
cat /tmp/lobbypms_filter_test_results.txt
```

---

## 📊 ERGEBNIS-INTERPRETATION

### ✅ Erfolgreiche Parameter (FUNKTIONIERT)
```
✅ created_after=2025-01-25: 15 Reservierungen (FUNKTIONIERT - alle in letzten 24h!)
   Erste creation_date: 2025-01-25 10:30:00
```

**Bedeutung:**
- Parameter funktioniert!
- Alle zurückgegebenen Reservierungen sind in den letzten 24h erstellt
- **→ Dieser Parameter kann verwendet werden!**

### ⚠️ Parameter wird ignoriert (KEINE FILTERUNG)
```
⚠️  creation_date_from=2025-01-25: 150 Reservierungen (Parameter wird ignoriert, keine Filterung)
```

**Bedeutung:**
- Parameter wird akzeptiert, aber nicht verwendet
- API gibt alle Reservierungen zurück (nicht gefiltert)
- **→ Dieser Parameter funktioniert NICHT!**

### ❌ Parameter wird nicht unterstützt
```
❌ created_since=2025-01-25: Status 400 (wird nicht unterstützt)
```

**Bedeutung:**
- Parameter wird nicht akzeptiert
- API gibt Fehler zurück
- **→ Dieser Parameter funktioniert NICHT!**

### ❌ Keine Daten
```
❌ date_created_from=2025-01-25: 0 Reservierungen (Parameter wird nicht unterstützt oder keine Daten)
```

**Bedeutung:**
- Entweder: Parameter funktioniert, aber keine Daten in letzten 24h
- Oder: Parameter funktioniert nicht
- **→ Prüfen ob wirklich keine Daten vorhanden sind!**

---

## 🎯 WAS WIR SUCHEN

### Ideal: Mindestens 1 Parameter mit ✅

**Erwartete Ausgabe:**
```
✅ created_after=2025-01-25: 15 Reservierungen (FUNKTIONIERT - alle in letzten 24h!)
```

**Dann können wir:**
- Diesen Parameter in `fetchReservations` verwenden
- API-Filter implementieren
- **30x Performance-Verbesserung!**

### Fallback: Kein Parameter funktioniert

**Dann müssen wir:**
- Lösung 2 (Früher stoppen) implementieren
- Oder Lösung 3 (Caching) implementieren

---

## 📝 ERGEBNISSE DOKUMENTIEREN

**Bitte die komplette Ausgabe kopieren und hier dokumentieren:**

1. Welche Parameter funktionieren? (✅)
2. Welche Parameter werden ignoriert? (⚠️)
3. Welche Parameter werden nicht unterstützt? (❌)
4. Wie viele Reservierungen wurden gefunden?

**Beispiel-Dokumentation:**
```
Test-Zeitraum: 2025-01-25 (letzte 24h)

✅ created_after=2025-01-25: 15 Reservierungen (FUNKTIONIERT)
⚠️  creation_date_from=2025-01-25: 150 Reservierungen (ignoriert)
❌ created_since=2025-01-25: Status 400 (nicht unterstützt)
...

Normale Abfrage: 150 Reservierungen (Check-in letzte 7 Tage)
Davon in letzten 24h ERSTELLT: 15
```

---

## ⚠️ WICHTIGE HINWEISE

1. **Script testet Branch 4** (Parque Poblado)
   - Falls Branch 4 keine LobbyPMS Settings hat, Script anpassen

2. **Test-Zeitraum:** Letzte 24 Stunden
   - Script verwendet `Date.now() - 24 * 60 * 60 * 1000`

3. **Vergleich:** Normale Abfrage ohne Filter
   - Zeigt wie viele Reservierungen insgesamt vorhanden sind
   - Vergleich: Check-in letzte 7 Tage vs. creation_date letzte 24h

4. **Timeout:** 30 Sekunden pro Request
   - Falls API langsam ist, kann es länger dauern

---

## 🔧 FALLS FEHLER AUFTRETEN

### Fehler: "Keine LobbyPMS Settings für Branch 4 gefunden"
**Lösung:** Script anpassen für andere Branch-ID

### Fehler: "ts-node nicht gefunden"
**Lösung:**
```bash
npm install -g ts-node
# Oder lokal:
npm install ts-node
```

### Fehler: "Module nicht gefunden"
**Lösung:**
```bash
npm install
```

---

**Erstellt:** 2025-01-26  
**Status:** 📋 BEREIT ZUM AUSFÜHREN

