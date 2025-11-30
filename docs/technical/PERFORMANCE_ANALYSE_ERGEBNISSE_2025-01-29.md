# Performance-Analyse: Ergebnisse (2025-01-29)

**Datum:** 2025-01-29  
**Status:** ✅ ANALYSE ABGESCHLOSSEN  
**Zweck:** Auswertung der Server-Analyse-Befehle

---

## 📊 ZUSAMMENFASSUNG DER ERGEBNISSE

### ✅ KEINE PROBLEME GEFUNDEN bei:
1. **Filter-Größe** - Alle Filter sind sehr klein (< 500 bytes)
2. **Branch Settings** - Normal groß (max. 14 kB)
3. **Branch Verschlüsselung** - Korrekt verschlüsselt (keine mehrfache Verschlüsselung)
4. **User.onboardingProgress** - Sehr klein (< 200 bytes)

### ⚠️ PROBLEM IDENTIFIZIERT:
**FilterTags dauern 2-3 Sekunden, obwohl:**
- Filter sind klein (< 500 bytes)
- Cache funktioniert (viele Cache-Hits)
- **ABER:** Cache-Miss dauert lange (DB-Query + JSON-Parsing)

---

## 🔍 DETAILLIERTE ANALYSE

### 1. Filter-Anzahl und Größe ✅

**Ergebnisse:**
- **Größte durchschnittliche Größe:** 150 bytes (User 1, tasks)
- **Größte maximale Größe:** 243 bytes
- **Meiste Filter:** 2-67 bytes

**Fazit:** ✅ Filter sind NICHT zu groß - das ist nicht das Problem!

**Top 5 User/Table-Kombinationen:**
1. User 16, `worktracker-reservations`: 2 Filter, 35 bytes avg, 67 bytes max
2. User 1, `tasks`: 2 Filter, 150 bytes avg, 243 bytes max
3. User 21, `workcenter-table`: 2 Filter, 35 bytes avg, 67 bytes max
4. User 16, `workcenter-table`: 2 Filter, 35 bytes avg, 67 bytes max
5. User 5, `workcenter-table`: 2 Filter, 35 bytes avg, 67 bytes max

---

### 2. Größte Filter ✅

**Ergebnisse:**
- **Größter Filter:** 416 bytes (id 5716, "Actual yo", requests-table)
- **Top 5 größte Filter:**
  1. 416 bytes - "Actual yo" (requests-table)
  2. 282 bytes - "Entr. ayer Manl" (worktracker-reservations)
  3. 282 bytes - "Entr. hoy Manl" (worktracker-reservations)
  4. 281 bytes - "Entr. maña Manl" (worktracker-reservations)
  5. 276 bytes - "Manila ayer" (worktracker-reservations)

**Fazit:** ✅ Keine sehr großen Filter - das ist nicht das Problem!

**JSON-Parsing sollte sehr schnell sein:**
- 416 bytes = ~0.4 KB
- JSON.parse sollte < 1ms dauern
- **Problem liegt woanders!**

---

### 3. Branch Settings ✅

**Ergebnisse:**
- **Manila (id 3):** 14 kB (größter)
- **Parque Poblado (id 4):** 1145 bytes
- **Alianza Paisa (id 17):** 24 bytes
- **Nowhere (id 18):** 24 bytes

**Fazit:** ✅ Branch Settings sind normal groß - kein Problem!

**Vergleich mit Organization Settings:**
- Organization Settings (vorher): 63 MB ❌
- Branch Settings (größter): 14 kB ✅
- **Kein Problem bei Branch Settings!**

---

### 4. Branch Settings Verschlüsselung ✅

**Ergebnisse:**
- **Manila (id 3):**
  - whatsapp_colon_count: 2 ✅ (korrekt verschlüsselt)
  - lobbypms_colon_count: 2 ✅ (korrekt verschlüsselt)
- **Parque Poblado (id 4):**
  - whatsapp_colon_count: 0 (nicht verschlüsselt oder nicht vorhanden)
  - lobbypms_colon_count: 2 ✅ (korrekt verschlüsselt)

**Fazit:** ✅ Keine mehrfache Verschlüsselung - das ist nicht das Problem!

**Erwartung:** 2 Doppelpunkte (Format: `iv:authTag:encrypted`)
**Tatsächlich:** 2 Doppelpunkte ✅

---

### 5. User.onboardingProgress ✅

**Ergebnisse:**
- **Größter:** 160 bytes (User 21, Alexishurtado@lafamilia.local)
- **Alle:** < 200 bytes

