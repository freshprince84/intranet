# Offboarding-Prozess - Implementierungsplan

**Erstellt am**: 2025-01-XX  
**Status**: ✅ **ABGESCHLOSSEN** (2025-01-XX)  
**Priorität**: Hoch

---

## 📋 Aktueller Stand

### ✅ Was bereits vorhanden ist:

1. **Backend - Status-Update**:
   - `LifecycleService.updateStatus()` kann Status auf "offboarding" setzen
   - Automatische Task-Erstellung bei Status-Wechsel zu "offboarding"
   - API-Endpoint: `PUT /api/users/:id/lifecycle/status`

2. **Backend - Offboarding-Tasks**:
   - `TaskAutomationService.createOffboardingTasks()` erstellt automatisch:
     - "Crear certificado laboral" (HR-Rolle)
     - "Realizar liquidación final" (HR-Rolle)
     - "Desafiliar de seguridad social" (HR-Rolle)
   - Tasks werden auf Spanisch erstellt

3. **Frontend - Status-Anzeige**:
   - `LifecycleView.tsx` zeigt Status-Badge an
   - Status "offboarding" und "archived" werden angezeigt

### ✅ Was implementiert wurde:

1. **Frontend - Offboarding-Start-UI** ✅:
   - ✅ `OffboardingStartModal.tsx` erstellt
   - ✅ Eingabefelder für `exitDate` (Austrittsdatum) und `exitReason` (Austrittsgrund)
   - ✅ Validierung: exitDate darf nicht mehr als 1 Jahr in der Zukunft liegen
   - ✅ Validierung: exitReason muss mindestens 10 Zeichen haben
   - ✅ Integration in `LifecycleView.tsx` mit Button (nur HR/Admin, nur bei Status "active")
   - ✅ Responsive Design (Mobile: Dialog, Desktop: Sidepane)
   - ✅ Übersetzungen für DE, ES, EN hinzugefügt

2. **Frontend - Offboarding-Progress** ✅:
   - ✅ Progress-Bar für Offboarding-Schritte (orange)
   - ✅ Anzeige der Offboarding-Tasks mit Status (abgeschlossen/offen)
   - ✅ Anzeige von `offboardingStartedAt`, `exitDate` und `exitReason` in Status-Box
   - ✅ Task-Liste mit Icons und Status-Badges

3. **Frontend - Offboarding-Abschluss-UI** ✅:
   - ✅ `OffboardingCompleteModal.tsx` erstellt
   - ✅ Prüfung: Sind alle Offboarding-Tasks abgeschlossen? (Warnung bei unvollständigen)
   - ✅ Bestätigung durch Namenseingabe (Sicherheitsmaßnahme)
   - ✅ Finale Warnung vor Archivierung
   - ✅ Integration in `LifecycleView.tsx` mit Button (nur HR/Admin, nur bei Status "offboarding")
   - ✅ Responsive Design (Mobile: Dialog, Desktop: Sidepane)
   - ✅ Übersetzungen für DE, ES, EN hinzugefügt

4. **Backend - Automatische Arbeitszeugnis-Generierung** ✅:
   - ✅ Beim Status-Wechsel zu "archived" automatisch Arbeitszeugnis generieren
   - ✅ Nur wenn noch kein Zertifikat existiert
   - ✅ Verwendung von `DocumentService.generateCertificate()` mit Standard-Template
   - ✅ Fehlerbehandlung: Fehler werden geloggt, brechen Prozess nicht ab

5. **Backend - Archivierungs-Logik** ✅:
   - ✅ User wird deaktiviert (`active = false`) bei Status "archived"
   - ✅ User wird nicht gelöscht (Daten bleiben erhalten)
   - ✅ Prüfung der Offboarding-Tasks (Warnung bei unvollständigen)
   - ✅ Vollständiger Cleanup-Prozess implementiert

---

## 🎯 Implementierungsplan

### Phase 1: Frontend - Offboarding-Start-UI

**Komponente**: `OffboardingStartModal.tsx` (neu)

**Features**:
- Modal zum Starten des Offboarding-Prozesses
- Eingabefelder:
  - `exitDate`: Date-Picker (Pflichtfeld)
  - `exitReason`: Textarea (Pflichtfeld, z.B. "Kündigung", "Vertragsende", etc.)
- Validierung:
  - exitDate darf nicht in der Vergangenheit liegen (oder doch? - prüfen)
  - exitReason muss mindestens 10 Zeichen haben
- Button "Offboarding starten"
- API-Call: `PUT /api/users/:id/lifecycle/status` mit `{ status: 'offboarding', exitDate, exitReason }`

**Integration**:
- Button in `LifecycleView.tsx` (nur für HR/Admin, nur wenn Status = "active")
- Button-Text: "Offboarding starten" (Spanisch: "Iniciar desvinculación")

**Aufwand**: ~3-4 Stunden

---

### Phase 2: Frontend - Offboarding-Progress-Anzeige

**Komponente**: Erweitere `LifecycleView.tsx`

