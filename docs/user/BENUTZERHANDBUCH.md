# BENUTZERHANDBUCH

Dieses Handbuch bietet eine umfassende Anleitung zur Nutzung des Intranet-Systems für alle Benutzer.

## Inhaltsverzeichnis

1. [Erste Schritte](#erste-schritte)
2. [Dashboard](#dashboard)
3. [Zeiterfassung](#zeiterfassung)
4. [Task-Management](#task-management)
5. [Requests](#requests)
6. [Benutzereinstellungen](#benutzereinstellungen)
7. [Cerebro Wiki](#cerebro-wiki)
8. [Dark Mode](#dark-mode)
9. [Benachrichtigungen](#benachrichtigungen)
10. [System-Meldungen](#system-meldungen)
11. [Häufige Fragen](#häufige-fragen)
12. [Profil verwalten](#profil-verwalten)
13. [Dateianhänge](#dateianhänge)
14. [Erweitertes Filtersystem](#erweitertes-filtersystem)
15. [Suchfelder](#suchfelder)

## Erste Schritte

### Login

1. Öffnen Sie die Anwendung in Ihrem Browser
2. Geben Sie Ihren Benutzernamen und Ihr Passwort ein
3. Klicken Sie auf den "Anmelden"-Button

**Standardanmeldedaten (nach Erstinstallation):**
- Benutzername: `admin`
- Passwort: `admin123`

### Navigation

Die Hauptnavigation befindet sich am linken Rand (Desktop) oder am oberen Rand (Mobile) des Bildschirms und bietet Zugriff auf:

- Dashboard
- Zeiterfassung
- Aufgaben
- Requests
- Einstellungen
- Profil
- Cerebro Wiki (falls berechtigt)
- Team-Worktime-Control (falls berechtigt)
- Lohnabrechnung (falls berechtigt)

## Dashboard

Das Dashboard bietet einen Überblick über Ihre wichtigsten Informationen:

### Arbeitszeitstatistik Box

- Zeigt Wochenstatistiken Ihrer Arbeitszeit als interaktives Diagramm
- Vergleicht Ihre aktuelle Arbeitszeit mit dem Soll
- Klicken Sie auf einzelne Tage, um Details anzuzeigen

### Requests Box

- Zeigt Ihre aktuellen Requests und deren Status
- Ermöglicht das Erstellen neuer Requests
- Filtermöglichkeiten nach Status und Datum

## Zeiterfassung

### Zeiterfassung starten

1. Wechseln Sie zum "Worktracker"-Bereich
2. Wählen Sie Ihre aktuelle Niederlassung aus dem Dropdown-Menü
3. Geben Sie optional einen Kommentar ein
4. Klicken Sie auf den Start-Button

### Zeiterfassung beenden

1. Klicken Sie auf den Stop-Button in der aktiven Zeiterfassungsbox
2. Geben Sie optional einen Kommentar ein
3. Bestätigen Sie die Beendigung

### Arbeitszeiten einsehen

- In der Zeiterfassungs-Box werden Ihre heutigen Zeiteinträge angezeigt
- Für ältere Einträge nutzen Sie die Kalenderauswahl
- Die wöchentliche und monatliche Übersicht finden Sie im Statistik-Bereich

## Task-Management

### To Do's Box

- Zeigt Ihre aktuellen Aufgaben und deren Status
- Ermöglicht das Erstellen neuer Aufgaben
- Aufgaben können nach Priorität und Status gefiltert werden

### Aufgaben verwalten

1. Klicken Sie auf eine Aufgabe, um Details anzuzeigen
2. Ändern Sie den Status über die Dropdown-Auswahl
3. Fügen Sie Kommentare oder Anhänge hinzu
4. Speichern Sie Ihre Änderungen

## Requests

Requests sind Anfragen, die von anderen Benutzern bearbeitet werden müssen.

### Request erstellen

1. Navigieren Sie zur "Requests"-Box
2. Klicken Sie auf "Neuen Request erstellen"
3. Füllen Sie das Formular aus (Titel, Beschreibung, Priorität)
4. Wählen Sie einen Verantwortlichen oder eine Abteilung aus
5. Klicken Sie auf "Erstellen"

### Request-Status verfolgen

- Offene Requests werden in der "Requests"-Box angezeigt
- Statusänderungen werden Ihnen per Benachrichtigung mitgeteilt
- Details sehen Sie durch Klick auf den Request-Titel

## Erweitertes Filtersystem

Das System bietet ein leistungsstarkes Filtersystem für verschiedene Tabellen, mit dem Sie komplexe Suchabfragen erstellen, speichern und wiederverwenden können.

### Verfügbare Filter-Tabellen

Das erweiterte Filtersystem ist für folgende Tabellen verfügbar:
- Requests-Tabelle (Dashboard)
- Workcenter-Tabelle (Team-Worktime-Control)
- Rollen-Tabelle (UserManagement)

### Filter erstellen und anwenden

1. Klicken Sie in der entsprechenden Tabelle auf den Filter-Button (Trichter-Symbol)
2. Im erscheinenden Filter-Panel können Sie mehrere Filterbedingungen definieren:
   - Wählen Sie die Spalte aus, nach der gefiltert werden soll
   - Wählen Sie einen Operator (z.B. "enthält", "ist gleich", "beginnt mit")
   - Geben Sie den Filterwert ein
3. Fügen Sie weitere Bedingungen hinzu, indem Sie auf das "+" Symbol klicken
4. Wählen Sie für mehrere Bedingungen die logische Verknüpfung "UND" oder "ODER"
5. Klicken Sie auf "Filter anwenden", um die Tabelle zu filtern

### Filter speichern

1. Nachdem Sie Ihre Filterbedingungen definiert haben, geben Sie dem Filter einen Namen
2. Klicken Sie auf "Filter speichern"
3. Der gespeicherte Filter erscheint nun als Tag über der Tabelle

### Gespeicherte Filter verwenden

- Klicken Sie auf einen Filter-Tag, um diesen Filter sofort anzuwenden
- Die aktiven Filter-Tags werden farblich hervorgehoben
- Sie können zwischen verschiedenen gespeicherten Filtern wechseln
- Klicken Sie auf "Filter zurücksetzen", um alle Filter zu entfernen

### Standardfilter

Jede Tabelle verfügt über nicht löschbare Standardfilter:

- **Requests-Tabelle**:
  - "Aktuell": Zeigt alle nicht archivierten Requests
  - "Archiv": Zeigt archivierte Requests

- **Workcenter-Tabelle**:
  - "Aktive": Zeigt nur Benutzer mit aktiver Zeiterfassung
  - "Alle": Zeigt alle Benutzer

- **Rollen-Tabelle**:
  - "Alle": Zeigt alle Rollen

### Filter löschen

1. Fahren Sie mit der Maus über einen selbst erstellten Filter-Tag
2. Klicken Sie auf das "X"-Symbol, um den Filter zu löschen
3. Beachten Sie, dass Standardfilter nicht gelöscht werden können

## Suchfelder

Das System verfügt über einheitliche Suchfelder, die in allen Bereichen konsistent gestaltet sind und so die Benutzerfreundlichkeit erhöhen.

### Funktionen der Suchfelder

- **Sofortsuche**: Die Suche wird bei jeder Eingabe automatisch aktualisiert
- **Globale Suche**: Durchsucht mehrere relevante Felder gleichzeitig (z.B. Titel, Beschreibung, Name)
- **Einheitliches Design**: Alle Suchfelder haben dasselbe Erscheinungsbild im gesamten System
- **Dark-Mode-Unterstützung**: Optimale Lesbarkeit auch im Dunkelmodus

### Verwendung der Suchfelder

1. Klicken Sie in das Suchfeld der jeweiligen Komponente (Requests, To Do's, Workcenter, usw.)
2. Geben Sie Ihren Suchbegriff ein
3. Die Ergebnisse werden sofort gefiltert und angezeigt
4. Löschen Sie den Suchtext, um zur vollständigen Ansicht zurückzukehren

### Tipps zur Suche

- Sie können nach Teilen von Wörtern suchen (z.B. "mark" findet "Marketing")
- Bei einigen Komponenten werden mehrere Felder gleichzeitig durchsucht:
  - **In Requests**: Titel, Beschreibung, Verantwortlicher, Ersteller
  - **In To Do's**: Titel, Beschreibung, Verantwortlicher, Qualitätskontrolle
  - **In Workcenter**: Name, Benutzername, Niederlassung
  - **In Rollen**: Name, Beschreibung, Berechtigungen
  - **In Cerebro**: Titel, Inhalt, Tags

## Benutzereinstellungen

### Profil bearbeiten

1. Klicken Sie auf Ihren Benutzernamen in der oberen rechten Ecke
2. Wählen Sie "Profil bearbeiten"
3. Aktualisieren Sie Ihre Informationen
4. Speichern Sie die Änderungen

### Benachrichtigungseinstellungen

1. Klicken Sie auf Ihr Profil in der oberen rechten Ecke
2. Wählen Sie "Einstellungen"
3. Gehen Sie zum Reiter "Benachrichtigungen"
4. Aktivieren oder deaktivieren Sie einzelne Benachrichtigungstypen
5. Speichern Sie Ihre Änderungen

## Cerebro Wiki

Das Cerebro Wiki ist ein internes Wissensmanagementsystem.

### Artikel durchsuchen

1. Navigieren Sie zum "Cerebro"-Bereich
2. Nutzen Sie die Suchfunktion oder die Kategorienavigation
3. Klicken Sie auf einen Artikeltitel, um ihn zu lesen

### Artikel erstellen (mit entsprechenden Rechten)

1. Klicken Sie auf "Neuer Artikel"
2. Wählen Sie eine Kategorie
3. Geben Sie Titel und Inhalt ein
4. Fügen Sie optional Medien hinzu
5. Klicken Sie auf "Veröffentlichen"

## Dark Mode

Das System bietet einen Dark Mode für angenehmeres Arbeiten bei wenig Umgebungslicht.

### Dark Mode aktivieren

1. Klicken Sie auf Ihr Profil in der oberen rechten Ecke
2. Wählen Sie "Einstellungen"
3. Gehen Sie zum Reiter "Darstellung"
4. Wählen Sie zwischen:
   - Systemmodus (folgt Ihren Betriebssystemeinstellungen)
   - Hell
   - Dunkel
5. Speichern Sie Ihre Auswahl

## Benachrichtigungen

Das System informiert Sie über wichtige Ereignisse.

### Benachrichtigungen anzeigen

1. Klicken Sie auf das Glockensymbol in der oberen rechten Ecke
2. Eine Liste Ihrer Benachrichtigungen wird angezeigt
3. Ungelesene Benachrichtigungen sind markiert
4. Klicken Sie auf eine Benachrichtigung, um zum entsprechenden Bereich zu gelangen

### Benachrichtigungstypen

Das System sendet Benachrichtigungen für:
- Task-Änderungen (Erstellung, Updates, Statusänderungen)
- Request-Änderungen (Erstellung, Updates, Statusänderungen)
- Benutzerverwaltung (wenn Sie betroffen sind)
- Zeiterfassung (Start/Stop)

## System-Meldungen

Das System zeigt wichtige Meldungen in der Kopfzeile an, um Sie über Aktionen und deren Ergebnisse zu informieren.

### Arten von Meldungen

Das System verwendet verschiedene Arten von Meldungen:
- **Erfolg** (grün): Bestätigung, dass eine Aktion erfolgreich abgeschlossen wurde
- **Fehler** (rot): Information über ein Problem oder einen Fehler
- **Warnung** (gelb): Hinweis auf potenzielle Probleme oder erforderliche Aufmerksamkeit
- **Info** (blau): Allgemeine Informationen und Hinweise

### Verhalten der Meldungen

- Meldungen erscheinen im oberen Bereich zwischen dem Logo und den Bedienungselementen
- Meldungen verschwinden automatisch nach 3 Sekunden
- Zu einem Zeitpunkt wird immer nur eine Meldung angezeigt
- Bei mehreren aufeinanderfolgenden Aktionen wird jeweils die neueste Meldung angezeigt

![Beispiel für eine Erfolgsmeldung](assets/images/success-message.png)

## Häufige Fragen

### Ich kann meine Arbeitszeit nicht starten

Prüfen Sie, ob:
- Sie eine Niederlassung ausgewählt haben
- Sie nicht bereits eine aktive Zeiterfassung haben
- Ihre Berechtigungen korrekt eingestellt sind

### Ich finde einen Cerebro-Artikel nicht mehr

Nutzen Sie die erweiterte Suche im Cerebro-Bereich:
1. Klicken Sie auf "Erweiterte Suche"
2. Filtern Sie nach Erstellungsdatum, Autor oder Stichworten
3. Nutzen Sie die Kategorie-Navigation auf der linken Seite

### Ich sehe bestimmte Bereiche nicht

Der Zugriff auf bestimmte Funktionen hängt von Ihren Berechtigungen ab:
1. Team-Worktime-Control ist nur für Teamleiter und Administratoren sichtbar
2. Lohnabrechnung ist nur für die Finanzabteilung und Administratoren zugänglich
3. Manche Cerebro-Kategorien können eingeschränkten Zugriff haben

Wenden Sie sich an Ihren Administrator, wenn Sie Zugriff auf bestimmte Bereiche benötigen.

## Profil verwalten

### Ausweisdokumente verwalten

In Ihrem Benutzerprofil können Sie Ausweisdokumente hinzufügen, bearbeiten und verwalten.

#### Dokument hinzufügen

1. Navigieren Sie zu **Profil** → Tab **Dokumente**
2. Klicken Sie auf **Neues Dokument hinzufügen**
3. Füllen Sie das Formular mit den Dokumentinformationen aus:
   - Dokumenttyp (Reisepass, Personalausweis, etc.)
   - Dokumentnummer
   - Ausstellungsland
   - Ausstellungsbehörde (optional)
   - Ausstellungsdatum (optional)
   - Ablaufdatum (optional)
4. Laden Sie eine Kopie des Dokuments hoch durch:
   - **Datei hochladen**: Wählen Sie eine PDF- oder Bilddatei von Ihrem Gerät
   - **Foto aufnehmen** (auf mobilen Geräten): Nehmen Sie ein Foto mit der Gerätekamera auf

#### Automatische Dokumentenerkennung

Das System bietet eine KI-basierte Erkennung, die Informationen automatisch aus Dokumentbildern extrahieren kann:

1. Laden Sie zuerst ein Bild hoch oder nehmen Sie ein Foto auf
2. Klicken Sie auf den Button **Daten automatisch erkennen**
3. Die KI analysiert das Dokument und befüllt die Formularfelder
4. Überprüfen Sie die erkannten Daten und korrigieren Sie sie bei Bedarf
5. Speichern Sie das Dokument mit **Speichern**

#### Dokumente verwalten

Auf der Dokumentenliste können Sie:

- Alle Ihre Dokumente einsehen
- Den Verifizierungsstatus prüfen (verifiziert/nicht verifiziert)
- Dokumente bearbeiten
- Dokumente löschen
- Dokumentenkopien herunterladen

#### Hinweise zur Dokumentverifizierung

- Neu hinzugefügte Dokumente haben den Status "Nicht verifiziert"
- Ein Administrator muss die Dokumente überprüfen und verifizieren
- Verifizierte Dokumente werden mit einem grünen Häkchen gekennzeichnet
- Bei Fragen zur Verifizierung wenden Sie sich bitte an Ihren Administrator

#### Tipps für bessere Erkennung

Für eine optimale automatische Erkennung:

- Sorgen Sie für gute Beleuchtung
- Vermeiden Sie Blendeffekte und Schatten
- Erfassen Sie das gesamte Dokument im Bild
- Stellen Sie sicher, dass alle wichtigen Informationen lesbar sind

## Dateianhänge

Das Intranet-System ermöglicht das Anhängen von Dateien an Tasks und Requests, was die Dokumentation und Zusammenarbeit erheblich verbessert.

### Dateien an Tasks oder Requests anhängen

Es gibt drei Möglichkeiten, Dateien anzuhängen:

1. **Drag & Drop**:
   - Öffnen Sie das Bearbeitungsfenster für einen Task oder Request
   - Ziehen Sie eine Datei direkt in das Beschreibungsfeld
   - Die Datei wird hochgeladen und als Link in der Beschreibung eingefügt

2. **Copy & Paste**:
   - Kopieren Sie ein Bild in die Zwischenablage (z.B. mit Screenshot-Tool)
   - Klicken Sie in das Beschreibungsfeld des Tasks oder Requests
   - Fügen Sie das Bild mit Strg+V (Windows) oder Cmd+V (Mac) ein
   - Das Bild wird automatisch hochgeladen und als Vorschau eingefügt

3. **Manueller Upload**:
   - Klicken Sie auf "Datei hinzufügen" unterhalb des Beschreibungsfelds
   - Wählen Sie eine Datei aus dem Datei-Dialog
   - Die Datei wird hochgeladen und in der Anhangsliste angezeigt

### Anhänge verwalten

- Alle hochgeladenen Anhänge erscheinen in der Liste unter dem Beschreibungsfeld
- Klicken Sie auf "Herunterladen", um einen Anhang herunterzuladen
- Klicken Sie auf "Entfernen", um einen Anhang zu löschen (nur verfügbar, wenn Sie die Berechtigung haben)

### Hinweise

- Bilder werden automatisch als Vorschau in der Beschreibung angezeigt
- Andere Dateitypen werden als Links eingefügt
- Bei der Erstellung eines Tasks aus einem genehmigten Request werden alle Anhänge automatisch übernommen
- Es gibt keine Beschränkung für die Anzahl der Anhänge, aber beachten Sie die Dateigröße für eine optimale Leistung 