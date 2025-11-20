# Schichtplaner - Analyse: Verfügbarkeiten-Admin & Verbesserungen

## 📋 Übersicht

Diese Analyse prüft die folgenden Punkte:
1. Berechtigungssystem für Admin-Verfügbarkeiten-Verwaltung
2. Automatische Schichtplan-Generierung (warum nur für aktuellen User?)
3. Schichtverteilung basierend auf Vertragstypen
4. Kalender-Anzeige (Farben nach Standort/Rolle)

**Datum:** 2025-01-XX  
**Status:** Analyse abgeschlossen

---

## 1. Berechtigungssystem - Hardcodiert vs. Rollen-basiert

### 🔍 Aktueller Stand

**Backend (`userAvailabilityController.ts`):**
- **Zeile 192:** Hardcodierte Admin-Prüfung: `req.user?.roles?.some((r: any) => r.name === 'admin')`
- **Zeile 377:** Hardcodierte Admin-Prüfung: `req.user?.roles?.some((r: any) => r.name === 'admin')`
- **Zeile 569:** Hardcodierte Admin-Prüfung: `req.user?.roles?.some((r: any) => r.name === 'admin')`

**Problem:**
- ❌ Admin-Berechtigung ist **hardcodiert** (prüft auf Rollenname "admin")
- ❌ Nicht über das Berechtigungssystem steuerbar
- ❌ Andere Rollen können nicht diese Berechtigung erhalten

**Berechtigungssystem:**
- ✅ Es existiert ein flexibles Berechtigungssystem mit `Permission` Model
- ✅ Berechtigungen haben `entity`, `entityType` und `accessLevel`
- ✅ Beispiel: `entity: "users"`, `entityType: "table"`, `accessLevel: "write"`
- ✅ Wird bereits für andere Module verwendet (z.B. User-Management)

**Was fehlt:**
- ❌ Keine Permission-Entity für "availability_management" oder "shift_availability"
- ❌ Keine Middleware/Prüfung über das Berechtigungssystem
- ❌ Frontend prüft nicht auf Berechtigungen

### ✅ Lösung

**Backend:**
1. Neue Permission-Entity erstellen: `"availability_management"` mit `entityType: "page"` oder `"table"`
2. Middleware `checkPermission` verwenden statt hardcodierter Admin-Prüfung
3. Prüfung: `hasPermission('availability_management', 'write')` statt `r.name === 'admin'`

**Frontend:**
1. `usePermissions` Hook verwenden
2. Prüfung: `hasPermission('availability_management', 'write')` statt `isAdmin()`

**Datenbank:**
- Admin-Rolle sollte bereits `availability_management` Permission haben
- Andere Rollen können diese Permission ebenfalls erhalten

---

## 2. Automatische Schichtplan-Generierung - Warum nur für aktuellen User?

### 🔍 Aktueller Stand

**Backend (`shiftController.ts` - `generateShiftPlan`):**
- **Zeile 882-889:** `findAvailableUsers` wird aufgerufen
- **Zeile 34-118:** `findAvailableUsers` Funktion:
  - Findet User basierend auf `UserAvailability` Einträgen
  - Filtert nach Branch, Rolle, Wochentag, Zeitfenster
  - **WICHTIG:** Findet ALLE User mit passenden Verfügbarkeiten, nicht nur aktuellen User

**Problem-Analyse:**
- ✅ Die Funktion findet tatsächlich **ALLE** verfügbaren User
- ❌ **ABER:** Wenn ein User keine Verfügbarkeiten hat, wird er **nicht** gefunden
- ❌ Schichten werden nur für User mit Verfügbarkeiten erstellt
- ❌ User ohne Verfügbarkeiten bekommen keine Schichten (auch wenn sie verfügbar wären)

**Code-Stelle:**
```typescript
// Zeile 882-889: findAvailableUsers wird aufgerufen
const availableUsers = await findAvailableUsers({
  branchId,
  roleId: role.id,
  date,
  dayOfWeek,
  startTime: template.startTime,
  endTime: template.endTime
});

// Zeile 891-924: Wenn keine verfügbaren User gefunden werden
if (availableUsers.length === 0) {
  // Schicht wird OHNE User erstellt (userId = null)
  shifts.push({
    ...
    userId: null,  // ❌ Kein User zugewiesen
    ...
  });
}
```

**Was passiert:**
1. System sucht User mit Verfügbarkeiten
2. Wenn keine gefunden werden → Schicht wird ohne User erstellt
3. Wenn gefunden werden → User wird zugewiesen
4. **Problem:** User ohne Verfügbarkeiten werden nie gefunden

### ✅ Lösung

**Option 1: Fallback auf alle User (wenn keine Verfügbarkeiten)**
- Wenn `availableUsers.length === 0`, hole alle User mit der passenden Rolle/Branch
- Weise Schichten zu (basierend auf Arbeitslast, nicht Verfügbarkeiten)

**Option 2: Verfügbarkeiten optional machen**
- `findAvailableUsers` erweitern: Wenn keine Verfügbarkeiten gefunden werden, hole alle User
- Priorität: Verfügbarkeiten > Fallback auf alle User

