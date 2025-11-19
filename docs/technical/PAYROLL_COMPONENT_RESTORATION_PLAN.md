# Plan: PayrollComponent - Wiederherstellung der ursprünglichen Funktionalität

**Datum**: 2025-01-XX  
**Status**: 📋 Planung abgeschlossen, bereit für Implementierung

## Überblick

Die `PayrollComponent` wurde von einer vollständigen Lohnabrechnungs-Anwendung auf eine einfache Mock-Daten-Anzeige reduziert. Dieser Plan beschreibt, was wiederhergestellt werden muss, um die ursprüngliche Funktionalität wieder zu aktivieren.

## Vergleich: Vorher vs. Jetzt

### ✅ Was noch vorhanden ist

**Backend (vollständig vorhanden):**
- ✅ `backend/src/controllers/payrollController.ts` - Alle Controller-Funktionen existieren
  - `saveWorkHours()` - Stunden speichern
  - `calculatePayroll()` - Lohn berechnen
  - `getPayrolls()` - Abrechnungen abrufen
  - `generatePayrollPDF()` - PDF generieren
- ✅ `backend/src/routes/payroll.ts` - Alle Routes sind registriert
  - `POST /api/payroll/hours`
  - `GET /api/payroll/calculate`
  - `GET /api/payroll`
  - `GET /api/payroll/pdf/:payrollId`
- ✅ `backend/src/index.ts` - Route ist registriert: `app.use('/api/payroll', payrollRoutes)` ⚠️ **WICHTIG:** Routes werden in `index.ts` registriert, NICHT in `app.ts`!
- ✅ Datenbank-Schema: `EmployeePayroll` Model existiert mit allen Feldern

**Frontend (teilweise vorhanden):**
- ✅ `frontend/src/components/PayrollComponent.tsx` - Komponente existiert
- ✅ Berechtigungsprüfung (`usePermissions`) - **NEU, war vorher nicht da**
- ✅ Internationalisierung (`useTranslation`) - **NEU, war vorher nicht da**
- ✅ Besseres Error-Handling - **NEU**
- ✅ Loading-States - **NEU**

### ❌ Was fehlt

**Frontend:**
1. ❌ **API_ENDPOINTS für Payroll** - Fehlt in `frontend/src/config/api.ts`
2. ❌ **User-Auswahl** - Dropdown mit allen Benutzern
3. ❌ **Stunden-Eingabe-Formular** - 8 Input-Felder für verschiedene Stundentypen
4. ❌ **Speichern-Button** - Button zum Speichern und Berechnen
5. ❌ **Liste bestehender Abrechnungen** - Tabelle mit allen Abrechnungen des ausgewählten Users
6. ❌ **Details-Anzeige** - Vollständige Anzeige einer berechneten Abrechnung
7. ❌ **PDF-Generierung-Button** - Button zum Generieren und Downloaden des PDFs
8. ❌ **State-Management** - States für `users`, `selectedUser`, `hours`, `payrolls`, `payroll`
9. ❌ **API-Aufrufe** - Alle API-Aufrufe fehlen (nur Mock-Daten vorhanden)

## Aufräum-Phase: Alt-Rückstände entfernen

**WICHTIG**: Bevor neue Funktionalität hinzugefügt wird, müssen alle Alt-Rückstände der Mock-Version entfernt werden.

### Phase 0: Code-Bereinigung

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Zu entfernende Code-Teile:**

1. **Interface `PayrollData`** (Zeilen 9-15)
   - ❌ ENTFERNEN: Wird durch vollständiges `Payroll` Interface ersetzt

2. **Import `format` von `date-fns`** (Zeile 3)
   - ❌ ENTFERNEN: Wird nicht verwendet

3. **`formatCurrency` Funktion** (Zeilen 17-23)
   - ⚠️ ÜBERARBEITEN: Sollte dynamisch Währung aus `payroll.currency` nehmen (CHF oder COP)
   - Neue Version:
   ```typescript
   const formatCurrency = (amount: number, currency: string = 'CHF'): string => {
     return new Intl.NumberFormat(
       currency === 'CHF' ? 'de-CH' : 'es-CO',
       {
         style: 'currency',
         currency: currency
       }
     ).format(amount);
   };
   ```

