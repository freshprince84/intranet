# Datumsfilter mit Platzhaltern - Systemweite Implementierung

## Problem

Die "time" Spalte in Analytics-Tabs soll mit Platzhaltern wie "diese Woche", "heute", "dieser Monat" etc. funktionieren. Diese Platzhalter sollen im FilterPane sichtbar sein (nicht als Freitext-Variablen).

**Aktuelle Probleme:**
1. FilterRow zeigt nur `__TODAY__` als Platzhalter-Option
2. "between" Operator wird zwar angezeigt, aber nicht implementiert (weder Backend noch Frontend)
3. Platzhalter `__MONTH_START__`, `__MONTH_END__`, `__YEAR_START__`, `__YEAR_END__` fehlen
4. Benutzer- und Rollen-Filter im Seed enthalten keine Datumsfilterung

## Ziel

1. **FilterRow erweitern:** Dropdown mit Platzhaltern (ähnlich DateRangeSelector)
   - "Heute" → `__TODAY__`
   - "Diese Woche" → zwei Bedingungen: `time >= __WEEK_START__` AND `time <= __WEEK_END__`
   - "Dieser Monat" → zwei Bedingungen: `time >= __MONTH_START__` AND `time <= __MONTH_END__`
   - "Dieses Jahr" → zwei Bedingungen: `time >= __YEAR_START__` AND `time <= __YEAR_END__`
   - "Benutzerdefiniert" → Datumsauswahl

2. **"between" Operator implementieren:** Backend + Frontend
   - Backend: `convertDateCondition` erweitern
   - Frontend: `evaluateDateCondition` erweitern

3. **Platzhalter erweitern:** 
   - Backend: `__MONTH_START__`, `__MONTH_END__`, `__YEAR_START__`, `__YEAR_END__` unterstützen
   - Frontend: Gleiche Platzhalter unterstützen

4. **Seed anpassen:** Benutzer- und Rollen-Filter für Analytics-Tabellen erweitern
   - Zusätzlich zu `responsible = user-{id}` etc.
   - `time >= __WEEK_START__` AND `time <= __WEEK_END__` hinzufügen

## Systemweite Kompatibilität

### Prüfung: Wo werden Datumsfilter verwendet?

**Frontend-Komponenten mit Datumsfiltern:**
- `Requests.tsx` - `dueDate`
- `Worktracker.tsx` - `dueDate`
- `ConsultationList.tsx` - `startTime`
- `InvoiceManagementTab.tsx` - Datumsfelder
- `TodoAnalyticsTab.tsx` - `time` (NEU)
- `RequestAnalyticsTab.tsx` - `time` (NEU)
- Reservations - `checkInDate`, `checkOutDate`
- Tours - `tourDate`, `bookingDate`

**Backend:**
- `convertDateCondition` wird für alle Datumsfelder verwendet
- Unterstützt bereits: `dueDate`, `tourDate`, `bookingDate`, `checkInDate`, `checkOutDate`, `arrivalTime`, `time`

**Ergebnis:** Die Lösung muss für ALLE Datumsfelder funktionieren, nicht nur für "time".

## Implementierungsplan

### Phase 1: Platzhalter erweitern (Backend)

**Datei:** `backend/src/utils/filterToPrisma.ts`

1. **`convertDateCondition` erweitern:**
   - `__MONTH_START__` → `startOfMonth(new Date())`
   - `__MONTH_END__` → `endOfMonth(new Date())`
   - `__YEAR_START__` → `startOfYear(new Date())`
   - `__YEAR_END__` → `endOfYear(new Date())`

2. **"between" Operator implementieren:**
   - Wenn `operator === 'between'`:
     - `value` muss Array sein: `[startValue, endValue]`
     - Oder: Zwei separate Bedingungen mit AND (einfacher)
   - **Entscheidung:** Zwei separate Bedingungen verwenden (einfacher, konsistent mit bestehender Logik)

### Phase 2: Platzhalter erweitern (Frontend)

**Datei:** `frontend/src/utils/filterLogic.ts`

1. **`evaluateDateCondition` erweitern:**
   - `__MONTH_START__`, `__MONTH_END__`, `__YEAR_START__`, `__YEAR_END__` unterstützen
   - `startOfMonth`, `endOfMonth`, `startOfYear`, `endOfYear` von `date-fns` importieren

2. **"between" Operator implementieren:**
   - Wenn `operator === 'between'`:
     - `value` muss Array sein: `[startValue, endValue]`
     - Prüfe: `normalizedDate >= startDate && normalizedDate <= endDate`

### Phase 3: FilterRow erweitern

**Datei:** `frontend/src/components/FilterRow.tsx`

