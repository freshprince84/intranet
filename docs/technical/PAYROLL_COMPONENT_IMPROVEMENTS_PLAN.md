# Plan: PayrollComponent - Verbesserungen (Land/Sprache & Automatische Stunden)

**Datum**: 2025-01-XX  
**Status**: ✅ Analyse abgeschlossen, Plan finalisiert, bereit für Implementierung

**Kritische Probleme identifiziert:**
- ❌ Perioden-Auswahl fehlt komplett (periodStart immer `new Date()`)
- ❌ PDF hat hardcodierte deutsche Texte
- ❌ User-Daten fehlen `payrollCountry` im Frontend

## Überblick

Dieser Plan beschreibt die notwendigen Verbesserungen für die `PayrollComponent`:
1. **Land/Organisation/Sprache**: Dynamische Anpassung basierend auf Organisation/User
2. **Automatische Stunden-Vorausfüllung**: Stunden aus Zeiterfassung (WorkTime) automatisch kategorisieren und vorausfüllen
3. **Berechtigungsbasierte Editierbarkeit**: Felder je nach Rolle/Berechtigung editierbar machen

---

## Problem 1: Land/Organisation/Sprache

### Aktuelle Situation

**Frontend:**
- ❌ Hardcodierte deutsche Texte: "Schweiz", "Kolumbien", "Mitarbeiter", "Land", "Vertragsart"
- ❌ `formatCurrency` verwendet hardcodiert `'de-CH'` für CHF
- ❌ `useTranslation` vorhanden, aber nicht alle Texte übersetzt
- ❌ Organisation-Sprache wird nicht berücksichtigt
- ❌ Organisation-Land wird nicht berücksichtigt

**Backend:**
- ✅ `User.payrollCountry` existiert (default "CH")
- ✅ `User.country` existiert (default "CO")
- ✅ `User.language` existiert (default "es")
- ✅ `Organization.country` existiert (optional)
- ✅ `Organization.settings.language` existiert (optional)
- ✅ Backend verwendet bereits `user.payrollCountry` für Währung (CHF vs COP)
- ✅ Backend verwendet bereits `user.payrollCountry` für Berechnungen

**Sprach-Priorität (laut Code):**
1. `User.language` (höchste Priorität)
2. `Organization.settings.language` (falls User-Sprache nicht gesetzt)
3. `'de'` (Fallback)

**Land-Priorität (zu definieren):**
- Option 1: `User.payrollCountry` (aktuell verwendet)
- Option 2: `Organization.country` (falls vorhanden)
- Option 3: `User.country` (Fallback)

### Verfügbare Felder

**User:**
- `payrollCountry`: String (default "CH") - **Wird für Währung/Berechnungen verwendet**
- `country`: String (default "CO") - **Wird für UI-Logik verwendet (z.B. Quinzena)**
- `language`: String (default "es") - **Wird für Übersetzungen verwendet**

**Organization:**
- `country`: String? (optional) - **Land der Organisation**
- `settings.language`: String? (optional) - **Standard-Sprache der Organisation**

### Was muss geändert werden

1. **Frontend:**
   - ✅ `useTranslation` bereits vorhanden - **NUTZEN**
   - ✅ `useOrganization` Hook vorhanden - **NUTZEN**
   - ❌ Hardcodierte Texte durch Übersetzungen ersetzen
   - ❌ `formatCurrency` dynamisch machen (Währung aus `payroll.currency`)
   - ❌ Land-Anzeige dynamisch machen (basierend auf `payrollCountry` oder `organization.country`)
   - ❌ Sprache automatisch setzen basierend auf Organisation/User

2. **Übersetzungen:**
   - ❌ Fehlende Übersetzungen hinzufügen: "Mitarbeiter", "Land", "Vertragsart", etc.
   - ❌ Ländernamen übersetzen: "Schweiz" → "Suiza" (ES), "Switzerland" (EN)

3. **Währung:**
   - ✅ `formatCurrency` bereits überarbeitet (dynamische Währung)
   - ⚠️ Prüfen ob alle Stellen `formatCurrency(amount, currency)` verwenden

---

## Problem 2: Automatische Stunden-Vorausfüllung

### Aktuelle Situation

