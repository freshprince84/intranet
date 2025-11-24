# Passwort-Manager - Fortschrittsbericht

## Übersicht
**Startdatum:** 2025-01-22  
**Status:** ⏳ Geplant (noch nicht gestartet)  
**Hauptplan:** [PASSWORTMANAGER_IMPLEMENTATION_VOLLSTAENDIG.md](../implementation_plans/PASSWORTMANAGER_IMPLEMENTATION_VOLLSTAENDIG.md)

---

## Phasen-Status

| Phase | Status | Startdatum | Enddatum | Fortschritt | Notizen |
|-------|--------|------------|----------|-------------|---------|
| Phase 1: Datenbank-Schema | ✅ Abgeschlossen | 2025-01-22 | 2025-01-22 | 100% | Prisma Schema erweitert, Migration erstellt, Prisma Client generiert |
| Phase 2: Backend | ⏳ Geplant | - | - | 0% | - |
| Phase 3: Frontend | ⏳ Geplant | - | - | 0% | - |
| Phase 4: Testing | ⏳ Geplant | - | - | 0% | - |
| Phase 5: Auto-Fill (Browser-Extension) | ⏳ Geplant | - | - | 0% | MUSS implementiert werden |

**Legende:**
- ⏳ Geplant
- 🟡 In Arbeit
- ✅ Abgeschlossen
- ⚠️ Blockiert
- ❌ Abgebrochen

**Gesamt-Fortschritt:** 20% (Phase 1 abgeschlossen)

---

## Phase 1: Datenbank-Schema

### Status: ⏳ Geplant

#### 1.1 Prisma Schema erweitern
- [x] `PasswordEntry` Model hinzufügen
- [x] `PasswordEntryRolePermission` Model hinzufügen
- [x] `PasswordEntryUserPermission` Model hinzufügen
- [x] `PasswordEntryAuditLog` Model hinzufügen
- [x] Relations zu bestehenden Models hinzufügen (User, Organization, Role)

#### 1.2 Migration erstellen
- [x] Migration erstellen: `20250122120000_add_password_manager`
- [x] Migration erfolgreich ausgeführt
- [x] Prisma Client generiert: `npx prisma generate`
- [x] Datenbank-Schema validiert

**Notizen:**
- 

---

## Phase 2: Backend

### Status: ⏳ Geplant

#### 2.1 Controller erstellen
- [ ] `backend/src/controllers/passwordManagerController.ts` erstellen
- [ ] `getPasswordEntries()` - Alle Einträge abrufen (mit Berechtigungsprüfung)
- [ ] `getPasswordEntryById()` - Einzelnen Eintrag abrufen
- [ ] `getPasswordEntryPassword()` - Passwort entschlüsselt abrufen (mit Audit-Log)
- [ ] `createPasswordEntry()` - Neuen Eintrag erstellen
- [ ] `updatePasswordEntry()` - Eintrag aktualisieren
- [ ] `deletePasswordEntry()` - Eintrag löschen
- [ ] `generatePassword()` - Passwort generieren
- [ ] `getAuditLogs()` - Audit-Logs abrufen

#### 2.2 Verschlüsselung implementieren
- [ ] `encryptPassword()` - Passwort verschlüsseln (AES-256-GCM)
- [ ] `decryptPassword()` - Passwort entschlüsseln
- [ ] ENCRYPTION_KEY-Prüfung beim Start implementieren
- [ ] Fehlerbehandlung für Verschlüsselung

#### 2.3 Berechtigungen implementieren
- [ ] `checkPasswordEntryPermission()` - Eintrag-Berechtigung prüfen
- [ ] `checkPagePermission()` - Seiten-Berechtigung prüfen
- [ ] Middleware für Berechtigungsprüfung
- [ ] Fehlerbehandlung für fehlende Berechtigungen

#### 2.4 Audit-Logging implementieren
- [ ] `createAuditLog()` - Audit-Log erstellen
- [ ] Audit-Logs für alle Aktionen: `view`, `view_password`, `copy_password`, `create`, `update`, `delete`
- [ ] IP-Adresse und User-Agent speichern
- [ ] Details als JSON speichern

