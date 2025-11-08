# Backend-Integration für Quinzena-Unterstützung

## Übersicht

Dieses Dokument beschreibt die notwendigen Backend-Änderungen zur Unterstützung von Quinzenas (15-Tage-Perioden) in der Worktime-Statistik.

## Aktueller Stand

### Frontend
- ✅ Quinzena-Berechnung implementiert (15 Tage, monatsbasiert)
- ✅ UI mit Toggle zwischen Woche und Quinzena
- ✅ API-Aufruf vorbereitet: `?quinzena=${date}` statt `?week=${date}`

### Backend
- ⚠️ Aktuell nur Wochen-Unterstützung (`/worktime/stats?week=YYYY-MM-DD`)
- ⚠️ Quinzena-Parameter wird noch nicht verarbeitet

## Quinzena-Definition

**Quinzena** = 15-Tage-Periode, monatsbasiert:
- **Erste Quinzena**: 1.-15. des Monats (immer 15 Tage)
- **Zweite Quinzena**: 16. bis letzter Tag des Monats (variabel: 13-16 Tage je nach Monat)

**Format**: `YYYY-MM-Qq` (z.B. `2025-01-Q1` für erste Quinzena Januar)

## Backend-Implementierungsplan

### 1. Route-Anpassung

**Datei**: `backend/src/routes/worktime.ts`

**Aktuell**:
```typescript
router.get('/stats', getWorktimeStats);
```

**Keine Änderung nötig** - der Endpoint bleibt gleich, nur die Query-Parameter-Logik wird erweitert.

### 2. Controller-Anpassung

**Datei**: `backend/src/controllers/worktimeController.ts`

**Funktion**: `getWorktimeStats`

#### 2.1 Query-Parameter-Erweiterung

**Aktuell**:
```typescript
const { week } = req.query;
```

**Neu**:
```typescript
const { week, quinzena } = req.query;
const periodType = quinzena ? 'quinzena' : 'week';
const periodStartDate = quinzena || week;
```

#### 2.2 Perioden-Berechnung

**Für Wochen** (bestehend):
- Start: Montag der Woche
- Ende: Sonntag der Woche (7 Tage)
- Tage: 7 (Montag-Sonntag)

**Für Quinzenas** (neu):
- Start: 1. des Monats (erste Quinzena) oder 16. des Monats (zweite Quinzena)
- Ende: 15. des Monats (erste Quinzena) oder letzter Tag des Monats (zweite Quinzena)
- Tage: 15 (erste) oder variabel (zweite)

#### 2.3 Implementierung

