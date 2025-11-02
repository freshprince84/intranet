# Sprachunterstützung - Implementierungsplan

## Überblick

Implementierung eines vollständigen Mehrsprachigkeitssystems, das folgende Funktionalität bietet:
- Organisationen können eine Standard-Sprache festlegen
- Benutzer können ihre individuelle Spracheinstellung festlegen und die Organisation-Sprache überschreiben
- Alle UI-Texte (Menüpunkte, Buttons, Labels, etc.) werden entsprechend der gewählten Sprache angezeigt

## Aktueller Stand

### Bereits vorhanden:
✅ **Datenbankschema:**
- `User.language` (String, default "es") - bereits im Schema vorhanden
- `Organization.settings` (Json?) - bereits vorhanden, kann für Organisation-Sprache verwendet werden
- `Settings` Model (für User-Einstellungen) - vorhanden

✅ **Frontend:**
- Sprache-Auswahl in `Profile.tsx` vorhanden
- Sprache-Auswahl in `UserManagementTab.tsx` vorhanden
- User-Sprache wird in Formularen gespeichert

❌ **Fehlend:**
- Kein i18n-System implementiert (react-i18next oder ähnlich)
- Keine Übersetzungsdateien
- Menüpunkte sind hardcoded (alle auf Deutsch)
- UI-Texte sind hardcoded
- Keine Logik zur Bestimmung der aktiven Sprache
- Keine Organisation-Sprache-Einstellung
- `User.language` wird nicht verwendet (nur gespeichert)

## Zielsprachen

Basierend auf dem Code sind folgende Sprachen vorgesehen:
- **es** (Spanisch) - Standard
- **de** (Deutsch) - aktuell die meisten hardcoded Texte
- **en** (Englisch)

## Architektur

### Sprach-Priorität:
1. **User-Einstellung** (höchste Priorität) - falls Benutzer eine Sprache gewählt hat
2. **Organisation-Einstellung** - falls keine User-Einstellung, wird Organisation-Sprache verwendet
3. **Fallback** - "de" (Deutsch) als Standard-Fallback

### Datenstruktur:

**Organisation-Sprache:**
```json
{
  "language": "de"
}
```
Gespeichert in `Organization.settings` JSON-Feld

**User-Sprache:**
- Weiterhin in `User.language` gespeichert (keine Schema-Änderung nötig)
- Optional: Kann auch in `Settings.language` gespeichert werden, wenn gewünscht

## Implementierungsschritte

### Phase 1: Backend - Organisation-Sprache-Support

#### 1.1 Organization Controller erweitern

**Datei:** `backend/src/controllers/organizationController.ts`

**Neue/Erweiterte Funktionen:**

```typescript
// Organisation-Sprache-Einstellung abrufen
export const getOrganizationLanguage = async (req: Request, res: Response) => {
  // Liest language aus Organization.settings JSON-Feld
  // Fallback: null (dann wird User-Sprache oder default verwendet)
}

// Organisation-Sprache-Einstellung aktualisieren
export const updateOrganizationLanguage = async (req: Request, res: Response) => {
  // Speichert language in Organization.settings JSON-Feld
  // Validierung: Nur erlaubte Sprachen (es, de, en)
}

// updateOrganization erweitern
// Unterstützung für settings.language beim Update
```

**Validierung:**
```typescript
const languageSchema = z.enum(['es', 'de', 'en']);
```

**Neue Routes:**
```
GET /api/organizations/:id/language
PUT /api/organizations/:id/language
```

#### 1.2 User Controller erweitern

**Datei:** `backend/src/controllers/userController.ts`

**Neue Funktionen:**

```typescript
// Aktive Sprache für User bestimmen
export const getUserActiveLanguage = async (req: Request, res: Response) => {
  // Logik:
  // 1. Prüfe User.language (falls gesetzt)
  // 2. Falls nicht, hole Organisation-Sprache aus settings
  // 3. Falls auch nicht, Fallback auf "de"
  // Gibt die aktive Sprache zurück
}
```

**Neue Route:**
```
GET /api/users/active-language
```

#### 1.3 API Routes erweitern

**Datei:** `backend/src/routes/organizationRoutes.ts` (falls vorhanden)

