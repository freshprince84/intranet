# MITARBEITERLEBENSZYKLUS - Aktueller Status & Nächste Schritte

**Erstellt am**: 2025-01-XX  
**Stand**: Nach Analyse von Code und Dokumentation

---

## 📊 Gesamt-Übersicht

| Phase | Status | Fortschritt | Priorität |
|-------|--------|-------------|-----------|
| Phase 1: Datenmodell | ✅ Abgeschlossen | 100% | - |
| Phase 2: Backend Services | ✅ Abgeschlossen | 100% | - |
| Phase 3: API Endpoints | ✅ Abgeschlossen | 100% | - |
| Phase 4: Frontend Components | 🟡 Teilweise | ~85% | 🔴 Hoch |
| Phase 5: PDF-Generierung | 🟡 Teilweise | ~85% | 🟡 Mittel |
| Phase 6: Sozialversicherungen UI | ⏳ Geplant | 0% | 🟡 Mittel |
| Phase 7: Offboarding | ⏳ Geplant | 0% | 🟢 Niedrig |
| Phase 8: Dokumentation | 🟡 Fortlaufend | ~70% | 🟢 Niedrig |

**Gesamt-Fortschritt**: ~92%

---

## ✅ Was ist ERLEDIGT

### Phase 1: Datenmodell ✅
- ✅ Prisma Schema erweitert (EmployeeLifecycle, LifecycleEvent, EmploymentCertificate, EmploymentContract, SocialSecurityRegistration)
- ✅ Migration erstellt und angewendet
- ✅ Enums: EmployeeStatus, SocialSecurityStatus
- ✅ Relations zu User und Organization

### Phase 2: Backend Services ✅
- ✅ `lifecycleService.ts` - Vollständig implementiert:
  - `getLifecycle()`, `createLifecycle()`, `updateStatus()`
  - `getSocialSecurity()`, `updateSocialSecurity()`
  - `getCertificates()`, `createCertificate()`, `updateCertificate()`
  - `getContracts()`, `createContract()`, `updateContract()`
- ✅ `taskAutomationService.ts` - Vollständig implementiert:
  - `createOnboardingTasks()` - Automatische Tasks für ARL, EPS, Pension, Caja
  - `createOffboardingTasks()` - Automatische Tasks für Offboarding
  - Integration mit `Organization.settings.lifecycleRoles`
- ✅ `lifecycleController.ts` - Alle Endpoints implementiert
- ✅ `lifecycleRoles.ts` - Helper-Funktionen für Rollen-Prüfung

### Phase 3: API Endpoints ✅
- ✅ Routes in `backend/src/routes/users.ts` hinzugefügt
- ✅ Routes in `backend/src/routes/organizations.ts` hinzugefügt
- ✅ API-Endpunkte in `frontend/src/config/api.ts` definiert
- ✅ Middleware-Integration (authMiddleware, organizationMiddleware)
- ✅ Permission-Checks implementiert

### Phase 4: Frontend Components 🟡 (~75%)
- ✅ `usePermissions` Hook erweitert:
  - `hasLifecycleRole()`, `isHR()`, `isLegal()`, `loadLifecycleRoles()`
- ✅ `LifecycleTab.tsx` - Für User-Profil erstellt:
  - Onboarding-Status anzeigen
  - Sozialversicherungen-Status anzeigen
  - Progress-Bar für Onboarding
- ✅ `MyDocumentsTab.tsx` - Für User-Profil erstellt:
  - Arbeitszeugnisse anzeigen und herunterladen
  - Arbeitsverträge anzeigen und herunterladen
  - "Aktuell"-Badge für neueste Versionen
  - PDF-Vorschau in iframe
- ✅ `Profile.tsx` erweitert:
  - Tab "Lebenszyklus" hinzugefügt
  - Tab "Meine Dokumente" hinzugefügt
- ✅ HR-Modals erstellt:
  - `CertificateCreationModal.tsx` - Arbeitszeugnis erstellen
  - `ContractCreationModal.tsx` - Arbeitsvertrag erstellen
  - `CertificateEditModal.tsx` - Arbeitszeugnis bearbeiten
  - `ContractEditModal.tsx` - Arbeitsvertrag bearbeiten
  - Alle verwenden Standard-Sidepane-Pattern
  - Tabs für "Daten" und "PDF hochladen"
- ✅ `LifecycleView.tsx` - Für User-Management erstellt:
  - Lebenszyklus-Status anzeigen
  - Arbeitszeugnisse anzeigen/bearbeiten/herunterladen
  - Arbeitsverträge anzeigen/bearbeiten/herunterladen
  - Sozialversicherungen-Status anzeigen
  - Integration mit HR-Modals
- ✅ `UserManagementTab.tsx` erweitert:
  - Tab "Lebenszyklus" hinzugefügt
  - `LifecycleView` integriert
- ✅ Template-Auswahl in Modals implementiert:
  - `CertificateCreationModal.tsx` - Template-Auswahl mit Checkbox
  - `ContractCreationModal.tsx` - Template-Auswahl mit Checkbox
  - Automatische Aktivierung wenn Templates vorhanden
  - Wechsel zwischen Template und PDF-Upload möglich