**WorkTime Model:**
```prisma
model WorkTime {
  id              Int
  userId          Int
  branchId        Int
  startTime       DateTime
  endTime         DateTime?
  timezone        String?
  clientId        Int?
  notes           String?
  // KEINE Felder für: regular, overtime, night, holiday, sunday
}
```

**Problem:**
- WorkTime hat nur `startTime` und `endTime`
- Keine automatische Kategorisierung in verschiedene Stundentypen
- Aktuell: Manuelle Eingabe aller Stunden

**User Model:**
- `normalWorkingHours`: Float (default 7.6) - **Normale tägliche Arbeitszeit**
- `approvedOvertimeHours`: Float (default 0) - **Genehmigte Überstunden**

**Payroll Period:**
- `periodStart`: DateTime - **Start der Abrechnungsperiode**
- `periodEnd`: DateTime - **Ende der Abrechnungsperiode**
- **Schweiz**: Monatlich (25. des Monats)
- **Kolumbien**: Zweimal monatlich (15. und letzter Tag des Monats)

### Kategorisierungs-Logik (zu implementieren)

**1. Regular Hours (Reguläre Stunden):**
- Stunden innerhalb der normalen Arbeitszeit (`normalWorkingHours`)
- Montag-Samstag (außer Feiertage)
- Tageszeit: 06:00-22:00 (Kolumbien) oder 06:00-20:00 (Schweiz)
- **Berechnung**: `MIN(workTimeHours, normalWorkingHours - bereits gearbeitete Stunden am Tag)`

**2. Overtime Hours (Überstunden):**
- Stunden über `normalWorkingHours` pro Tag
- **Berechnung**: `MAX(0, workTimeHours - normalWorkingHours)`

**3. Night Hours (Nachtstunden):**
- **Kolumbien**: 22:00-06:00 (nächster Tag)
- **Schweiz**: 20:00-06:00 (nächster Tag)
- **Berechnung**: Stunden, die in diesem Zeitraum liegen

**4. Holiday Hours (Feiertagsstunden):**
- Stunden an gesetzlichen Feiertagen
- **Problem**: Feiertagsliste fehlt noch
- **Lösung**: Feiertagsliste implementieren (CH: kantonabhängig, CO: national)

**5. Sunday Hours (Sonntagsstunden):**
- Stunden an Sonntagen
- **Berechnung**: `IF (Wochentag(startTime) === 'Sunday') THEN workTimeHours`

**6. Kombinationen:**
- **Overtime + Night**: Überstunden UND in Nachtzeit
- **Overtime + Sunday/Holiday**: Überstunden UND an Sonntag/Feiertag
- **Overtime + Night + Sunday/Holiday**: Alle drei Bedingungen

### Web-Recherche Ergebnisse

**Kolumbien:**
- **Recargo Nocturno**: 35% Zuschlag (22:00-06:00) → 175% Gesamt
- **Recargo Dominical/Festivo**: 75% Zuschlag → 200% Gesamt
- **Recargo Dominical/Festivo Nocturno**: Kombination → 437.5% Gesamt
- **Überstunden**: 25% Zuschlag → 125% Gesamt

**Schweiz:**
- **Nachtstunden**: 25% Zuschlag (20:00-06:00) → 125% Gesamt
- **Feiertage**: 100% Zuschlag → 200% Gesamt
- **Überstunden**: 25% Zuschlag → 125% Gesamt
- **Kantonabhängig**: Verschiedene Regelungen je nach Kanton

### Was muss implementiert werden

**Backend:**
1. **Neue Funktion**: `categorizeWorkTimeHours(workTime, user, periodStart, periodEnd)`
   - Input: WorkTime-Einträge, User, Perioden-Daten
   - Output: Kategorisierte Stunden (regular, overtime, night, holiday, sunday, etc.)
   - **Logik**:
     - Iteriere über alle WorkTime-Einträge im Zeitraum
     - Für jeden Eintrag:
       - Berechne Gesamtstunden: `(endTime - startTime) / 3600000`
       - Prüfe Wochentag (Sonntag?)
       - Prüfe Feiertag (Feiertagsliste)
       - Prüfe Nachtzeit (22:00-06:00 CO, 20:00-06:00 CH)
       - Prüfe Überstunden (über `normalWorkingHours`)
       - Kategorisiere entsprechend