**Hinzufügen:**
```typescript
router.get('/:id/language', getOrganizationLanguage);
router.put('/:id/language', updateOrganizationLanguage);
```

### Phase 2: Frontend - i18n-System Setup

#### 2.1 Dependencies installieren

**Datei:** `frontend/package.json`

**Hinzufügen:**
```json
{
  "dependencies": {
    "react-i18next": "^15.0.0",
    "i18next": "^24.0.0",
    "i18next-browser-languagedetector": "^8.0.0"
  }
}
```

**Befehl:**
```bash
cd frontend && npm install react-i18next i18next i18next-browser-languagedetector
```

#### 2.2 i18n-Konfiguration

**Neue Datei:** `frontend/src/i18n/config.ts`

**Inhalt:**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import deTranslations from './locales/de.json';
import esTranslations from './locales/es.json';
import enTranslations from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: deTranslations },
      es: { translation: esTranslations },
      en: { translation: enTranslations }
    },
    fallbackLng: 'de',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

#### 2.3 Übersetzungsdateien erstellen

**Struktur:**
```
frontend/src/i18n/locales/
  ├── de.json (Deutsch)
  ├── es.json (Spanisch)
  └── en.json (Englisch)
```

**Basis-Struktur für alle Dateien:**
```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "create": "Erstellen",
    "loading": "Laden..."
  },
  "menu": {
    "dashboard": "Dashboard",
    "worktracker": "Worktracker",
    "consultations": "Beratungen",
    "workcenter": "Workcenter",
    "payroll": "Lohnabrechnung",
    "cerebro": "Cerebro",
    "organization": "Organisation",
    "settings": "Einstellungen"
  },
  "settings": {
    "title": "Einstellungen",
    "personal": "Persönlich",
    "notifications": "Benachrichtigungen",
    "system": "System",
    "language": "Sprache",
    "darkMode": "Dark Mode",
    "organizationLanguage": "Organisationssprache"
  },
  "profile": {
    "title": "Profil",
    "username": "Benutzername",
    "email": "E-Mail",
    "firstName": "Vorname",
    "lastName": "Nachname"
  }
}
```

**Hinweis:** Alle drei Dateien (de.json, es.json, en.json) müssen die gleiche Struktur haben, nur mit unterschiedlichen Übersetzungen.

#### 2.4 i18n in App integrieren

**Datei:** `frontend/src/index.tsx` oder `frontend/src/App.tsx`

**Hinzufügen:**
```typescript
import './i18n/config';
```

**Wichtig:** Muss ganz oben importiert werden, bevor die App rendert.

#### 2.5 Language Service erstellen

**Neue Datei:** `frontend/src/services/languageService.ts`

**Funktionen:**
```typescript
// Aktive Sprache für aktuellen User abrufen
export const getActiveLanguage = async (): Promise<string> => {
  // API-Call zu /api/users/active-language
  // Setzt i18n.language entsprechend
}

// Sprache ändern
export const setUserLanguage = async (language: string): Promise<void> => {
  // API-Call um User.language zu aktualisieren
  // Setzt i18n.language neu
}

// Organisation-Sprache setzen
export const setOrganizationLanguage = async (language: string): Promise<void> => {
  // API-Call um Organization.settings.language zu aktualisieren
}
```

### Phase 3: Frontend - Komponenten anpassen

#### 3.1 Sidebar - Menüpunkte übersetzen

**Datei:** `frontend/src/components/Sidebar.tsx`

**Änderungen:**
- `useTranslation` Hook verwenden
- Alle hardcoded Menü-Namen durch `t('menu.dashboard')` etc. ersetzen

**Vorher:**
```typescript
{
  name: 'Dashboard',
  path: '/dashboard',
  ...
}
```

**Nachher:**
```typescript
const { t } = useTranslation();

{
  name: t('menu.dashboard'),
  path: '/dashboard',
  ...
}
```

#### 3.2 Settings-Seite - Sprache-Einstellung hinzufügen

**Datei:** `frontend/src/pages/Settings.tsx`

**Hinzufügen:**
- Neuer Abschnitt "Sprache" im "Persönlich"-Tab
- Dropdown zur Auswahl der Benutzer-Sprache
- Optional: Anzeige der aktuellen Organisation-Sprache (nur informativ)

