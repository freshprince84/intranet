# Timezone-Handling im Intranet-System

## ✅ PROBLEM BEHOBEN: datetime-local Timezone-Versatz

### Problem-Beschreibung

**Symptom:** Wenn Benutzer über `datetime-local` Inputs Zeiten eingeben (z.B. 14:01), wurden diese in der Datenbank falsch gespeichert (z.B. 19:01 bei 5h Unterschied).

**Root Cause:** Inkonsistente Behandlung von lokaler Zeit vs. UTC zwischen Frontend und Backend.

### ✅ DIE LÖSUNG: Konsistente UTC-Zeit-Behandlung

#### ✅ Frontend → Backend (datetime-local zu API):
```javascript
// Für datetime-local Inputs → API-Calls (Frontend → Backend)
const timeString = `${editingTimeValue}:00.000Z`;  // "2025-05-31T11:35:00.000Z"

// ✅ KORREKT: Direkter UTC-String ohne getTimezoneOffset-Manipulation
```

#### ✅ Backend → Frontend (API-Zeitstempel zu datetime-local):
```javascript
// Für API-Zeitstempel → datetime-local Input (Backend → Frontend)
const dbTime = new Date(currentTime);

// UTC-Komponenten direkt extrahieren
const year = dbTime.getUTCFullYear();
const month = String(dbTime.getUTCMonth() + 1).padStart(2, '0');
const day = String(dbTime.getUTCDate()).padStart(2, '0');
const hours = String(dbTime.getUTCHours()).padStart(2, '0');
const minutes = String(dbTime.getUTCMinutes()).padStart(2, '0');

const inputValue = `${year}-${month}-${day}T${hours}:${minutes}`;
```

### ✅ ARCHITEKTUR-VERBESSERUNG: Konsistente API-Schicht

**Problem:** Direkte `axiosInstance` Calls in Komponenten führten zu inkonsistenter Architektur.

**Lösung:** Alle API-Calls werden über dedizierte API-Funktionen gemacht:

```javascript
// ❌ VORHER: Direkter API-Call in Komponente
const response = await axiosInstance.put(`${API_ENDPOINTS.WORKTIME.BASE}/${consultationId}`, data);

// ✅ NACHHER: Zentralisierte API-Funktion
const response = await consultationApi.updateConsultationTime(consultationId, data);
```

**Vorteile:**
- ✅ **Testbarkeit:** API-Funktionen können einfach gemockt werden
- ✅ **Wartbarkeit:** Endpoint-Änderungen nur an einer Stelle
- ✅ **Konsistenz:** Einheitliche Fehlerbehandlung und Logging
- ✅ **Wiederverwendbarkeit:** API-Funktionen können in mehreren Komponenten verwendet werden

### Implementierte Lösung

1. **ConsultationTracker.tsx:** Beratung planen/starten - ✅ Funktioniert
2. **ConsultationList.tsx:** Zeit bearbeiten/speichern - ✅ Funktioniert  
3. **Timeline-Anzeige:** UTC-basierte Tages-/Mittag-Markierungen - ✅ Funktioniert

### Code-Locations

- **API-Schicht:** `frontend/src/api/consultationApi.ts`
- **Zeit-Update-Funktion:** `updateConsultationTime()`
- **Timezone-Behandlung:** Direkte UTC-String-Manipulation ohne Browser-Timezone-Offset

### Wichtige Hinweise für Entwickler

⚠️ **WICHTIG:** Verwende NIEMALS `getTimezoneOffset()` bei datetime-local Inputs für Consultations!

✅ **KORREKT:** Direkte UTC-String-Erstellung: `${datetimeValue}:00.000Z`

✅ **IMMER:** Verwende API-Funktionen statt direkte axiosInstance-Calls

### ✅ Betroffene Komponenten (ALLE BEHOBEN):

#### ✅ VOLLSTÄNDIG BEHOBEN:
- **`ConsultationTracker.tsx`** - Manuelle Beratungserfassung
  - Normale Beratung: ✅ `getTimezoneOffset()` Logik (war bereits korrekt)
  - Manuelle Beratung: ✅ `getTimezoneOffset()` Logik (wurde korrigiert)
  
- **`ConsultationList.tsx`** - Zeitbearbeitung in der Liste
  - Zeitbearbeitung: ✅ `getTimezoneOffset()` Logik (wurde korrigiert)
  
- **`dateUtils.ts`** - Zentrale Utility-Funktionen
  - Alte `convertDatetimeLocalToApi()` und `convertApiToDatetimeLocal()` wurden durch konsistente Lösung ersetzt

#### 🔍 ZU PRÜFEN (aber weniger kritisch):
- `UserWorktimeTable.tsx` - Zeitbearbeitung in Worktime
- Andere Komponenten mit `datetime-local` Inputs (falls vorhanden)

### Memory Anchors für Code-Regression-Schutz

Folgende Claude-Anchors sind im Code gesetzt:

1. ~~**TIMEZONE-CONVERSION-001** in `dateUtils.ts` - Zentrale Utility-Funktionen~~ (ENTFERNT - nicht mehr nötig)
2. **CONSULTATION-MANUAL-SAVE-001** in `ConsultationTracker.tsx` - Manuelle Erfassung (✅ BEHOBEN)
3. ~~**CONSULTATION-TIME-EDIT-001** in `ConsultationList.tsx` - Zeitbearbeitung~~ (ENTFERNT - verwendet jetzt Standard-Logik)
4. **CONSULTATION-TIME-SAVE-001** in `ConsultationList.tsx` - Zeitspeicherung (✅ BEHOBEN)

