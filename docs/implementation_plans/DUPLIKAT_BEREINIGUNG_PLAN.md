# Plan: Duplikat-Bereinigung für Requests, Tasks und weitere Entitäten

**Datum:** 2025-01-21  
**Status:** Planungsphase  
**Motto:** "2 x messen, 1 x schneiden" - Analysieren → Planen → Umsetzen

## Problem-Analyse

### Aktuelle Situation
- Der Datenimport (`backend/scripts/import_data.ts`) wurde mehrfach ausgeführt
- Es gibt keine Duplikat-Prüfung bei Requests und Tasks im Import-Script
- Es existiert bereits ein `cleanup_duplicates.ts` Script, das aber nur Requests bereinigt
- Tasks haben keine Unique Constraints im Schema
- Requests haben keine Unique Constraints im Schema

### Betroffene Entitäten

#### 1. Requests
- **Aktueller Cleanup:** Bereits vorhanden in `cleanup_duplicates.ts`
- **Duplikat-Kriterium:** Gleicher Titel + Requester + Branch
- **Problem:** Script wurde möglicherweise nicht ausgeführt oder nicht vollständig

#### 2. Tasks
- **Aktueller Cleanup:** KEINER vorhanden
- **Duplikat-Kriterium:** Zu definieren (vermutlich: Titel + Responsible + Branch + QualityControl)
- **Problem:** Keine Prüfung im Import-Script

#### 3. Weitere mögliche Duplikate
- **UserBranches:** Hat Unique Constraint `[userId, branchId]` - sollte keine Duplikate haben
- **UserRoles:** Hat Unique Constraint `[userId, roleId]` - sollte keine Duplikate haben
- **Cerebro:** Hat Unique Constraint auf `slug` - sollte keine Duplikate haben
- **Users:** Hat Unique Constraint auf `username` und `email` - sollte keine Duplikate haben

## Duplikat-Identifikations-Kriterien

### Requests
**Duplikat = identisch wenn:**
- Gleicher `title`
- Gleiche `organizationId`

**Behalten:** Ältester Eintrag (niedrigste `id` oder frühestes `createdAt`)

### Tasks
**Duplikat = identisch wenn:**
- Gleicher `title`
- Gleiche `organizationId`

**Behalten:** Ältester Eintrag (niedrigste `id` oder frühestes `createdAt`)

**Hinweis:** Vereinfachte Kriterien - nur Titel + Organization werden geprüft.

## Implementierungsplan

### Phase 1: Analyse-Script erstellen
**Datei:** `backend/scripts/analyze_duplicates.ts`

**Funktionalität:**
1. Analysiere alle Requests auf Duplikate
   - Zeige Anzahl der Duplikate
   - Zeige Beispiele von Duplikat-Gruppen
   - Zeige Statistiken (wie viele Gruppen, wie viele Einträge pro Gruppe)
2. Analysiere alle Tasks auf Duplikate
   - Zeige Anzahl der Duplikate
   - Zeige Beispiele von Duplikat-Gruppen
   - Zeige Statistiken
3. Erstelle Zusammenfassung
   - Gesamtanzahl Duplikate
   - Betroffene Entitäten
   - Empfehlung für Bereinigung

**Ausgabe:**
- Konsolen-Output mit detaillierten Statistiken
- Optional: JSON-Export der Duplikat-IDs für Review

### Phase 2: Erweiterte Cleanup-Script erstellen
**Datei:** `backend/scripts/cleanup_all_duplicates.ts`

**Funktionalität:**
1. **Requests bereinigen:**
   - Identifiziere Duplikate nach Kriterien
   - Behalte ältesten Eintrag jeder Gruppe
   - Lösche alle anderen Duplikate
   - Zeige Statistiken (gelöscht, behalten)

2. **Tasks bereinigen:**
   - Identifiziere Duplikate nach Kriterien
   - Behalte ältesten Eintrag jeder Gruppe
   - Lösche alle anderen Duplikate
   - Zeige Statistiken (gelöscht, behalten)
   - **WICHTIG:** Prüfe auf abhängige Daten:
     - `TaskAttachment` (Cascade Delete)
     - `TaskCerebroCarticle` (Cascade Delete)
     - `WorkTimeTask` (muss manuell bereinigt werden)
     - `TaskStatusHistory` (Cascade Delete)

3. **Sicherheitsprüfungen:**
   - Backup-Hinweis vor Ausführung
   - Dry-Run Modus (zeigt was gelöscht würde, ohne zu löschen)
   - Bestätigung erforderlich vor tatsächlichem Löschen