**Features**:
- Progress-Bar für Offboarding (ähnlich wie Onboarding-Progress)
- Anzeige der Offboarding-Tasks:
  - "Crear certificado laboral" - Status anzeigen
  - "Realizar liquidación final" - Status anzeigen
  - "Desafiliar de seguridad social" - Status anzeigen
- Anzeige von `offboardingStartedAt` und `exitDate`
- Anzeige von `exitReason`

**Aufwand**: ~2-3 Stunden

---

### Phase 3: Frontend - Offboarding-Abschluss-UI

**Komponente**: `OffboardingCompleteModal.tsx` (neu)

**Features**:
- Modal zum Abschließen des Offboarding
- Prüfung: Sind alle Offboarding-Tasks abgeschlossen?
  - Wenn nicht: Warnung anzeigen
  - Wenn ja: Button "Offboarding abschließen" aktivieren
- Bestätigungs-Dialog
- API-Call: `PUT /api/users/:id/lifecycle/status` mit `{ status: 'archived' }`

**Integration**:
- Button in `LifecycleView.tsx` (nur für HR/Admin, nur wenn Status = "offboarding")
- Button-Text: "Offboarding abschließen" (Spanisch: "Completar desvinculación")

**Aufwand**: ~2-3 Stunden

---

### Phase 4: Backend - Automatische Arbeitszeugnis-Generierung

**Datei**: `taskAutomationService.ts` oder `lifecycleService.ts`

**Features**:
- Beim Start des Offboarding automatisch Arbeitszeugnis generieren
- Oder: Beim Abschluss des Tasks "Crear certificado laboral" automatisch generieren
- Verwendung von `DocumentService.generateCertificate()`

**Optionen**:
1. **Option A**: Beim Status-Wechsel zu "offboarding" automatisch generieren
   - Vorteil: Sofort verfügbar
   - Nachteil: Könnte unerwünscht sein, wenn noch Daten fehlen

2. **Option B**: Beim Abschluss des Tasks "Crear certificado laboral" automatisch generieren
   - Vorteil: HR hat Kontrolle
   - Nachteil: Zusätzlicher Schritt

**Empfehlung**: Option B (beim Task-Abschluss)

**Aufwand**: ~2-3 Stunden

---

### Phase 5: Backend - Archivierungs-Logik

**Datei**: `lifecycleService.ts` oder `userController.ts`

**Features**:
- Beim Status-Wechsel zu "archived":
  - User deaktivieren (nicht löschen!)
  - Prisma: `user.update({ where: { id }, data: { isActive: false } })`
  - Oder: Neues Feld `isArchived` im User-Model
  - Zugriff nur noch für Administratoren

**Prisma Schema prüfen**:
- Gibt es bereits ein `isActive` oder `isArchived` Feld?
- Falls nicht: Migration erstellen

**Aufwand**: ~2-3 Stunden

---

## 📊 Gesamt-Aufwand

| Phase | Aufwand | Priorität |
|-------|---------|-----------|
| Phase 1: Offboarding-Start-UI | 3-4h | Hoch |
| Phase 2: Offboarding-Progress | 2-3h | Hoch |
| Phase 3: Offboarding-Abschluss-UI | 2-3h | Hoch |
| Phase 4: Automatische Arbeitszeugnis-Generierung | 2-3h | Mittel |
| Phase 5: Archivierungs-Logik | 2-3h | Mittel |
| **Gesamt** | **11-16h** | |

---

## 🎯 Empfohlene Reihenfolge

1. **Phase 1** (Offboarding-Start-UI) - Grundfunktionalität
2. **Phase 2** (Offboarding-Progress) - Benutzerfreundlichkeit
3. **Phase 3** (Offboarding-Abschluss-UI) - Vollständiger Prozess
4. **Phase 4** (Automatische Arbeitszeugnis-Generierung) - Automatisierung
5. **Phase 5** (Archivierungs-Logik) - Datenverwaltung

---

## 🔍 Gelöste Fragen

1. **exitDate-Validierung**: ✅ Implementiert - exitDate darf nicht mehr als 1 Jahr in der Zukunft liegen (Vergangenheit ist erlaubt)
2. **Automatische Arbeitszeugnis-Generierung**: ✅ Option C implementiert - Beim Status-Wechsel zu "archived" (beim Abschluss)
3. **User-Deaktivierung**: ✅ Implementiert - `active` Feld existiert bereits, wird auf `false` gesetzt
4. **Zugriff auf archivierte User**: ✅ User wird deaktiviert, Administratoren haben weiterhin Zugriff (über `active` Feld)

---

## 📝 Technische Details

### API-Endpoints (bereits vorhanden):
- `PUT /api/users/:id/lifecycle/status` - Status aktualisieren
- `GET /api/users/:id/lifecycle` - Lebenszyklus-Daten abrufen

### Neue API-Endpoints (falls benötigt):
- Keine neuen Endpoints erforderlich

