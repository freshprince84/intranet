# Dokumentationsaufräumplan

## Vollständige Inventur aller Dokumentationsdateien

**Gesamt: 251 Markdown-Dateien im Projekt**

### Identifizierte Probleme

1. **Dateien im Root von `docs/`** (8 Dateien - sollten in Unterordnern sein)
2. **Dateien im Projekt-Root** (12 Dateien - sollten nach `docs/` verschoben werden)
3. **Dateien in `backend/`** (6 Dateien - sollten nach `docs/` verschoben werden)
4. **Dateien in `frontend/`** (1 Datei - sollte nach `docs/` verschoben werden)
5. **Duplikate** zwischen `implementation_plans/` und `implementation_reports/`
6. **Viele ähnliche/veraltete Dateien** die konsolidiert werden sollten
7. **Fehlende klare Struktur** für bestimmte Themenbereiche

---

## Detaillierter Aufräumplan

### Phase 1: Dateien aus `docs/` Root verschieben

#### → `docs/technical/`
- `HETZNER_SERVER_SETUP.md` - Server-Setup Dokumentation
- `TROUBLESHOOTING_WHATSAPP_HETZNER.md` - Troubleshooting für WhatsApp auf Hetzner
- `WHATSAPP_WEBHOOK_SERVER_SETUP.md` - Webhook-Setup für Server
- `WHATSAPP_WEBHOOK_SETUP.md` - Webhook-Setup allgemein
- `WHATSAPP_TOKEN_SETUP.md` - Token-Setup für WhatsApp

#### → `docs/user/`
- `BENUTZERANLEITUNG_LEBENSZYKLUS.md` - Benutzeranleitung für Lebenszyklus

#### → `docs/modules/` (neue Datei erstellen: `MODUL_WHATSAPP.md`)
- `WHATSAPP_TEMPLATE_ERSTELLUNG_ANLEITUNG.md` - In Modul-Dokumentation integrieren
- `WHATSAPP_TEMPLATE_ERSTELLUNG_QUICK_START.md` - In Modul-Dokumentation integrieren

#### → `docs/core/`
- `backlog.md` - Projekt-Backlog (oder nach `docs/analysis/` wenn es Analysen enthält)

---

### Phase 2: Dateien aus Projekt-Root nach `docs/` verschieben

#### → `docs/analysis/`
- `BUTTON_ANALYSE_ERGEBNISSE.md` - Analyse-Ergebnisse
- `FEHLENDE_UEBERSETZUNGEN.md` - Analyse fehlender Übersetzungen

#### → `docs/user/`
- `FRONTEND_ANLEITUNG.md` - Benutzeranleitung für Frontend

#### → `docs/technical/`
- `QUICK_REFERENCE_API_KEYS.md` - Technische Referenz
- `DEPLOYMENT_CHECKLIST.md` - Deployment-Checkliste
- `DEPLOYMENT_MIT_DATEN_PLAN.md` - Deployment-Plan mit Datenübertragung
- `GIT_MERGE_KONFLIKT_BEHEBEN.md` - Git-Merge-Konflikt-Lösung
- `MIGRATION_FIX_ANLEITUNG.md` - Migration-Fix-Anleitung
- `SERVER_DB_UPDATE_ANLEITUNG.md` - Server-Datenbank-Update-Anleitung
- `SERVER_FIX_ORGANIZATIONID.md` - Server-Fix für organizationId
- `SERVER_FRONTEND_FIX.md` - Server-Frontend-Fix

### Phase 2b: Dateien aus `backend/` nach `docs/` verschieben

#### → `docs/technical/`
- `backend/ANLEITUNG_FIX.md` - Backend-Fix-Anleitung
- `backend/EMAIL_SETUP.md` - E-Mail-Setup-Anleitung

#### → `docs/technical/` (Script-Dokumentation)
- `backend/scripts/README.md` - Scripts-Übersicht → **BEHALTEN** (kann im backend/ bleiben, da spezifisch für Scripts)
- `backend/scripts/EXPORT_IMPORT_README.md` - Export/Import-Anleitung → **VERSCHIEBEN** nach `docs/technical/EXPORT_IMPORT.md`
- `backend/scripts/import-anleitung.md` - Import-Anleitung → **KONSOLIDIEREN** mit EXPORT_IMPORT_README.md

#### → `docs/user/` oder `docs/technical/`
- `backend/public/downloads/README.md` - Downloads-README → **PRÜFEN**: Ist das für Benutzer oder Entwickler? → Entsprechend verschieben

### Phase 2c: Dateien aus `frontend/` nach `docs/` verschieben

#### → `docs/technical/` oder `docs/modules/`
- `frontend/src/utils/OCR_README.md` - OCR-Dokumentation → **VERSCHIEBEN** nach `docs/technical/OCR_IMPLEMENTATION.md` oder in `docs/modules/MODUL_DOKUMENT_ERKENNUNG.md` integrieren

