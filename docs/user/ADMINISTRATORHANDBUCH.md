# ADMINISTRATORHANDBUCH

Dieses Handbuch bietet eine umfassende Anleitung zur Administration und Konfiguration des Intranet-Systems.

## Inhaltsverzeichnis

1. [Systemadministration](#systemadministration)
2. [Benutzerverwaltung](#benutzerverwaltung)
3. [Rollenverwaltung](#rollenverwaltung)
4. [Berechtigungssystem](#berechtigungssystem)
5. [Systemeinstellungen](#systemeinstellungen)
6. [Team-Worktime-Control](#team-worktime-control)
7. [Lohnabrechnung](#lohnabrechnung)
8. [Cerebro Wiki-Administration](#cerebro-wiki-administration)
9. [Datenbank-Management](#datenbank-management)
10. [Backup und Wiederherstellung](#backup-und-wiederherstellung)
11. [Systemaktualisierungen](#systemaktualisierungen)
12. [Fehlerbehebung](#fehlerbehebung)

## Systemadministration

### Admin-Zugang

Verwenden Sie für den ersten Zugang die folgenden Anmeldedaten:
- Benutzername: `admin`
- Passwort: `admin123`

**WICHTIG:** Ändern Sie das Standard-Passwort sofort nach der ersten Anmeldung.

### Admin-Dashboard

Das Admin-Dashboard bietet:
- Systemstatus-Übersicht
- Benutzeraktivitätsstatistiken
- Schnellzugriff auf administrative Funktionen
- Systembenachrichtigungen

## Benutzerverwaltung

### Benutzer anlegen

1. Navigieren Sie zur UserManagement Box
2. Klicken Sie auf "Neuen Benutzer erstellen"
3. Füllen Sie das Formular mit den erforderlichen Daten aus:
   - Benutzername (eindeutig)
   - Vor- und Nachname
   - E-Mail-Adresse
   - Initiales Passwort
   - Zugewiesene Rollen
   - Niederlassungszugehörigkeit
4. Klicken Sie auf "Speichern"

### Benutzer bearbeiten

1. Suchen Sie den Benutzer in der Benutzerliste
2. Klicken Sie auf das Bearbeiten-Symbol
3. Ändern Sie die gewünschten Informationen
4. Klicken Sie auf "Speichern"

### Benutzer deaktivieren/löschen

**Deaktivieren (empfohlen):**
1. Suchen Sie den Benutzer in der Benutzerliste
2. Klicken Sie auf das Bearbeiten-Symbol
3. Setzen Sie den Status auf "Inaktiv"
4. Klicken Sie auf "Speichern"

**Löschen (nur wenn unbedingt erforderlich):**
1. Suchen Sie den Benutzer in der Benutzerliste
2. Klicken Sie auf das Löschen-Symbol
3. Bestätigen Sie die Löschung

**WICHTIG:** Das Löschen eines Benutzers entfernt alle seine Daten aus dem System, einschließlich Arbeitszeiten und Tasks. Bevorzugen Sie die Deaktivierung.

### Passwort zurücksetzen

1. Suchen Sie den Benutzer in der Benutzerliste
2. Klicken Sie auf "Passwort zurücksetzen"
3. Geben Sie ein neues temporäres Passwort ein oder lassen Sie das System eines generieren
4. Klicken Sie auf "Zurücksetzen"
5. Teilen Sie dem Benutzer das neue Passwort mit

### Ausweisdokumente verwalten und verifizieren

Als Administrator sind Sie für die Überprüfung und Verifizierung von Benutzerausweisdokumenten verantwortlich.

#### Zugriff auf Ausweisdokumente

1. Navigieren Sie zu **Benutzerverwaltung**
2. Wählen Sie einen Benutzer aus
3. Öffnen Sie den Tab **Dokumente**

#### Dokumente überprüfen und verifizieren

1. Sehen Sie sich das Dokument an, indem Sie auf **Herunterladen** klicken
2. Prüfen Sie die Dokumentdetails auf Richtigkeit:
   - Dokumenttyp
   - Dokumentnummer
   - Ausstellungsland
   - Ausstellungsdatum und Ablaufdatum
   - Ausstellungsbehörde
3. Wenn alle Informationen korrekt sind, klicken Sie auf **Verifizieren**
4. Das Dokument erhält den Status "Verifiziert" mit Ihrem Benutzernamen und dem Verifizierungsdatum

#### Nicht korrekte Dokumente

Wenn ein Dokument nicht korrekt oder verdächtig erscheint:

1. Lassen Sie es im Status "Nicht verifiziert"
2. Kontaktieren Sie den Benutzer über das System oder direkt
3. Bitten Sie um Korrektur der Informationen oder ein besseres Dokumentbild
4. Dokumentieren Sie Ihre Bedenken in einer internen Notiz

#### Bulk-Aktionen für Dokumente

Für die effiziente Verwaltung mehrerer Dokumente:

1. Navigieren Sie zu **Benutzerverwaltung** → **Dokumente**
2. Verwenden Sie die Filter, um nicht verifizierte Dokumente anzuzeigen
3. Überprüfen Sie die Dokumente einzeln
4. Verwenden Sie die Checkbox-Auswahl für Massenverwaltung

#### Sicherheitshinweise

- Überprüfen Sie immer, ob die Dokumentdaten mit dem tatsächlichen Bild übereinstimmen
- Achten Sie auf Ablaufdaten und die Gültigkeit der Dokumente
- Bei verdächtigen Dokumenten konsultieren Sie die entsprechenden Behörden
- Stellen Sie sicher, dass Sie die gesetzlichen Anforderungen für die Identitätsverifizierung kennen

#### Datenschutz

Als Administrator haben Sie Zugriff auf sensible personenbezogene Daten:

- Behandeln Sie alle Dokumentinformationen streng vertraulich
- Laden Sie Dokumente nur herunter, wenn es für die Verifizierung notwendig ist
- Löschen Sie heruntergeladene Kopien nach der Verifizierung
- Dokumentieren Sie alle Verifizierungsaktionen für Audit-Zwecke

## Rollenverwaltung

### Standardrollen

Das System enthält folgende vordefinierte Rollen:
- **Administrator**: Vollzugriff auf alle Systembereiche
- **Manager**: Zugriff auf Team-Worktime-Control und Berichterstellung
- **HR**: Zugriff auf Personalverwaltung und Lohnabrechnung
- **Mitarbeiter**: Basiszugriff auf eigene Zeiterfassung und Tasks

### Rolle erstellen

1. Navigieren Sie zu "Rollenverwaltung"
2. Klicken Sie auf "Neue Rolle erstellen"
3. Geben Sie einen Namen und eine Beschreibung ein
4. Weisen Sie Berechtigungen zu (siehe [Berechtigungssystem](#berechtigungssystem))
5. Klicken Sie auf "Speichern"

### Rolle bearbeiten

1. Suchen Sie die Rolle in der Rollenliste
2. Klicken Sie auf das Bearbeiten-Symbol
3. Ändern Sie Name, Beschreibung oder Berechtigungen
4. Klicken Sie auf "Speichern"

## Berechtigungssystem

Das System verwendet ein granulares Berechtigungssystem mit drei Komponenten:

1. **EntityType**: Definiert die Art des Objekts (z.B. 'page', 'table')
2. **EntityName**: Name des spezifischen Objekts (z.B. 'team_worktime', 'user_management')
3. **AccessLevel**: Zugriffsebene ('read', 'write', 'both')

### Berechtigungen zuweisen

Jede Rolle hat spezifische Berechtigungszuweisungen:

```
{entityType: 'page', entityName: 'team_worktime', accessLevel: 'both'}
```

Dies würde vollen Zugriff auf die Team-Worktime-Control-Seite gewähren.

### Wichtige Berechtigungen

- **worktime** (entityType: 'page'): Zugriff auf die Zeiterfassungsseite
- **worktime_edit** (entityType: 'table'): Berechtigung zum Bearbeiten von Zeiteinträgen
- **team_worktime** (entityType: 'page'): Zugriff auf die Team-Zeiterfassungsseite
- **user_management** (entityType: 'page'): Zugriff auf die Benutzerverwaltung
- **role_management** (entityType: 'page'): Zugriff auf die Rollenverwaltung
- **cerebro_admin** (entityType: 'page'): Zugriff auf die Cerebro-Wiki-Administration

## Systemeinstellungen

### Allgemeine Einstellungen

1. Navigieren Sie zu "Systemeinstellungen"
2. Im Reiter "Allgemein" können Sie konfigurieren:
   - Systemname
   - Logo und Farbschema
   - Standard-Sprache
   - Zeitzoneneinstellungen (wichtig für Zeiterfassung)
   - Session-Timeout

### Benachrichtigungseinstellungen

1. Wechseln Sie zum Reiter "Benachrichtigungen"
2. Konfigurieren Sie:
   - Standardmäßig aktivierte Benachrichtigungen
   - E-Mail-Benachrichtigungen (wenn aktiviert)
   - Benachrichtigungsfrequenz

### API-Konfiguration

Die API-URL wird dynamisch basierend auf dem aktuellen Hostname generiert:

```javascript
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? window.location.hostname === 'localhost'
    ? 'http://localhost:5000'  // Lokale Entwicklung auf localhost
    : `http://${window.location.hostname}:5000`  // Entwicklung über IP
  : 'http://localhost:5000';   // Produktionsumgebung
```

## Team-Worktime-Control

### Überwachung der Teamarbeitszeiten

Als Administrator oder Manager können Sie:

1. Die aktuell aktiven Zeiterfassungen aller Teammitglieder sehen
2. Arbeitszeiten für Teammitglieder beenden
3. Arbeitszeiten für Teammitglieder bearbeiten

### Arbeitszeit für Teammitglied beenden

1. Navigieren Sie zur "Workcenter Box"
2. Finden Sie den Benutzer in der Liste aktiver Zeiterfassungen
3. Klicken Sie auf den "Stoppen"-Button
4. Bestätigen Sie die Aktion

### Arbeitszeiten für Teammitglied bearbeiten

1. Navigieren Sie zur "Workcenter Box"
2. Klicken Sie auf den "Bearbeiten"-Button neben dem Benutzernamen
3. Wählen Sie das Datum, für das Sie Arbeitszeiten bearbeiten möchten
4. Bearbeiten, fügen Sie hinzu oder löschen Sie Zeiteinträge
5. Klicken Sie auf "Speichern"

**WICHTIG:** Beachten Sie die korrekte Zeitzonenbehandlung bei der Bearbeitung von Arbeitszeiten. Das System verwendet lokale Zeiten ohne Zeitzonenumrechnungen.

## Lohnabrechnung

### Lohnabrechnung generieren

1. Navigieren Sie zur "Lohnabrechnung Box"
2. Wählen Sie den Abrechnungszeitraum
3. Wählen Sie die Mitarbeiter oder Abteilungen aus
4. Klicken Sie auf "Abrechnung generieren"
5. Überprüfen Sie die generierten Abrechnungen
6. Exportieren Sie die Abrechnungen bei Bedarf

### Lohnkonfiguration

1. Navigieren Sie zu "Lohneinstellungen"
2. Konfigurieren Sie Stundensätze, Steuerinformationen und andere lohnrelevante Parameter
3. Speichern Sie die Änderungen

## Cerebro Wiki-Administration

### Kategorien verwalten

1. Navigieren Sie zur Cerebro-Administration
2. Wählen Sie "Kategorien verwalten"
3. Erstellen, bearbeiten oder löschen Sie Kategorien
4. Konfigurieren Sie Berechtigungen für Kategorien

### Artikel moderieren

1. Navigieren Sie zur Liste der neuesten Artikel
2. Überprüfen Sie neue oder bearbeitete Artikel
3. Bestätigen oder lehnen Sie Änderungen ab
4. Markieren Sie bei Bedarf Artikel als "Wichtig" oder "Hervorgehoben"

## Datenbank-Management

### Prisma Studio

Prisma Studio läuft auf Port 5555 und bietet eine grafische Oberfläche für die Datenbankverwaltung.

**WICHTIG:** Starten Sie Prisma Studio niemals selbst neu. Falls erforderlich, bitten Sie den Systemadministrator um einen Neustart.

### Datenbankschema

Das Datenbankschema wird mit Prisma ORM verwaltet und befindet sich in `backend/prisma/schema.prisma`.

## Backup und Wiederherstellung

### Regelmäßige Backups

Das System sollte regelmäßig gesichert werden:

1. Datenbank-Backup: Verwenden Sie die PostgreSQL-Backup-Funktionen
2. Datei-Backup: Sichern Sie alle hochgeladenen Dateien und Medien
3. Konfigurationsbackup: Sichern Sie die .env-Dateien und andere Konfigurationen

### Wiederherstellung

Im Falle eines Systemausfalls:

1. Stellen Sie die Datenbank aus dem letzten Backup wieder her
2. Stellen Sie die Dateien und Konfigurationen wieder her
3. Starten Sie den Server neu

## Systemaktualisierungen

### Server-Updates

Für Server-Updates:

1. Benachrichtigen Sie alle Benutzer über die bevorstehende Wartung
2. Führen Sie ein vollständiges Backup durch
3. Folgen Sie den Anweisungen in SERVER_UPDATE.md
4. Testen Sie das System nach dem Update

### Frontend-Updates

Für Frontend-Updates:

1. Stellen Sie sicher, dass die neue Version alle erforderlichen Abhängigkeiten enthält
2. Führen Sie npm run build aus, um die neuen Dateien zu erstellen
3. Testen Sie die Benutzeroberfläche auf Kompatibilität

## Fehlerbehebung

### Bekannte Probleme und Lösungen

#### Zeitzonenprobleme in der Zeiterfassung

**Problem:** Falsche Zeitstempel bei der Zeiterfassung.

**Lösung:** 
1. Stellen Sie sicher, dass die Systemzeit des Servers korrekt eingestellt ist
2. Überprüfen Sie, ob die Zeitzoneneinstellungen in der .env-Datei korrekt sind
3. Beachten Sie die Hinweise in MODUL_ZEITERFASSUNG.md zur korrekten Zeitzonenbehandlung

#### 500-Fehler in Cerebro-API-Aufrufen

**Lösungen:**
1. Stellen Sie sicher, dass die Tabelle `CerebroCarticle` in der Datenbank existiert
2. Überprüfen Sie, ob alle Controller-Methoden auf Prisma ORM umgestellt wurden
3. Stellen Sie sicher, dass API-Pfade zwischen Frontend und Backend konsistent sind
4. Nach Änderungen im Controller muss der Server neu gestartet werden

### Serverlogs

Die Serverlogs finden Sie in:
- Entwicklung: In der Konsolenausgabe des Servers
- Produktion: In den konfigurierten Log-Dateien (abhängig von der Serverkonfiguration)

### Support kontaktieren

Bei Problemen, die Sie nicht selbst lösen können:
1. Sammeln Sie relevante Logs und Fehlermeldungen
2. Beschreiben Sie die Schritte zur Reproduktion des Problems
3. Kontaktieren Sie den Support mit diesen Informationen 