1. **Platzhalter-Dropdown erweitern:**
   - Statt nur "Aktueller Tag" → Dropdown mit:
     - "Heute" → `__TODAY__`
     - "Diese Woche" → Spezialbehandlung (zwei Bedingungen)
     - "Dieser Monat" → Spezialbehandlung (zwei Bedingungen)
     - "Dieses Jahr" → Spezialbehandlung (zwei Bedingungen)
     - "Benutzerdefiniert" → Datumsauswahl

2. **Spezialbehandlung für Zeiträume:**
   - Wenn "Diese Woche" ausgewählt:
     - Automatisch zwei Bedingungen erstellen:
       - `time >= __WEEK_START__` (Operator: "after")
       - `time <= __WEEK_END__` (Operator: "before")
     - Oder: "between" Operator verwenden (wenn implementiert)

3. **UI-Anpassung:**
   - Dropdown ähnlich `DateRangeSelector` (Zeile 26-36)
   - Übersetzungen hinzufügen: `filter.row.placeholders.today`, `filter.row.placeholders.thisWeek`, etc.

### Phase 4: Seed anpassen

**Datei:** `backend/prisma/seed.ts`

1. **Benutzer-Filter für `todo-analytics-table` erweitern:**
   - Aktuell: `responsible = user-{id} OR qualityControl = user-{id}`
   - Neu: Zusätzlich `time >= __WEEK_START__` AND `time <= __WEEK_END__`
   - Operatoren: `['OR', 'AND', 'AND']`

2. **Rollen-Filter für `todo-analytics-table` erweitern:**
   - Aktuell: `responsible = role-{id}`
   - Neu: Zusätzlich `time >= __WEEK_START__` AND `time <= __WEEK_END__`
   - Operatoren: `['AND', 'AND']`

3. **Benutzer-Filter für `request-analytics-table` erweitern:**
   - Aktuell: `requestedBy = user-{id} OR responsible = user-{id}`
   - Neu: Zusätzlich `time >= __WEEK_START__` AND `time <= __WEEK_END__`
   - Operatoren: `['OR', 'AND', 'AND']`

### Phase 5: Übersetzungen

**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

1. **Neue Übersetzungsschlüssel hinzufügen:**
   ```json
   "filter": {
     "row": {
       "placeholders": {
         "today": "Heute",
         "thisWeek": "Diese Woche",
         "thisMonth": "Dieser Monat",
         "thisYear": "Dieses Jahr",
         "custom": "Benutzerdefiniert"
       }
     }
   }
   ```

### Phase 6: Dokumentation

**Dateien:** 
- `docs/implementation_plans/TASKS_REQUESTS_ANALYTICS_UMBAU_PLAN.md`
- `docs/modules/MODUL_FILTERSYSTEM_STANDARDS.md`

1. **Standard-Filter-Verhalten korrigieren:**
   - Datumsfilterung ist in Benutzer- und Rollen-Filtern enthalten
   - Platzhalter-System dokumentieren

## Risiken und Überlegungen

### Risiko 1: "between" Operator Komplexität
**Status:** Mittel
- **Lösung:** Zwei separate Bedingungen verwenden (einfacher, konsistent)
- **Alternative:** "between" Operator mit Array-Wert implementieren

### Risiko 2: FilterRow UI-Komplexität
**Status:** Gering
- **Lösung:** Dropdown ähnlich DateRangeSelector (bereits vorhanden)
- **UI:** Platzhalter-Auswahl → automatisch zwei Bedingungen erstellen

### Risiko 3: Rückwärtskompatibilität
**Status:** Gering
- Bestehende Filter mit `__TODAY__` funktionieren weiterhin
- Neue Platzhalter sind optional

### Risiko 4: Performance
**Status:** Gering
- Platzhalter werden nur beim Filtern evaluiert
- Keine zusätzlichen DB-Queries

## Implementierungsreihenfolge

1. **Backend:** Platzhalter erweitern (`__MONTH_START__`, etc.)
2. **Backend:** "between" Operator implementieren (optional, falls gewünscht)
3. **Frontend:** Platzhalter erweitern in `filterLogic.ts`
4. **Frontend:** FilterRow UI erweitern (Platzhalter-Dropdown)
5. **Seed:** Filter erweitern (Datumsfilterung hinzufügen)
6. **Übersetzungen:** Neue Schlüssel hinzufügen
7. **Dokumentation:** Aktualisieren

## Testing

1. **FilterRow:** Platzhalter-Dropdown funktioniert für alle Datumsfelder
2. **Backend:** Alle Platzhalter werden korrekt aufgelöst
3. **Frontend:** Filter-Logik funktioniert mit allen Platzhaltern
4. **Seed:** Filter enthalten Datumsfilterung
5. **Rückwärtskompatibilität:** Bestehende Filter funktionieren weiterhin

