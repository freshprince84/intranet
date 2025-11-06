# Bereinigungsplan: Umstellung von `usermanagement` auf `organization_management`

**Datum:** $(date)
**Ziel:** Alle Berechtigungen von `usermanagement` (page) auf `organization_management` (page) umstellen
**Grund:** Konsistenz mit dem Namen "Organisation" und Vereinfachung der Berechtigungsstruktur

## DB-Status (vor Bereinigung)

- ✅ `usermanagement` (page): 4 Berechtigungen vorhanden
- ✅ `organization_management` (page): 5 Berechtigungen vorhanden
- ❌ **Problem:** Beide Varianten existieren parallel

## Umstellungsplan

### Phase 1: Code-Änderungen

#### 1.1 Frontend - UserManagement.tsx
**Datei:** `frontend/src/pages/UserManagement.tsx`
- **Zeile 25:** `hasPermission('usermanagement', 'read', 'page')` 
  → Ändern zu: `hasPermission('organization_management', 'read', 'page')`

#### 1.2 Frontend - Sidebar.tsx
**Datei:** `frontend/src/components/Sidebar.tsx`
- **Zeile 21:** `'usermanagement'` im PageName type
  → Ändern zu: `'organization_management'`
- **Zeile 137:** `page: 'usermanagement'`
  → Ändern zu: `page: 'organization_management'`
- **Zeile 154:** `hasPermission(item.page)` wird automatisch `organization_management` prüfen

#### 1.3 Frontend - RoleManagementTab.tsx
**Datei:** `frontend/src/components/RoleManagementTab.tsx`
- **Zeile 34:** `'usermanagement'` aus ALL_PAGES entfernen (nicht mehr nötig)
- **Zeile 128-132:** Mapping von Tabellen zu `usermanagement`
  → Ändern zu: `'organization_management'`
- **Zeile 157-166:** Mapping von Buttons zu `usermanagement`
  → Ändern zu: `'organization_management'`
- **Zeile 342:** Translation key `'usermanagement'` 
  → Kann bleiben (für Übersetzung), aber Kommentar anpassen
- **Zeile 1361, 1698:** Kommentare anpassen

#### 1.4 Backend - routes/roles.ts
**Datei:** `backend/src/routes/roles.ts`
- **Zeile 20:** `permission.entity === 'usermanagement'`
  → Ändern zu: `permission.entity === 'organization_management'`
- **Zeile 40:** `permission.entity === 'usermanagement'`
  → Ändern zu: `permission.entity === 'organization_management'`
- **Zeile 28, 49:** Log-Messages anpassen

#### 1.5 Backend - seed.ts
**Datei:** `backend/prisma/seed.ts`
- **Zeile 26:** `'usermanagement'` aus ALL_PAGES entfernen
- **Zeile 27:** `'organization_management'` bleibt (ist bereits korrekt)
- **Zeile 318:** Kommentar anpassen
- **Zeile 326:** `userPermissionMap['page_usermanagement']` entfernen
- **Zeile 327:** `userPermissionMap['page_organization_management']` bleibt

#### 1.6 Backend - organizationController.ts
**Datei:** `backend/src/controllers/organizationController.ts`
- **Zeile 184:** `'usermanagement'` aus ALL_PAGES entfernen
- **Zeile 185:** `'organization_management'` bleibt
- **Kommentar anpassen:** "Wird in roles.ts Route geprüft" bleibt korrekt

#### 1.7 i18n Übersetzungen
**Dateien:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`
- **de.json Zeile 460:** `"usermanagement"` key kann bleiben (für Rückwärtskompatibilität)
- **en.json Zeile 467, 1082:** `"usermanagement"` key kann bleiben
- **es.json Zeile 468, 1083:** `"usermanagement"` key kann bleiben
- **Hinweis:** Keys können bleiben für evtl. alte Daten, werden aber nicht mehr verwendet

### Phase 2: Datenbank-Bereinigung

#### 2.1 Migration Script erstellen
**Datei:** `backend/scripts/migrateUsermanagementToOrganizationManagement.ts`

**Funktionalität:**
1. Alle `usermanagement` (page) Berechtigungen finden
2. Für jede Rolle prüfen:
   - Existiert bereits `organization_management` (page)?
   - Wenn ja: `usermanagement` löschen (doppelt)
   - Wenn nein: `usermanagement` zu `organization_management` umbenennen
3. Logging aller Änderungen
4. Rollback-Funktion vorbereiten

#### 2.2 Script ausführen
- Script testen
- Backup der Datenbank erstellen
- Script ausführen
- Ergebnisse prüfen

### Phase 3: Alte Scripts aufräumen

#### 3.1 Scripts anpassen oder löschen
**Dateien:**
- `backend/scripts/addOrganizationPermissionsToUser.ts` - anpassen oder löschen
- `backend/scripts/addHamburgerOrganizationPermissions.ts` - anpassen oder löschen  
- `backend/scripts/removeOrganizationPermissionsFromHamburger.ts` - anpassen oder löschen

**Entscheidung:** Diese Scripts waren Workarounds und sollten nicht mehr benötigt werden.

### Phase 4: Dokumentation aktualisieren

#### 4.1 Dokumentationsdateien
- `docs/technical/BERECHTIGUNGSSYSTEM.md` - aktualisieren
- `docs/implementation_plans/ROLLENSYSTEM_UMSTELLUNG_PLAN.md` - Kommentare anpassen
- `docs/implementation_plans/ORGANISATION_DATENISOLATION_PLAN.md` - Kommentare anpassen
- `docs/analysis/BERECHTIGUNGEN_ORGANISATION_ANALYSE.md` - als abgeschlossen markieren

## Zusammenfassung der Änderungen

### Code-Änderungen
- ✅ Frontend: 3 Dateien
- ✅ Backend: 3 Dateien  
- ✅ i18n: 3 Dateien (optional, Keys können bleiben)
- ✅ Scripts: 1 neues Script, 3 alte Scripts aufräumen

### Datenbank-Änderungen
- ✅ Migration: `usermanagement` → `organization_management`
- ✅ Erwartetes Ergebnis: Nur noch `organization_management` (page) vorhanden

### Risiken
- ⚠️ **Mittel:** Code-Änderungen sind lokalisiert und gut nachvollziehbar
- ⚠️ **Niedrig:** Datenbank-Migration ist reversibel (Backup)
- ⚠️ **Niedrig:** Rollback möglich durch Script

## Nächste Schritte

1. ✅ Code-Änderungen durchführen
2. ✅ Migration-Script erstellen
3. ✅ Script testen
4. ✅ Datenbank migrieren
5. ✅ Alte Scripts aufräumen
6. ✅ Dokumentation aktualisieren
7. ✅ Testen der Funktionalität

## Status: ✅ ABGESCHLOSSEN

**Datum:** 2025-01-21
**Ergebnis:** Alle Berechtigungen wurden erfolgreich von `usermanagement` auf `organization_management` umgestellt.

Siehe auch: `docs/analysis/BERECHTIGUNGEN_ORGANISATION_VERIFIKATION.md` für detaillierte Verifikationsergebnisse.

