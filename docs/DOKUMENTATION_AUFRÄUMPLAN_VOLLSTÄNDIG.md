# Vollständiger Dokumentationsaufräumplan

## Analyse: Alle .md Dateien im Projekt

### Kategorisierung aller Dateien

---

## PHASE 1: Dateien aus Projekt-Root nach `docs/` verschieben

### → `docs/technical/` (Deployment & Server)
- `DEPLOYMENT_CHECKLIST.md` - Deployment-Checkliste
- `DEPLOYMENT_MIT_DATEN_PLAN.md` - Deployment-Plan mit Datenübertragung
- `GIT_MERGE_KONFLIKT_BEHEBEN.md` - Git-Merge-Konflikt-Lösung
- `MIGRATION_FIX_ANLEITUNG.md` - Migration-Fix-Anleitung
- `SERVER_DB_UPDATE_ANLEITUNG.md` - Server-Datenbank-Update-Anleitung
- `SERVER_FIX_ORGANIZATIONID.md` - Server-Fix für organizationId
- `SERVER_FRONTEND_FIX.md` - Server-Frontend-Fix
- `QUICK_REFERENCE_API_KEYS.md` - API-Keys-Referenz

### → `docs/analysis/`
- `BUTTON_ANALYSE_ERGEBNISSE.md` - Button-Analyse-Ergebnisse
- `FEHLENDE_UEBERSETZUNGEN.md` - Analyse fehlender Übersetzungen

### → `docs/user/`
- `FRONTEND_ANLEITUNG.md` - Frontend-Benutzeranleitung

---

## PHASE 2: Dateien aus `backend/` nach `docs/` verschieben

### → `docs/technical/`
- `backend/ANLEITUNG_FIX.md` - Fix-Anleitung (verschieben nach `docs/technical/FIX_ANLEITUNG.md`)
- `backend/EMAIL_SETUP.md` - E-Mail-Setup-Anleitung (verschieben nach `docs/technical/EMAIL_SETUP.md`)

### → `docs/user/`
- `backend/public/downloads/README.md` - Mobile App Download-Anleitung (verschieben nach `docs/user/MOBILE_APP_DOWNLOAD.md`)

---

## PHASE 3: Dateien aus `backend/scripts/` nach `docs/` verschieben

### → `docs/technical/`
- `backend/scripts/README.md` - Scripts-Übersicht (verschieben nach `docs/technical/SCRIPTS_README.md`)
- `backend/scripts/EXPORT_IMPORT_README.md` - Export/Import-Dokumentation (verschieben nach `docs/technical/DATEN_EXPORT_IMPORT.md`)
- `backend/scripts/import-anleitung.md` - Import-Anleitung (verschieben nach `docs/technical/CEREBRO_IMPORT_ANLEITUNG.md`)

**Hinweis:** Scripts-README könnte auch in `backend/scripts/` bleiben, wenn es spezifisch für Scripts ist. Entscheidung: Verschieben, da es Dokumentation ist.

---

## PHASE 4: Dateien aus `frontend/` nach `docs/` verschieben

### → `docs/technical/` oder `docs/modules/`
- `frontend/src/utils/OCR_README.md` - OCR-Dokumentation
  - **Entscheidung:** Nach `docs/modules/` verschieben, da OCR Teil des Dokumentenerkennungsmoduls ist
  - **Neuer Name:** `docs/modules/OCR_DOKUMENTATION.md` (oder in `MODUL_DOKUMENT_ERKENNUNG.md` integrieren)

---

## PHASE 5: Dateien aus `docs/` Root nach Unterordnern verschieben

### → `docs/technical/`
- `docs/HETZNER_SERVER_SETUP.md` - Hetzner-Server-Setup
- `docs/TROUBLESHOOTING_WHATSAPP_HETZNER.md` - WhatsApp-Troubleshooting auf Hetzner
- `docs/WHATSAPP_WEBHOOK_SERVER_SETUP.md` - WhatsApp-Webhook-Server-Setup
- `docs/WHATSAPP_WEBHOOK_SETUP.md` - WhatsApp-Webhook-Setup
- `docs/WHATSAPP_TOKEN_SETUP.md` - WhatsApp-Token-Setup

### → `docs/user/`
- `docs/BENUTZERANLEITUNG_LEBENSZYKLUS.md` - Benutzeranleitung für Lebenszyklus