4. **State `payrollData`** (Zeile 28)
   - ❌ ENTFERNEN: Wird durch `payroll` State ersetzt

5. **Refs `hasInitialLoadRef` und `mountedRef`** (Zeilen 31-32)
   - ❌ ENTFERNEN: Werden nicht mehr benötigt

6. **TODO-Kommentar** (Zeilen 34-36)
   - ❌ ENTFERNEN: Nicht mehr relevant

7. **Funktion `loadPayrollData`** (Zeilen 38-82)
   - ❌ ENTFERNEN: Komplette Mock-Daten-Logik entfernen
   - Inklusive:
     - `setTimeout` Mock-Daten-Logik
     - Alle `console.log` Statements
     - Mock-Daten-Generierung

8. **useEffect für Mount/Unmount** (Zeilen 84-94)
   - ❌ ENTFERNEN: Wird nicht mehr benötigt

9. **useEffect für Daten-Laden** (Zeilen 96-133)
   - ❌ ENTFERNEN: Wird durch neue Logik ersetzt

10. **Hinweis-Banner "zukünftige Umstrukturierung"** (Zeilen 176-189)
    - ❌ ENTFERNEN: Nicht mehr relevant

11. **4 Karten-Anzeige** (Zeilen 204-241)
    - ❌ ENTFERNEN: Wird durch vollständige UI ersetzt

12. **Alle `console.log` Statements**
    - ❌ ENTFERNEN: Debug-Logs entfernen (ca. 10 Stellen)

**Zusammenfassung der zu entfernenden Zeilen:**
- Zeilen 3: `format` Import
- Zeilen 9-15: `PayrollData` Interface
- Zeilen 17-23: Alte `formatCurrency` Funktion (wird ersetzt)
- Zeilen 28: `payrollData` State
- Zeilen 31-32: Refs
- Zeilen 34-36: TODO-Kommentar
- Zeilen 38-82: `loadPayrollData` Funktion
- Zeilen 84-94: Mount/Unmount useEffect
- Zeilen 96-133: Daten-Laden useEffect
- Zeilen 176-189: Hinweis-Banner
- Zeilen 204-241: 4 Karten-Anzeige
- Alle `console.log` Statements

---

### Phase 0.1: Übersetzungen aufräumen

**Dateien**: 
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/es.json`
- `frontend/src/i18n/locales/en.json`

**Zu entfernende Übersetzungen:**

1. **`futureDevelopment`** (Zeile 935/1048/1059)
   - ❌ ENTFERNEN: Nicht mehr relevant

2. **`futureDevelopmentDescription`** (Zeile 936/1049/1060)
   - ❌ ENTFERNEN: Nicht mehr relevant

3. **`noData`** (Zeile 934/1047/1058)
   - ❌ ENTFERNEN: Wird nicht mehr benötigt (immer Daten vorhanden)

**Zu behaltende Übersetzungen:**
- ✅ `title` - Wird weiterhin verwendet
- ✅ `noPermission` - Wird weiterhin verwendet
- ✅ `loadError` - Wird weiterhin verwendet
- ⚠️ `totalHours`, `grossPay`, `deductions`, `netPay` - Werden durch neue, spezifischere Übersetzungen ergänzt (nicht entfernt, da sie in Details-Anzeige verwendet werden)

---

### Phase 0.2: CSS prüfen

**Datei**: `frontend/src/index.css`

**Prüfung:**
- Zeile 278: Kommentar "Spezifische Anpassungen für WorktimeList und PayrollComponent"
- Zeile 362: Kommentar "Die Tabellen Requests, Tasks, UserWorktime und PayrollComponent"

**Entscheidung:**
- ✅ BEHALTEN: Diese CSS-Regeln sind generisch und werden weiterhin benötigt für die neue Tabelle

---

## Detaillierte Implementierungs-Schritte

### Phase 1: API-Endpunkte hinzufügen

**Datei**: `frontend/src/config/api.ts`

**Änderung**: Füge `PAYROLL` zu `API_ENDPOINTS` hinzu:

```typescript
PAYROLL: {
    BASE: '/payroll',
    HOURS: '/payroll/hours',
    CALCULATE: '/payroll/calculate',
    PDF: (payrollId: number) => `/payroll/pdf/${payrollId}`
}
```

**Position**: Nach `MONTHLY_CONSULTATION_REPORTS` (ca. Zeile 221)

---

### Phase 2: Interfaces und Types hinzufügen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Änderung 1**: Füge vollständige Interfaces hinzu (nach Entfernung von `PayrollData` in Phase 0):

```typescript
interface Hours {
  regular: number;
  overtime: number;
  night: number;
  holidayHours: number;
  sundayHoliday: number;
  overtimeNight: number;
  overtimeSundayHoliday: number;
  overtimeNightSundayHoliday: number;
}