2. **Neuer Endpoint**: `GET /api/payroll/prefill-hours?userId=X&periodStart=Y&periodEnd=Z`
   - Gibt vorausgefüllte Stunden zurück
   - Ruft `categorizeWorkTimeHours` auf
   - Gibt `Hours` Interface zurück

3. **Feiertagsliste**:
   - **Kolumbien**: Nationale Feiertage (fest)
   - **Schweiz**: Kantonabhängig (komplexer)
   - **Lösung**: Initial nur Kolumbien, Schweiz später

**Frontend:**
1. **Neue Funktion**: `fetchPrefilledHours(userId, periodStart, periodEnd)`
   - Ruft neuen Endpoint auf
   - Setzt `hours` State mit vorausgefüllten Werten

2. **UI-Anpassung**:
   - Beim User-Auswahl: Automatisch Stunden vorausfüllen
   - Beim Perioden-Wechsel: Automatisch Stunden neu vorausfüllen
   - **Hinweis anzeigen**: "Stunden wurden automatisch aus Zeiterfassung übernommen"

---

## Problem 3: Berechtigungsbasierte Editierbarkeit

### Aktuelle Situation

**Berechtigungssystem:**
- ✅ `usePermissions` Hook vorhanden
- ✅ `hasPermission(entity, level, entityType)` Funktion vorhanden
- ✅ Berechtigungen: `'payroll'` entity mit `'read'`/`'write'`/`'both'`
- ✅ Button-Berechtigungen: `'payroll_edit'`, `'payroll_generate'`, `'payroll_export'`

**Aktuell:**
- ❌ Alle Stunden-Felder sind immer editierbar
- ❌ Keine Prüfung auf Berechtigungen

### Was muss implementiert werden

**Frontend:**
1. **Berechtigungsprüfung**:
   - `hasPermission('payroll', 'write')` oder `hasPermission('payroll', 'both')` → Felder editierbar
   - `hasPermission('payroll', 'read')` → Felder nur lesbar (disabled)
   - Keine Berechtigung → Kein Zugriff

2. **UI-Anpassung**:
   - Input-Felder: `disabled={!hasPermission('payroll', 'write')}`
   - Speichern-Button: `disabled={!hasPermission('payroll', 'write') || loading}`
   - **Hinweis anzeigen**: "Sie haben keine Berechtigung, Stunden zu bearbeiten" (falls nur read)

3. **Rollen-spezifisch**:
   - **Admin/HR**: Vollzugriff (read + write)
   - **User**: Nur Lesen (read)
   - **Manager**: Je nach Konfiguration

---

## Detaillierte Implementierungs-Schritte

### Phase 1: Land/Organisation/Sprache

#### 1.1: Übersetzungen hinzufügen

**Dateien**: `frontend/src/i18n/locales/{de,es,en}.json`

**Hinzuzufügen:**
```json
{
  "payroll": {
    "payrollComponent": {
      "employee": "Mitarbeiter",
      "country": "Land",
      "contractType": "Vertragsart",
      "countries": {
        "CH": "Schweiz",
        "CO": "Kolumbien"
      },
      "hoursAutoFilled": "Stunden wurden automatisch aus Zeiterfassung übernommen",
      "hoursAutoFilledDescription": "Die Stunden basieren auf den Zeiterfassungsdaten für den ausgewählten Zeitraum. Sie können die Werte bei Bedarf anpassen."
    }
  }
}
```

#### 1.2: Hardcodierte Texte ersetzen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Zu ändern:**
- Zeile 431: `"Mitarbeiter"` → `{t('payroll.payrollComponent.employee')}`
- Zeile 439: `"Land"` → `{t('payroll.payrollComponent.country')}`
- Zeile 440: `payroll.user.payrollCountry === 'CH' ? 'Schweiz' : 'Kolumbien'` → `{t(`payroll.payrollComponent.countries.${payroll.user.payrollCountry}`)}`
- Zeile 444: `"Vertragsart"` → `{t('payroll.payrollComponent.contractType')}`
- Weitere hardcodierte Texte prüfen

