# Erweiterter Plan: Filter-Probleme Fix (nach Produktionstest)

## Analyse der Probleme nach Migration

### Problem 1: "Todos" Filter nicht gelöscht (Requests)

**Symptom:** Filter "Todos" ist nach Migration noch vorhanden

**Mögliche Ursachen:**
1. Filter-Name ist nicht exakt "Todos" (könnte Übersetzungsschlüssel sein)
2. Filter wurde nach Migration erneut erstellt
3. Filter ist in einer anderen Gruppe oder hat andere Eigenschaften

**Lösung:**
- Migration-Script erweitern: Suche nach allen Varianten von "Todos"/"Alle" (case-insensitive)
- Prüfen ob Filter als Übersetzungsschlüssel gespeichert ist
- Alle User-Filter prüfen, nicht nur in "Users"-Gruppe

### Problem 2: User-Filter Requests ohne Status-Bedingungen

**Symptom:** User-Filter für Requests haben weiterhin keine Status-Bedingungen, obwohl Migration 1172 Filter aktualisiert hat

**Mögliche Ursachen:**
1. Prüfung `hasStatusConditions` ist falsch - findet Bedingungen nicht
2. Filter wurden aktualisiert, aber Frontend lädt alte Version
3. Filter sind in falscher Struktur gespeichert
4. Filter wurden überschrieben nach Migration

**Lösung:**
- Migration-Script: Prüfung verbessern - prüfe auf beide Status-Bedingungen separat
- Migration-Script: Logging erweitern - zeige aktuelle Bedingungen vor Update
- Frontend: Cache prüfen - möglicherweise werden Filter gecacht
- Migration-Script: Prüfe ALLE User-Filter, nicht nur in "Users"-Gruppe

### Problem 3: ToDos User-Filter falsche Struktur

**Symptom:** User-Filter für ToDos haben Status-Bedingungen, aber falsche Struktur

**Aktuelle Struktur (falsch):**
```
Bedingungen: [responsible = user, qualityControl = user, status != done]
Operatoren: ['OR', 'AND']
Bedeutung: (responsible = user OR qualityControl = user) AND status != done
```

**Gewünschte Struktur (Screenshot 1):**
```
Bedingungen: [responsible = user, status != done, qualityControl = user, status = quality_control]
Operatoren: ['OR', 'OR', 'AND']
Bedeutung: (responsible = user OR status != done OR qualityControl = user) AND status = quality_control
```

**Warte, das macht keinen Sinn. Lass mich Screenshot 1 nochmal analysieren:**

Screenshot 1 zeigt:
- `Responsable = Daniel Arango` (OR) `Estado ≠ Hecho` (OR) `Control de calidad = Daniel Arango` (AND) `Estado = Control de calidad`

Das ist eine komplexe Struktur. Aber das ist nicht die Standard-Struktur für User-Filter.

**Tatsächliche gewünschte Struktur (basierend auf Seed):**
```
Bedingungen: [responsible = user, qualityControl = user, status != done]
Operatoren: ['OR', 'AND']
Bedeutung: (responsible = user OR qualityControl = user) AND status != done
```

**Das Problem:** Die Anzeige im FilterPane zeigt die Struktur falsch an, oder die Operatoren werden falsch interpretiert.

**Lösung:**
- FilterPane: Prüfen wie Operatoren angezeigt werden
- FilterLogic: Prüfen wie Operatoren interpretiert werden
- Migration-Script: Struktur prüfen und korrigieren

### Problem 4: Rollen-Filter fehlen Status-Bedingungen

**Symptom:** Rollen-Filter für ToDos haben keine Status-Bedingungen

**Aktuelle Struktur (Seed):**
```
Bedingungen: [responsible = role]
Operatoren: []
```

**Gewünschte Struktur:**
```
Bedingungen: [responsible = role, status != done]
Operatoren: ['AND']
```

**Lösung:**
- Migration-Script: Rollen-Filter für ToDos erweitern
- Seed: Rollen-Filter erweitern (für zukünftige Seeds)

### Problem 5: Reservas de toures zeigt falsche Filter

**Symptom:** Immer noch werden Filtertags von Reservaciones angezeigt statt Tours-Filter

**Ursache:** `SavedFilterTags` verwendet falsche `tableId` oder Filter werden falsch geladen

**Lösung:**
- ToursTab: Prüfen ob `TOURS_TABLE_ID` korrekt verwendet wird
- SavedFilterTags: Prüfen ob Filter für `worktracker-tours` geladen werden
- Backend: Prüfen ob Filter für `worktracker-tours` existieren

## Detaillierte Fixes