4. **Zusammenfassung:**
   - Zeige finale Statistiken
   - Zeige Anzahl gelöschter Einträge pro Entität
   - Zeige Anzahl verbleibender Einträge

### Phase 3: Import-Script verbessern
**Datei:** `backend/scripts/import_data.ts`

**Änderungen:**
1. **Requests-Import:**
   - Prüfe vor Erstellung auf Duplikat
   - Überspringe wenn Duplikat gefunden
   - Logge übersprungene Duplikate

2. **Tasks-Import:**
   - Prüfe vor Erstellung auf Duplikat
   - Überspringe wenn Duplikat gefunden
   - Logge übersprungene Duplikate

**Duplikat-Prüfung:**
```typescript
// Für Requests
const existingRequest = await prisma.request.findFirst({
  where: {
    title: req.title,
    organizationId: LA_FAMILIA_ORG_ID
  }
});

// Für Tasks
const existingTask = await prisma.task.findFirst({
  where: {
    title: task.title || 'Unbenannter Task',
    organizationId: LA_FAMILIA_ORG_ID
  }
});
```

## Abhängigkeiten beachten

### Tasks haben folgende abhängige Tabellen:
- `TaskAttachment` - Cascade Delete (automatisch)
- `TaskCerebroCarticle` - Cascade Delete (automatisch)
- `TaskStatusHistory` - Cascade Delete (automatisch)
- `WorkTimeTask` - **KEIN Cascade Delete** - muss manuell bereinigt werden!

### Requests haben folgende abhängige Tabellen:
- `RequestAttachment` - Cascade Delete (automatisch)
- `RequestCerebroCarticle` - Cascade Delete (automatisch)

## Sicherheitsmaßnahmen

1. **Backup vor Bereinigung:**
   - Datenbank-Backup erstellen
   - Export der betroffenen Tabellen als JSON

2. **Dry-Run Modus:**
   - Script kann im Dry-Run Modus ausgeführt werden
   - Zeigt was gelöscht würde, ohne tatsächlich zu löschen
   - Ermöglicht Review vor tatsächlicher Bereinigung

3. **Bestätigung:**
   - Script fragt nach Bestätigung vor Löschung
   - Zeigt Zusammenfassung der zu löschenden Einträge

4. **Logging:**
   - Detailliertes Logging aller Aktionen
   - Log-Datei mit allen gelöschten IDs

## Ausführungsreihenfolge

1. **Schritt 1:** Analyse-Script ausführen
   - `ts-node backend/scripts/analyze_duplicates.ts`
   - Review der Ergebnisse
   - Entscheidung ob Bereinigung notwendig

2. **Schritt 2:** Backup erstellen
   - Datenbank-Backup
   - Export der betroffenen Tabellen

3. **Schritt 3:** Cleanup-Script im Dry-Run Modus ausführen
   - `ts-node backend/scripts/cleanup_all_duplicates.ts --dry-run`
   - Review der Ergebnisse

4. **Schritt 4:** Cleanup-Script tatsächlich ausführen
   - `ts-node backend/scripts/cleanup_all_duplicates.ts`
   - Bestätigung geben
   - Bereinigung durchführen

5. **Schritt 5:** Import-Script verbessern
   - Änderungen am Import-Script vornehmen
   - Testen mit kleinen Datenmengen

## Erwartete Ergebnisse

### Nach Bereinigung:
- Keine Duplikate mehr in Requests
- Keine Duplikate mehr in Tasks
- Alle abhängigen Daten korrekt bereinigt
- Import-Script verhindert zukünftige Duplikate

### Statistiken die erfasst werden:
- Anzahl Duplikate vor Bereinigung
- Anzahl gelöschter Einträge
- Anzahl verbleibender Einträge
- Anzahl abhängiger Einträge die mitgelöscht wurden

## Risiken und Mitigation

### Risiko 1: Falsche Duplikat-Erkennung
- **Mitigation:** Kriterien genau definieren, Dry-Run Modus verwenden

### Risiko 2: Abhängige Daten verloren
- **Mitigation:** Prüfe alle Abhängigkeiten, bereinige WorkTimeTask manuell

### Risiko 3: Datenverlust
- **Mitigation:** Backup vor Bereinigung, Dry-Run Modus, Logging

## Nächste Schritte

1. ✅ Plan erstellt
2. ⏳ Plan vom Benutzer bestätigen lassen
3. ⏳ Analyse-Script implementieren
4. ⏳ Cleanup-Script implementieren
5. ⏳ Import-Script verbessern
6. ⏳ Testen und validieren