#### 1.3: Organisation-Kontext nutzen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Hinzufügen:**
```typescript
import { useOrganization } from '../contexts/OrganizationContext.tsx';
import { useLanguage } from '../hooks/useLanguage.ts';

const { organization } = useOrganization();
const { activeLanguage } = useLanguage();

// Land bestimmen (Priorität: User.payrollCountry > Organization.country > User.country)
const effectiveCountry = user?.payrollCountry || organization?.country || user?.country || 'CH';
```

#### 1.4: formatCurrency prüfen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Prüfen:**
- Alle `formatCurrency` Aufrufe verwenden `formatCurrency(amount, currency)`
- Währung kommt aus `payroll.currency` (bereits implementiert)

---

### Phase 2: Perioden-Auswahl (KRITISCH)

#### 2.1: Backend - periodStart/periodEnd im Request akzeptieren

**Datei**: `backend/src/controllers/payrollController.ts`

**Änderung**: `saveWorkHours` erweitern:

```typescript
export const saveWorkHours = async (req: Request, res: Response) => {
  try {
    const { userId, hours, periodStart, periodEnd } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    // Perioden bestimmen (mit Fallback)
    let startDate: Date;
    let endDate: Date;

    if (periodStart && periodEnd) {
      startDate = new Date(periodStart);
      endDate = new Date(periodEnd);
    } else {
      // Fallback: Automatische Berechnung
      startDate = new Date();
      endDate = getPayrollEndDate(user.payrollCountry);
    }

    // Validierung
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'periodStart muss vor periodEnd liegen' });
    }

    // Prüfe auf doppelte Perioden
    const existingPayroll = await prisma.employeePayroll.findFirst({
      where: {
        userId,
        OR: [
          {
            periodStart: { lte: endDate },
            periodEnd: { gte: startDate }
          }
        ]
      }
    });

    if (existingPayroll) {
      return res.status(400).json({ 
        error: 'Für diesen Zeitraum existiert bereits eine Lohnabrechnung',
        existingPayroll: {
          id: existingPayroll.id,
          periodStart: existingPayroll.periodStart,
          periodEnd: existingPayroll.periodEnd
        }
      });
    }

    const effectiveHourlyRate = await calculateEffectiveHourlyRate(user);
    
    const payroll = await prisma.employeePayroll.create({
      data: {
        userId,
        periodStart: startDate,
        periodEnd: endDate,
        // ... rest bleibt gleich
      },
    });
    
    res.json(payroll);
  } catch (error) {
    console.error('Fehler beim Speichern der Stunden:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
```

#### 2.2: Frontend - Perioden-Auswahl hinzufügen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Hinzufügen:**
- State für `periodStart` und `periodEnd`
- Funktion `getDefaultPeriod(user)` - berechnet Standard-Periode
- UI: Date Picker oder Dropdown für Perioden-Auswahl
- Beim User-Auswahl: Perioden automatisch setzen
- Beim Perioden-Wechsel: Stunden neu vorausfüllen

**UI-Komponente:**
```typescript
const [periodStart, setPeriodStart] = useState<Date | null>(null);
const [periodEnd, setPeriodEnd] = useState<Date | null>(null);

// Beim User-Auswahl: Perioden setzen
useEffect(() => {
  if (selectedUser && users.length > 0) {
    const user = users.find(u => u.id === selectedUser);
    if (user) {
      const defaultPeriod = getDefaultPeriod(user);
      setPeriodStart(defaultPeriod.start);
      setPeriodEnd(defaultPeriod.end);
    }
  }
}, [selectedUser, users]);

// Helper-Funktion
function getDefaultPeriod(user: any): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (user.payrollCountry === 'CH') {
    // Schweiz: Monatlich (1. bis 25.)
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth(), 25);
  } else {
    // Kolumbien: Quinzena (1.-15. oder 16.-Monatsende)
    if (now.getDate() <= 15) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth(), 15);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 16);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
  }

  return { start, end };
}
```

