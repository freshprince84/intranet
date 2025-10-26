# Filter-Funktionalität Standardisierung - Finaler Implementierungsplan

## Übersicht
Systematische Standardisierung der Filterfunktionalität im Intranet-Projekt, seitenbasiert und tabellenorientiert.

## Kritische Warnungen ⚠️
- **TableID-Änderungen**: Änderungen an TableIDs können gespeicherte Filter beeinträchtigen
- **Server-Neustart**: Nur nach expliziter Genehmigung durch Benutzer
- **Backup**: Vor jeder Änderung Datenbank-Backup erstellen

## Implementierungsreihenfolge

### 1. DASHBOARD SEITE
**Datei**: `frontend/src/pages/Dashboard.tsx`

#### 1.1 RoleManagementTab
**Datei**: `frontend/src/components/RoleManagementTab.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert
- [ ] Spalten definiert: `id`, `name`, `description`, `permissions`, `createdAt`, `updatedAt`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`
- [ ] Standardfilter definiert: "Alle Rollen" (kein Filter)
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. FilterPane-Props korrigieren (falls nötig)
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

#### 1.2 ActiveUsersList
**Datei**: `frontend/src/components/teamWorktime/ActiveUsersList.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert
- [ ] Spalten definiert: `id`, `username`, `firstName`, `lastName`, `email`, `role`, `status`, `lastActive`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`
- [ ] Standardfilter definiert: "Aktive Benutzer" (status = 'active')
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. FilterPane-Integration prüfen
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

---

### 2. WORKTRACKER SEITE
**Datei**: `frontend/src/pages/Worktracker.tsx`

#### 2.1 Worktracker-Haupttabelle
**Datei**: `frontend/src/components/Worktracker.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert
- [ ] Spalten definiert: `id`, `userId`, `startTime`, `endTime`, `duration`, `description`, `status`, `createdAt`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`, `greaterThan`, `lessThan`, `between`
- [ ] Standardfilter definiert: "Heute" (startTime = heute)
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. FilterPane-Integration prüfen
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

---

### 3. BERATUNGEN SEITE
**Datei**: `frontend/src/pages/Consultations.tsx`

#### 3.1 ConsultationList
**Datei**: `frontend/src/components/ConsultationList.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert
- [ ] Spalten definiert: `id`, `title`, `clientName`, `consultantName`, `status`, `startDate`, `endDate`, `duration`, `rate`, `totalAmount`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`, `greaterThan`, `lessThan`, `between`
- [ ] Standardfilter definiert: "Offene Beratungen" (status = 'open')
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. FilterPane-Integration prüfen
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

---

### 4. WORKTRACKER (REQUESTS) SEITE
**Datei**: `frontend/src/pages/Requests.tsx`

#### 4.1 Requests-Tabelle
**Datei**: `frontend/src/components/Requests.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert
- [ ] Spalten definiert: `id`, `title`, `description`, `status`, `priority`, `assignedTo`, `createdBy`, `createdAt`, `updatedAt`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`
- [ ] Standardfilter definiert: "Offene Requests" (status = 'open')
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. FilterPane-Integration prüfen
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

---

### 5. LOHNABRECHNUNG SEITE
**Datei**: `frontend/src/pages/InvoiceManagement.tsx`

#### 5.1 InvoiceManagementTab
**Datei**: `frontend/src/components/InvoiceManagementTab.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert (Props korrigieren: `availableColumns` → `columns`)
- [ ] Spalten definiert: `id`, `invoiceNumber`, `clientName`, `amount`, `status`, `issueDate`, `dueDate`, `paidDate`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`, `greaterThan`, `lessThan`, `between`
- [ ] Standardfilter definiert: "Offene Rechnungen" (status = 'pending')
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. **KRITISCH**: FilterPane-Props korrigieren (`availableColumns` → `columns`)
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

---

### 6. BENUTZERVERWALTUNG SEITE
**Datei**: `frontend/src/pages/UserManagement.tsx`

#### 6.1 UserManagementTab
**Datei**: `frontend/src/components/UserManagementTab.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert
- [ ] Spalten definiert: `id`, `username`, `firstName`, `lastName`, `email`, `role`, `status`, `createdAt`, `lastLogin`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`
- [ ] Standardfilter definiert: "Alle Benutzer" (kein Filter)
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. FilterPane-Integration implementieren (falls fehlend)
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