---

### Phase 3: Duplikate bereinigen

#### `MITARBEITERLEBENSZYKLUS_*` Dateien
**In `implementation_plans/`:**
- `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` - Hauptplan (BEHALTEN)
- `MITARBEITERLEBENSZYKLUS_PROZESS.md` - Prozessbeschreibung (BEHALTEN)
- `MITARBEITERLEBENSZYKLUS_DETAILLIERT.md` - Detaillierte Spezifikationen (BEHALTEN)
- `MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md` - Zusammenfassung (BEHALTEN)

**In `implementation_reports/`:**
- `MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md` - **PRÜFEN**: Ist identisch mit Plan-Version? → LÖSCHEN wenn Duplikat
- `MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md` - **PRÜFEN**: Ist identisch mit Plan-Version? → LÖSCHEN wenn Duplikat
- `MITARBEITERLEBENSZYKLUS_TEST_REPORT.md` - **BEHALTEN** (ist Report, nicht Plan)

**Zu prüfen/löschen:**
- `MITARBEITERLEBENSZYKLUS_AKTUELLER_STAND.md` - Status-Update (veraltet?) → PRÜFEN
- `MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md` - Status-Update (veraltet?) → PRÜFEN
- `MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md` - Fortschritt (veraltet?) → PRÜFEN
- `MITARBEITERLEBENSZYKLUS_NUTZUNGSANLEITUNG.md` - **VERSCHIEBEN** nach `docs/user/` (ist Benutzeranleitung)
- `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION_DETAILS.md` - **PRÜFEN**: Überschneidung mit DETAILLIERT? → KONSOLIDIEREN
- `MITARBEITERLEBENSZYKLUS_PRÜFUNG.md` - Prüfungsdokument (veraltet?) → PRÜFEN

#### `FILTER_*` Dateien
**In `implementation_plans/`:**
- Behalten: Aktuelle Pläne die noch relevant sind

**In `implementation_reports/`:**
- `FILTER_CLEANUP_PLAN.md` - **PRÜFEN**: Ist das ein Plan oder Report? → Ggf. nach plans/ verschieben
- `FILTER_CLEANUP_STATUS.md` - Status-Update (veraltet?) → PRÜFEN
- `FILTER_REFACTORING_*.md` - Mehrere Refactoring-Dokumente → **KONSOLIDIEREN** zu einem Dokument
- `filter_implementation.md` - Implementierungsreport → **BEHALTEN** (ist Report)

#### `CEREBRO_*` Dateien
**In `implementation_plans/`:**
- `CEREBRO_HIGH_PRIORITY_FEATURES_PLAN.md` - **BEHALTEN** (ist Plan)
- `CEREBRO_UNIFIED_EDITOR_PLAN.md` - **BEHALTEN** (ist Plan)
- `CEREBRO_UNIFIED_EDITOR_REUSE_PLAN.md` - **PRÜFEN**: Überschneidung mit UNIFIED_EDITOR_PLAN? → KONSOLIDIEREN

**In `implementation_reports/`:**
- `CEREBRO_ANALYSE.md` - Analyse → **VERSCHIEBEN** nach `docs/analysis/`
- `CEREBRO_KORRIGIERTE_ANALYSE.md` - Korrigierte Analyse → **VERSCHIEBEN** nach `docs/analysis/`

---

### Phase 4: Ähnliche/veraltete Dateien konsolidieren

#### `LOBBYPMS_*` Dateien (über 20 Dateien)
**Kategorisierung:**

**Hauptdokumentation (BEHALTEN & KONSOLIDIEREN):**
- `LOBBYPMS_INTEGRATION.md` - Hauptdokumentation → **BEHALTEN als Hauptdokument**
- `LOBBYPMS_ZUSAMMENFASSUNG.md` - Zusammenfassung → **INTO HAUPTDOKUMENT INTEGRIEREN**
- `LOBBYPMS_STATUS_UPDATE.md` - Status → **INTO HAUPTDOKUMENT INTEGRIEREN** (wenn aktuell)
- `LOBBYPMS_ANBINDUNGEN_ABGESCHLOSSEN.md` - Anbindungen → **INTO HAUPTDOKUMENT INTEGRIEREN**