#### 2.3: Frontend - saveHours anpassen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Änderung:**
```typescript
const saveHours = useCallback(async () => {
  if (!selectedUser || !periodStart || !periodEnd) {
    setError(t('payroll.payrollComponent.selectUserAndPeriod'));
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const response = await axiosInstance.post(API_ENDPOINTS.PAYROLL.HOURS, {
      userId: selectedUser,
      hours,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    });
    // ... rest bleibt gleich
  } catch (error) {
    // ... error handling
  }
}, [selectedUser, hours, periodStart, periodEnd, fetchPayrolls, t]);
```

---

### Phase 3: PDF-Übersetzungen (KRITISCH)

#### 3.1: Backend - PDF-Generator übersetzen

**Datei**: `backend/src/controllers/payrollController.ts`

**Änderung**: `generatePayrollPDF` erweitern:

```typescript
export const generatePayrollPDF = async (req: Request, res: Response) => {
  try {
    const { payrollId } = req.params;
    
    const payroll = await prisma.employeePayroll.findUnique({
      where: { id: Number(payrollId) },
      include: { user: true },
    });

    if (!payroll) return res.status(404).json({ error: 'Lohnabrechnung nicht gefunden' });

    // Sprache bestimmen
    const language = await getUserLanguage(payroll.userId);
    const translations = getPayrollTranslations(language);

    const doc = new PDFDocument();
    // ... PDF-Erstellung mit translations
  }
};
```

**Neue Funktion**: `getPayrollTranslations(language: string)`

---

### Phase 4: Automatische Stunden-Vorausfüllung

#### 4.1: Backend - Kategorisierungs-Logik

**Datei**: `backend/src/controllers/payrollController.ts`

**Neue Funktion hinzufügen:**
```typescript
export const getPrefilledHours = async (req: Request, res: Response) => {
  try {
    const { userId, periodStart, periodEnd } = req.query;
    
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    const startDate = new Date(periodStart as string);
    const endDate = new Date(periodEnd as string);

    // Hole alle WorkTime-Einträge im Zeitraum
    const workTimes = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        startTime: { gte: startDate, lte: endDate },
        endTime: { not: null } // Nur abgeschlossene Einträge
      }
    });

    // Kategorisiere Stunden
    const categorizedHours = categorizeWorkTimeHours(workTimes, user, startDate, endDate);

    res.json(categorizedHours);
  } catch (error) {
    console.error('Fehler beim Abrufen der vorausgefüllten Stunden:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

function categorizeWorkTimeHours(
  workTimes: any[],
  user: any,
  periodStart: Date,
  periodEnd: Date
): Hours {
  // Implementierung der Kategorisierungs-Logik
  // Siehe Details unten
}
```

**Kategorisierungs-Logik (Pseudocode):**
```typescript
function categorizeWorkTimeHours(workTimes, user, periodStart, periodEnd): Hours {
  const hours: Hours = {
    regular: 0,
    overtime: 0,
    night: 0,
    holidayHours: 0,
    sundayHoliday: 0,
    overtimeNight: 0,
    overtimeSundayHoliday: 0,
    overtimeNightSundayHoliday: 0
  };

  const isColombia = user.payrollCountry === 'CO';
  const nightStart = isColombia ? 22 : 20; // 22:00 CO, 20:00 CH
  const nightEnd = 6; // 06:00

  // Feiertagsliste (initial nur Kolumbien)
  const holidays = getHolidays(periodStart, periodEnd, user.payrollCountry);

  for (const workTime of workTimes) {
    const startTime = new Date(workTime.startTime);
    const endTime = new Date(workTime.endTime!);
    const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const dayOfWeek = startTime.getDay(); // 0 = Sonntag
    const isSunday = dayOfWeek === 0;
    const isHoliday = holidays.some(h => isSameDay(startTime, h));
    const isNight = isNightTime(startTime, endTime, nightStart, nightEnd);
    const isOvertime = workHours > user.normalWorkingHours;

    // Kategorisiere
    if (isOvertime && isNight && (isSunday || isHoliday)) {
      hours.overtimeNightSundayHoliday += workHours;
    } else if (isOvertime && (isSunday || isHoliday)) {
      hours.overtimeSundayHoliday += workHours;
    } else if (isOvertime && isNight) {
      hours.overtimeNight += workHours;
    } else if (isOvertime) {
      hours.overtime += workHours;
    } else if (isNight) {
      hours.night += workHours;
    } else if (isSunday || isHoliday) {
      hours.sundayHoliday += workHours;
    } else {
      hours.regular += workHours;
    }
  }

  return hours;
}
```