interface Payroll {
  id: number;
  userId: number;
  periodStart: string;
  periodEnd: string;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  sundayHolidayHours: number;
  overtimeNightHours: number;
  overtimeSundayHolidayHours: number;
  overtimeNightSundayHolidayHours: number;
  hourlyRate: number;
  grossPay: number;
  socialSecurity: number;
  taxes: number;
  netPay: number;
  currency: string;
  user: {
    firstName: string;
    lastName: string;
    payrollCountry: string;
    contractType: string | null;
  };
}
```

---

### Phase 3: State-Management hinzufügen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Änderung**: Erweitere States:

```typescript
const [hours, setHours] = useState<Hours>({
  regular: 0,
  overtime: 0,
  night: 0,
  holidayHours: 0,
  sundayHoliday: 0,
  overtimeNight: 0,
  overtimeSundayHoliday: 0,
  overtimeNightSundayHoliday: 0
});
const [payroll, setPayroll] = useState<Payroll | null>(null);
const [payrolls, setPayrolls] = useState<Payroll[]>([]);
const [selectedUser, setSelectedUser] = useState<number | null>(null);
const [users, setUsers] = useState<{ id: number; firstName: string; lastName: string }[]>([]);
// loading und error bleiben bestehen
```

**Hinweis**: 
- `payrollData` State wurde bereits in Phase 0 entfernt
- `hasInitialLoadRef` und `mountedRef` wurden bereits in Phase 0 entfernt

---

### Phase 4: API-Aufrufe implementieren

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Änderung 1**: Füge `fetchUsers` hinzu (nach Entfernung von `loadPayrollData` in Phase 0):

```typescript
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get(API_ENDPOINTS.USERS.BASE);
      setUsers(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
      setError(t('payroll.payrollComponent.usersLoadError'));
    }
  };

  if (hasPermission('payroll', 'read')) {
    fetchUsers();
  }
}, [hasPermission, t]);
```

**Änderung 2**: Füge `fetchPayrolls` hinzu:

```typescript
const fetchPayrolls = useCallback(async () => {
  if (!selectedUser) return;

  setLoading(true);
  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.PAYROLL.BASE}?userId=${selectedUser}`
    );
    setPayrolls(response.data);
    setLoading(false);
  } catch (error) {
    console.error('Fehler beim Laden der Abrechnungen:', error);
    setError(t('payroll.payrollComponent.payrollsLoadError'));
    setLoading(false);
  }
}, [selectedUser, t]);
```

**Änderung 3**: Füge `saveHours` hinzu:

```typescript
const saveHours = useCallback(async () => {
  if (!selectedUser) {
    setError(t('payroll.payrollComponent.selectUserFirst'));
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const response = await axiosInstance.post(API_ENDPOINTS.PAYROLL.HOURS, {
      userId: selectedUser,
      hours
    });

    // Automatisch berechnen
    const calculatedPayroll = await axiosInstance.get(
      `${API_ENDPOINTS.PAYROLL.CALCULATE}?payrollId=${response.data.id}`
    );
    setPayroll(calculatedPayroll.data);

    // Liste aktualisieren
    fetchPayrolls();

    setLoading(false);
  } catch (error) {
    console.error('Fehler beim Speichern der Stunden:', error);
    setError(t('payroll.payrollComponent.saveError'));
    setLoading(false);
  }
}, [selectedUser, hours, fetchPayrolls, t]);
```

**Änderung 4**: Füge `selectPayroll` hinzu:

```typescript
const selectPayroll = useCallback(async (payrollId: number) => {
  setLoading(true);
  setError(null);

  try {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.PAYROLL.CALCULATE}?payrollId=${payrollId}`
    );
    setPayroll(response.data);
    setLoading(false);
  } catch (error) {
    console.error('Fehler beim Laden der Abrechnung:', error);
    setError(t('payroll.payrollComponent.loadError'));
    setLoading(false);
  }
}, [t]);
```

**Änderung 5**: Füge `generatePDF` hinzu:

```typescript
const generatePDF = useCallback(async (payrollId: number) => {
  try {
    window.open(
      `${window.location.origin}${API_ENDPOINTS.PAYROLL.PDF(payrollId)}`,
      '_blank'
    );
  } catch (error) {
    console.error('Fehler beim Generieren des PDFs:', error);
    setError(t('payroll.payrollComponent.pdfError'));
  }
}, [t]);
```

**Änderung 6**: Füge `useEffect` für `selectedUser` hinzu:

```typescript
useEffect(() => {
  if (selectedUser) {
    fetchPayrolls();
  }
}, [selectedUser, fetchPayrolls]);
```

---

### Phase 5: Event-Handler hinzufügen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Änderung 1**: Füge `handleUserChange` hinzu:

```typescript
const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const userId = Number(e.target.value);
  setSelectedUser(userId || null);
  setPayroll(null); // Reset Details bei User-Wechsel
};
```

**Änderung 2**: Füge `handleHoursChange` hinzu:

```typescript
const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof Hours) => {
  const value = Math.max(0, Number(e.target.value)); // Keine negativen Werte
  setHours({ ...hours, [field]: value });
};
```

---

### Phase 6: UI-Komponenten hinzufügen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Änderung**: Ersetze den gesamten `return`-Block durch die vollständige UI:

#### 6.1: User-Auswahl hinzufügen

Nach dem Header, vor dem Hinweis-Banner:

```typescript
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    {t('payroll.payrollComponent.selectEmployee')}
  </label>
  <select
    className="border border-gray-300 dark:border-gray-600 rounded-md p-2 w-full dark:bg-gray-700 dark:text-white"
    value={selectedUser || ''}
    onChange={handleUserChange}
  >
    <option value="">-- {t('payroll.payrollComponent.pleaseSelect')} --</option>
    {users.map(user => (
      <option key={user.id} value={user.id}>
        {user.firstName} {user.lastName}
      </option>
    ))}
  </select>