**Komponente:**
```typescript
<div className="flex items-center justify-between">
  <div>
    <h3 className="text-lg font-medium dark:text-white">{t('settings.language')}</h3>
    <p className="text-gray-600 dark:text-gray-400">
      Sprache für die Benutzeroberfläche
    </p>
  </div>
  <select
    value={userLanguage}
    onChange={(e) => handleLanguageChange(e.target.value)}
    className="..."
  >
    <option value="">{t('settings.useOrganizationLanguage')}</option>
    <option value="de">Deutsch</option>
    <option value="es">Español</option>
    <option value="en">English</option>
  </select>
</div>
```

#### 3.3 Organization Settings - Sprache-Einstellung

**Datei:** `frontend/src/components/organization/OrganizationSettings.tsx`

**Hinzufügen:**
- Neuer Abschnitt für Organisation-Sprache
- Dropdown zur Auswahl der Organisation-Sprache
- Nur sichtbar für Benutzer mit `canManageOrganization` Berechtigung

#### 3.4 Profile - Sprache-Anzeige anpassen

**Datei:** `frontend/src/pages/Profile.tsx`

**Änderungen:**
- Label "Language" übersetzen
- Option-Texts übersetzen (Spanisch, Deutsch, Englisch)

#### 3.5 Weitere Komponenten

**Systematisches Vorgehen:**

1. **Alle Labels und Texte identifizieren:**
   - Durch Code-Scan nach hardcoded deutschen/spanischen Texten suchen
   - Übersetzungsdateien entsprechend erweitern

2. **Komponenten nach und nach umstellen:**
   - Wichtigste zuerst: Sidebar, Header, Settings, Profile
   - Dann: Forms, Modals, Buttons
   - Zum Schluss: Fehlermeldungen, Bestätigungen

3. **Übersetzungsdateien kontinuierlich erweitern:**
   - Bei jeder Komponente neue Keys hinzufügen
   - Struktur logisch organisieren (z.B. nach Seiten/Modulen)

### Phase 4: Language Context und Hooks

#### 4.1 Language Context erstellen

**Neue Datei:** `frontend/src/contexts/LanguageContext.tsx`

**Funktionalität:**
- Verwaltet aktive Sprache
- Lädt User- und Organisation-Sprache beim Login
- Stellt Hook `useLanguage()` bereit
- Automatisches Update bei Sprach-Änderung

**Verwendung:**
```typescript
const { activeLanguage, setUserLanguage, organizationLanguage } = useLanguage();
```

#### 4.2 Language Hook erstellen

**Neue Datei:** `frontend/src/hooks/useLanguage.ts`

**Funktionalität:**
- Wrapper um `useTranslation` von react-i18next
- Automatisches Laden der aktiven Sprache beim Mount
- Automatisches Update von i18n bei Sprach-Änderung

### Phase 5: Initialisierung beim Login

#### 5.1 Auth Hook erweitern

**Datei:** `frontend/src/hooks/useAuth.tsx` (oder ähnlich)

**Änderungen:**
- Nach erfolgreichem Login aktive Sprache laden
- i18n entsprechend setzen

**Flow:**
1. User loggt sich ein
2. User-Daten werden geladen (inkl. `User.language`)
3. Aktive Sprache wird bestimmt (User → Organisation → Fallback)
4. i18n.language wird gesetzt
5. UI wird in der richtigen Sprache angezeigt

### Phase 6: Testing und Verfeinerung

#### 6.1 Funktions-Tests:
- [ ] Sprache wird beim Login korrekt geladen
- [ ] User-Sprache überschreibt Organisation-Sprache
- [ ] Organisation-Sprache wird verwendet, wenn keine User-Sprache gesetzt
- [ ] Fallback funktioniert korrekt
- [ ] Sprach-Änderung wird sofort in der UI übernommen
- [ ] Menüpunkte werden übersetzt
- [ ] Alle wichtigen UI-Texte werden übersetzt