#### 2.2: Backend - Route hinzufügen

**Datei**: `backend/src/routes/payroll.ts`

**Hinzufügen:**
```typescript
router.get('/prefill-hours', getPrefilledHours);
```

#### 2.3: Frontend - API-Endpunkt hinzufügen

**Datei**: `frontend/src/config/api.ts`

**Hinzufügen:**
```typescript
PAYROLL: {
  BASE: '/payroll',
  HOURS: '/payroll/hours',
  CALCULATE: '/payroll/calculate',
  PDF: (payrollId: number) => `/payroll/pdf/${payrollId}`,
  PREFILL_HOURS: '/payroll/prefill-hours' // NEU
}
```

#### 2.4: Frontend - Vorausfüllung implementieren

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Hinzufügen:**
```typescript
const fetchPrefilledHours = useCallback(async (userId: number) => {
  if (!selectedUser) return;

  try {
    const periodStart = new Date(); // Aktueller Monat/Quinzena
    const periodEnd = getPayrollEndDate(user?.payrollCountry || 'CH');

    const response = await axiosInstance.get(
      `${API_ENDPOINTS.PAYROLL.PREFILL_HOURS}?userId=${userId}&periodStart=${periodStart.toISOString()}&periodEnd=${periodEnd.toISOString()}`
    );

    setHours(response.data);
  } catch (error) {
    console.error('Fehler beim Abrufen der vorausgefüllten Stunden:', error);
    // Kein Error setzen, da manuelle Eingabe weiterhin möglich
  }
}, [selectedUser, user?.payrollCountry]);

// Beim User-Auswahl: Stunden vorausfüllen
useEffect(() => {
  if (selectedUser) {
    fetchPrefilledHours(selectedUser);
  }
}, [selectedUser, fetchPrefilledHours]);
```

#### 2.5: UI - Hinweis anzeigen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Hinzufügen:**
```typescript
{selectedUser && (
  <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
    <p className="text-sm text-blue-800 dark:text-blue-200">
      {t('payroll.payrollComponent.hoursAutoFilled')}
    </p>
    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
      {t('payroll.payrollComponent.hoursAutoFilledDescription')}
    </p>
  </div>
)}
```

---

### Phase 3: Berechtigungsbasierte Editierbarkeit

#### 3.1: Frontend - Berechtigungsprüfung

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Hinzufügen:**
```typescript
const canEditPayroll = hasPermission('payroll', 'write') || hasPermission('payroll', 'both');
```

#### 3.2: Frontend - Input-Felder anpassen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Ändern:**
```typescript
<input
  type="number"
  min="0"
  step="0.5"
  className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
  value={hours.regular}
  onChange={(e) => handleHoursChange(e, 'regular')}
  disabled={!canEditPayroll} // NEU
/>
```

#### 3.3: Frontend - Speichern-Button anpassen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Ändern:**
```typescript
<button
  className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800"
  onClick={saveHours}
  disabled={loading || !canEditPayroll} // NEU
>
  {loading ? t('payroll.payrollComponent.saving') : t('payroll.payrollComponent.saveAndCalculate')}
</button>
```

#### 3.4: Frontend - Hinweis anzeigen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Hinzufügen:**
```typescript
{!canEditPayroll && (
  <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
    <p className="text-sm text-yellow-800 dark:text-yellow-200">
      {t('payroll.payrollComponent.noEditPermission')}
    </p>
  </div>
)}
```

---

## Zusammenfassung der Änderungen

### Dateien, die geändert werden müssen:

**Phase 1:**
1. ✅ `frontend/src/i18n/locales/de.json` - Übersetzungen hinzufügen
2. ✅ `frontend/src/i18n/locales/es.json` - Übersetzungen hinzufügen
3. ✅ `frontend/src/i18n/locales/en.json` - Übersetzungen hinzufügen
4. ✅ `frontend/src/components/PayrollComponent.tsx` - Hardcodierte Texte ersetzen, Organisation-Kontext nutzen