### → `docs/modules/` (neue WhatsApp-Modul-Dokumentation erstellen)
- `docs/WHATSAPP_TEMPLATE_ERSTELLUNG_ANLEITUNG.md` - In WhatsApp-Modul integrieren
- `docs/WHATSAPP_TEMPLATE_ERSTELLUNG_QUICK_START.md` - In WhatsApp-Modul integrieren

### → `docs/core/` oder `docs/analysis/`
- `docs/backlog.md` - Projekt-Backlog
  - **Entscheidung:** Nach `docs/core/` verschieben, da es Projekt-Management ist

---

## PHASE 6: Duplikate zwischen `implementation_plans/` und `implementation_reports/` bereinigen

### MITARBEITERLEBENSZYKLUS-Dateien

**In `implementation_plans/` (BEHALTEN):**
- `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md` - Hauptplan
- `MITARBEITERLEBENSZYKLUS_PROZESS.md` - Prozessbeschreibung
- `MITARBEITERLEBENSZYKLUS_DETAILLIERT.md` - Detaillierte Spezifikationen
- `MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md` - Zusammenfassung

**In `implementation_reports/` (PRÜFEN & BEREINIGEN):**
- `MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md` - **PRÜFEN:** Ist identisch mit Plan-Version? → LÖSCHEN wenn Duplikat
- `MITARBEITERLEBENSZYKLUS_ZUSAMMENFASSUNG.md` - **PRÜFEN:** Ist identisch mit Plan-Version? → LÖSCHEN wenn Duplikat
- `MITARBEITERLEBENSZYKLUS_TEST_REPORT.md` - **BEHALTEN** (ist Report, nicht Plan)

**In `implementation_plans/` (PRÜFEN & BEREINIGEN):**
- `MITARBEITERLEBENSZYKLUS_AKTUELLER_STAND.md` - Status-Update → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet
- `MITARBEITERLEBENSZYKLUS_STATUS_REPORT.md` - Status-Report → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet
- `MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md` - Fortschritt → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet
- `MITARBEITERLEBENSZYKLUS_NUTZUNGSANLEITUNG.md` - **VERSCHIEBEN** nach `docs/user/` (ist Benutzeranleitung)
- `MITARBEITERLEBENSZYKLUS_IMPLEMENTATION_DETAILS.md` - **PRÜFEN:** Überschneidung mit DETAILLIERT? → KONSOLIDIEREN
- `MITARBEITERLEBENSZYKLUS_PRÜFUNG.md` - Prüfungsdokument → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet
- `MITARBEITERLEBENSZYKLUS_OFFBOARDING_PLAN.md` - Offboarding-Plan → **PRÜFEN:** Teil von Hauptplan? → KONSOLIDIEREN
- `MITARBEITERLEBENSZYKLUS_TODO_DOKUMENTATION.md` - TODO-Dokumentation → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet

### FILTER-Dateien

**In `implementation_plans/` (BEHALTEN - aktuelle Pläne):**
- `FILTER_FUNCTIONALITY_ANALYSIS.md` - Funktionalitätsanalyse
- `FILTER_FUNCTIONALITY_STANDARDIZATION.md` - Standardisierung
- `FILTER_GROUPING_DRAG_DROP.md` - Gruppierung & Drag-Drop
- `FILTER_SORTIERUNG_PRO_FILTER.md` - Sortierung pro Filter
- `FILTER_STANDARDFILTER_ROLES_USERS_PLAN.md` - Standardfilter-Plan

**In `implementation_reports/` (BEREINIGEN):**
- `FILTER_CLEANUP_PLAN.md` - **PRÜFEN:** Ist das ein Plan oder Report? → Ggf. nach plans/ verschieben
- `FILTER_CLEANUP_STATUS.md` - Status-Update → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet
- `FILTER_REFACTORING_DECISIONS.md` - Refactoring-Entscheidungen → **KONSOLIDIEREN** mit anderen Refactoring-Dokumenten
- `FILTER_REFACTORING_DETAILED.md` - Detailliertes Refactoring → **KONSOLIDIEREN** mit anderen Refactoring-Dokumenten
- `FILTER_REFACTORING_FINAL.md` - Finales Refactoring → **KONSOLIDIEREN** mit anderen Refactoring-Dokumenten
- `FILTER_REFACTORING_PROGRESS.md` - Refactoring-Fortschritt → **KONSOLIDIEREN** mit anderen Refactoring-Dokumenten
- `filter_implementation.md` - Implementierungsreport → **BEHALTEN** (ist Report)