## Systemweite Kompatibilität - Detaillierte Prüfung

### Prüfung: Unterstützung für alle Datumsfelder

**Datumsfelder im System:**
- `dueDate` (Requests, Tasks)
- `startTime` (Consultations)
- `checkInDate`, `checkOutDate` (Reservations)
- `arrivalTime` (Reservations)
- `tourDate`, `bookingDate` (Tours)
- `time` (Analytics-Tabs) - NEU

**Aktuelle Unterstützung:**
- ✅ Alle Datumsfelder verwenden `convertDateCondition` (Backend)
- ✅ Alle Datumsfelder verwenden `evaluateDateCondition` (Frontend)
- ✅ Platzhalter `__TODAY__`, `__WEEK_START__`, `__WEEK_END__` werden unterstützt
- ❌ Platzhalter `__MONTH_START__`, `__MONTH_END__`, `__YEAR_START__`, `__YEAR_END__` fehlen
- ❌ "between" Operator wird nicht unterstützt (nur in priceRecommendationService.ts)

**Ergebnis:** Die Lösung muss für ALLE Datumsfelder funktionieren, nicht nur für "time".

### Prüfung: "between" Operator

**Aktueller Stand:**
- "between" ist in `dateOperators` definiert (FilterRow.tsx Zeile 59)
- "between" wird in `priceRecommendationService.ts` verwendet (Array-Wert: `[startDate, endDate]`)
- "between" wird NICHT in `convertDateCondition` unterstützt
- "between" wird NICHT in `evaluateDateCondition` unterstützt

**Entscheidung:** "between" Operator implementieren mit Array-Wert (konsistent mit priceRecommendationService.ts)

### Prüfung: FilterRow UI

**Aktueller Stand:**
- FilterRow zeigt nur `__TODAY__` als Platzhalter-Option
- Keine Optionen für "diese Woche", "dieser Monat" etc.
- Datumsauswahl funktioniert nur für einzelne Daten

**Erforderlich:**
- Dropdown mit Platzhaltern (ähnlich DateRangeSelector)
- Automatische Erstellung von zwei Bedingungen für Zeiträume
- Oder: "between" Operator mit Array-Wert verwenden

## Erweiterte Implementierungsdetails

### "between" Operator Implementierung

**Backend (`convertDateCondition`):**
```typescript
if (operator === 'between') {
  // value muss Array sein: [startValue, endValue]
  if (!Array.isArray(value) || value.length !== 2) {
    return {};
  }
  
  const startDate = resolveDatePlaceholder(value[0]);
  const endDate = resolveDatePlaceholder(value[1]);
  
  return {
    [fieldName]: {
      gte: startDate,
      lte: endDate
    }
  };
}
```

**Frontend (`evaluateDateCondition`):**
```typescript
case 'between':
  if (!Array.isArray(condition.value) || condition.value.length !== 2) {
    return false;
  }
  const startDate = resolveDatePlaceholder(condition.value[0]);
  const endDate = resolveDatePlaceholder(condition.value[1]);
  return normalizedDate >= startDate && normalizedDate <= endDate;
```

### FilterRow UI für Zeiträume

**Option 1: Automatisch zwei Bedingungen erstellen (Empfehlung)**
- Wenn "Diese Woche" ausgewählt:
  - Erstelle automatisch zwei Bedingungen:
    - `time >= __WEEK_START__` (Operator: "after")
    - `time <= __WEEK_END__` (Operator: "before")
  - Operatoren: `['AND']`

**Option 2: "between" Operator verwenden**
- Wenn "Diese Woche" ausgewählt:
  - Erstelle eine Bedingung:
    - `time between [__WEEK_START__, __WEEK_END__]`
  - Erfordert "between" Operator Implementierung

**Entscheidung:** Option 1 (einfacher, konsistent mit bestehender Logik)

## Offene Fragen

1. **"between" Operator:** Soll er als einzelner Operator implementiert werden, oder zwei separate Bedingungen verwenden?
   - **Empfehlung:** Zwei separate Bedingungen (einfacher, konsistent)
   - **Alternative:** "between" Operator mit Array-Wert (konsistent mit priceRecommendationService.ts)

2. **UI für "diese Woche":** Soll automatisch zwei Bedingungen erstellt werden, oder "between" Operator verwendet werden?
   - **Empfehlung:** Automatisch zwei Bedingungen (konsistent mit bestehender Logik)

3. **Platzhalter-Dropdown:** Soll es für ALLE Datumsfelder verfügbar sein, oder nur für "time"?
   - **Empfehlung:** Für ALLE Datumsfelder (konsistent, systemweit)