**Phase 2 (KRITISCH):**
1. ✅ `backend/src/controllers/payrollController.ts` - periodStart/periodEnd im Request akzeptieren, Validierung
2. ✅ `frontend/src/components/PayrollComponent.tsx` - Perioden-Auswahl UI hinzufügen
3. ✅ `frontend/src/i18n/locales/{de,es,en}.json` - Perioden-Übersetzungen

**Phase 3 (KRITISCH):**
1. ✅ `backend/src/controllers/payrollController.ts` - PDF-Übersetzungen
2. ✅ `backend/src/utils/translations.ts` - Payroll-Übersetzungen hinzufügen

**Phase 4:**
1. ✅ `backend/src/controllers/payrollController.ts` - Kategorisierungs-Logik hinzufügen
2. ✅ `backend/src/routes/payroll.ts` - Route hinzufügen
3. ✅ `frontend/src/config/api.ts` - API-Endpunkt hinzufügen
4. ✅ `frontend/src/components/PayrollComponent.tsx` - Vorausfüllung implementieren

**Phase 5:**
1. ✅ `frontend/src/components/PayrollComponent.tsx` - Berechtigungsprüfung hinzufügen

### Neue Abhängigkeiten:

- **Feiertagsliste**: Initial nur Kolumbien (fest codiert), Schweiz später

### Geschätzter Aufwand:

- **Phase 1**: 2 Stunden (Übersetzungen + Hardcodierte Texte)
- **Phase 2 (KRITISCH)**: 3 Stunden (Perioden-Auswahl Backend + Frontend)
- **Phase 3 (KRITISCH)**: 2 Stunden (PDF-Übersetzungen)
- **Phase 4**: 8 Stunden (Backend-Logik + Frontend-Integration)
- **Phase 5**: 1 Stunde (Berechtigungsprüfung)

**Gesamt**: ~16 Stunden

---

## KRITISCHE PROBLEME (Übersehen)

### Problem 4: Perioden-Auswahl fehlt komplett

**Aktuelle Situation:**
- ❌ `periodStart` wird immer auf `new Date()` gesetzt (Zeile 21 in `payrollController.ts`)
- ❌ Keine Möglichkeit, eine andere Periode auszuwählen
- ❌ Keine Perioden-Auswahl im Frontend
- ❌ Keine Validierung ob `periodStart < periodEnd`
- ❌ Keine Prüfung auf doppelte Perioden

**Risiken:**
- Kann keine vergangenen Perioden erstellen
- Kann keine zukünftigen Perioden erstellen
- Perioden-Überschneidungen möglich
- Doppelte Abrechnungen für gleiche Periode möglich

**Lösung:**
- Backend: `periodStart` und `periodEnd` im Request-Body akzeptieren (optional, mit Fallback)
- Frontend: Perioden-Auswahl hinzufügen (Date Picker oder Dropdown)
- Backend: Validierung hinzufügen (periodStart < periodEnd)
- Backend: Prüfung auf doppelte Perioden hinzufügen

### Problem 5: PDF hat hardcodierte deutsche Texte

**Aktuelle Situation:**
- ❌ PDF-Generator verwendet hardcodierte deutsche Texte
- ❌ "Lohnabrechnung", "Mitarbeiter", "Abrechnungszeitraum", "Land", "Schweiz", "Kolumbien", etc.
- ❌ `formatDate` verwendet hardcodiert `'de-CH'` Locale

**Lösung:**
- PDF-Generator: Übersetzungen basierend auf User/Organisation-Sprache
- `formatDate`: Dynamisches Locale basierend auf Sprache

### Problem 6: Fehlende Felder/Validierungen

**Fehlend:**
- ❌ Perioden-Auswahl UI
- ❌ Validierung: periodStart < periodEnd
- ❌ Validierung: Keine Überschneidungen mit existierenden Perioden
- ❌ Validierung: Perioden-Format (z.B. Monat/Quinzena)
- ❌ Feiertagsliste (initial nur Kolumbien)

---

## Wichtige Hinweise

