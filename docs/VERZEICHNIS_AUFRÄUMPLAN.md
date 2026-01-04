# Verzeichnis-Aufräumplan - Doppelte und mehrfache Verzeichnisse

**Datum:** 2025-01-30  
**Status:** Analyse abgeschlossen, Vorschläge erstellt

---

## Übersicht

Dieses Dokument listet alle doppelten oder mehrfachen Verzeichnisse auf und schlägt vor, wie sie zusammengelegt werden können, um die Struktur kürzer, einfacher und übersichtlicher zu machen.

---

## 1. UPLOAD-VERZEICHNISSE (3 Verzeichnisse)

### Aktuelle Situation:
- `backend/public/uploads` (16K) - nur `invoices/`
- `backend/uploads` (20M) - `cerebro/`, `certificates/`, `contracts/`, `document-signatures/`, `document-templates/`, `documents/`, `invoices/`, `logos/`, `request-attachments/`, `task-attachments/`, `tours/`
- `uploads/` (1.5M) - nur `documents/`

### Problem:
- 3 verschiedene Upload-Verzeichnisse
- `backend/public/uploads` wird wahrscheinlich für statische Dateien verwendet
- `uploads/` im Root ist redundant

### Vorschlag:
**Option A (Empfohlen):**
- `backend/uploads/` als Hauptverzeichnis behalten (bereits strukturiert)
- `backend/public/uploads/` → Inhalt nach `backend/uploads/` verschieben, Verzeichnis löschen
- `uploads/` → Inhalt nach `backend/uploads/documents/` verschieben, Verzeichnis löschen
- **Ergebnis:** Nur noch `backend/uploads/` mit allen Unterordnern

**Option B (Wenn public/uploads für statische Dateien benötigt wird):**
- `backend/public/uploads/` behalten für statische Dateien
- `uploads/` → Inhalt nach `backend/uploads/documents/` verschieben
- **Ergebnis:** 2 Verzeichnisse (`backend/public/uploads/` für statisch, `backend/uploads/` für dynamisch)

---

## 2. SCRIPT-VERZEICHNISSE (3 Verzeichnisse)

### Aktuelle Situation:
- `backend/scripts/` (2 Dateien) - SQL-Dateien (`check-reservation-columns.sql`, `fix-ai-enabled-manila.sql`)
- `frontend/scripts/` (3 Dateien) - Translation-Scripts (`add-missing-translations.js`, `analyze-translations.js`, `validate-translations.js`)
- `scripts/` (382 Dateien) - Hauptverzeichnis mit `backend/`, `utils/`, `deployment/`

### Problem:
- Scripts sind auf 3 Ebenen verteilt
- `backend/scripts/` enthält SQL-Dateien (sollten eigentlich nicht in scripts sein)
- `frontend/scripts/` könnte in Hauptverzeichnis integriert werden

### Vorschlag:
**Option A (Empfohlen):**
- `backend/scripts/` → SQL-Dateien nach `backend/prisma/migrations/manual/` verschieben, Verzeichnis löschen
- `frontend/scripts/` → Inhalt nach `scripts/frontend/` verschieben, Verzeichnis löschen
- **Ergebnis:** Nur noch `scripts/` mit Unterordnern (`backend/`, `frontend/`, `utils/`, `deployment/`)

**Option B:**
- `backend/scripts/` → SQL-Dateien nach `backend/data/sql/` verschieben
- `frontend/scripts/` → Inhalt nach `scripts/frontend/` verschieben
- **Ergebnis:** Gleiche Struktur wie Option A

---

## 3. MIGRATION-VERZEICHNISSE (3 Verzeichnisse)

### Aktuelle Situation:
- `backend/migrations/` (1 Datei) - `manual_add_password_reset_token.sql`
- `backend/prisma/migrations/` (83 Dateien) - Prisma-Migrationen
- `prisma/migrations/` (2 Verzeichnisse) - Scheint Duplikat von `backend/prisma/migrations/`

### Problem:
- Manuelle SQL-Dateien sind in separatem Verzeichnis
- `prisma/migrations/` im Root scheint Duplikat zu sein

### Vorschlag:
**Option A (Empfohlen):**
- `backend/migrations/` → Inhalt nach `backend/prisma/migrations/manual/` verschieben, Verzeichnis löschen
- `prisma/migrations/` → Prüfen ob Duplikat, wenn ja löschen, wenn nein nach `backend/prisma/migrations/` verschieben
- **Ergebnis:** Nur noch `backend/prisma/migrations/` mit Unterordner `manual/` für manuelle SQL-Dateien

**Option B:**
- `backend/migrations/` → Umbenennen zu `backend/prisma/migrations/manual/`
- `prisma/migrations/` → Prüfen und entsprechend handhaben
- **Ergebnis:** Gleiche Struktur wie Option A

---

## 4. DATA/EXPORT/IMPORT-VERZEICHNISSE (4 Verzeichnisse)