- ✅ `DocumentConfigurationTab.tsx` vollständig implementiert:
  - Template-Upload mit Typ-Auswahl
  - Template-Liste mit Versionen
  - Signatur-Upload mit Name, Position, Datei
  - Signatur-Liste und -Löschen

### Phase 5: PDF-Generierung 🟡 (~60%)
- ✅ `documentService.ts` erstellt:
  - `generateCertificate()` - Generiert Arbeitszeugnis-PDF
  - `generateContract()` - Generiert Arbeitsvertrag-PDF
  - PDFKit-Integration vorhanden
  - Automatische Verzeichniserstellung
- ✅ Integration in `lifecycleService.ts`:
  - `createCertificate()` generiert automatisch PDF, falls `pdfPath` nicht angegeben
  - `createContract()` generiert automatisch PDF, falls `pdfPath` nicht angegeben
  - Rückwärtskompatibel: Manuell hochgeladene PDFs werden unterstützt
- ✅ Template-System vollständig implementiert:
  - Template-Upload in OrganizationSettings
  - Backend-Endpoints für Template-Verwaltung
  - Template-Auswahl in Modals
  - Automatische Versionierung
- ✅ Signatur-Integration vollständig implementiert:
  - Signatur-Upload in OrganizationSettings
  - Backend-Endpoints für Signatur-Verwaltung
  - Signatur-Integration in PDF-Generierung
  - Automatisches Einfügen in PDFs mit Fallback

---

## ❌ Was noch OFFEN ist

### Phase 4: Frontend Components - Offene Punkte

#### 1. PDF-Vorschau in Modals ✅
**Status**: Vollständig implementiert  
**Priorität**: -  
**Beschreibung**: 
- ✅ PDF-Vorschau in `CertificateCreationModal` und `ContractCreationModal` vorhanden
- ✅ PDF-Vorschau in `CertificateEditModal` und `ContractEditModal` implementiert
- ✅ iframe-basierte Vorschau mit 400px Höhe

#### 2. Template-Auswahl in Modals ✅
**Status**: Implementiert  
**Priorität**: -  
**Beschreibung**:
- ✅ Template-Auswahl in CertificateCreationModal und ContractCreationModal implementiert
- ✅ Checkbox für Template-Verwendung
- ✅ Dropdown für verfügbare Templates
- ✅ Wechsel zwischen Template und PDF-Upload möglich

#### 3. Text-Bearbeitung in Modals ⚠️
**Status**: Nicht implementiert  
**Priorität**: 🟡 Mittel  
**Beschreibung**:
- HR sollte Text in Templates bearbeiten können
- Aktuell: Nur PDF-Upload, keine Text-Bearbeitung
- Benötigt: Rich-Text-Editor oder Markdown-Editor für Template-Inhalte

#### 4. Automatische Daten-Vorausfüllung ✅
**Status**: Vollständig implementiert  
**Priorität**: -  
**Beschreibung**:
- ✅ `CertificateCreationModal` lädt User-Daten beim Öffnen
- ✅ `ContractCreationModal` lädt User- und Lifecycle-Daten beim Öffnen
- ✅ Automatisches Setzen von Datum, Gehalt, Position, Vertragstyp, etc.

#### 5. Validierung und Fehlerbehandlung ✅
**Status**: Vollständig implementiert  
**Priorität**: -  
**Beschreibung**:
- ✅ Inline-Validierung mit visuellen Fehleranzeigen (rote Border)
- ✅ Spezifische Fehlermeldungen für alle Felder
- ✅ Echtzeit-Validierung beim Eingeben
- ✅ ARIA-Attribute für Barrierefreiheit
- ✅ Client-seitige Validierung vor Submit

### Phase 5: PDF-Generierung - Offene Punkte

#### 1. Template-System ✅
**Status**: Vollständig implementiert  
**Priorität**: -  
**Beschreibung**:
- ✅ Template-Upload in OrganizationSettings implementiert
- ✅ Backend-Endpoints für Template-Verwaltung
- ✅ Template-Versionierung automatisch (1.0, 1.1, 2.0, etc.)
- ✅ Template-Erkennung in PDF-Generierung (`loadTemplatePDF()`, `fillTemplatePDF()`)
- ✅ PDF-Lib integriert für Template-Bearbeitung
- ✅ Text-Einfügung an definierten Positionen vollständig implementiert
- ✅ Standard-Positionen als Fallback
- ✅ Positionen aus Settings werden unterstützt

#### 2. Signatur-Integration ✅
**Status**: Vollständig implementiert  
**Priorität**: -  
**Beschreibung**:
- ✅ Signatur-Upload in OrganizationSettings implementiert
- ✅ Backend-Endpoints für Signatur-Verwaltung
- ✅ Signatur-Positionierung im PDF (Standard-Werte, konfigurierbar)
- ✅ Signatur-Einbindung in PDF-Generierung mit Fallback
- ✅ Erweiterte Signatur-Positionierung (UI für X, Y, Seite)
- ✅ Positionen werden in Signatur-Liste angezeigt

