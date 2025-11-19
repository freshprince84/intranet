# Automatische Monatsabrechnungen

Dieses Dokument beschreibt die technische Implementierung der automatischen Erstellung von Monatsabrechnungen zum konfigurierten Stichdatum.

## Überblick

Das System erstellt automatisch Monatsabrechnungen für Berater, die:
1. Die automatische Funktion in ihren Rechnungseinstellungen aktiviert haben
2. Einen gültigen Rechnungsempfänger konfiguriert haben  
3. Deren konfigurierter Stichdatum dem aktuellen Datum entspricht

## Technische Implementierung

### Backend-Service
- **Datei**: `backend/src/services/monthlyReportScheduler.ts`
- **Hauptfunktion**: `checkAndGenerateMonthlyReports()`
- **Ausführung**: Täglich zwischen 9:00-10:00 Uhr alle 10 Minuten

### Integration in App
- **Datei**: `backend/src/index.ts` ⚠️ **WICHTIG:** Server-Code gehört in `index.ts`, NICHT in `app.ts`!
- **Timer**: `setInterval()` mit 10-Minuten-Intervall
- **Sicherheit**: Nur einmal pro Tag ausgeführt

### Ablauf

1. **Tägliche Prüfung (9:00-10:00 Uhr)**
   ```
   System prüft alle Benutzer mit:
   - monthlyReportEnabled = true
   - monthlyReportDay = heute (1-31)
   - monthlyReportRecipient ist gesetzt
   ```

2. **Zeitraumberechnung**
   ```
   Beispiel bei Stichdatum 25:
   - 25. Januar: Zeitraum 25.12. - 24.01.
   - 24. Januar: Kein Bericht (noch nicht fällig)
   ```

3. **Duplikatsprüfung**
   - Prüft, ob bereits ein Bericht für den Zeitraum existiert
   - Verhindert mehrfache Erstellung

4. **Berichterstellung**
   - Nutzt bestehende `generateAutomaticMonthlyReport` Funktion
   - Sammelt alle unbilled consultations im Zeitraum
   - Erstellt PDF-Bericht

5. **Benachrichtigungen**
   - **Erfolg**: "Monatsabrechnung erstellt"
   - **Fehler**: "Fehler bei Monatsabrechnung"

## Konfiguration pro Benutzer

### Rechnungseinstellungen (InvoiceSettings)
```sql
monthlyReportEnabled    BOOLEAN  -- Automatik aktiviert?
monthlyReportDay        INTEGER  -- Stichdatum (1-31)  
monthlyReportRecipient  TEXT     -- E-Mail des Arbeitgebers
```

### Frontend-Konfiguration
- **Seite**: Einstellungen → Rechnungseinstellungen
- **Felder**:
  - ☑️ Automatische Monatsabrechnung aktivieren
  - Stichdatum: [1-31]
  - Empfänger: [E-Mail-Adresse]

## Logging & Monitoring

### Console-Ausgaben
```
Starte automatische Überprüfung für Monatsabrechnungen...
3 Benutzer haben heute (25.) ihre Monatsstichtag-Konfiguration
Verarbeite automatische Monatsabrechnung für Benutzer Max Mustermann (ID: 1)
Bericht für Benutzer 2 existiert bereits (ID: 15)
Automatische Überprüfung für Monatsabrechnungen abgeschlossen.
```

### Fehlerbehandlung
- User-spezifische Fehler werden protokolliert
- System läuft trotz Einzelfehlern weiter
- Fehler-Benachrichtigungen an betroffene Benutzer

## Manuelle Auslösung

### Test-Endpoint
```
POST /api/admin/trigger-monthly-reports
```

**Antwort:**
```json
{
  "message": "Monatsabrechnungsprüfung erfolgreich ausgeführt in 1250ms",
  "processedUsers": 3
}
```

### Via curl
```bash
curl -X POST http://localhost:5000/api/admin/trigger-monthly-reports
```

## Zeitraumberechnung

### Beispiele

**Stichdatum 25, heute 25. Januar:**
- Zeitraum: 25. Dezember - 24. Januar
- Status: Bericht wird erstellt

**Stichdatum 25, heute 24. Januar:**  
- Zeitraum: 25. November - 24. Dezember
- Status: Zu früh, kein Bericht

**Stichdatum 1, heute 1. Februar:**
- Zeitraum: 1. Januar - 31. Januar  
- Status: Bericht wird erstellt

### Code-Logik
```typescript
if (today.getDate() >= reportDay) {
  // Aktueller Monat: vom reportDay des Vormonats bis reportDay-1 
  periodEnd = new Date(year, month, reportDay - 1, 23, 59, 59);
  periodStart = new Date(year, month - 1, reportDay);
} else {
  // Vormonat: vom reportDay des Vor-Vormonats bis reportDay-1 des Vormonats
  periodEnd = new Date(year, month - 1, reportDay - 1, 23, 59, 59);
  periodStart = new Date(year, month - 2, reportDay);
}
```

## Abhängigkeiten

### Erforderliche Services
- ✅ PrismaClient (Datenbankzugriff)
- ✅ generateAutomaticMonthlyReport (Controller)
- ✅ createNotificationIfEnabled (Benachrichtigungen)

### Datenbankfelder
- ✅ InvoiceSettings.monthlyReportEnabled
- ✅ InvoiceSettings.monthlyReportDay  
- ✅ InvoiceSettings.monthlyReportRecipient
- ✅ MonthlyConsultationReport.periodStart/periodEnd

## Deployment-Hinweise

### Nach Server-Neustart
- Service startet automatisch mit der App
- Keine manuelle Konfiguration erforderlich
- Läuft im Hintergrund (Background-Service)

### Performance
- Sehr effizient: Nur Benutzer mit aktivierter Funktion werden geprüft
- Minimaler Server-Load durch 10-Minuten-Intervall
- Einmal-pro-Tag-Logik verhindert Spam

### Monitoring
```bash
# Server-Logs prüfen
tail -f logs/app.log | grep "Monatsabrechnung"

# Manueller Test
curl -X POST localhost:5000/api/admin/trigger-monthly-reports
```

## Troubleshooting

### Problem: Bericht wird nicht erstellt
**Prüfung:**
1. Ist `monthlyReportEnabled = true`?
2. Ist `monthlyReportRecipient` gesetzt?
3. Stimmt das `monthlyReportDay` mit heute überein?
4. Existiert bereits ein Bericht für den Zeitraum?

### Problem: Server läuft nicht
**Lösung:**
```bash
# Service-Status prüfen
pm2 status intranet-backend

# Server-Logs prüfen  
pm2 logs intranet-backend

# Service neu starten
pm2 restart intranet-backend
```

### Problem: Doppelte Berichte
**Ursache:** Duplikatsprüfung funktioniert nicht
**Lösung:** Prüfe `periodStart`-Berechnung in Logs

## Zukunft / Erweiterungen

### Geplant
- [ ] **Cron-Integration**: Echte Cron-Jobs statt setInterval
- [ ] **E-Mail-Versand**: Automatischer PDF-Versand an Empfänger
- [ ] **Retry-Mechanismus**: Wiederholen bei temporären Fehlern
- [ ] **Dashboard**: Admin-Übersicht über automatische Berichte

### Möglich
- [ ] **Kalender-Integration**: Berücksichtigung von Feiertagen
- [ ] **Zeitzone-Support**: Verschiedene Zeitzonen für Benutzer
- [ ] **Batch-Größe**: Beschränkung gleichzeitiger Berichterstellungen 