### Aktuelle Situation:
- `backend/data/` (24K) - Daten-Dateien
- `backend/export_data/` (621K) - Exportierte Daten
- `extracted_data/` (31K) - Extrahierte Daten
- `import_data/` (609K) - Import-Daten

### Problem:
- 4 verschiedene Verzeichnisse für ähnliche Zwecke
- `extracted_data/` und `import_data/` sind im Root

### Vorschlag:
**Option A (Empfohlen):**
- `backend/data/` als Hauptverzeichnis behalten
- `backend/export_data/` → Inhalt nach `backend/data/exports/` verschieben, Verzeichnis löschen
- `extracted_data/` → Inhalt nach `backend/data/extracted/` verschieben, Verzeichnis löschen
- `import_data/` → Inhalt nach `backend/data/imports/` verschieben, Verzeichnis löschen
- **Ergebnis:** Nur noch `backend/data/` mit Unterordnern (`exports/`, `extracted/`, `imports/`)

**Option B:**
- Alle nach `backend/data/` verschieben, aber flache Struktur
- **Ergebnis:** Gleiche Struktur, aber weniger übersichtlich

---

## 5. LOG-VERZEICHNISSE (1 Verzeichnis - OK)

### Aktuelle Situation:
- `backend/logs/` (3.7M) - Log-Dateien

### Problem:
- Kein Problem, nur ein Verzeichnis

### Vorschlag:
- **Keine Änderung nötig**

---

## 6. WEITERE VERZEICHNISSE

### 6.1 `backend/debug/` (1 Datei)
- **Vorschlag:** Inhalt nach `backend/data/debug/` verschieben, Verzeichnis löschen

### 6.2 `backend/routes/` (1 Datei: `document-recognition.js`)
- **Problem:** Route-Datei außerhalb von `backend/src/routes/`
- **Vorschlag:** Datei nach `backend/src/routes/document-recognition.ts` verschieben (TypeScript), Verzeichnis löschen

### 6.3 `backend/prismamigrations20250122120000_add_password_manager/`
- **Problem:** Altes Migrations-Verzeichnis außerhalb von `prisma/migrations/`
- **Vorschlag:** Prüfen ob noch benötigt, wenn nein löschen, wenn ja nach `backend/prisma/migrations/` verschieben

### 6.4 `backend/20250101120000_add_request_type_and_is_private/`
- **Problem:** Migrations-Verzeichnis im falschen Ort
- **Vorschlag:** Prüfen ob noch benötigt, wenn nein löschen, wenn ja nach `backend/prisma/migrations/` verschieben

---

## ZUSAMMENFASSUNG DER VORSCHLÄGE

### Priorität HOCH (Redundanzen eliminieren):

1. **Upload-Verzeichnisse:**
   - `backend/public/uploads/` → `backend/uploads/` (verschieben)
   - `uploads/` → `backend/uploads/documents/` (verschieben)
   - **Ergebnis:** Nur `backend/uploads/`

2. **Script-Verzeichnisse:**
   - `backend/scripts/` → SQL-Dateien nach `backend/prisma/migrations/manual/` (verschieben)
   - `frontend/scripts/` → `scripts/frontend/` (verschieben)
   - **Ergebnis:** Nur `scripts/` mit Unterordnern

3. **Data/Export/Import-Verzeichnisse:**
   - Alle nach `backend/data/` mit Unterordnern (verschieben)
   - **Ergebnis:** Nur `backend/data/` mit `exports/`, `extracted/`, `imports/`

### Priorität MITTEL (Struktur verbessern):

4. **Migration-Verzeichnisse:**
   - `backend/migrations/` → `backend/prisma/migrations/manual/` (verschieben)
   - `prisma/migrations/` → Prüfen und entsprechend handhaben
   - **Ergebnis:** Nur `backend/prisma/migrations/`

5. **Weitere Verzeichnisse:**
   - `backend/debug/` → `backend/data/debug/` (verschieben)
   - `backend/routes/` → `backend/src/routes/` (verschieben)
   - Alte Migrations-Verzeichnisse prüfen und bereinigen

---

## ERGEBNIS NACH UMSETZUNG

### Vorher:
- 3 Upload-Verzeichnisse
- 3 Script-Verzeichnisse
- 3 Migration-Verzeichnisse
- 4 Data/Export/Import-Verzeichnisse
- **Gesamt:** 13+ redundante Verzeichnisse

### Nachher:
- 1 Upload-Verzeichnis (`backend/uploads/`)
- 1 Script-Verzeichnis (`scripts/` mit Unterordnern)
- 1 Migration-Verzeichnis (`backend/prisma/migrations/` mit `manual/`)
- 1 Data-Verzeichnis (`backend/data/` mit Unterordnern)
- **Gesamt:** 4 Hauptverzeichnisse, klar strukturiert

---

## NÄCHSTE SCHRITTE

1. ✅ Analyse abgeschlossen
2. ⏭️ Vorschläge prüfen und bestätigen
3. ⏭️ Umsetzung nach Bestätigung
4. ⏭️ Code-Referenzen aktualisieren (falls nötig)