**Option 3: Standard-Verfügbarkeiten**
- Wenn User keine Verfügbarkeiten hat, gelten Standard-Verfügbarkeiten (z.B. Mo-Fr, 08:00-17:00)

**Empfehlung:** Option 2 (Verfügbarkeiten optional machen)

---

## 3. Schichtverteilung - Vertragstypen berücksichtigen

### 🔍 Aktueller Stand

**User-Model (`schema.prisma`):**
- **Zeile 29:** `contractType String?` - Existiert bereits
- Mögliche Werte: `tiempo_completo`, `tiempo_parcial_7`, `tiempo_parcial_14`, `tiempo_parcial_21`, `servicios_externos`

**Payroll-Controller (`payrollController.ts`):**
- **Zeile 295-304:** `getDaysForContractType` Funktion existiert bereits
  - `tiempo_completo`: 22 Tage/Monat (>21 Tage)
  - `tiempo_parcial_7`: 7 Tage/Monat
  - `tiempo_parcial_14`: 14 Tage/Monat
  - `tiempo_parcial_21`: 21 Tage/Monat
  - `servicios_externos`: 0 Tage (stundenbasiert)

**Schichtplan-Generierung (`shiftController.ts`):**
- **Zeile 862:** `userWorkload: Map<number, number>` - Zählt nur **Anzahl** der Schichten
- **Zeile 981-984:** Arbeitslast wird nur als Anzahl erhöht, nicht als Stunden
- **Zeile 932:** Sortierung nach `workload` (Anzahl), nicht nach Stunden

**Problem:**
- ❌ `userWorkload` zählt nur Schichten, nicht Stunden
- ❌ Vertragstyp wird **nicht** berücksichtigt
- ❌ `tiempo_completo` sollte ~45h/Woche bekommen, nicht nur "mehr Schichten"
- ❌ Teilzeit sollte entsprechend weniger Stunden bekommen

**Was fehlt:**
- ❌ Berechnung der wöchentlichen Arbeitszeit pro User (basierend auf Vertragstyp)
- ❌ Ziel-Stunden pro Woche:
  - `tiempo_completo`: ~45h/Woche (9h/Tag × 5 Tage)
  - `tiempo_parcial_7`: ~10.5h/Woche (1.5h/Tag × 7 Tage)
  - `tiempo_parcial_14`: ~21h/Woche (1.5h/Tag × 14 Tage)
  - `tiempo_parcial_21`: ~31.5h/Woche (1.5h/Tag × 21 Tage)
- ❌ Sortierung sollte nach "Stunden-Defizit" erfolgen, nicht nach Anzahl

### ✅ Lösung

**Backend-Änderungen:**

1. **`userWorkload` erweitern:**
   ```typescript
   // Statt: Map<number, number> (Anzahl)
   // Zu: Map<number, { count: number, hours: number }> (Anzahl + Stunden)
   ```

2. **Ziel-Stunden pro Woche berechnen:**
   ```typescript
   function getTargetWeeklyHours(contractType: string): number {
     switch (contractType) {
       case 'tiempo_completo': return 45; // 9h/Tag × 5 Tage
       case 'tiempo_parcial_7': return 10.5; // 1.5h/Tag × 7 Tage
       case 'tiempo_parcial_14': return 21; // 1.5h/Tag × 14 Tage
       case 'tiempo_parcial_21': return 31.5; // 1.5h/Tag × 21 Tage
       default: return 45; // Standard
     }
   }
   ```

3. **Schicht-Dauer berechnen:**
   ```typescript
   // Berechne Stunden pro Schicht
   const shiftHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
   ```

4. **Sortierung anpassen:**
   ```typescript
   // Statt: Nach workload (Anzahl)
   // Zu: Nach Stunden-Defizit (Ziel-Stunden - Aktuelle Stunden)
   const deficit = targetHours - currentHours;
   // User mit größtem Defizit bekommen Vorrang
   ```

5. **User-Daten laden:**
   - Beim Laden der User auch `contractType` laden
   - In `findAvailableUsers` oder `generateShiftPlan` User-Daten mit Vertragstyp holen

---

## 4. Kalender-Anzeige - Farben nach Standort/Rolle

### 🔍 Aktueller Stand