</div>
```

#### 6.2: Stunden-Eingabe-Formular hinzufügen

Nach User-Auswahl, nur wenn `selectedUser` gesetzt ist:

```typescript
{selectedUser && (
  <>
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">
        {t('payroll.payrollComponent.enterHours')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 8 Input-Felder für Stunden */}
        {/* Reguläre Stunden, Überstunden, Nachtstunden, etc. */}
      </div>
      
      <button
        className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        onClick={saveHours}
        disabled={loading}
      >
        {loading ? t('payroll.payrollComponent.saving') : t('payroll.payrollComponent.saveAndCalculate')}
      </button>
    </div>
    
    {/* Liste bestehender Abrechnungen */}
    {/* Details-Anzeige */}
  </>
)}
```

#### 6.3: Liste bestehender Abrechnungen hinzufügen

Nach Stunden-Eingabe, nur wenn `payrolls.length > 0`:

```typescript
{payrolls.length > 0 && (
  <div className="mb-6">
    <h2 className="text-xl font-semibold mb-4 dark:text-white">
      {t('payroll.payrollComponent.existingPayrolls')}
    </h2>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {/* Tabellen-Header und -Body */}
      </table>
    </div>
  </div>
)}
```

#### 6.4: Details-Anzeige hinzufügen

Nach Liste, nur wenn `payroll` gesetzt ist:

```typescript
{payroll && (
  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-sm">
    <h2 className="text-xl font-semibold mb-4 dark:text-white">
      {t('payroll.payrollComponent.payrollDetails')}
    </h2>
    
    {/* Mitarbeiter-Info */}
    {/* Arbeitsstunden */}
    {/* Abrechnung */}
    {/* PDF-Button */}
    {/* Zahlungsanweisung */}
  </div>
)}
```

---

### Phase 7: Hilfsfunktionen hinzufügen

**Datei**: `frontend/src/components/PayrollComponent.tsx`

**Änderung 1**: Ersetze `formatCurrency` Funktion (wurde in Phase 0 überarbeitet, jetzt finalisieren):

```typescript
const formatCurrency = (amount: number, currency: string = 'CHF'): string => {
  return new Intl.NumberFormat(
    currency === 'CHF' ? 'de-CH' : 'es-CO',
    {
      style: 'currency',
      currency: currency
    }
  ).format(amount);
};
```

**Änderung 2**: Füge `formatContractType` Funktion hinzu (am Ende der Datei, vor `export default`):

```typescript
function formatContractType(contractType: string): string {
  switch (contractType) {
    case 'tiempo_completo': return 'Tiempo Completo (>21 Tage/Monat)';
    case 'tiempo_parcial_7': return 'Tiempo Parcial (≤7 Tage/Monat)';
    case 'tiempo_parcial_14': return 'Tiempo Parcial (≤14 Tage/Monat)';
    case 'tiempo_parcial_21': return 'Tiempo Parcial (≤21 Tage/Monat)';
    case 'servicios_externos': return 'Servicios Externos (Stundenbasiert)';
    default: return contractType;
  }
}
```

---

### Phase 8: Übersetzungen hinzufügen

**Dateien**: 
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/es.json`
- `frontend/src/i18n/locales/en.json`

