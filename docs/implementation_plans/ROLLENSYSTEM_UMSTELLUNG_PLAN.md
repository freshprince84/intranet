# Plan: Rollensystem Umstellung

**Erstellt:** 2024  
**Status:** Planungsphase  
**Priorität:** Hoch

## Zusammenfassung der Anforderung

Änderung des Rollensystems für neue Benutzer und Organisationen:

1. **Neue Registrierung:** User-Rolle (statt Hamburger-Rolle), ohne Organisation
2. **Organisation gründen:** Admin-Rolle der neuen Organisation (User-Rolle ohne Org bleibt bestehen)
3. **Organisation beitreten:** Hamburger-Rolle der Organisation

## Aktuelle Situation

### ✅ Was bereits korrekt ist:

1. **Organisation erstellen (`organizationController.ts`):**
   - ✅ Admin-Rolle wird erstellt und zugewiesen
   - ✅ User-Rolle ohne Organisation bleibt bestehen (wird nicht gelöscht)
   - ✅ Hamburger-Rolle wird für die Organisation erstellt

2. **Organisation beitreten (`joinRequestController.ts`):**
   - ✅ Hamburger-Rolle wird verwendet, wenn keine Rolle angegeben (Zeile 271-280)

### ❌ Was geändert werden muss:

1. **Registrierung (`authController.ts`):**
   - ❌ Aktuell: Hamburger-Rolle (ID 999) wird zugewiesen
   - ✅ Soll: User-Rolle (ID 2) wird zugewiesen

2. **Organisation beitreten (`organizationController.ts`):**
   - ❌ Aktuell: Hamburger-Rolle wird verwendet (Zeile 895-909)
   - ✅ Soll: Hamburger-Rolle verwenden (ist bereits korrekt, aber konsistent halten)

3. **Seed-File (`seed.ts`):**
   - ⚠️ User-Rolle Berechtigungen prüfen (sollten ausreichend sein für neue Benutzer)
   - ⚠️ Hamburger-Rolle ohne Organisation kann aufgeräumt werden (aber Vorsicht bei bestehenden Usern!)

## Detaillierter Implementierungsplan

### Phase 1: Backend-Anpassungen

#### Schritt 1.1: Registrierung ändern (`authController.ts`)

**Datei:** `backend/src/controllers/authController.ts`

**Änderungen:**
- Zeile 61-69: Hamburger-Rolle (ID 999) → User-Rolle (ID 2)
- Zeile 124: Token-Rolle-ID anpassen

**Code:**
```typescript
// ALT:
const hamburgerRole = await prisma.role.findUnique({
    where: { id: 999 }
});

// NEU:
const userRole = await prisma.role.findUnique({
    where: { id: 2 }
});

if (!userRole) {
    console.error('User-Rolle nicht gefunden');
    return res.status(500).json({ message: 'User-Rolle nicht gefunden' });
}

// Im User erstellen:
role: {
    connect: {
        id: userRole.id  // statt hamburgerRole.id
    }
}

// Im Token:
roleId: userRole.id  // statt hamburgerRole.id
```

#### Schritt 1.2: Organisation beitreten konsistent machen

**Datei:** `backend/src/controllers/organizationController.ts`

**Status:** Bereits korrekt (verwendet Hamburger-Rolle), aber prüfen ob konsistent mit `joinRequestController.ts`

**Datei:** `backend/src/controllers/joinRequestController.ts`

**Status:** Bereits korrekt (verwendet Hamburger-Rolle wenn keine Rolle angegeben)

**Prüfen:** Beide Controller sollten dasselbe Verhalten haben

#### Schritt 1.3: Seed-File prüfen und anpassen

**Datei:** `backend/prisma/seed.ts`

**WICHTIG:** Hamburger-Rolle Berechtigungen müssen korrekt bleiben!

**Prüfen:**
- User-Rolle (ID 2) hat ausreichende Berechtigungen für neue Benutzer ohne Organisation
- Hamburger-Rolle ohne Organisation (ID 999) kann entfernt werden (aber Vorsicht bei Migration!)
- **Hamburger-Rolle in Organisationen** muss die ursprünglichen Berechtigungen haben (OHNE `page_usermanagement` und `page_organization_management`)
  - Aktuell wurde `page_usermanagement` und `page_organization_management` hinzugefügt (Zeile 360-361)
  - Das muss rückgängig gemacht werden für Hamburger-Rolle in Organisationen!
  - Ursprüngliche Berechtigungen: `page_dashboard`, `page_settings`, `page_profile`, `page_cerebro`, `button_cerebro`, `button_settings_profile`, `table_notifications`

**Mögliche Aufräumarbeiten:**
- Hamburger-Rolle ohne Organisation (ID 999) ist nicht mehr nötig für neue Registrierungen
- ABER: Bestehende Benutzer mit Hamburger-Rolle (ID 999) müssen migriert werden!
- Hamburger-Rolle in Organisationen behält ihre ursprünglichen Basis-Berechtigungen (ohne Organisation-Seite)

#### Schritt 1.3: Seed-File prüfen und anpassen

**Datei:** `backend/prisma/seed.ts`

**WICHTIG:** Hamburger-Rolle Berechtigungen müssen korrekt bleiben!

**Prüfen:**
- User-Rolle (ID 2) hat ausreichende Berechtigungen für neue Benutzer ohne Organisation ✅
- Hamburger-Rolle ohne Organisation (ID 999) kann entfernt werden (aber Vorsicht bei Migration!)
- **Hamburger-Rolle in Organisationen** muss die ursprünglichen Berechtigungen haben (OHNE `page_usermanagement` und `page_organization_management`)
  - ❌ Aktuell wurde `page_usermanagement` und `page_organization_management` hinzugefügt (Zeile 360-361)
  - ✅ Muss entfernt werden für Hamburger-Rolle in Organisationen!
  - ✅ Ursprüngliche Berechtigungen: `page_dashboard`, `page_settings`, `page_profile`, `page_cerebro`, `button_cerebro`, `button_settings_profile`, `table_notifications`

