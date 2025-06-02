# MODUL ABRECHNUNG

Dieses Dokument beschreibt das Abrechnungsmodul mit den drei Hauptbereichen: Beratungsrechnungen, Monatsabrechnungen und Lohnabrechnungen.

## Überblick

Das Abrechnungsmodul wurde umstrukturiert und besteht aus drei aufeinander aufbauenden Bereichen:

1. **Beratungsrechnungen** - Einzelabrechnung von Beratungen an Kunden
2. **Monatsabrechnungen** - Gesammelte Abrechnung aller Beratungen eines Monats an Arbeitgeber
3. **Lohnabrechnungen** - Wird zukünftig auf Basis der Monatsabrechnungen erstellt

## Tab-Reihenfolge

Die Tabs sind bewusst in dieser Reihenfolge angeordnet:

1. **Beratungsrechnungen** (Standard-Tab)
2. **Monatsabrechnungen** 
3. **Lohnabrechnungen** (als letzter Tab, nur bei entsprechender Lizenz/Berechtigung)

## 1. Beratungsrechnungen

**Zweck**: Einzelne Beratungen oder Gruppen von Beratungen direkt an Kunden abrechnen

**Workflow**:
- Beratungen auswählen (mit Filtern)
- Rechnung erstellen mit Stundensatz
- PDF generieren und versenden
- Zahlungsstatusverförgung

**Implementierung**: 
- Siehe `CONSULTATION_INVOICE_IMPLEMENTATION.md`
- Controller: `consultationInvoiceController.ts`
- Frontend: `InvoiceManagementTab.tsx`

## 2. Monatsabrechnungen

**Zweck**: Alle Beratungen eines Monats gesammelt an einen Arbeitgeber abrechnen

**Workflow**:
- Automatische oder manuelle Generierung
- Alle nicht-abgerechneten Beratungen des Zeitraums
- Gruppierung nach Clients mit Stundensummen
- PDF-Generierung für Arbeitgeber

**Besonderheiten**:
- Verhindert Doppel-Billing durch Prüfung existierender Monatsberichte
- Berücksichtigt sowohl einzelne Rechnungen als auch bereits abgerechnete Zeiträume
- Konfigurierbare Abrechnungstage (z.B. 15. des Monats)

**Implementierung**: 
- Siehe `MONTHLY_CONSULTATION_REPORT_IMPLEMENTATION.md`
- Controller: `monthlyConsultationReportController.ts`
- Frontend: `MonthlyReportsTab.tsx`

## 3. Lohnabrechnungen (Zukünftige Implementierung)

**Aktueller Status**: Mock-Implementation mit Hinweis

**Geplantes Konzept**:
- Übernimmt Daten aus Monatsabrechnungen (nur Stunden, keine Geldbeträge)
- Berechnet daraus Lohnabrechnungen mit konfigurierbaren Stundensätzen
- Berücksichtigt verschiedene Stundentypen (Normal, Überstunden, etc.)
- Steuer- und Sozialversicherungsberechnung je nach Land/Konfiguration

**Warum als letzter Tab**:
- Builds on top of Monatsabrechnungen
- Erfordert spezielle Lizenzen/Berechtigungen
- Komplexere Logik die später implementiert wird

## Datenfluss

```
Beratungen (WorkTime) 
    ↓
├─ Einzelrechnung (ConsultationInvoice) → PDF an Kunde
│
└─ Monatsabrechnung (MonthlyConsultationReport) → PDF an Arbeitgeber
    ↓
    Lohnabrechnung (Payroll) → PDF an Mitarbeiter [ZUKÜNFTIG]
```

## Anti-Doppel-Billing Logik

Das System verhindert doppelte Abrechnung durch:

1. **ConsultationInvoiceItem**: Markiert WorkTime-Einträge als individual abgerechnet
2. **MonthlyReport Zeiträume**: Prüft ob WorkTime bereits in einem Monatsbericht enthalten
3. **Kombinierte Prüfung**: `checkUnbilledConsultations` berücksichtigt beide Mechanismen

```typescript
// Beispiel der Anti-Doppel-Billing Logik
const whereClause = {
  userId,
  clientId: { not: null },
  endTime: { not: null },
  AND: [
    // Nicht einzeln abgerechnet
    { invoiceItems: { none: {} } },
    // Nicht in Monthly Report abgerechnet
    ...existingReports.map(report => ({
      NOT: {
        startTime: {
          gte: report.periodStart,
          lte: report.periodEnd
        }
      }
    }))
  ]
};
```

## Berechtigungen

- `consultations_view` - Beratungsrechnungen anzeigen
- `consultations_create` - Rechnungen erstellen
- `monthly_reports_view` - Monatsabrechnungen anzeigen  
- `monthly_reports_create` - Monatsberichte erstellen
- `payroll_view` - Lohnabrechnungen anzeigen (zukünftig)
- `payroll_create` - Lohnabrechnungen erstellen (zukünftig)

## API Endpoints

### Beratungsrechnungen
- `POST /api/consultation-invoices/create-from-consultations`
- `GET /api/consultation-invoices`
- `PUT /api/consultation-invoices/:id/status`

### Monatsabrechnungen  
- `POST /api/monthly-consultation-reports/generate`
- `POST /api/monthly-consultation-reports/generate-automatic` 
- `GET /api/monthly-consultation-reports`
- `GET /api/monthly-consultation-reports/check-unbilled`

### Lohnabrechnungen (zukünftig)
- `POST /api/payroll/generate-from-monthly-report`
- `GET /api/payroll`

## Testing

Beim Testen die Reihenfolge beachten:

1. Erstelle Beratungen (WorkTime mit clientId)
2. Teste Einzelrechnungen  
3. Teste Monatsabrechnungen
4. Verifiziere Anti-Doppel-Billing
5. Lohnabrechnung zeigt Mock-Daten mit Hinweis 