#### 6.2 Edge Cases:
- [ ] Was passiert, wenn User keine Sprache hat?
- [ ] Was passiert, wenn Organisation keine Sprache hat?
- [ ] Was passiert bei ungültiger Sprache?
- [ ] Persistenz nach Reload/Logout

## Dateien-Übersicht

### Backend (neu/geändert):
- `backend/src/controllers/organizationController.ts` - Erweitern
- `backend/src/controllers/userController.ts` - Erweitern
- `backend/src/routes/organizationRoutes.ts` - Erweitern (falls vorhanden)

### Frontend (neu):
- `frontend/src/i18n/config.ts` - i18n-Konfiguration
- `frontend/src/i18n/locales/de.json` - Deutsche Übersetzungen
- `frontend/src/i18n/locales/es.json` - Spanische Übersetzungen
- `frontend/src/i18n/locales/en.json` - Englische Übersetzungen
- `frontend/src/services/languageService.ts` - Language Service
- `frontend/src/contexts/LanguageContext.tsx` - Language Context
- `frontend/src/hooks/useLanguage.ts` - Language Hook

### Frontend (geändert):
- `frontend/src/index.tsx` oder `App.tsx` - i18n importieren
- `frontend/src/components/Sidebar.tsx` - Menüpunkte übersetzen
- `frontend/src/pages/Settings.tsx` - Sprache-Einstellung hinzufügen
- `frontend/src/pages/Profile.tsx` - Sprache-Labels übersetzen
- `frontend/src/components/organization/OrganizationSettings.tsx` - Organisation-Sprache hinzufügen
- `frontend/src/components/UserManagementTab.tsx` - Sprache-Labels übersetzen
- Alle weiteren Komponenten mit hardcoded Texten (nach und nach)

### Package.json:
- `frontend/package.json` - Dependencies hinzufügen

## Implementierungsreihenfolge (Empfehlung)

1. **Backend-API erweitern** (Phase 1)
   - Organisation-Sprache-Endpoints
   - User aktive Sprache-Endpoint
   - Testen mit Postman/curl

2. **i18n-System Setup** (Phase 2)
   - Dependencies installieren
   - Basis-Konfiguration
   - Erste Übersetzungsdateien (minimal)

3. **Basis-Funktionalität** (Phase 3.1, 3.2, 4)
   - Sidebar übersetzen
   - Settings-Seite Sprache-Einstellung
   - Language Context und Hook
   - Login-Integration (Phase 5)

4. **Erweiterte Komponenten** (Phase 3.3-3.5)
   - Weitere Komponenten nach und nach
   - Übersetzungsdateien erweitern

5. **Testing und Verfeinerung** (Phase 6)

## Wichtige Hinweise

- **Keine Schema-Änderung nötig:** `User.language` existiert bereits, `Organization.settings` auch
- **Schrittweise Migration:** Nicht alle Texte auf einmal übersetzen, sondern nach Priorität
- **Übersetzungsqualität:** Für produktive Nutzung sollten professionelle Übersetzungen eingeholt werden
- **Fallback-Mechanismus:** Wichtig, dass immer eine Sprache angezeigt wird, auch wenn keine gesetzt ist
- **Performance:** i18n-Übersetzungen werden gelazy-loaded, sollte kein Performance-Problem sein

## Migration bestehender Daten

- Bestehende `User.language` Werte bleiben erhalten
- Neue Organisationen haben standardmäßig keine Sprache gesetzt (dann Fallback)
- Bestehende Organisationen müssen Sprache manuell setzen (oder Migration-Script schreiben)

## Offene Fragen / Entscheidungen benötigt

1. **Soll `User.language` auch in `Settings.language` gespeichert werden?**
   - Aktuell: Nur in `User.language`
   - Alternative: In `Settings` Model erweitern für Konsistenz

2. **Standard-Sprache für neue Organisationen?**
   - Aktuell: Keine (Fallback "de")
   - Alternative: Automatisch "de" setzen bei Erstellung

3. **Welche Sprachen sollen unterstützt werden?**
   - Aktuell: es, de, en
   - Weitere Sprachen später einfach hinzufügbar

4. **Soll Browser-Sprache erkannt werden?**
   - i18next-browser-languagedetector ist bereits in der Konfiguration
   - Kann als letzter Fallback verwendet werden

