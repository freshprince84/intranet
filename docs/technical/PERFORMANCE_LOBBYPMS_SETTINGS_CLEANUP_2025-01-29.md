# Performance-Fix: LobbyPMS Settings Cleanup (2025-01-29)

**Datum:** 2025-01-29  
**Status:** ✅ GELÖST - System läuft wieder deutlich schneller  
**Priorität:** 🔴🔴🔴 KRITISCH (war)

## ✅ PROBLEM GELÖST

**Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

---

---

## 🔍 PROBLEM

### Settings-Größe:
- **Organization ID 1 ("la-familia-hostel"):** 63 MB Settings
  - `lobbyPms`: **63 MB** 🔴🔴🔴
  - `doorSystem`: 49 kB
  - `whatsapp`: 8.7 kB
  - Rest: < 1 kB

### Impact:
- Query-Zeit: 5.5 Sekunden (statt 10-50ms)
- System extrem langsam
- Connection Pool blockiert

---

## 📊 ANALYSE-BEFEHLE

### 1. LobbyPMS-Struktur analysieren:
```bash
# LobbyPMS-Keys finden (nur Struktur, nicht Werte)
sudo -u postgres psql -d intranet -c "
SELECT 
    jsonb_object_keys(settings->'lobbyPms') as lobbypms_key
FROM \"Organization\"
WHERE id = 1
ORDER BY lobbypms_key;
"

# Größte LobbyPMS-Keys finden
sudo -u postgres psql -d intranet -c "
SELECT 
    key,
    pg_size_pretty(length(value::text)::bigint) as size
FROM (
    SELECT 
        jsonb_object_keys(settings->'lobbyPms') as key,
        settings->'lobbyPms'->jsonb_object_keys(settings->'lobbyPms') as value
    FROM \"Organization\"
    WHERE id = 1
) subquery
ORDER BY length(value::text) DESC
LIMIT 20;
"
```

---

## 🔧 LÖSUNGEN

### Lösung 1: Settings bereinigen (SOFORT)

**Problem:** 63 MB sind zu groß für Settings.

**Mögliche Ursachen:**
1. Alte/ungültige Reservierungsdaten in Settings
2. Sync-History in Settings
3. Große verschlüsselte Daten
4. Duplikate

**Cleanup-Strategie:**
1. Nur notwendige Settings behalten:
   - `apiUrl`
   - `apiKey` (verschlüsselt)
   - `propertyId`
   - `syncEnabled`
   - `autoCreateTasks`
   - `lateCheckInThreshold`
   - `notificationChannels`
   - `autoSendReservationInvitation`

2. Entfernen:
   - Alte Sync-History
   - Reservierungsdaten (gehören in Reservation-Tabelle)
   - Temporäre Daten
   - Duplikate

---

### Lösung 2: Settings-Caching (KURZFRISTIG)

**Problem:** Settings werden bei jedem Request neu geladen.

**Lösung:**
- Settings in Memory-Cache speichern
- Cache-Invalidierung bei Settings-Update
- TTL: 10 Minuten (Settings ändern sich selten)

**Code-Stelle:** `backend/src/utils/organizationCache.ts`

---

### Lösung 3: Settings nur bei Bedarf laden (KURZFRISTIG)

**Problem:** Services laden Settings immer, auch wenn nicht benötigt.

**Lösung:**
- Services sollten Settings nur laden wenn wirklich benötigt
- Settings-Cache verwenden statt DB-Query

**Betroffene Services:**
- `lobbyPmsService.ts` (Zeile 181)
- `reservationNotificationService.ts` (Zeile 71)
- `ttlockService.ts` (Zeile 132, 371)
- `boldPaymentService.ts` (Zeile 107)
- `whatsappService.ts` (Zeile 106)

---

### Lösung 4: Settings in separate Tabelle (MITTELFRISTIG)

**Problem:** Settings > 1 MB sollten nicht in Organization-Tabelle sein.

**Lösung:**
- Neue Tabelle `OrganizationSettings` für große Settings
- Organization-Tabelle: Nur kleine Settings (< 1 MB)
- Lazy Loading für große Settings

---

## 🎯 SOFORT-MASSNAHMEN

### 1. Settings-Struktur analysieren

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    jsonb_object_keys(settings->'lobbyPms') as lobbypms_key
FROM \"Organization\"
WHERE id = 1
ORDER BY lobbypms_key;
"
```

**Ziel:** Verstehen was in den 63 MB ist

---

### 2. Cleanup-Script erstellen

**Ziel:** Nur notwendige Settings behalten, Rest entfernen

**Vorgehen:**
1. Backup erstellen
2. Settings-Struktur analysieren
3. Unnötige Daten identifizieren
4. Cleanup durchführen
5. Performance testen

---

### 3. Settings-Caching implementieren

**Code-Stelle:** `backend/src/utils/organizationCache.ts`

**Erweitern:**
- Settings-Cache hinzufügen
- TTL: 10 Minuten
- Cache-Invalidierung bei Update

---

## 📈 ERWARTETE VERBESSERUNG

**Vorher:**
- Settings-Größe: 63 MB
- Query-Zeit: 5.5 Sekunden
- System: Extrem langsam

**Nachher:**
- Settings-Größe: < 10 kB (nur Konfiguration)
- Query-Zeit: 10-50ms
- System: Schnell

**Verbesserung: 99% schneller**

---

## ✅ TEST-PLAN

1. ✅ Settings-Struktur analysieren
2. ✅ Cleanup-Script erstellen
3. ✅ Backup erstellen
4. ✅ Cleanup durchführen
5. ✅ Performance testen
6. ✅ Settings-Caching implementieren

---

## 📝 NÄCHSTE SCHRITTE

1. **SOFORT:** Settings-Struktur analysieren (was ist in den 63 MB?)
2. **SOFORT:** Cleanup-Script erstellen
3. **KURZFRISTIG:** Settings-Caching implementieren
4. **MITTELFRISTIG:** Settings in separate Tabelle auslagern