**Anleitungen (BEHALTEN & KONSOLIDIEREN):**
- `LOBBYPMS_QUICK_START.md` - Quick Start → **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_SCHNELLSTART.md` - Schnellstart (Duplikat von QUICK_START?) → **PRÜFEN & LÖSCHEN wenn Duplikat**
- `LOBBYPMS_KONFIGURATION_SCHRITT_FUER_SCHRITT.md` - Konfiguration → **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_KONFIGURATION_UND_TEST_ANLEITUNG.md` - Konfiguration & Test → **KONSOLIDIEREN** mit obiger Datei
- `LOBBYPMS_TEST_ANLEITUNG.md` - Test-Anleitung → **KONSOLIDIEREN** mit Konfiguration
- `LOBBYPMS_TEST_UND_KONFIGURATION.md` - Test & Konfiguration → **KONSOLIDIEREN** mit obigen
- `LOBBYPMS_TEST_CHECKLISTE.md` - Test-Checkliste → **INTO TEST-ANLEITUNG INTEGRIEREN**
- `LOBBYPMS_TEST_SCHRITT_2.md` - Test Schritt 2 → **INTO TEST-ANLEITUNG INTEGRIEREN**

**Status-Updates (PRÜFEN & LÖSCHEN wenn veraltet):**
- `LOBBYPMS_FEHLENDE_KOMPONENTEN.md` - Fehlende Komponenten → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_FEHLER_BEHOBEN.md` - Fehler behoben → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_API_ENDPOINT_PROBLEM.md` - API-Endpoint-Problem → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_API_TAB_FEHLERBEHEBUNG.md` - API-Tab-Fehlerbehebung → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_WARTEZEIT_PLAN.md` - Wartezeit-Plan → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_SERVER_NEUSTART.md` - Server-Neustart → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet

**Spezifische Dokumentation (BEHALTEN):**
- `LOBBYPMS_USE_CASES_UND_PROZESSE.md` - Use Cases → **BEHALTEN**
- `LOBBYPMS_WO_IM_SYSTEM_SEHEN.md` - Wo im System → **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_FRONTEND_POSITIONEN.md` - Frontend-Positionen → **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_FRONTEND_PRÜFUNG.md` - Frontend-Prüfung → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_INTEGRATION_API_TAB_STATUS.md` - API-Tab-Status → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_INTEGRATION_API_TAB_FINAL_REVIEW.md` - Final Review → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_INTEGRATION_NEXT_STEPS.md` - Next Steps → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_API_RESEARCH.md` - API-Research → **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_MOCK_DATEN.md` - Mock-Daten → **BEHALTEN** (oder in Hauptdokument integrieren)

**Vorschlag:** 
- Hauptdokument: `LOBBYPMS_INTEGRATION.md` (erweitern mit Zusammenfassung, Status, Anbindungen)
- Separate Anleitung: `LOBBYPMS_SETUP_ANLEITUNG.md` (konsolidiert aus Konfiguration & Test-Dateien)
- Use Cases: `LOBBYPMS_USE_CASES.md` (aus USE_CASES_UND_PROZESSE)
- Rest: Prüfen und löschen wenn veraltet

#### `BOLD_PAYMENT_*` Dateien
**Kategorisierung:**

**Hauptdokumentation:**
- `BOLD_PAYMENT_DOKUMENTATION_ANALYSE.md` - Analyse → **BEHALTEN** (oder in Hauptdokument integrieren)
- `BOLD_PAYMENT_STATUS.md` - Status → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet

**Implementierungsdetails:**
- `BOLD_PAYMENT_SIGV4_IMPLEMENTIERT.md` - SIGV4-Implementierung → **BEHALTEN** (oder in Hauptdokument integrieren)
- `BOLD_PAYMENT_AUTHENTIFIZIERUNG.md` - Authentifizierung → **BEHALTEN** (oder in Hauptdokument integrieren)
- `BOLD_PAYMENT_KEY_ZUORDNUNG.md` - Key-Zuordnung → **BEHALTEN** (oder in Hauptdokument integrieren)
- `BOLD_PAYMENT_API_URL_HINWEIS.md` - API-URL-Hinweis → **BEHALTEN** (oder in Hauptdokument integrieren)
- `BOLD_PAYMENT_API_LINK_KORRIGIERT.md` - API-Link korrigiert → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet
- `BOLD_PAYMENT_UND_WHATSAPP_KORREKTUR.md` - Korrektur → **PRÜFEN**: Noch relevant? → LÖSCHEN wenn veraltet

**Vorschlag:**
- Hauptdokument: `BOLD_PAYMENT_INTEGRATION.md` (neu erstellen, konsolidiert aus allen relevanten Dateien)
- Oder: In `LOBBYPMS_INTEGRATION.md` integrieren (da Bold Payment Teil von LobbyPMS ist)

#### `WHATSAPP_*` Dateien in `implementation_plans/`
**Kategorisierung:**