**Frontend (`ShiftPlannerTab.tsx`):**
- **Zeile 238-268:** `calendarEvents` werden erstellt
- **Zeile 244-252:** Farben werden **nur nach Status** bestimmt:
  - `scheduled`: Blau (#3b82f6)
  - `confirmed`: Grün (#10b981)
  - `cancelled`: Rot (#ef4444)
  - `swapped`: Orange (#f59e0b)

**Filter:**
- **Zeile 72-79:** Filter existieren bereits:
  - `selectedBranchIds`: Filter nach Standort
  - `selectedRoleIds`: Filter nach Rolle
  - `selectedStatuses`: Filter nach Status
  - `selectedUserIds`: Filter nach User
- **Zeile 196-220:** Filter-Logik funktioniert

**Problem:**
- ❌ Alle Schichten haben die **gleiche Farbe** (nur Status-basiert)
- ❌ Man kann **nicht visuell** erkennen, welche Schicht zu welchem Standort gehört
- ❌ Man kann **nicht visuell** erkennen, welche Schicht zu welcher Rolle gehört
- ✅ Filter funktionieren, aber visuelle Unterscheidung fehlt

**Was fehlt:**
- ❌ Farbcodierung nach Standort (z.B. jeder Standort eine andere Farbe)
- ❌ Farbcodierung nach Rolle (z.B. jede Rolle eine andere Farbe)
- ❌ Optional: Kombination (z.B. Standort = Hintergrundfarbe, Rolle = Randfarbe)

### ✅ Lösung

**Option 1: Farben nach Standort**
- Jeder Standort bekommt eine feste Farbe (z.B. aus einer Palette)
- Hintergrundfarbe = Standort-Farbe
- Randfarbe = Status-Farbe (optional)

**Option 2: Farben nach Rolle**
- Jede Rolle bekommt eine feste Farbe
- Hintergrundfarbe = Rolle-Farbe
- Randfarbe = Status-Farbe (optional)

**Option 3: Kombination (Empfehlung)**
- Hintergrundfarbe = Standort-Farbe (Hauptunterscheidung)
- Randfarbe = Status-Farbe (dick, 2-3px)
- Optional: Text-Icon oder Badge für Rolle

**Implementierung:**
1. Farb-Palette für Standorte erstellen (z.B. 10-15 Farben)
2. Farb-Palette für Rollen erstellen (z.B. 10-15 Farben)
3. `calendarEvents` erweitern:
   ```typescript
   const branchColor = getBranchColor(shift.branchId);
   const roleColor = getRoleColor(shift.roleId);
   const statusColor = getStatusColor(shift.status);
   
   return {
     backgroundColor: branchColor, // Hauptfarbe = Standort
     borderColor: statusColor, // Rand = Status
     // Optional: textColor für besseren Kontrast
   };
   ```

4. Legende hinzufügen:
   - Zeigt Standort-Farben
   - Zeigt Status-Farben (Rand)
   - Optional: Zeigt Rolle-Farben

---

## 📊 Zusammenfassung

### 1. Berechtigungssystem
- **Status:** ❌ Hardcodiert
- **Lösung:** Permission-basiert über `availability_management` Entity
- **Aufwand:** Mittel (Backend + Frontend + Datenbank)

### 2. Automatische Generierung
- **Status:** ⚠️ Funktioniert nur für User mit Verfügbarkeiten
- **Lösung:** Fallback auf alle User wenn keine Verfügbarkeiten
- **Aufwand:** Niedrig (nur Backend)

### 3. Schichtverteilung
- **Status:** ❌ Vertragstyp wird nicht berücksichtigt
- **Lösung:** Stunden-basierte Verteilung statt Anzahl-basiert
- **Aufwand:** Hoch (Backend-Logik komplett überarbeiten)

### 4. Kalender-Anzeige
- **Status:** ⚠️ Filter funktionieren, aber visuelle Unterscheidung fehlt
- **Lösung:** Farbcodierung nach Standort/Rolle
- **Aufwand:** Niedrig (nur Frontend)

---

## 🎯 Prioritäten

1. **Hoch:** Berechtigungssystem (Sicherheit)
2. **Hoch:** Automatische Generierung (Funktionalität)
3. **Mittel:** Kalender-Anzeige (UX)
4. **Niedrig:** Schichtverteilung (Optimierung)

---

## 📝 Nächste Schritte

1. **Berechtigungssystem implementieren:**
   - Permission-Entity erstellen
   - Backend-Middleware anpassen
   - Frontend-Prüfung hinzufügen

2. **Automatische Generierung verbessern:**
   - Fallback auf alle User implementieren
   - Testen mit verschiedenen Szenarien

3. **Kalender-Anzeige erweitern:**
   - Farb-Paletten erstellen
   - Farbcodierung implementieren
   - Legende hinzufügen

4. **Schichtverteilung optimieren:**
   - Stunden-basierte Verteilung implementieren
   - Vertragstyp berücksichtigen
   - Testen mit verschiedenen Vertragstypen

---

## 🔍 Code-Stellen für Implementierung

### Backend
- `backend/src/controllers/userAvailabilityController.ts` - Zeile 192, 377, 569
- `backend/src/controllers/shiftController.ts` - Zeile 34-118 (findAvailableUsers), 862-984 (generateShiftPlan)
- `backend/src/middleware/permissionMiddleware.ts` - Berechtigungsprüfung

### Frontend
- `frontend/src/components/teamWorktime/AvailabilityManagement.tsx` - Admin-Check
- `frontend/src/components/teamWorktime/ShiftPlannerTab.tsx` - Zeile 238-268 (calendarEvents)
- `frontend/src/hooks/usePermissions.ts` - Berechtigungsprüfung

### Datenbank
- `backend/prisma/schema.prisma` - User-Model (contractType existiert bereits)
- Permission-Tabelle - Neue Entity `availability_management` hinzufügen