1. **Feiertagsliste**: Initial nur Kolumbien implementieren, Schweiz später (kantonabhängig, komplexer)
2. **Nachtzeit**: Kolumbien 22:00-06:00, Schweiz 20:00-06:00
3. **Perioden**: Schweiz monatlich (25.), Kolumbien zweimal monatlich (15. + Monatsende)
4. **Berechtigungen**: `payroll` entity mit `read`/`write`/`both`
5. **Sprache**: Priorität: User.language > Organization.settings.language > 'de'
6. **Land**: Priorität: User.payrollCountry > Organization.country > User.country
7. **Perioden-Auswahl**: MUSS implementiert werden (kritisch!)
8. **PDF-Übersetzungen**: MUSS implementiert werden (kritisch!)

---

## Testing-Checkliste

Nach der Implementierung testen:

**Phase 1:**
- [ ] Übersetzungen funktionieren (DE, ES, EN)
- [ ] Land-Anzeige korrekt (CH/CO)
- [ ] Währung korrekt (CHF/COP)
- [ ] Hardcodierte Texte ersetzt

**Phase 2 (KRITISCH):**
- [ ] Perioden-Auswahl funktioniert
- [ ] Standard-Periode wird korrekt berechnet (CH: Monat, CO: Quinzena)
- [ ] Validierung: periodStart < periodEnd
- [ ] Validierung: Doppelte Perioden werden erkannt
- [ ] Perioden können manuell geändert werden

**Phase 3 (KRITISCH):**
- [ ] PDF wird in korrekter Sprache generiert
- [ ] PDF-Texte sind übersetzt (DE, ES, EN)
- [ ] PDF-Datum-Format korrekt

**Phase 4:**
- [ ] Stunden werden automatisch vorausgefüllt
- [ ] Kategorisierung korrekt (regular, overtime, night, etc.)
- [ ] Feiertags-Erkennung funktioniert (Kolumbien)
- [ ] Nachtzeit-Erkennung funktioniert (22:00-06:00 CO, 20:00-06:00 CH)
- [ ] Sonntags-Erkennung funktioniert
- [ ] Überstunden-Berechnung korrekt

**Phase 5:**
- [ ] Berechtigungen funktionieren (read-only vs. editierbar)
- [ ] Input-Felder disabled bei read-only
- [ ] Speichern-Button disabled bei read-only

---

## Risiken und Mitigation

### Risiko 1: Perioden-Überschneidungen
**Risiko**: Mehrere Abrechnungen für gleiche Periode möglich
**Mitigation**: Validierung im Backend vor dem Speichern

### Risiko 2: Falsche Perioden-Berechnung
**Risiko**: Perioden werden falsch berechnet (z.B. falscher Monat)
**Mitigation**: Unit-Tests für `getPayrollEndDate` und Perioden-Berechnung

### Risiko 3: Feiertagsliste unvollständig
**Risiko**: Feiertage werden nicht erkannt
**Mitigation**: Initial nur Kolumbien (fest codiert), später erweiterbar

### Risiko 4: Kategorisierungs-Logik komplex
**Risiko**: Stunden werden falsch kategorisiert (z.B. Nachtstunden)
**Mitigation**: Detaillierte Tests, Edge Cases prüfen (z.B. über Mitternacht)

### Risiko 5: Performance bei vielen WorkTime-Einträgen
**Risiko**: Kategorisierung langsam bei vielen Einträgen
**Mitigation**: Optimierung, ggf. Caching

### Risiko 6: Zeitzonen-Probleme
**Risiko**: Falsche Kategorisierung durch Zeitzonen-Unterschiede
**Mitigation**: UTC verwenden, Zeitzone aus WorkTime.timezone berücksichtigen

### Risiko 7: User-Daten fehlen
**Risiko**: `users` Array enthält nicht alle benötigten Felder (z.B. `payrollCountry`)
**Aktuell**: `fetchUsers` verwendet `API_ENDPOINTS.USERS.BASE` → gibt vollständige User-Objekte zurück
**Problem**: Frontend verwendet nur `{ id, firstName, lastName }` → `payrollCountry` fehlt
**Mitigation**: 
- Frontend: User-Interface erweitern um `payrollCountry`
- Oder: Separater API-Call für User-Details beim Auswählen

### Risiko 8: Organisation-Daten fehlen
**Risiko**: `organization` ist null oder hat keine `country`/`settings.language`
**Mitigation**: Fallback-Logik implementieren (User.payrollCountry > Organization.country > User.country)