**Vorschlag:** Alle FILTER_REFACTORING_* Dateien zu einem Dokument konsolidieren: `FILTER_REFACTORING.md`

### CEREBRO-Dateien

**In `implementation_plans/` (BEHALTEN):**
- `CEREBRO_HIGH_PRIORITY_FEATURES_PLAN.md` - High-Priority-Features-Plan
- `CEREBRO_UNIFIED_EDITOR_PLAN.md` - Unified-Editor-Plan
- `CEREBRO_UNIFIED_EDITOR_REUSE_PLAN.md` - **PRÜFEN:** Überschneidung mit UNIFIED_EDITOR_PLAN? → KONSOLIDIEREN

**In `implementation_reports/` (VERSCHIEBEN):**
- `CEREBRO_ANALYSE.md` - **VERSCHIEBEN** nach `docs/analysis/`
- `CEREBRO_KORRIGIERTE_ANALYSE.md` - **VERSCHIEBEN** nach `docs/analysis/`

---

## PHASE 7: Ähnliche/veraltete Dateien konsolidieren

### LOBBYPMS-Dateien (über 20 Dateien in `implementation_plans/`)

**Hauptdokumentation (KONSOLIDIEREN zu `LOBBYPMS_INTEGRATION.md`):**
- `LOBBYPMS_INTEGRATION.md` - **HAUPTDOKUMENT** (erweitern)
- `LOBBYPMS_ZUSAMMENFASSUNG.md` - **INTEGRIEREN** in Hauptdokument
- `LOBBYPMS_STATUS_UPDATE.md` - **INTEGRIEREN** in Hauptdokument (wenn aktuell)
- `LOBBYPMS_ANBINDUNGEN_ABGESCHLOSSEN.md` - **INTEGRIEREN** in Hauptdokument

**Anleitungen (KONSOLIDIEREN zu `LOBBYPMS_SETUP_ANLEITUNG.md`):**
- `LOBBYPMS_QUICK_START.md` - Quick Start
- `LOBBYPMS_SCHNELLSTART.md` - **PRÜFEN:** Duplikat von QUICK_START? → LÖSCHEN wenn Duplikat
- `LOBBYPMS_KONFIGURATION_SCHRITT_FUER_SCHRITT.md` - Konfiguration
- `LOBBYPMS_KONFIGURATION_UND_TEST_ANLEITUNG.md` - **KONSOLIDIEREN** mit Konfiguration
- `LOBBYPMS_TEST_ANLEITUNG.md` - **KONSOLIDIEREN** mit Konfiguration
- `LOBBYPMS_TEST_UND_KONFIGURATION.md` - **KONSOLIDIEREN** mit Konfiguration
- `LOBBYPMS_TEST_CHECKLISTE.md` - **INTEGRIEREN** in Test-Anleitung
- `LOBBYPMS_TEST_SCHRITT_2.md` - **INTEGRIEREN** in Test-Anleitung

**Status-Updates (PRÜFEN & LÖSCHEN wenn veraltet):**
- `LOBBYPMS_FEHLENDE_KOMPONENTEN.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_FEHLER_BEHOBEN.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_API_ENDPOINT_PROBLEM.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_API_TAB_FEHLERBEHEBUNG.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_WARTEZEIT_PLAN.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_SERVER_NEUSTART.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_FRONTEND_PRÜFUNG.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_INTEGRATION_API_TAB_STATUS.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_INTEGRATION_API_TAB_FINAL_REVIEW.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet
- `LOBBYPMS_INTEGRATION_NEXT_STEPS.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet

**Spezifische Dokumentation (BEHALTEN oder integrieren):**
- `LOBBYPMS_USE_CASES_UND_PROZESSE.md` - **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_WO_IM_SYSTEM_SEHEN.md` - **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_FRONTEND_POSITIONEN.md` - **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_API_RESEARCH.md` - **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_MOCK_DATEN.md` - **BEHALTEN** (oder in Hauptdokument integrieren)
- `LOBBYPMS_API_URL_ERKLAERUNG.md` - **PRÜFEN:** Noch relevant? → LÖSCHEN wenn veraltet

**Ergebnis:**
- Hauptdokument: `LOBBYPMS_INTEGRATION.md` (erweitert)
- Setup-Anleitung: `LOBBYPMS_SETUP_ANLEITUNG.md` (neu, konsolidiert)
- Use Cases: `LOBBYPMS_USE_CASES.md` (aus USE_CASES_UND_PROZESSE)
- Rest: Prüfen und löschen wenn veraltet