#### 3. Template-Editor ⚠️
**Status**: Nicht implementiert  
**Priorität**: 🟢 Niedrig  
**Beschreibung**:
- UI für Template-Bearbeitung fehlt
- Template-Variablen-System fehlt
- Template-Vorschau fehlt

### Phase 6: Sozialversicherungen UI ✅

**Status**: Abgeschlossen  
**Priorität**: -  

**Abgeschlossene Schritte**:
- ✅ UI für Legal-Rolle zur Bearbeitung von Sozialversicherungen (`SocialSecurityEditor.tsx`)
- ✅ Status-Updates mit Notizen
- ✅ Integration in LifecycleView
- ✅ Backend-Berechtigungen erweitert (GET-Endpoint für Legal)
- ✅ Seed-File erweitert (Derecho-Rolle)

**Offene Schritte**:
- [ ] Email-Template-Generierung für Anwalt - **Priorität: Niedrig**
- [ ] Automatische Daten-Generierung für Anmeldungen - **Priorität: Niedrig**

### Phase 7: Offboarding ⏳

**Status**: Nicht gestartet  
**Priorität**: 🟢 Niedrig  

**Geplante Schritte**:
- [ ] Offboarding-Prozess-UI
- [ ] Automatische Arbeitszeugnis-Generierung bei Offboarding
- [ ] Abrechnungs-Tasks
- [ ] Abmeldung bei Sozialversicherungen
- [ ] Archivierungs-Logik

---

## 🎯 NÄCHSTE SCHRITTE (Priorisiert)

### 🟡 MITTEL - Als nächstes

#### 1. Positionen-Konfiguration in Organization.settings
**Aufwand**: ~4-6 Stunden  
**Voraussetzung**: Template-Variablen-System existiert bereits  
**Dateien**:
- `frontend/src/components/organization/DocumentConfigurationTab.tsx`
- Neue Komponente: `frontend/src/components/organization/FieldPositionEditor.tsx` (optional)

**Umsetzung**:
- UI für Konfiguration von Template-Feld-Positionen
- Eingabefelder für X, Y, FontSize für jedes Feld
- Vorschau der Positionen (optional)
- Speicherung in `Organization.settings.documentTemplates[type].fields`

---

### 🟢 NIEDRIG - Später

#### 7. Text-Bearbeitung in Modals
**Aufwand**: ~6-8 Stunden  
**Voraussetzung**: Template-System muss vollständig sein  
**Dateien**:
- Alle Modal-Komponenten

**Umsetzung**:
- Rich-Text-Editor oder Markdown-Editor integrieren
- Template-Variablen-System
- Vorschau der bearbeiteten Inhalte

#### 8. Offboarding-Prozess
**Aufwand**: ~8-10 Stunden  
**Dateien**:
- Neue Komponente: `frontend/src/components/OffboardingView.tsx`
- `backend/src/services/offboardingService.ts` (erweitern)

**Umsetzung**:
- Offboarding-UI erstellen
- Automatische Arbeitszeugnis-Generierung
- Abrechnungs-Tasks
- Archivierungs-Logik

---

## 📝 Technische Details

### Bekannte Probleme

1. **PDF-Vorschau in iframe**: Funktioniert in MyDocumentsTab, sollte auch in Modals funktionieren
2. **Template-Variablen-System**: Templates können hochgeladen werden, aber noch keine automatische Befüllung mit Daten
3. **Signatur-Positionierung**: Standard-Werte funktionieren, aber keine UI für manuelle Positionierung (x, y, page)

### Code-Qualität

- ✅ TypeScript-Typisierung vorhanden
- ✅ Error-Handling implementiert
- ✅ Konsistente Code-Struktur
- ⚠️ Einige TODOs in Code vorhanden (z.B. in LifecycleTab.tsx Zeile 209)

### Testing

- ⚠️ Keine automatisierten Tests vorhanden
- ⚠️ Manuelle Tests empfohlen für:
  - Certificate/Contract Creation Flow
  - PDF-Generierung
  - Task Automation

---

## 🔄 Empfohlene Reihenfolge

1. **Sofort**: PDF-Vorschau in Modals + Automatische Daten-Vorausfüllung + Validierung
2. **Dann**: Template-Variablen-System + Sozialversicherungen UI
3. **Später**: Text-Bearbeitung + Offboarding

---

## 📚 Referenzen

- **Hauptplan**: [MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md](./MITARBEITERLEBENSZYKLUS_IMPLEMENTATION.md)
- **Fortschritts-Tracking**: [MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md](./MITARBEITERLEBENSZYKLUS_FORTSCHRITT.md)
- **Implementierungsdetails**: [MITARBEITERLEBENSZYKLUS_IMPLEMENTATION_DETAILS.md](./MITARBEITERLEBENSZYKLUS_IMPLEMENTATION_DETAILS.md)
- **Prozess-Beschreibung**: [MITARBEITERLEBENSZYKLUS_PROZESS.md](./MITARBEITERLEBENSZYKLUS_PROZESS.md)

---

**Letzte Aktualisierung**: 2025-01-XX  
**Nächste Review**: Nach Abschluss der nächsten Schritte