**Änderungen:**
- Zeile 355-361: Kommentar "Basis-Berechtigungen + Organisation-Seite" → "Basis-Berechtigungen" ändern
- Zeile 360-361: `page_usermanagement` und `page_organization_management` entfernen

**Mögliche Aufräumarbeiten:**
- Hamburger-Rolle ohne Organisation (ID 999) ist nicht mehr nötig für neue Registrierungen
- ABER: Bestehende Benutzer mit Hamburger-Rolle (ID 999) müssen migriert werden!
- Hamburger-Rolle in Organisationen behält ihre ursprünglichen Basis-Berechtigungen (ohne Organisation-Seite)

### Phase 2: Migration bestehender Benutzer

#### Schritt 2.1: Script erstellen für Migration

**Neue Datei:** `backend/scripts/migrateHamburgerToUser.ts`

**Zweck:** Alle bestehenden Benutzer mit Hamburger-Rolle (ID 999) auf User-Rolle (ID 2) migrieren

**Logik:**
1. Finde alle UserRole-Einträge mit roleId = 999
2. Prüfe ob User bereits User-Rolle (ID 2) hat
3. Falls nicht, erstelle UserRole-Eintrag mit roleId = 2
4. Falls Hamburger-Rolle lastUsed = true, setze User-Rolle auf lastUsed = true
5. Optional: Hamburger-Rolle (ID 999) UserRole-Einträge löschen (nur wenn User-Rolle vorhanden)

#### Schritt 2.2: Script erstellen für Hamburger-Rolle Berechtigungen korrigieren

**Neue Datei:** `backend/scripts/removeOrganizationPermissionsFromHamburger.ts`

**Zweck:** Entferne `page_usermanagement` und `page_organization_management` Berechtigungen von allen Hamburger-Rollen in Organisationen

**Logik:**
1. Finde alle Hamburger-Rollen mit `organizationId != null`
2. Entferne Berechtigungen `page_usermanagement` und `page_organization_management` von diesen Rollen
3. Logge alle Änderungen

### Phase 3: Dokumentation

#### Schritt 3.1: Dokumentation aktualisieren

**Dateien:**
- `docs/technical/BERECHTIGUNGSSYSTEM.md`: Rollenbeschreibung aktualisieren
- `docs/implementation_plans/ORGANISATION_DATENISOLATION_PLAN.md`: Neue Logik dokumentieren
- `docs/user/BENUTZERHANDBUCH.md`: Benutzerhandbuch aktualisieren (falls relevant)

**Änderungen:**
- User-Rolle beschreiben als Standard-Rolle für neue Registrierungen
- Hamburger-Rolle beschreiben als Rolle für Benutzer, die einer Organisation beitreten
- **WICHTIG:** Hamburger-Rolle hat nur Basis-Berechtigungen (OHNE Organisation-Seite) - das muss klar dokumentiert werden!

### Phase 4: Frontend-Anpassungen (falls nötig)

#### Schritt 4.1: Frontend prüfen

**Zu prüfen:**
- Gibt es Hardcoded-Checks auf Hamburger-Rolle bei Registrierung?
- Werden Rollen-Namen im Frontend angezeigt? (müssen ggf. angepasst werden)
- Gibt es spezielle UI-Logik für Hamburger-Rolle?

## Risiken und Überlegungen

### ⚠️ Risiken:

1. **Bestehende Benutzer:** Benutzer mit Hamburger-Rolle (ID 999) müssen migriert werden
2. **Berechtigungen:** User-Rolle muss ausreichende Berechtigungen haben für neue Benutzer ohne Organisation
3. **Hamburger-Rolle Berechtigungen:** Die Hamburger-Rolle in Organisationen muss die ursprünglichen Berechtigungen behalten (OHNE `page_usermanagement` und `page_organization_management`)
4. **Konsistenz:** Zwei Controller für Join-Requests (`organizationController.ts` und `joinRequestController.ts`) - beide müssen konsistent sein

### ✅ Vorteile:

1. **Klare Rollenstruktur:** User-Rolle für neue Benutzer ist klarer als "Hamburger"
2. **Konsistenz:** Hamburger-Rolle wird nur noch für Organisationen verwendet
3. **Wartbarkeit:** Einfachere Logik, weniger Verwirrung

## Implementierungsreihenfolge

1. ✅ **Phase 1:** Backend-Anpassungen
   - 1.1: Registrierung ändern
   - 1.2: Join-Request konsistent machen
   - 1.3: Seed-File prüfen

2. ✅ **Phase 2:** Migration bestehender Benutzer
   - 2.1: Migration-Script erstellen und ausführen

3. ✅ **Phase 3:** Dokumentation
   - 3.1: Dokumentation aktualisieren

4. ✅ **Phase 4:** Frontend (falls nötig)
   - 4.1: Frontend prüfen und anpassen

## Test-Szenarien

1. **Neue Registrierung:**
   - Benutzer registriert sich → erhält User-Rolle (ID 2), keine Organisation

2. **Organisation gründen:**
   - Benutzer mit User-Rolle gründet Organisation → erhält Admin-Rolle der Organisation, User-Rolle bleibt bestehen

3. **Organisation beitreten:**
   - Benutzer mit User-Rolle tritt Organisation bei → erhält Hamburger-Rolle der Organisation, User-Rolle bleibt bestehen

4. **Migration:**
   - Bestehende Benutzer mit Hamburger-Rolle (ID 999) werden auf User-Rolle (ID 2) migriert