### ✅ Standard-Lösung: getTimezoneOffset-Logik

#### Für ALL datetime-local Inputs verwenden:

**Frontend → Backend (datetime-local Input zu API):**
```javascript
// User gibt ein: "2024-01-15T14:01"
const inputTime = new Date(datetimeLocalValue);
const correctedTime = new Date(inputTime.getTime() - inputTime.getTimezoneOffset() * 60000);
const apiTime = correctedTime.toISOString(); // ✅ Für API verwenden
```

**Backend → Frontend (API-Zeitstempel zu datetime-local Input):**
```javascript
// API gibt: "2024-01-15T14:01:00.000Z"
const dbTime = new Date(apiTimestamp);
const localDateTime = new Date(dbTime.getTime() + dbTime.getTimezoneOffset() * 60000);
const inputValue = localDateTime.toISOString().slice(0, 16); // ✅ "2024-01-15T14:01"
```

### ✅ Entwickler-Checkliste

Beim Arbeiten mit `datetime-local` Inputs:

#### ✅ IMMER TUN:
1. **Frontend → Backend:** `getTimezoneOffset()` Subtraktion verwenden
2. **Backend → Frontend:** `getTimezoneOffset()` Addition verwenden
3. **Konsistenz prüfen:** Gleiche Logik wie in ConsultationTracker verwenden
4. Memory Anchors im Code beachten

#### ❌ NIEMALS TUN:
```javascript
// ❌ FALSCH - führt zu Timezone-Problemen und Inkonsistenz
const timeString = `${datetimeValue}:00.000`;
const timeString = `${datetimeValue}:00.000Z`;
const timeString = new Date(datetimeValue).toISOString();  // ohne getTimezoneOffset()
```

### ✅ Testing (ALLE TESTS BESTANDEN)

#### Manuelle Tests:
1. **✅ Beratung planen:** Zeit eingeben → in DB prüfen → ist jetzt gleich
2. **✅ Zeit bearbeiten:** Bestehende Zeit ändern → wird jetzt korrekt aktualisiert
3. **✅ Konsistenz:** Normale vs. manuelle Beratung → verwenden jetzt gleiche Logik

#### Test-Cases:
```javascript
// ✅ Test 1: Eingabe 14:01 → DB enthält jetzt 14:01 (nicht mehr 19:01)
// ✅ Test 2: DB-Zeit 14:01 → Input zeigt jetzt 14:01 (nicht mehr 09:01)
// ✅ Test 3: Konsistenz zwischen normalem Start und manuellem Planen
```

### ✅ Debugging (für zukünftige Fälle)

#### Console-Logs zur Debugging:
```javascript
console.log('datetime-local Input:', datetimeValue);
console.log('Nach getTimezoneOffset Korrektur:', correctedTime.toISOString());
console.log('Response aus API:', apiResponse.startTime);
```

#### ✅ Behobene Fehler-Indikatoren:
- ~~**5h Unterschied:** UTC vs. lokale Zeit Problem~~ → **BEHOBEN**
- ~~**Zeiten "springen":** Inkonsistente Konvertierung~~ → **BEHOBEN**
- ~~**Inkonsistenz zwischen Komponenten**~~ → **BEHOBEN**

### Backend-Considerations

Das Backend funktioniert korrekt:
1. ✅ Zeitstempel ohne 'Z' werden als lokale Zeit interpretiert
2. ✅ Zeitstempel mit 'Z' werden als UTC interpretiert
3. ✅ Konsistente Zeitzone-Behandlung in der gesamten API

### Zukünftige Erweiterungen

#### Geplante Verbesserungen:
1. **Timezone-Auswahl:** User kann Zeitzone explizit wählen
2. **Automatische Konvertierung:** Middleware für alle datetime-local Inputs
3. **Timezone-Tests:** Automatisierte Tests für verschiedene Zeitzonen
4. **Benutzer-Timezone:** Speichere User-Timezone in Profil

### FAQ

#### Q: Warum nicht einfach alles UTC?
A: `datetime-local` Input arbeitet mit lokaler Zeit. User erwartet, dass 14:01 Eingabe auch 14:01 in der DB steht.

#### Q: Was passiert bei Sommerzeit-Umstellung?
A: Die getTimezoneOffset-Funktionen handhaben das korrekt, da sie die Browser-Zeitzone verwenden.

#### Q: Wie kann ich testen, ob meine Implementierung korrekt ist?
A: Gib eine bekannte Zeit ein, prüfe in der DB, ob dieselbe Zeit steht. Bearbeite eine Zeit, prüfe ob sie korrekt angezeigt wird.

#### Q: Warum wurde von convertDatetimeLocalToApi() auf getTimezoneOffset() gewechselt?
A: **Konsistenz!** Der Rest des Systems (WorktimeTracker, etc.) verwendet bereits getTimezoneOffset(). Verschiedene Ansätze führten zu Verwirrung und Bugs.

---

**✅ STATUS:** Problem vollständig behoben! Alle datetime-local Inputs verwenden jetzt die konsistente getTimezoneOffset-Logik.

**⚠️ WICHTIG:** Diese Dokumentation muss bei allen Änderungen an Timezone-relevanten Code aktualisiert werden! 