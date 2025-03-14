# MODUL ABRECHNUNG

Dieses Dokument beschreibt die Implementierung und Funktionsweise des Lohnabrechnungsmoduls im Intranet-Projekt. Das Modul ermöglicht die Verwaltung, Berechnung und Ausgabe von Lohnabrechnungen basierend auf erfassten Arbeitszeiten.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Komponenten](#komponenten)
3. [Länderspezifische Implementierungen](#länderspezifische-implementierungen)
4. [API-Endpunkte](#api-endpunkte)
5. [Datenmodell](#datenmodell)
6. [Benutzeroberfläche](#benutzeroberfläche)
7. [Berechtigungen](#berechtigungen)
8. [Integration mit anderen Modulen](#integration-mit-anderen-modulen)

## Überblick

Das Lohnabrechnungsmodul ist für die Erstellung und Verwaltung von Lohnabrechnungen zuständig. Es verarbeitet die im Zeiterfassungsmodul gesammelten Arbeitszeitdaten und berechnet daraus Lohnabrechnungen unter Berücksichtigung verschiedener Parameter wie:

- Stundensätze
- Überstundenzuschläge
- Steuerabzüge
- Sozialversicherungsbeiträge
- Länderspezifische Regelungen (Schweiz/Kolumbien)

Das Modul unterstützt sowohl monatliche als auch periodenbezogene Abrechnungen und bietet verschiedene Export-Optionen für die weitere Verarbeitung durch externe Buchhaltungssysteme.

## Komponenten

### PayrollDashboard

Die `PayrollDashboard`-Komponente bildet den Einstiegspunkt für das Modul:

```typescript
// Vereinfachtes Beispiel
const PayrollDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('CH');
  
  const { data: periods, isLoading: periodsLoading } = usePayrollPeriods();
  const { data: payrollData, isLoading: dataLoading } = usePayrollData(
    selectedPeriod?.id,
    selectedUser?.id,
    selectedCountry
  );
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-6">Lohnabrechnung</h1>
      
      <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold flex items-center mb-4">
          <CurrencyDollarIcon className="h-6 w-6 mr-2" />
          Abrechnungsverwaltung
        </h2>
        
        <div className="mb-4">
          <FilterControls 
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            selectedUser={selectedUser}
            onUserChange={setSelectedUser}
            selectedCountry={selectedCountry}
            onCountryChange={setSelectedCountry}
          />
        </div>
        
        <PayrollControls
          period={selectedPeriod}
          user={selectedUser}
          country={selectedCountry}
        />
      </div>
      
      {!periodsLoading && !dataLoading && payrollData && (
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold flex items-center mb-4">
            <DocumentTextIcon className="h-6 w-6 mr-2" />
            Lohnabrechnungen
          </h2>
          
          <PayrollTable data={payrollData} country={selectedCountry} />
          
          <div className="mt-4 flex justify-end">
            <ExportControls 
              period={selectedPeriod}
              user={selectedUser}
              country={selectedCountry}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

### PayrollTable

Diese Komponente zeigt die Lohnabrechnungsdaten in Tabellenform an:

```typescript
// Vereinfachtes Beispiel
const PayrollTable: React.FC<{
  data: PayrollData[];
  country: CountryCode;
}> = ({ data, country }) => {
  if (data.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 p-4">
        Keine Abrechnungsdaten für den ausgewählten Zeitraum vorhanden.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Benutzer
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Arbeitsstunden
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Überstunden
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Bruttolohn
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Abzüge
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Nettolohn
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {data.map((payroll) => (
            <tr key={payroll.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {payroll.user.firstName} {payroll.user.lastName}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {payroll.regularHours.toFixed(2)} h
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {payroll.overtimeHours.toFixed(2)} h
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(payroll.grossSalary, country)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(payroll.deductions, country)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency(payroll.netSalary, country)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <PayrollStatusBadge status={payroll.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={() => viewPayrollDetails(payroll.id)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => downloadPayslip(payroll.id)}
                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                  >
                    Lohnzettel
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### PayrollCalculator

Der `PayrollCalculator` ist ein Service, der die Lohnberechnungen durchführt:

```typescript
// Vereinfachtes Beispiel
class PayrollCalculator {
  calculatePayroll(
    worktimes: WorkTime[],
    user: User,
    period: PayrollPeriod,
    country: CountryCode
  ): PayrollData {
    // Basiswerte
    const regularHours = this.calculateRegularHours(worktimes);
    const overtimeHours = this.calculateOvertimeHours(worktimes, user);
    
    // Lohnberechnung basierend auf Land
    if (country === 'CH') {
      return this.calculateSwissPayroll(regularHours, overtimeHours, user, period);
    } else if (country === 'CO') {
      return this.calculateColombianPayroll(regularHours, overtimeHours, user, period);
    } else {
      throw new Error(`Nicht unterstütztes Land: ${country}`);
    }
  }
  
  private calculateSwissPayroll(
    regularHours: number,
    overtimeHours: number,
    user: User,
    period: PayrollPeriod
  ): PayrollData {
    // Schweizer Lohnberechnung
    const hourlyRate = user.payrollSettings?.hourlyRate || 0;
    const overtimeRate = hourlyRate * 1.25; // 25% Überstundenzuschlag
    
    const regularSalary = regularHours * hourlyRate;
    const overtimeSalary = overtimeHours * overtimeRate;
    const grossSalary = regularSalary + overtimeSalary;
    
    // Abzüge
    const ahvIvEo = grossSalary * 0.053; // 5.3% AHV/IV/EO
    const alv = grossSalary * 0.011; // 1.1% ALV
    const pensionFund = this.calculatePensionFund(grossSalary, user);
    const incomeTax = this.calculateSwissIncomeTax(grossSalary, user);
    
    const totalDeductions = ahvIvEo + alv + pensionFund + incomeTax;
    const netSalary = grossSalary - totalDeductions;
    
    return {
      id: 0, // Wird vom Server gesetzt
      userId: user.id,
      periodId: period.id,
      regularHours,
      overtimeHours,
      grossSalary,
      deductions: totalDeductions,
      netSalary,
      status: 'draft',
      country: 'CH',
      details: {
        regularSalary,
        overtimeSalary,
        deductionDetails: {
          ahvIvEo,
          alv,
          pensionFund,
          incomeTax
        }
      }
    };
  }
  
  private calculateColombianPayroll(
    regularHours: number,
    overtimeHours: number,
    user: User,
    period: PayrollPeriod
  ): PayrollData {
    // Kolumbianische Lohnberechnung
    const hourlyRate = user.payrollSettings?.hourlyRate || 0;
    const overtimeRate = hourlyRate * 1.35; // 35% Überstundenzuschlag
    
    const regularSalary = regularHours * hourlyRate;
    const overtimeSalary = overtimeHours * overtimeRate;
    const grossSalary = regularSalary + overtimeSalary;
    
    // Abzüge
    const health = grossSalary * 0.04; // 4% Gesundheit
    const pension = grossSalary * 0.04; // 4% Rente
    const incomeTax = this.calculateColombianIncomeTax(grossSalary, user);
    
    const totalDeductions = health + pension + incomeTax;
    const netSalary = grossSalary - totalDeductions;
    
    return {
      id: 0, // Wird vom Server gesetzt
      userId: user.id,
      periodId: period.id,
      regularHours,
      overtimeHours,
      grossSalary,
      deductions: totalDeductions,
      netSalary,
      status: 'draft',
      country: 'CO',
      details: {
        regularSalary,
        overtimeSalary,
        deductionDetails: {
          health,
          pension,
          incomeTax
        }
      }
    };
  }
  
  // Weitere Hilfsmethoden für die Berechnung von Steuern, Beiträgen usw.
}
```

## Länderspezifische Implementierungen

Das Lohnabrechnungssystem unterstützt zwei verschiedene Länder mit unterschiedlichen gesetzlichen Anforderungen:

### Schweiz

Die Schweizer Implementierung beachtet folgende Besonderheiten:

- AHV/IV/EO-Beiträge (5.3%)
- ALV-Beiträge (1.1%)
- Pensionskassenbeiträge (je nach Alter und Lohn)
- Quellensteuer oder Einkommenssteuer je nach Aufenthaltsstatus
- 13. Monatslohn
- 25% Überstundenzuschlag

Die Berechnungen verwenden den Schweizer Franken (CHF) als Währung und beachten die kantonalen Unterschiede bei der Besteuerung.

### Kolumbien

Die kolumbianische Implementierung beachtet folgende Besonderheiten:

- Gesundheitsbeiträge (4%)
- Rentenbeiträge (4%)
- Einkommenssteuer (progressive Staffelung)
- Prima de servicios (halbes Monatsgehalt im Juni und Dezember)
- Cesantías (jährliche Abfindungsrücklage)
- 35% Überstundenzuschlag

Die Berechnungen verwenden den kolumbianischen Peso (COP) als Währung und berücksichtigen den gesetzlichen Mindestlohn (Salario Mínimo Legal Vigente).

## API-Endpunkte

Das Lohnabrechnungsmodul verwendet folgende API-Endpunkte:

### Abrechnungsperioden abrufen

```
GET /api/payroll/periods
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Januar 2023",
    "startDate": "2023-01-01",
    "endDate": "2023-01-31",
    "status": "closed"
  },
  {
    "id": 2,
    "name": "Februar 2023",
    "startDate": "2023-02-01",
    "endDate": "2023-02-28",
    "status": "closed"
  },
  {
    "id": 3,
    "name": "März 2023",
    "startDate": "2023-03-01",
    "endDate": "2023-03-31",
    "status": "active"
  }
]
```

### Lohnabrechnungsdaten abrufen

```
GET /api/payroll/data
```

**Query-Parameter:**
- `periodId`: ID der Abrechnungsperiode
- `userId`: (optional) ID des Benutzers
- `country`: Ländercode (z.B. 'CH', 'CO')

**Response:**
```json
[
  {
    "id": 123,
    "userId": 456,
    "user": {
      "id": 456,
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe"
    },
    "periodId": 3,
    "regularHours": 160.0,
    "overtimeHours": 8.5,
    "grossSalary": 6800.0,
    "deductions": 1360.0,
    "netSalary": 5440.0,
    "status": "draft",
    "country": "CH",
    "details": {
      "regularSalary": 6400.0,
      "overtimeSalary": 400.0,
      "deductionDetails": {
        "ahvIvEo": 360.4,
        "alv": 74.8,
        "pensionFund": 510.0,
        "incomeTax": 414.8
      }
    }
  },
  // Weitere Lohnabrechnungen...
]
```

### Lohnabrechnung generieren

```
POST /api/payroll/generate
```

**Request-Body:**
```json
{
  "periodId": 3,
  "userId": 456,
  "country": "CH"
}
```

**Response:**
```json
{
  "id": 123,
  "userId": 456,
  "periodId": 3,
  "regularHours": 160.0,
  "overtimeHours": 8.5,
  "grossSalary": 6800.0,
  "deductions": 1360.0,
  "netSalary": 5440.0,
  "status": "draft",
  "country": "CH",
  "details": {
    "regularSalary": 6400.0,
    "overtimeSalary": 400.0,
    "deductionDetails": {
      "ahvIvEo": 360.4,
      "alv": 74.8,
      "pensionFund": 510.0,
      "incomeTax": 414.8
    }
  }
}
```

### Lohnzettel herunterladen

```
GET /api/payroll/payslip/:id
```

**Path-Parameter:**
- `id`: ID der Lohnabrechnung

**Query-Parameter:**
- `format`: Format des Lohnzettels (z.B. 'pdf', 'html')

**Response:** 
Eine Datei zum Download im angeforderten Format.

## Datenmodell

Das Lohnabrechnungsmodul verwendet folgendes Datenmodell:

### PayrollPeriod

```prisma
model PayrollPeriod {
  id        Int       @id @default(autoincrement())
  name      String
  startDate DateTime
  endDate   DateTime
  status    String    @default("active") // active, closed
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // Relationen
  payrolls  Payroll[]
}
```

### Payroll

```prisma
model Payroll {
  id            Int          @id @default(autoincrement())
  userId        Int
  user          User         @relation(fields: [userId], references: [id])
  periodId      Int
  period        PayrollPeriod @relation(fields: [periodId], references: [id])
  regularHours  Float
  overtimeHours Float
  grossSalary   Float
  deductions    Float
  netSalary     Float
  status        String       @default("draft") // draft, approved, paid
  country       String       // CH, CO
  details       Json
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

### PayrollSettings (Teil des User-Modells)

```prisma
model PayrollSettings {
  id            Int       @id @default(autoincrement())
  userId        Int       @unique
  user          User      @relation(fields: [userId], references: [id])
  hourlyRate    Float
  contractType  String    // fulltime, parttime, hourly
  taxCode       String?
  bankAccount   String?
  country       String    // CH, CO
  additionalInfo Json?
}
```

## Benutzeroberfläche

Die Benutzeroberfläche des Lohnabrechnungsmoduls besteht aus mehreren Hauptkomponenten:

### 1. Abrechnungsverwaltung

- Auswahl der Abrechnungsperiode
- Auswahl des Benutzers (für Administratoren)
- Auswahl des Landes (Schweiz/Kolumbien)
- Buttons zum Generieren neuer Abrechnungen

### 2. Lohnabrechnungstabelle

- Tabellarische Anzeige aller Lohnabrechnungen
- Filterfunktionen
- Status-Anzeige (Entwurf, Genehmigt, Bezahlt)
- Aktionsbuttons (Details anzeigen, Lohnzettel herunterladen)

### 3. Lohnabrechnungsdetails

- Detailansicht einer einzelnen Lohnabrechnung
- Vollständige Aufschlüsselung aller Berechnungen
- Visualisierung der Verteilung (Brutto, Abzüge, Netto)
- Genehmigungsworkflow für Administratoren

### 4. Export-Optionen

- Export einzelner Lohnzettel als PDF
- Export von Zusammenfassungen für die Buchhaltung
- Export von Zahlungslisten für Banken

## Berechtigungen

Für das Lohnabrechnungsmodul sind folgende Berechtigungen definiert:

- **payroll** (entityType: 'page'): Grundlegende Berechtigung für die Lohnabrechnungsseite
- **payroll_data** (entityType: 'table'): Berechtigung zum Anzeigen und Verwalten von Lohnabrechnungsdaten
- **payroll_settings** (entityType: 'table'): Berechtigung zum Verwalten von Lohnabrechnungseinstellungen

Diese Berechtigungen können die folgenden Zugriffsebenen haben:
- **read**: Nur Lesezugriff (kann eigene Lohnabrechnungen sehen)
- **write**: Schreibzugriff (kann Lohnabrechnungen erstellen und bearbeiten)
- **both**: Voller Zugriff (kann Lohnabrechnungen für andere Benutzer verwalten)

Beispiel für die Implementierung der Berechtigungsprüfung:

```typescript
// Im Frontend
const { hasPermission } = usePermissions();

// Prüfen, ob der Benutzer Lohnabrechnungseinstellungen bearbeiten darf
const canEditPayrollSettings = hasPermission('payroll_settings', 'write', 'table');

// Bedingte Anzeige des Bearbeitungsformulars
{canEditPayrollSettings && (
  <PayrollSettingsForm user={user} onSave={handleSaveSettings} />
)}
```

## Integration mit anderen Modulen

Das Lohnabrechnungsmodul ist mit anderen Modulen des Intranets integriert:

### 1. Zeiterfassungsmodul

Die engste Integration besteht mit dem Zeiterfassungsmodul, da die Lohnabrechnung auf den erfassten Arbeitszeiten basiert:

```typescript
// Vereinfachtes Beispiel für den Abruf der Arbeitszeiten
const fetchWorktimesForPayroll = async (userId: number, startDate: string, endDate: string) => {
  try {
    const response = await axiosInstance.get(API_ENDPOINTS.WORKTIME.FOR_PAYROLL, {
      params: { userId, startDate, endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Arbeitszeiten für die Lohnabrechnung:', error);
    throw error;
  }
};
```

### 2. Benutzerverwaltung

Die Lohnabrechnung verwendet Benutzerinformationen und -einstellungen aus dem Benutzerverwaltungsmodul:

```typescript
// Vereinfachtes Beispiel für den Abruf der Benutzereinstellungen
const fetchUserPayrollSettings = async (userId: number) => {
  try {
    const response = await axiosInstance.get(`${API_ENDPOINTS.USERS.SETTINGS}/${userId}/payroll`);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der Lohnabrechnungseinstellungen:', error);
    throw error;
  }
};
```

### 3. Notification-System

Das Lohnabrechnungsmodul sendet Benachrichtigungen über neue oder geänderte Lohnabrechnungen:

```typescript
// Backend-Implementierung (vereinfacht)
async function sendPayrollNotification(payrollId, userId, type) {
  await prisma.notification.create({
    data: {
      userId,
      type,
      message: type === 'PAYROLL_READY' 
        ? 'Ihre Lohnabrechnung ist verfügbar' 
        : 'Ihre Lohnabrechnung wurde aktualisiert',
      isRead: false,
      metadata: {
        payrollId
      }
    }
  });
}
```

---

Das Lohnabrechnungsmodul bietet eine flexible und leistungsstarke Lösung für die Verwaltung von Lohnabrechnungen in einem internationalen Kontext. Durch die Unterstützung verschiedener Länder und gesetzlicher Anforderungen ermöglicht es eine korrekte und effiziente Abrechnung der Mitarbeitergehälter. 