#### 2.5 Routes erstellen
- [ ] `backend/src/routes/passwordManager.ts` erstellen
- [ ] Route: `GET /api/password-manager/entries` - Alle Einträge
- [ ] Route: `GET /api/password-manager/entries/:id` - Einzelner Eintrag
- [ ] Route: `GET /api/password-manager/entries/:id/password` - Passwort abrufen
- [ ] Route: `POST /api/password-manager/entries` - Eintrag erstellen
- [ ] Route: `PUT /api/password-manager/entries/:id` - Eintrag aktualisieren
- [ ] Route: `DELETE /api/password-manager/entries/:id` - Eintrag löschen
- [ ] Route: `POST /api/password-manager/generate-password` - Passwort generieren
- [ ] Route: `GET /api/password-manager/audit-logs` - Audit-Logs abrufen
- [ ] Routes in `backend/src/app.ts` registrieren
- [ ] `authenticateToken` Middleware hinzufügen
- [ ] `checkPermission` Middleware hinzufügen

#### 2.6 Rate-Limiting implementieren
- [ ] Rate-Limiting-Middleware erstellen
- [ ] Max. 10 Anfragen pro Minute pro User
- [ ] Rate-Limiting für Passwort-Manager-Endpunkte aktivieren
- [ ] Fehlerbehandlung für Rate-Limit-Überschreitung

#### 2.7 URL-Validierung implementieren
- [ ] URL-Validierung für Passwort-Manager-URLs
- [ ] Schutz vor JavaScript-URLs (javascript:, data:, etc.)
- [ ] SSRF-Schutz implementieren
- [ ] Nur http:// und https:// erlauben

#### 2.8 Seed-File aktualisieren
- [ ] Berechtigungen in `backend/prisma/seed.ts` hinzufügen
- [ ] `password_manager` - Seiten-Berechtigung
- [ ] `password_entry_create` - Button-Berechtigung
- [ ] `password_entry_edit` - Button-Berechtigung
- [ ] `password_entry_delete` - Button-Berechtigung
- [ ] Seed ausführen: `npx prisma db seed`

**Notizen:**
- 

---

## Phase 3: Frontend

### Status: ⏳ Geplant

#### 3.1 Übersetzungen hinzufügen
- [ ] `frontend/src/i18n/locales/de.json` - Deutsche Übersetzungen
- [ ] `frontend/src/i18n/locales/en.json` - Englische Übersetzungen
- [ ] `frontend/src/i18n/locales/es.json` - Spanische Übersetzungen
- [ ] Alle Texte übersetzt (keine hardcodierten Texte)

#### 3.2 API-Endpunkte definieren
- [ ] `frontend/src/services/api.ts` erweitern (falls nötig)
- [ ] `frontend/src/services/passwordManagerApi.ts` erstellen
- [ ] `getPasswordEntries()` - API-Funktion
- [ ] `getPasswordEntryById()` - API-Funktion
- [ ] `getPasswordEntryPassword()` - API-Funktion
- [ ] `createPasswordEntry()` - API-Funktion
- [ ] `updatePasswordEntry()` - API-Funktion
- [ ] `deletePasswordEntry()` - API-Funktion
- [ ] `generatePassword()` - API-Funktion
- [ ] `getAuditLogs()` - API-Funktion
- [ ] Fehlerbehandlung implementiert

#### 3.3 Sidepane-Komponente erstellen
- [ ] `frontend/src/components/PasswordEntrySidepane.tsx` erstellen
- [ ] Sidepane-Pattern implementiert (Desktop >640px)
- [ ] Modal-Pattern implementiert (Mobile <640px)
- [ ] `useSidepane()` Hook verwendet
- [ ] Responsive Breakpoints: 640px (Mobile), 1070px (Large Screen)
- [ ] Formular mit Validierung
- [ ] Icon-only Buttons (XMarkIcon für Cancel, CheckIcon für Save)
- [ ] Dark Mode Support
- [ ] URL-Validierung im Frontend
- [ ] Passwort-Generierung-UI
- [ ] Passwort-Stärke-Anzeige

#### 3.4 Tab-Komponente erstellen
- [ ] `frontend/src/components/PasswordManagerTab.tsx` erstellen
- [ ] Liste aller Einträge anzeigen
- [ ] Suchfunktion implementiert
- [ ] Filter-Funktion (optional)
- [ ] Sortierung implementiert
- [ ] Berechtigungsprüfung mit `usePermissions()` Hook
- [ ] "Erstellen"-Button (mit Berechtigungsprüfung)
- [ ] "Bearbeiten"-Button (mit Berechtigungsprüfung)
- [ ] "Löschen"-Button (mit Berechtigungsprüfung)
- [ ] "Passwort kopieren"-Button
- [ ] "Öffnen & Passwort kopieren"-Button
- [ ] "Passwort anzeigen"-Button
- [ ] URL als klickbarer Link
- [ ] Clipboard-Operationen implementiert
- [ ] Toast-Benachrichtigungen
- [ ] Loading-States
- [ ] Error-Handling
- [ ] Dark Mode Support