### BOLD_PAYMENT-Dateien (7 Dateien in `implementation_plans/`)

**Konsolidieren zu `BOLD_PAYMENT_INTEGRATION.md` oder in `LOBBYPMS_INTEGRATION.md` integrieren:**

- `BOLD_PAYMENT_DOKUMENTATION_ANALYSE.md` - Analyse → **INTEGRIEREN**
- `BOLD_PAYMENT_STATUS.md` - Status → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet
- `BOLD_PAYMENT_SIGV4_IMPLEMENTIERT.md` - SIGV4-Implementierung → **INTEGRIEREN**
- `BOLD_PAYMENT_AUTHENTIFIZIERUNG.md` - Authentifizierung → **INTEGRIEREN**
- `BOLD_PAYMENT_KEY_ZUORDNUNG.md` - Key-Zuordnung → **INTEGRIEREN**
- `BOLD_PAYMENT_API_URL_HINWEIS.md` - API-URL-Hinweis → **INTEGRIEREN**
- `BOLD_PAYMENT_API_LINK_KORRIGIERT.md` - API-Link korrigiert → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet
- `BOLD_PAYMENT_UND_WHATSAPP_KORREKTUR.md` - Korrektur → **PRÜFEN:** Veraltet? → LÖSCHEN wenn veraltet

**Vorschlag:** In `LOBBYPMS_INTEGRATION.md` integrieren, da Bold Payment Teil von LobbyPMS ist.

### WHATSAPP-Dateien in `implementation_plans/`

**Kategorisierung:**

- `WHATSAPP_BRANCH_INTEGRATION.md` - Branch-Integration → **BEHALTEN** (ist Plan)
- `WHATSAPP_LOBBYPMS_RESERVATION_PROCESS.md` - LobbyPMS-Reservierungsprozess → **VERSCHIEBEN** nach `docs/modules/` oder in `LOBBYPMS_INTEGRATION.md` integrieren
- `WHATSAPP_BUSINESS_API_ANLEITUNG.md` - Business API-Anleitung → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren
- `WHATSAPP_BUSINESS_API_GENAU.md` - Business API genau → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren
- `WHATSAPP_BUSINESS_API_QUICK_START.md` - Business API Quick Start → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren
- `WHATSAPP_TOKEN_SCHRITT_FUER_SCHRITT.md` - Token Schritt-für-Schritt → **VERSCHIEBEN** nach `docs/technical/` oder in WhatsApp-Modul integrieren

---

## PHASE 8: Neue Struktur für WhatsApp-Dokumentation

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

## PHASE 9: Weitere Bereinigungen in `implementation_plans/`

### Veraltete/abgeschlossene Pläne prüfen

**Zu prüfen (Status-Updates, die veraltet sein könnten):**
- `ATTACHMENT_PREVIEW_FIX_PLAN.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `ATTACHMENT_PREVIEW_PDF_FIX.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `BEITRITTSANFRAGEN_DEBUG_PLAN.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `BEITRITTSANFRAGEN_EINLADUNGEN_PLAN.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `BUTTON_ANALYSIS_AND_STANDARDIZATION.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `CARD_DESIGN_VORSCHLAEGE.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `CODE_OPTIMIZATION_PLAN.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `DUPLIKAT_BEREINIGUNG_PLAN.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `edit_request_sidepane.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `EXPIRED_REQUESTS_TODOS_MARKING.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `mobile_worktime_screen_redesign_detailed.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `MODAL_UMSTELLUNG_LISTE.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `modern_design.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `PERFORMANCE_OPTIMIZATION.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `PERFORMANCE_OPTIMIZATION_LOADING_SCREEN.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `PERFORMANCE_ATTACHMENTS_OPTIMIZATION.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `task_cerebro_linking.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `todo_attachments.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `worktracker_mobile_app_anpassungen.md` - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen
- `worktracker_table_*.md` (5 Dateien) - **PRÜFEN:** Abgeschlossen? → Verschieben nach reports/ oder löschen

**Analysen die nach `docs/analysis/` gehören:**
- `ORGANISATION_DATENISOLATION_ANALYSE.md` - **VERSCHIEBEN** nach `docs/analysis/`
- `BRANCH_SYSTEM_ANALYSE_UND_PLAN.md` - **PRÜFEN:** Ist das Analyse oder Plan? → Ggf. teilen