**Änderung**: Erweitere `payroll.payrollComponent` Objekt (nach Entfernung der Mock-Daten-Übersetzungen in Phase 0.1):

```json
{
  "payroll": {
    "payrollComponent": {
      "selectEmployee": "Mitarbeiter auswählen",
      "pleaseSelect": "Bitte auswählen",
      "enterHours": "Arbeitsstunden erfassen",
      "regularHours": "Reguläre Stunden",
      "overtimeHours": "Überstunden",
      "nightHours": "Nachtstunden",
      "holidayHours": "Feiertagsstunden",
      "sundayHolidayHours": "Sonntagsstunden",
      "overtimeNightHours": "Nachtüberstunden",
      "overtimeSundayHolidayHours": "Sonntags-/Feiertagsüberstunden",
      "overtimeNightSundayHolidayHours": "Nacht-Sonntags-/Feiertagsüberstunden",
      "saveAndCalculate": "Stunden speichern und berechnen",
      "saving": "Wird gespeichert...",
      "existingPayrolls": "Bestehende Abrechnungen",
      "payrollDetails": "Lohnabrechnung Details",
      "period": "Abrechnungszeitraum",
      "totalHours": "Gesamt Stunden",
      "grossPay": "Bruttolohn",
      "netPay": "Nettolohn",
      "actions": "Aktionen",
      "details": "Details",
      "generatePDF": "PDF generieren",
      "selectUserFirst": "Bitte wählen Sie zuerst einen Benutzer aus",
      "usersLoadError": "Benutzer konnten nicht geladen werden",
      "payrollsLoadError": "Abrechnungen konnten nicht geladen werden",
      "saveError": "Stunden konnten nicht gespeichert werden",
      "pdfError": "PDF konnte nicht generiert werden"
    }
  }
}
```

---

## Zusammenfassung der Änderungen

### Dateien, die geändert werden müssen:

**Phase 0 - Aufräumen:**
1. ✅ `frontend/src/components/PayrollComponent.tsx` - Alt-Rückstände entfernen
2. ✅ `frontend/src/i18n/locales/de.json` - Mock-Daten-Übersetzungen entfernen
3. ✅ `frontend/src/i18n/locales/es.json` - Mock-Daten-Übersetzungen entfernen
4. ✅ `frontend/src/i18n/locales/en.json` - Mock-Daten-Übersetzungen entfernen

**Phase 1-8 - Implementierung:**
1. ✅ `frontend/src/config/api.ts` - API_ENDPOINTS erweitern
2. ✅ `frontend/src/components/PayrollComponent.tsx` - Komplette Überarbeitung
3. ✅ `frontend/src/i18n/locales/de.json` - Neue Übersetzungen hinzufügen
4. ✅ `frontend/src/i18n/locales/es.json` - Neue Übersetzungen hinzufügen
5. ✅ `frontend/src/i18n/locales/en.json` - Neue Übersetzungen hinzufügen