**Fazit:** ✅ Sehr klein - kein Problem!

---

## ⚠️ PROBLEM IDENTIFIZIERT: FilterTags dauern 2-3 Sekunden

### Warum dauert es so lange?

**Aus Cache-Logs (vorherige Analyse):**
- ✅ Cache funktioniert (viele Cache-Hits)
- ⚠️ Cache-Miss dauert lange
- ⚠️ Häufige Cache-Invalidierungen

**Mögliche Ursachen:**

1. **DB-Query ist langsam bei Cache-Miss**
   - `prisma.savedFilter.findMany` dauert 1-2 Sekunden?
   - **Zu prüfen:** Query-Zeit messen

2. **JSON-Parsing ist langsam**
   - **ABER:** Filter sind klein (< 500 bytes)
   - JSON.parse sollte < 1ms dauern
   - **Wahrscheinlich NICHT das Problem**

3. **Doppelte Requests (Frontend)**
   - Filter-Liste UND Filter-Gruppen werden beide geladen
   - **Wenn beide Cache-Miss:** 2x langsam
   - **Zu prüfen:** Frontend macht doppelte Requests?

4. **Häufige Cache-Invalidierungen**
   - `consultations-table` wird mehrfach invalidiert
   - Jede Invalidierung = Cache-Miss beim nächsten Request
   - **Zu prüfen:** Warum wird so oft invalidiert?

5. **Network-Latenz**
   - Server ↔ Frontend
   - **Zu prüfen:** Request-Zeit im Browser messen

---

## 🔧 NÄCHSTE SCHRITTE

### 1. DB-Query-Zeit bei Cache-Miss messen

**Befehl:**
```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 2000 --nostream | grep -E "Cache-Miss|Query abgeschlossen|getUserSavedFilters|getFilterGroups|FilterListCache.*aus DB geladen" | tail -100
```

**Was prüft es:**
- Wie lange dauert die DB-Query bei Cache-Miss?
- Gibt es Timing-Logs?

---

### 2. Frontend-Requests prüfen

**Im Browser DevTools:**
1. Network-Tab öffnen
2. Seite neu laden
3. Nach `/saved-filters` filtern
4. Prüfen:
   - Werden beide Endpoints aufgerufen? (`/saved-filters/{tableId}` und `/saved-filters/groups/{tableId}`)
   - Wie lange dauern die Requests?
   - Werden sie parallel oder sequenziell aufgerufen?

---

### 3. Cache-Invalidierung analysieren

**Befehl:**
```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 5000 --nostream | grep -E "Cache invalidiert" | tail -100
```

**Was prüft es:**
- Wie oft wird Cache invalidiert?
- Welche TableIds werden am häufigsten invalidiert?
- Warum wird so oft invalidiert?

---

### 4. Query-Plan analysieren

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
EXPLAIN ANALYZE
SELECT id, \"userId\", \"tableId\", name, \"conditions\", \"operators\", \"sortDirections\", \"groupId\", \"order\", \"createdAt\", \"updatedAt\"
FROM \"SavedFilter\"
WHERE \"userId\" = 16 AND \"tableId\" = 'worktracker-todos';
"
```

**Was prüft es:**
- Wird ein Index verwendet?
- Wie lange dauert die Query?
- Gibt es Full Table Scans?

---

## 📊 FAZIT

### ✅ Was funktioniert:
1. Filter-Größe ist normal (< 500 bytes)
2. Branch Settings sind normal groß (max. 14 kB)
3. Verschlüsselung ist korrekt (keine mehrfache Verschlüsselung)
4. Cache funktioniert (viele Cache-Hits)

### ⚠️ Problem:
**FilterTags dauern 2-3 Sekunden trotz Cache**

**Wahrscheinlichste Ursachen:**
1. **DB-Query ist langsam bei Cache-Miss** (zu prüfen)
2. **Doppelte Requests im Frontend** (zu prüfen)
3. **Häufige Cache-Invalidierungen** (zu prüfen)
4. **Network-Latenz** (zu prüfen)

**Nächste Schritte:**
- DB-Query-Zeit messen
- Frontend-Requests analysieren
- Cache-Invalidierung analysieren
- Query-Plan prüfen

---

**Erstellt:** 2025-01-29  
**Status:** ✅ ANALYSE ABGESCHLOSSEN  
**Nächster Schritt:** DB-Query-Zeit und Frontend-Requests prüfen