**Anleitungen die nach `docs/user/` oder `docs/technical/` gehören:**
- `FRONTEND_KONFIGURATION_SCHRITT_FUER_SCHRITT.md` - **VERSCHIEBEN** nach `docs/user/` oder `docs/technical/`
- `WO_HER_API_KEYS_BEKOMMEN.md` - **VERSCHIEBEN** nach `docs/technical/`

---

## PHASE 10: Weitere Bereinigungen in `implementation_reports/`

**Analysen die nach `docs/analysis/` gehören:**
- `BEITRITTSANFRAGEN_ANALYSE.md` - **VERSCHIEBEN** nach `docs/analysis/`
- `BEITRITTSANFRAGEN_ANALYSE_AKTUALISIERT.md` - **VERSCHIEBEN** nach `docs/analysis/` (oder löschen wenn Duplikat)
- `ORGANISATION_FUNKTIONALITAET_ANALYSE.md` - **VERSCHIEBEN** nach `docs/analysis/`
- `ORGANISATION_FUNKTIONALITAET_ANALYSE_FINAL.md` - **VERSCHIEBEN** nach `docs/analysis/` (oder löschen wenn Duplikat)
- `ROLLE_USERROLE_DELETE_PROBLEM_ANALYSE.md` - **VERSCHIEBEN** nach `docs/analysis/`

**Pläne die nach `implementation_plans/` gehören:**
- `FILTER_CLEANUP_PLAN.md` - **VERSCHIEBEN** nach `implementation_plans/` (ist Plan, nicht Report)

---

## PHASE 11: README-Dateien aktualisieren

**Nach allen Verschiebungen:**
- `README.md` (Projekt-Root) - Verweise aktualisieren
- `docs/claude/README.md` - Verweise aktualisieren

**Wichtig:** Nur Verweise aktualisieren, keine Implementierungsdetails (gemäß Dokumentationshierarchie)

---

## Zusammenfassung der Aktionen

### Zu verschieben:
1. **11 Dateien** aus Projekt-Root → `docs/`
2. **3 Dateien** aus `backend/` → `docs/`
3. **3 Dateien** aus `backend/scripts/` → `docs/`
4. **1 Datei** aus `frontend/` → `docs/`
5. **8 Dateien** aus `docs/` Root → Unterordner
6. **Mehrere Dateien** zwischen `implementation_plans/` und `implementation_reports/` bereinigen
7. **Mehrere Dateien** aus `implementation_plans/` nach `docs/analysis/` oder `docs/user/` verschieben
8. **Mehrere Dateien** aus `implementation_reports/` nach `docs/analysis/` verschieben

### Zu konsolidieren:
1. **LOBBYPMS-Dokumentation** (über 20 Dateien → 3-4 Hauptdokumente)
2. **BOLD_PAYMENT-Dokumentation** (7 Dateien → 1 Hauptdokument oder in LOBBYPMS integrieren)
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
4. **Konsolidierte BOLD_PAYMENT-Dokumentation** (oder in LOBBYPMS integrieren)

---

## Reihenfolge der Umsetzung

1. ✅ **Phase 1**: Dateien aus Projekt-Root verschieben
2. ✅ **Phase 2**: Dateien aus `backend/` verschieben
3. ✅ **Phase 3**: Dateien aus `backend/scripts/` verschieben
4. ✅ **Phase 4**: Dateien aus `frontend/` verschieben
5. ✅ **Phase 5**: Dateien aus `docs/` Root verschieben
6. ✅ **Phase 6**: Duplikate identifizieren und bereinigen
7. ✅ **Phase 7**: Ähnliche Dateien konsolidieren
8. ✅ **Phase 8**: Neue Struktur für WhatsApp erstellen
9. ✅ **Phase 9**: Weitere Bereinigungen in `implementation_plans/`
10. ✅ **Phase 10**: Weitere Bereinigungen in `implementation_reports/`
11. ✅ **Phase 11**: README-Dateien aktualisieren (nur Verweise)

---

## Hinweise

- **Vorsicht bei Löschungen**: Vor dem Löschen immer prüfen ob Inhalt noch relevant ist
- **Konsolidierungen**: Wichtige Informationen aus zu löschenden Dateien in Hauptdokumente integrieren
- **README-Updates**: Nur Verweise aktualisieren, keine Implementierungsdetails (gemäß Dokumentationshierarchie)
- **Prüfung vor Löschung**: Bei allen als "PRÜFEN" markierten Dateien den Inhalt prüfen, bevor gelöscht wird