### Fix 1: Migration-Script erweitern

**Datei:** `backend/prisma/migrate-filters.ts`

**Änderungen:**
1. **"Todos" Filter löschen:**
   - Suche case-insensitive
   - Suche nach Übersetzungsschlüsseln
   - Suche in allen Gruppen

2. **User-Filter Requests erweitern:**
   - Prüfe ALLE User-Filter (nicht nur in "Users"-Gruppe)
   - Prüfe auf beide Status-Bedingungen separat
   - Logging erweitern (zeige Bedingungen vor/nach Update)

3. **ToDos User-Filter korrigieren:**
   - Prüfe aktuelle Struktur
   - Korrigiere Operatoren falls nötig
   - Stelle sicher: `(responsible = user OR qualityControl = user) AND status != done`

4. **Rollen-Filter erweitern:**
   - Finde alle Rollen-Filter für `worktracker-todos`
   - Füge `status != done` Bedingung hinzu
   - Füge `AND` Operator hinzu

### Fix 2: Seed erweitern

**Datei:** `backend/prisma/seed.ts`

**Änderungen:**
1. **Rollen-Filter erweitern (Zeile 2166-2169):**
   ```typescript
   // ToDos: responsible = role UND status != done
   const conditions = [
     { column: 'responsible', operator: 'equals', value: `role-${role.id}` },
     { column: 'status', operator: 'notEquals', value: 'done' }
   ];
   const operators: string[] = ['AND'];
   ```

### Fix 3: Tours Filter prüfen

**Datei:** `frontend/src/components/tours/ToursTab.tsx`

**Prüfungen:**
1. `TOURS_TABLE_ID` ist korrekt: `'worktracker-tours'`
2. `SavedFilterTags` verwendet `TOURS_TABLE_ID`
3. Backend: Prüfen ob Filter für `worktracker-tours` existieren

**Mögliche Fixes:**
- Prüfen ob Filter in DB existieren
- Prüfen ob Filter korrekt geladen werden
- Prüfen ob `tableId` korrekt übergeben wird

## Implementierungsreihenfolge

1. **Migration-Script erweitern** (höchste Priorität)
   - "Todos" Filter löschen (erweitert)
   - User-Filter Requests erweitern (erweitert)
   - ToDos User-Filter korrigieren
   - Rollen-Filter erweitern

2. **Seed erweitern** (für zukünftige Seeds)
   - Rollen-Filter erweitern

3. **Tours Filter prüfen**
   - Backend: Prüfen ob Filter existieren
   - Frontend: Prüfen ob Filter geladen werden

## Test-Plan

### Test 1: "Todos" Filter löschen
1. Migration ausführen
2. Prüfen ob "Todos" Filter gelöscht wurde
3. Prüfen ob Filter nicht erneut erstellt wird

### Test 2: User-Filter Requests
1. Migration ausführen
2. User-Filter öffnen
3. Prüfen ob Status-Bedingungen vorhanden sind
4. Prüfen ob Filter korrekt funktioniert

### Test 3: ToDos User-Filter
1. Migration ausführen
2. User-Filter öffnen
3. Prüfen ob Struktur korrekt ist: `(responsible = user OR qualityControl = user) AND status != done`
4. Prüfen ob Filter korrekt funktioniert

### Test 4: Rollen-Filter
1. Migration ausführen
2. Rollen-Filter öffnen
3. Prüfen ob Status-Bedingung vorhanden ist
4. Prüfen ob Filter korrekt funktioniert

### Test 5: Tours Filter
1. Tours-Tab öffnen
2. Prüfen ob Filter-Tags angezeigt werden
3. Prüfen ob Filter für `worktracker-tours` geladen werden

## Risiken

1. **Migration überschreibt bestehende Filter:**
   - Lösung: Prüfung vor Update (bereits implementiert)

2. **Filter-Struktur wird falsch interpretiert:**
   - Lösung: Logging erweitern, Struktur prüfen

3. **Frontend zeigt alte Filter:**
   - Lösung: Cache leeren, Filter neu laden

4. **Tours Filter fehlen:**
   - Lösung: Filter in Seed erstellen

## Offene Fragen

1. **Screenshot 1 vs Screenshot 2:**
   - Welche Struktur ist korrekt?
   - Ist Screenshot 1 ein manuell erstellter Filter?
   - Oder ist es die gewünschte Standard-Struktur?

2. **"Todos" Filter:**
   - Wird er automatisch erstellt?
   - Oder wurde er manuell erstellt?

3. **Tours Filter:**
   - Existieren Filter in der DB?
   - Oder müssen sie erst erstellt werden?