### Dateien, die NICHT geändert werden müssen:

- ✅ `backend/src/controllers/payrollController.ts` - Bereits vollständig
- ✅ `backend/src/routes/payroll.ts` - Bereits vollständig
- ✅ `backend/src/app.ts` - Route bereits registriert ⚠️ **WICHTIG:** Routes werden in `app.ts` registriert!
- ✅ Datenbank-Schema - Bereits vorhanden

## Wichtige Hinweise

1. **Aufräumen zuerst**: Phase 0 MUSS vor Phase 1-8 durchgeführt werden, um saubere Basis zu schaffen
2. **Keine Alt-Rückstände**: Alle Mock-Daten-Logik, Debug-Logs und nicht verwendete Imports müssen entfernt werden
3. **Berechtigungen**: Die neue Berechtigungsprüfung (`usePermissions`) sollte beibehalten werden
4. **Internationalisierung**: Alle neuen Texte müssen übersetzt werden, alte Mock-Daten-Übersetzungen entfernt werden
5. **Dark Mode**: Alle neuen UI-Komponenten müssen Dark-Mode-Support haben
6. **Error-Handling**: Das verbesserte Error-Handling sollte beibehalten werden
7. **Loading-States**: Die Loading-States sollten beibehalten werden
8. **API-Standardisierung**: Alle API-Aufrufe müssen `axiosInstance` verwenden (nicht `axios` direkt)
9. **PDF-URL**: PDF-URLs müssen `window.location.origin` verwenden (siehe backlog.md)
10. **Währung**: `formatCurrency` muss dynamisch Währung aus `payroll.currency` nehmen (CHF oder COP)

## Code-Qualität-Checkliste

Nach Phase 0 (Aufräumen) prüfen:

- [ ] Keine `console.log` Statements mehr vorhanden
- [ ] Keine Mock-Daten-Logik mehr vorhanden
- [ ] Keine nicht verwendeten Imports mehr vorhanden
- [ ] Keine Alt-Interfaces mehr vorhanden (`PayrollData` entfernt)
- [ ] Keine Alt-States mehr vorhanden (`payrollData` entfernt)
- [ ] Keine Alt-Refs mehr vorhanden (`hasInitialLoadRef`, `mountedRef` entfernt)
- [ ] Keine Alt-Übersetzungen mehr vorhanden (`futureDevelopment`, `futureDevelopmentDescription`, `noData` entfernt)
- [ ] Hinweis-Banner entfernt
- [ ] 4 Karten-Anzeige entfernt
- [ ] `formatCurrency` überarbeitet (dynamische Währung)

## Testing-Checkliste

Nach der Implementierung testen:

- [ ] User-Auswahl funktioniert
- [ ] Stunden-Eingabe funktioniert (alle 8 Felder)
- [ ] Speichern und Berechnen funktioniert
- [ ] Liste bestehender Abrechnungen wird angezeigt
- [ ] Details-Anzeige funktioniert
- [ ] PDF-Generierung funktioniert
- [ ] Berechtigungen werden korrekt geprüft
- [ ] Dark Mode funktioniert
- [ ] Übersetzungen funktionieren (DE, ES, EN)
- [ ] Error-Handling funktioniert
- [ ] Loading-States werden korrekt angezeigt

## Geschätzter Aufwand

- **Phase 0**: 30 Minuten (Code-Bereinigung und Aufräumen)
  - Phase 0.0: 20 Minuten (Code entfernen)
  - Phase 0.1: 5 Minuten (Übersetzungen entfernen)
  - Phase 0.2: 5 Minuten (CSS prüfen)
- **Phase 1**: 5 Minuten (API-Endpunkte)
- **Phase 2**: 10 Minuten (Interfaces)
- **Phase 3**: 10 Minuten (State-Management)
- **Phase 4**: 30 Minuten (API-Aufrufe)
- **Phase 5**: 10 Minuten (Event-Handler)
- **Phase 6**: 60 Minuten (UI-Komponenten)
- **Phase 7**: 10 Minuten (Hilfsfunktionen - inkl. formatCurrency Überarbeitung)
- **Phase 8**: 20 Minuten (Übersetzungen)

**Gesamt**: ~3 Stunden (inkl. Aufräumen)