### Frontend-Komponenten:
- `OffboardingStartModal.tsx` (neu)
- `OffboardingCompleteModal.tsx` (neu)
- `LifecycleView.tsx` (erweitern)

### Übersetzungen:
- Alle Texte auf Spanisch (kolumbien-spezifisch)
- DE, ES, EN Übersetzungen hinzufügen

---

## ✅ Definition of Done

- [x] Offboarding kann von HR/Admin gestartet werden
- [x] exitDate und exitReason können eingegeben werden
- [x] Offboarding-Tasks werden automatisch erstellt
- [x] Offboarding-Progress wird angezeigt
- [x] Offboarding kann abgeschlossen werden (Status → "archived")
- [x] User wird bei Archivierung deaktiviert
- [x] Alle Texte sind auf Spanisch
- [x] Validierung funktioniert korrekt
- [x] Fehlerbehandlung ist implementiert

---

## 📝 Implementierungs-Details

### Backend-Änderungen

**Dateien**:
- `backend/src/services/lifecycleService.ts`:
  - `updateStatus()` erweitert um `generatedBy` Parameter
  - Automatische Zertifikats-Generierung beim Status "archived"
  - User-Deaktivierung beim Archivieren
  - Task-Status-Prüfung mit Warnung

- `backend/src/controllers/lifecycleController.ts`:
  - `updateStatus()` übergibt `currentUserId` an Service

### Frontend-Änderungen

**Neue Komponenten**:
- `frontend/src/components/OffboardingStartModal.tsx`:
  - Modal für Offboarding-Start
  - Validierung von exitDate und exitReason
  - Responsive Design (Mobile/Desktop)

- `frontend/src/components/OffboardingCompleteModal.tsx`:
  - Modal für Offboarding-Abschluss
  - Task-Status-Prüfung
  - Bestätigung durch Namenseingabe

**Erweiterte Komponenten**:
- `frontend/src/components/LifecycleView.tsx`:
  - Offboarding-Start-Button (Status "active")
  - Offboarding-Abschluss-Button (Status "offboarding")
  - Offboarding-Progress-Anzeige
  - Offboarding-Daten in Status-Box
  - Task-Liste mit Status

**Übersetzungen**:
- `frontend/src/i18n/locales/de.json`: Alle Offboarding-Texte hinzugefügt
- `frontend/src/i18n/locales/es.json`: Alle Offboarding-Texte hinzugefügt
- `frontend/src/i18n/locales/en.json`: Alle Offboarding-Texte hinzugefügt

### Prozess-Flow

1. **Offboarding starten**:
   - HR/Admin klickt "Offboarding starten" (Status "active")
   - Modal öffnet sich
   - exitDate und exitReason werden eingegeben
   - Status wird auf "offboarding" gesetzt
   - Offboarding-Tasks werden automatisch erstellt

2. **Offboarding-Progress**:
   - Progress-Bar zeigt Fortschritt (basierend auf abgeschlossenen Tasks)
   - Task-Liste zeigt Status jeder Aufgabe
   - Offboarding-Daten werden angezeigt

3. **Offboarding abschließen**:
   - HR/Admin klickt "Offboarding abschließen" (Status "offboarding")
   - Modal öffnet sich
   - Task-Status wird geprüft (Warnung bei unvollständigen)
   - Bestätigung durch Namenseingabe erforderlich
   - Status wird auf "archived" gesetzt
   - Arbeitszeugnis wird automatisch generiert (falls noch keines existiert)
   - User wird deaktiviert (`active = false`)

### Technische Details

**API-Endpoints** (bereits vorhanden):
- `PUT /api/users/:id/lifecycle/status` - Status aktualisieren
- `GET /api/users/:id/lifecycle` - Lebenszyklus-Daten abrufen
- `GET /api/users/:id/lifecycle/certificates` - Zertifikate abrufen
- `GET /api/tasks/user/:userId` - Tasks für User abrufen

**Automatische Prozesse**:
- Beim Status "offboarding": Offboarding-Tasks werden erstellt
- Beim Status "archived": 
  - Arbeitszeugnis wird generiert (falls noch keines existiert)
  - User wird deaktiviert
  - Task-Status wird geprüft (Warnung)

**Validierungen**:
- exitDate: Muss gesetzt sein, darf nicht mehr als 1 Jahr in der Zukunft liegen
- exitReason: Muss gesetzt sein, muss mindestens 10 Zeichen haben
- Bestätigung: Vollständiger Name muss eingegeben werden (beim Abschluss)



- [ ] Offboarding kann von HR/Admin gestartet werden
- [ ] exitDate und exitReason können eingegeben werden
- [ ] Offboarding-Tasks werden automatisch erstellt
- [ ] Offboarding-Progress wird angezeigt
- [ ] Offboarding kann abgeschlossen werden (Status → "archived")
- [ ] User wird bei Archivierung deaktiviert
- [ ] Alle Texte sind auf Spanisch
- [ ] Validierung funktioniert korrekt
- [ ] Fehlerbehandlung ist implementiert