- `WHATSAPP_BRANCH_INTEGRATION.md` - Branch-Integration → **BEHALTEN** (ist Plan)
- `WHATSAPP_LOBBYPMS_RESERVATION_PROCESS.md` - LobbyPMS-Reservierungsprozess → **VERSCHIEBEN** nach `docs/modules/` oder in `LOBBYPMS_INTEGRATION.md` integrieren
- `WHATSAPP_BUSINESS_API_ANLEITUNG.md` - Business API-Anleitung → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren
- `WHATSAPP_BUSINESS_API_GENAU.md` - Business API genau → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren
- `WHATSAPP_BUSINESS_API_QUICK_START.md` - Business API Quick Start → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren
- `WHATSAPP_TOKEN_SCHRITT_FUER_SCHRITT.md` - Token Schritt-für-Schritt → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren

---

### Phase 5: Neue Struktur für WhatsApp-Dokumentation

**Vorschlag:** Neues Modul-Dokument erstellen: `docs/modules/MODUL_WHATSAPP.md`

**Inhalt:**
- Übersicht der WhatsApp-Integration
- Setup-Anleitung (konsolidiert aus verschiedenen Setup-Dateien)
- Template-Erstellung (konsolidiert aus Template-Dateien)
- Webhook-Konfiguration
- Token-Setup
- Verwendung in verschiedenen Modulen (LobbyPMS, etc.)

**Technische Details** → `docs/technical/WHATSAPP_TECHNICAL.md`:
- API-Details
- Webhook-Implementierung
- Server-Setup
- Troubleshooting

---

### Phase 6: Weitere Bereinigungen

#### `implementation_plans/` - Veraltete/abgeschlossene Pläne
- Pläne die bereits vollständig umgesetzt wurden → **VERSCHIEBEN** nach `implementation_reports/` oder **LÖSCHEN**
- Status-Updates die veraltet sind → **LÖSCHEN**

#### `implementation_reports/` - Strukturierung
- Reports die eigentlich Analysen sind → **VERSCHIEBEN** nach `docs/analysis/`
- Reports die eigentlich Pläne sind → **VERSCHIEBEN** nach `implementation_plans/`

#### `analysis/` - Strukturierung
- Analysen die eigentlich technische Dokumentation sind → **VERSCHIEBEN** nach `docs/technical/`
- Analysen die eigentlich Implementierungsberichte sind → **VERSCHIEBEN** nach `implementation_reports/`

---

## Zusammenfassung der Aktionen

### Zu verschieben:
1. **5 WhatsApp-Dateien** aus `docs/` Root → `docs/technical/` oder `docs/modules/`
2. **2 Server-Dateien** aus `docs/` Root → `docs/technical/`
3. **1 Benutzeranleitung** aus `docs/` Root → `docs/user/`
4. **1 Backlog** aus `docs/` Root → `docs/core/` oder `docs/analysis/`
5. **4 Dateien** aus Projekt-Root → `docs/`
6. **Mehrere Dateien** zwischen `implementation_plans/` und `implementation_reports/` bereinigen

### Zu konsolidieren:
1. **LOBBYPMS-Dokumentation** (über 20 Dateien → 3-4 Hauptdokumente)
2. **BOLD_PAYMENT-Dokumentation** (7 Dateien → 1 Hauptdokument)
3. **WHATSAPP-Dokumentation** (verschiedene Dateien → Modul-Dokument + technische Dokumentation)
4. **FILTER-Refactoring-Dokumente** (mehrere → 1 konsolidiertes Dokument)
5. **CEREBRO-Dokumente** (konsolidieren wo sinnvoll)

### Zu löschen:
1. **Veraltete Status-Updates** (nach Prüfung)
2. **Duplikate** (nach Prüfung)
3. **Abgeschlossene Pläne** die bereits in Reports dokumentiert sind

### Zu erstellen:
1. **`docs/modules/MODUL_WHATSAPP.md`** - Hauptdokumentation für WhatsApp-Modul
2. **`docs/technical/WHATSAPP_TECHNICAL.md`** - Technische Details für WhatsApp
3. **Konsolidierte LOBBYPMS-Dokumentation**
4. **Konsolidierte BOLD_PAYMENT-Dokumentation**

---

## Reihenfolge der Umsetzung

1. ✅ **Phase 1**: Dateien aus `docs/` Root verschieben
2. ✅ **Phase 2**: Dateien aus Projekt-Root verschieben
3. ✅ **Phase 3**: Duplikate identifizieren und bereinigen
4. ✅ **Phase 4**: Ähnliche Dateien konsolidieren
5. ✅ **Phase 5**: Neue Struktur für WhatsApp erstellen
6. ✅ **Phase 6**: Weitere Bereinigungen
7. ✅ **Phase 7**: README.md und docs/claude/README.md aktualisieren (nur Verweise)

---

## Hinweise

- **Vorsicht bei Löschungen**: Vor dem Löschen immer prüfen ob Inhalt noch relevant ist
- **Konsolidierungen**: Wichtige Informationen aus zu löschenden Dateien in Hauptdokumente integrieren
- **README-Updates**: Nur Verweise aktualisieren, keine Implementierungsdetails (gemäß Dokumentationshierarchie)