#### 6.2 UserWorktimeTable
**Datei**: `frontend/src/components/UserWorktimeTable.tsx`

**Prüfcheckliste:**
- [ ] FilterPane-Interface korrekt implementiert
- [ ] Spalten definiert: `id`, `userId`, `startTime`, `endTime`, `duration`, `description`, `status`, `createdAt`
- [ ] Operatoren verfügbar: `equals`, `contains`, `startsWith`, `endsWith`, `isNull`, `isNotNull`, `greaterThan`, `lessThan`, `between`
- [ ] Standardfilter definiert: "Diesen Monat" (startTime = aktueller Monat)
- [ ] Standardfilter standardmäßig aktiv
- [ ] Filter-Tags korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen

**Implementierungsschritte:**
1. FilterPane-Integration implementieren (falls fehlend)
2. Standardfilter im Backend definieren
3. Filter-Logik testen
4. UI-Verhalten validieren

---

## Backend-Implementierung

### 1. Standardfilter-Seed-System
**Datei**: `backend/prisma/seed.ts` oder neues Script

**Implementierungsschritte:**
1. Standardfilter-Definitionen für alle Tabellen erstellen
2. Seed-Script für Standardfilter implementieren
3. Standardfilter in Datenbank einfügen
4. Standardfilter-API-Endpoints prüfen

### 2. FilterRow-Bug-Fix
**Datei**: `frontend/src/components/FilterRow.tsx`

**Problem**: Status-Filter-Logik beeinträchtigt Tabellentyp-Erkennung
**Lösung**: Tabellentyp-Erkennung verbessern

---

## Qualitätssicherung

### Abschluss-Checkliste
- [ ] Alle Tabellen haben korrekte FilterPane-Integration
- [ ] Alle Standardfilter sind definiert und funktional
- [ ] Filter-Tags werden korrekt sortiert und angezeigt
- [ ] Gespeicherte Filter werden korrekt geladen
- [ ] UI-Verhalten ist konsistent über alle Seiten
- [ ] Backend-API funktioniert korrekt
- [ ] Keine Console-Fehler
- [ ] Responsive Design funktioniert

### Test-Szenarien
1. **Standardfilter-Test**: Jede Tabelle lädt mit korrektem Standardfilter
2. **Filter-Erstellung-Test**: Neue Filter können erstellt und gespeichert werden
3. **Filter-Loading-Test**: Gespeicherte Filter werden korrekt geladen
4. **Filter-Sorting-Test**: Filter-Tags sind korrekt sortiert
5. **Cross-Table-Test**: Filter funktionieren über verschiedene Tabellen hinweg

---

## Implementierungsreihenfolge (Detailliert)

1. **Backend vorbereiten**: Standardfilter-Seed-System implementieren
2. **Dashboard**: RoleManagementTab → ActiveUsersList
3. **Worktracker**: Haupttabelle
4. **Beratungen**: ConsultationList
5. **Requests**: Requests-Tabelle
6. **Lohnabrechnung**: InvoiceManagementTab (kritisch: Props korrigieren)
7. **Benutzerverwaltung**: UserManagementTab → UserWorktimeTable
8. **Qualitätssicherung**: Alle Tests durchführen

---

## Risiken und Mitigation

**Risiko**: TableID-Änderungen beeinträchtigen gespeicherte Filter
**Mitigation**: TableIDs dokumentieren und Änderungen vermeiden

**Risiko**: FilterPane-Interface-Inkonsistenzen
**Mitigation**: Systematische Prüfung aller Implementierungen

**Risiko**: Performance-Probleme bei vielen Filtern
**Mitigation**: Pagination und Lazy-Loading implementieren

---

## Erfolgskriterien

- [ ] Alle 8 Tabellen haben vollständige Filterfunktionalität
- [ ] Standardfilter sind definiert und funktional
- [ ] UI ist konsistent über alle Seiten
- [ ] Keine Console-Fehler
- [ ] Alle Tests bestehen
- [ ] Dokumentation ist aktualisiert 