#### 3.5 Settings-Seite erweitern
- [ ] `frontend/src/pages/Settings.tsx` öffnen
- [ ] Tab-Type erweitern: `'password_manager'` hinzufügen
- [ ] Tab-Button hinzufügen (mit KeyIcon)
- [ ] Tab-Content hinzufügen (`PasswordManagerTab`)
- [ ] Import hinzufügen
- [ ] Dark Mode Support für Tab-Button

#### 3.6 Auto-Fill Funktionalität (Phase 1 - Manuell)
- [ ] `handleOpenAndCopy()` - URL öffnen + Passwort kopieren
- [ ] `handleCopyPassword()` - Nur Passwort kopieren
- [ ] URL-Validierung vor dem Öffnen
- [ ] Clipboard-Operationen mit Fehlerbehandlung
- [ ] Toast-Benachrichtigungen
- [ ] Audit-Log wird automatisch erstellt (Backend)

**Notizen:**
- 

---

## Phase 4: Testing

### Status: ⏳ Geplant

#### 4.1 Funktionalitätstests
- [ ] CRUD-Operationen testen (Create, Read, Update, Delete)
- [ ] Passwort-Generierung testen
- [ ] Passwort-Stärke-Anzeige testen
- [ ] Verschlüsselung testen (Passwort verschlüsselt gespeichert)
- [ ] Entschlüsselung testen (Passwort korrekt entschlüsselt)
- [ ] Berechtigungen testen (Admin, User, Hamburger)
- [ ] Eintrag-Berechtigungen testen (Rolle/User)
- [ ] Audit-Logs testen (alle Aktionen protokolliert)
- [ ] Auto-Fill testen (Links öffnen, Passwort kopieren)
- [ ] URL-Validierung testen (nur http://, https://)
- [ ] Rate-Limiting testen (max. 10 Anfragen/Minute)

#### 4.2 UI/UX-Tests
- [ ] Sidepane auf Desktop testen (>640px)
- [ ] Modal auf Mobile testen (<640px)
- [ ] Responsive Design testen (640px, 1070px Breakpoints)
- [ ] Dark Mode testen
- [ ] Alle Buttons funktionieren
- [ ] Alle Formulare validieren korrekt
- [ ] Fehlermeldungen werden angezeigt
- [ ] Loading-States werden angezeigt
- [ ] Toast-Benachrichtigungen funktionieren

#### 4.3 Mehrsprachigkeit testen
- [ ] Deutsch (de) - Alle Texte korrekt
- [ ] Englisch (en) - Alle Texte korrekt
- [ ] Spanisch (es) - Alle Texte korrekt
- [ ] Keine hardcodierten Texte vorhanden

#### 4.4 Sicherheitstests
- [ ] Verschlüsselung testen (Passwort nicht im Klartext)
- [ ] Berechtigungen testen (kein Zugriff ohne Berechtigung)
- [ ] Rate-Limiting testen (Brute-Force-Schutz)
- [ ] URL-Validierung testen (SSRF-Schutz)
- [ ] XSS-Schutz testen (React automatisch)
- [ ] SQL-Injection-Schutz testen (Prisma automatisch)

**Notizen:**
- 

---

## Phase 5: Auto-Fill (Browser-Extension)

### Status: ⏳ Geplant

**⚠️ WICHTIG:** Diese Phase MUSS implementiert werden (nicht optional!)

#### 5.1 Browser-Extension erstellen
- [ ] Chrome-Extension erstellen
- [ ] Firefox-Extension erstellen (optional)
- [ ] Manifest-Datei erstellen
- [ ] Content Script erstellen
- [ ] Background Script erstellen
- [ ] Popup-Script erstellen

#### 5.2 Content Script implementieren
- [ ] Login-Felder erkennen (input[type="password"], input[name*="user"], etc.)
- [ ] URL extrahieren und mit gespeicherten Einträgen vergleichen
- [ ] Popup mit passenden Einträgen anzeigen
- [ ] Automatisches Ausfüllen von Username/Password
- [ ] Manuelle Bestätigung vor Auto-Fill

#### 5.3 Sicherheit implementieren
- [ ] URL-Validierung vor Auto-Fill (nur wenn URL exakt übereinstimmt)
- [ ] Phishing-Schutz (URL-Vergleich)
- [ ] DOM-basiertes Clickjacking-Schutz (CSP, Frame-Busting)
- [ ] Keylogger-Schutz
- [ ] Certificate Pinning (optional)

#### 5.4 API-Integration
- [ ] Kommunikation zwischen Extension und System über API
- [ ] Authentifizierung (JWT-Token)
- [ ] Rate-Limiting
- [ ] Audit-Log für jeden Auto-Fill-Vorgang

#### 5.5 Testing
- [ ] Extension auf verschiedenen Webseiten testen
- [ ] Login-Felder korrekt erkannt
- [ ] Auto-Fill funktioniert korrekt
- [ ] Sicherheitstests (Phishing-Schutz, Clickjacking-Schutz)
- [ ] Performance-Tests

**Notizen:**
- 

---

## Kritische Risiken & Maßnahmen

### 🔴 SOFORT beheben (vor Produktion):

1. **Rate-Limiting fehlt** - Brute-Force-Schutz unvollständig
   - [ ] Rate-Limiting-Middleware implementiert
   - [ ] Max. 10 Anfragen/Minute pro User
   - [ ] Fehlerbehandlung für Rate-Limit-Überschreitung

2. **ENCRYPTION_KEY-Prüfung fehlt** - Keine Validierung ob Key gesetzt ist
   - [ ] ENCRYPTION_KEY-Prüfung beim Start implementiert
   - [ ] Fehlerbehandlung wenn Key fehlt

3. **URL-Validierung für Passwort-Manager fehlt** - SSRF-Risiko
   - [ ] URL-Validierung implementiert
   - [ ] Nur http:// und https:// erlauben
   - [ ] Schutz vor JavaScript-URLs

4. **Phishing-Schutz fehlt** - Keine URL-Validierung vor Auto-Fill
   - [ ] URL-Validierung vor Auto-Fill (Phase 5)
   - [ ] Manuelle Bestätigung vor Auto-Fill

5. **DOM-basiertes Clickjacking** - Browser-Extension-Schutz fehlt (Phase 5)
   - [ ] CSP für Extension
   - [ ] Frame-Busting-Code

### 🟡 Sollten behoben werden:

6. **Certificate Pinning fehlt** - Man-in-the-Middle-Schutz unvollständig
   - [ ] Certificate Pinning für Extension (Phase 5)

7. **CSP-Header fehlt** - XSS-Schutz unvollständig
   - [ ] CSP-Header im Backend hinzufügen

8. **Backup-Strategie fehlt** - Datenverlust-Risiko
   - [ ] Backup-Strategie dokumentieren
   - [ ] Regelmäßige Backups planen

9. **Token-Rotation fehlt** - Session-Hijacking-Schutz unvollständig
   - [ ] Token-Rotation bei sensiblen Operationen (optional)

---

## Fortschritts-Tracking

### Commits

**WICHTIG:** Nach JEDEM erledigten Schritt:
1. Checkbox abhaken (☑️)
2. Commit erstellen mit aussagekräftiger Message
3. Zum nächsten Schritt gehen

**Commit-Message-Format:**
```
Passwort-Manager: [Phase X] [Schritt] - [Beschreibung]

Beispiele:
- Passwort-Manager: Phase 1 - Prisma Schema erweitert
- Passwort-Manager: Phase 2 - Controller erstellt
- Passwort-Manager: Phase 3 - Sidepane-Komponente erstellt
```

### Rollback-Strategie

**Bei größeren Änderungen:**
- [ ] Branch erstellen vor größeren Änderungen
- [ ] Regelmäßige Commits
- [ ] Möglichkeit zum Zurückrollen bei Fehlern

**Beispiel:**
```bash
git checkout -b feature/password-manager-phase-1
# ... Änderungen ...
git commit -m "Passwort-Manager: Phase 1 - Prisma Schema erweitert"
git push origin feature/password-manager-phase-1
```

---

## Zusammenfassung

### Abgeschlossene Phasen:
- Keine (noch nicht gestartet)

### Aktuelle Phase:
- ⏳ Phase 1: Datenbank-Schema (geplant)

### Nächste Schritte:
1. Phase 1 starten: Prisma Schema erweitern
2. Migration erstellen und ausführen
3. Prisma Client generieren

### Erwartete Verbesserungen:
- Sichere Speicherung von Zugangsdaten
- Granulare Berechtigungen pro Eintrag
- Auto-Fill-Funktionalität (wie KeePass)
- Vollständige Audit-Logs
- Passwort-Generierung
- Passwort-Stärke-Anzeige

---

## Notizen & Probleme

### Bekannte Probleme:
- 

### Offene Fragen:
- 

### Änderungen am Plan:
- 

---

**Letzte Aktualisierung:** 2025-01-22  
**Nächste Überprüfung:** Nach jedem abgeschlossenen Schritt