```typescript
export const getWorktimeStats = async (req: Request, res: Response) => {
  try {
    const { week, quinzena } = req.query;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Bestimme Periodentyp und Startdatum
    const isQuinzena = !!quinzena;
    const periodStartStr = (quinzena || week) as string;
    
    if (!periodStartStr) {
      // Fallback: Aktuelle Woche/Quinzena
      const today = new Date();
      if (isQuinzena) {
        // Berechne aktuelle Quinzena
        const day = today.getDate();
        const quinzenaStart = day <= 15 
          ? new Date(today.getFullYear(), today.getMonth(), 1)
          : new Date(today.getFullYear(), today.getMonth(), 16);
        periodStartStr = format(quinzenaStart, 'yyyy-MM-dd');
      } else {
        const monday = startOfWeek(today, { weekStartsOn: 1 });
        periodStartStr = format(monday, 'yyyy-MM-dd');
      }
    }

    // Berechne Periodenende
    let periodEndStr: string;
    let daysInPeriod: number;
    
    if (isQuinzena) {
      const startDate = new Date(periodStartStr);
      const year = startDate.getFullYear();
      const month = startDate.getMonth();
      const day = startDate.getDate();
      
      if (day === 1) {
        // Erste Quinzena: 1.-15.
        const endDate = new Date(year, month, 15);
        periodEndStr = format(endDate, 'yyyy-MM-dd');
        daysInPeriod = 15;
      } else {
        // Zweite Quinzena: 16.-Monatsende
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const endDate = new Date(year, month, lastDayOfMonth);
        periodEndStr = format(endDate, 'yyyy-MM-dd');
        daysInPeriod = lastDayOfMonth - 15;
      }
    } else {
      // Woche: 7 Tage
      const tempDate = new Date(periodStartStr);
      tempDate.setDate(tempDate.getDate() + 6); // Sonntag
      periodEndStr = format(tempDate, 'yyyy-MM-dd');
      daysInPeriod = 7;
    }

    // UTC-Zeitgrenzen für Datenbankabfrage
    const periodStartUtc = new Date(`${periodStartStr}T00:00:00.000Z`);
    const periodEndUtc = new Date(`${periodEndStr}T23:59:59.999Z`);

    // WorkTime-Einträge abrufen (unverändert)
    const entries = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        startTime: {
          gte: periodStartUtc,
          lte: periodEndUtc
        },
        endTime: {
          not: null
        }
      },
      include: {
        user: true,
      },
    });

    // Tagesdaten-Struktur erstellen
    // Für Wochen: Wochentage (Montag-Sonntag)
    // Für Quinzenas: Alle Tage der Quinzena (1-15 oder 16-Monatsende)
    
    let periodData: Array<{ day: string; hours: number; date: string }>;
    
    if (isQuinzena) {
      // Quinzena: Erstelle Array für alle Tage
      periodData = [];
      for (let i = 0; i < daysInPeriod; i++) {
        const currentDate = new Date(periodStartStr);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const dayName = format(currentDate, 'EEEE', { locale: de }); // Wochentag
        
        periodData.push({
          day: dayName,
          hours: 0,
          date: dateStr
        });
      }
    } else {
      // Woche: Wochentage (bestehend)
      periodData = [
        { day: "Montag", hours: 0, date: "" },
        { day: "Dienstag", hours: 0, date: "" },
        { day: "Mittwoch", hours: 0, date: "" },
        { day: "Donnerstag", hours: 0, date: "" },
        { day: "Freitag", hours: 0, date: "" },
        { day: "Samstag", hours: 0, date: "" },
        { day: "Sonntag", hours: 0, date: "" }
      ];
      
      // Berechne Datum für jeden Wochentag
      periodData.forEach((dayData, index) => {
        dayData.date = calculateDateFromWeekStart(periodStartStr, index);
      });
    }

    // Stunden auf Tage verteilen (unverändert, aber angepasst für Quinzenas)
    let totalHours = 0;
    let daysWorked = 0;

    entries.forEach(entry => {
      if (entry.endTime) {
        const workTime = entry.endTime.getTime() - entry.startTime.getTime();
        const hoursWorked = workTime / (1000 * 60 * 60);
        
        // Extrahiere UTC-Datum
        const date = entry.startTime;
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(date.getUTCDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${dayOfMonth}`;
        
        // Finde entsprechenden Tag in periodData
        const dayEntry = periodData.find(d => d.date === dateString);
        
        if (dayEntry) {
          dayEntry.hours += hoursWorked;
          totalHours += hoursWorked;
          
          // Tage mit Arbeit zählen
          if (hoursWorked > 0 && dayEntry.hours === hoursWorked) {
            daysWorked++;
          }
        }
      }
    });

    // Runden und Formatieren
    periodData.forEach(day => {
      day.hours = Math.round(day.hours * 10) / 10;
    });

    const averageHoursPerDay = daysWorked > 0 
      ? Math.round((totalHours / daysWorked) * 10) / 10 
      : 0;
    totalHours = Math.round(totalHours * 10) / 10;

    // Response (kompatibel mit Frontend - verwendet weiterhin weeklyData)
    res.json({
      totalHours,
      averageHoursPerDay,
      daysWorked,
      weeklyData: periodData // Frontend erwartet weeklyData
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Worktime-Statistik:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### 3. Hilfsfunktionen

**Datei**: `backend/src/controllers/worktimeController.ts`

Keine neuen Hilfsfunktionen nötig - bestehende Funktionen (`calculateDateFromWeekStart`, `calculateDayIndex`) können weiterverwendet werden.

### 4. Testing

#### Test-Szenarien:

1. **Erste Quinzena** (1.-15.):
   - Request: `GET /worktime/stats?quinzena=2025-01-01`
   - Erwartet: 15 Tage, Daten für 1.-15. Januar

2. **Zweite Quinzena** (16.-Monatsende):
   - Request: `GET /worktime/stats?quinzena=2025-01-16`
   - Erwartet: Variable Tage (Januar: 16, Februar: 12/13, etc.)

3. **Monatsübergang**:
   - Request: `GET /worktime/stats?quinzena=2025-01-31` (zweite Quinzena Januar)
   - Erwartet: Nur Tage bis 31. Januar

4. **Rückwärtskompatibilität**:
   - Request: `GET /worktime/stats?week=2025-01-06`
   - Erwartet: Funktioniert wie bisher (7 Tage)

## Zusammenfassung

### Änderungen im Backend:

1. ✅ Query-Parameter `quinzena` hinzufügen
2. ✅ Perioden-Berechnung für Quinzenas (15 Tage, monatsbasiert)
3. ✅ Dynamische Tagesdaten-Struktur (7 Tage für Woche, 15+ Tage für Quinzena)
4. ✅ Kompatibilität mit bestehender `weeklyData`-Struktur beibehalten

### Keine Breaking Changes:

- Bestehende `?week=` Parameter funktionieren weiterhin
- Response-Struktur bleibt identisch (`weeklyData`)
- Frontend kann beide Modi nutzen

### Geschätzte Implementierungszeit:

- **Controller-Anpassung**: ~2-3 Stunden
- **Testing**: ~1-2 Stunden
- **Gesamt**: ~3-5 Stunden

