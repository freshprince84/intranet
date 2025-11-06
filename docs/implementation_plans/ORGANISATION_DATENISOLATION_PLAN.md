# Plan: Organisation - Vollständige Multi-Tenant Datenisolation

**Erstellt:** 2024  
**Status:** Planungsphase  
**Priorität:** Hoch

## Zusammenfassung der aktuellen Situation

### ✅ Was bereits funktioniert:

1. **Organisation-Erstellung:**
   - ✅ Unique Constraint behoben (Name wird lowercase normalisiert)
   - ✅ Standard-Rollen werden erstellt (Admin, User, Hamburger) mit allen Berechtigungen
   - ✅ Ersteller wird automatisch Admin-Rolle zugewiesen
   - ✅ Ersteller sieht nach Erstellung nur seine Organisation

2. **Hamburger-Rolle Berechtigungen:**
   - ✅ Hamburger-Rolle hat Zugriff auf `page_usermanagement` (Seite sichtbar)
   - ✅ Hamburger-Rolle hat Zugriff auf `page_organization_management` (Tab "Organisation" aktiv)
   - ✅ Benutzer- und Rollen-Tabs sind sichtbar, aber mit "PRO"-Markierung
   - ✅ Implementiert in seed.ts und organizationController.ts

2. **Join Request System:**
   - ✅ Hamburger-Rolle wird automatisch zugewiesen wenn keine Rolle angegeben
   - ✅ JoinRequest-Controller funktioniert

3. **User-Filterung:**
   - ✅ `getUserOrganizationFilter` funktioniert korrekt
   - ✅ User sehen nur User ihrer Organisation

### ⚠️ Was NICHT funktioniert (kritische Probleme):

1. **Tasks/Requests/WorkTimes Datenisolation:**
   - ❌ **Tasks:** User mit Organisation sehen nur eigene Tasks (responsibleId/qualityControlId = userId)
   - ❌ **Requests:** User mit Organisation sehen nur eigene Requests (requesterId/responsibleId = userId)
   - ❌ **WorkTimes:** User mit Organisation sehen nur eigene WorkTimes (userId = userId)
   - **Problem:** Sollten ALLE Daten ihrer Organisation sehen, nicht nur eigene!

2. **Branches:**
   - ❌ Keine Filterung nach Organisation implementiert
   - **Problem:** Branches sind global, sollten organisations-spezifisch sein

3. **Rollen:**
   - ❌ `getAllRoles` zeigt alle Rollen (auch von anderen Organisationen)
   - ❌ `createRole` verwendet hardcoded `organizationId: 1`
   - **Problem:** Sollte nur Rollen der eigenen Organisation zeigen/erstellen

4. **Clients & Consultations:**
   - ❌ Keine Organisation-Filterung implementiert
   - **Problem:** Clients sind global, sollten organisations-spezifisch sein

5. **Consultations (WorkTimes mit clientId):**
   - ❌ `getConsultations` filtert nur nach userId, nicht nach Organisation
   - **Problem:** Sollte alle Consultations der Organisation zeigen

## Anforderungen

### Für Benutzer MIT Organisation:

1. **Nach Organisation-Erstellung:**
   - ✅ Ersteller wird automatisch Admin der neuen Organisation
   - ✅ Ersteller sieht nur Daten seiner Organisation
   - ✅ Ersteller kann nur User/Rollen/Branches seiner Organisation verwalten

2. **Für neue Registrierungen:**
   - ✅ User-Rolle ohne Organisation (kostenlos, für sich selbst)
   - ✅ Kann einer Organisation beitreten → Hamburger-Rolle in dieser Organisation
   - ✅ Kann eigene Organisation erstellen → Admin-Rolle der neuen Organisation (User-Rolle bleibt bestehen)
   - ✅ Nach Beitritt/Erstellung: Nur Daten der eigenen Organisation sehen

### Datenisolation-Regeln:

**Standalone User (ohne Organisation):**
- Nur eigene Tasks/Requests/WorkTimes
- Nur eigene Clients
- Kann keine User/Rollen verwalten
- Kann keine Branches verwalten

**User MIT Organisation:**
- **ALLES** von seiner Organisation sehen (Tasks/Requests/WorkTimes/Clients/Branches/User/Rollen)
- **NICHTS** von anderen Organisationen sehen
- Kann nur User/Rollen/Branches seiner Organisation verwalten

## Detaillierter Implementierungsplan

### Phase 1: getDataIsolationFilter erweitern ⚠️ KRITISCH

**Problem:** Aktuell filtert es nur nach User-ID, nicht nach Organisation.

**Lösung:** Filter muss prüfen ob User eine Organisation hat:
- **JA:** Zeige ALLE Daten wo User der Organisation angehört
- **NEIN:** Zeige nur eigene Daten

#### Schritt 1.1: Tasks-Filter erweitern
```typescript
case 'task':
  if (!req.organizationId) {
    // Standalone: Nur eigene
    return {
      OR: [
        { responsibleId: userId },
        { qualityControlId: userId }
      ]
    };
  }
  
  // Mit Organisation: ALLE Tasks der Organisation
  return {
    OR: [
      {
        responsible: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      },
      {
        qualityControl: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      }
    ]
  };
```

#### Schritt 1.2: Requests-Filter erweitern
```typescript
case 'request':
  if (!req.organizationId) {
    // Standalone: Nur eigene
    return {
      OR: [
        { requesterId: userId },
        { responsibleId: userId }
      ]
    };
  }
  
  // Mit Organisation: ALLE Requests der Organisation
  return {
    OR: [
      {
        requester: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      },
      {
        responsible: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      }
    ]
  };
```

#### Schritt 1.3: WorkTimes-Filter erweitern
```typescript
case 'worktime':
  if (!req.organizationId) {
    // Standalone: Nur eigene
    return { userId: userId };
  }
  
  // Mit Organisation: ALLE WorkTimes der Organisation
  return {
    user: {
      roles: {
        some: {
          role: {
            organizationId: req.organizationId
          }
        }
      }
    }
  };
```

#### Schritt 1.4: Clients-Filter hinzufügen (NEU)
```typescript
case 'client':
  if (!req.organizationId) {
    // Standalone: Nur Clients, die der User verwendet hat
    return {
      workTimes: {
        some: {
          userId: userId
        }
      }
    };
  }
  
  // Mit Organisation: ALLE Clients der Organisation (via WorkTimes)
  return {
    workTimes: {
      some: {
        user: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      }
    }
  };
```

#### Schritt 1.5: Branches-Filter hinzufügen (NEU)
```typescript
case 'branch':
  if (!req.organizationId) {
    // Standalone: Nur Branches wo User Mitglied ist
    return {
      users: {
        some: {
          userId: userId
        }
      }
    };
  }
  
  // Mit Organisation: ALLE Branches der Organisation (via Users)
  return {
    users: {
      some: {
        user: {
          roles: {
            some: {
              role: {
                organizationId: req.organizationId
              }
            }
          }
        }
      }
    }
  };
```

#### Schritt 1.6: Roles-Filter hinzufügen (NEU)
```typescript
case 'role':
  if (!req.organizationId) {
    // Standalone: Nur Rollen die User hat (Hamburger-Rolle)
    return {
      users: {
        some: {
          userId: userId
        }
      }
    };
  }
  
  // Mit Organisation: ALLE Rollen der Organisation
  return {
    organizationId: req.organizationId
  };
```

### Phase 2: Controller-Anpassungen

#### Schritt 2.1: TaskController
- ✅ Verwendet bereits `getDataIsolationFilter(req, 'task')`
- ✅ **ABER:** Filter muss erweitert werden (siehe Phase 1.1)

#### Schritt 2.2: RequestController  
- ✅ Verwendet bereits `getDataIsolationFilter(req, 'request')`
- ✅ **ABER:** Filter muss erweitert werden (siehe Phase 1.2)

#### Schritt 2.3: WorktimeController
- ⚠️ Prüfen ob `getDataIsolationFilter` verwendet wird
- ⚠️ Wenn nicht: Hinzufügen

#### Schritt 2.4: ConsultationController
- ⚠️ `getConsultations` verwendet nur `userId: Number(userId)`
- ⚠️ **MUSS ERWEITERT WERDEN** um WorkTime-Filter zu nutzen

#### Schritt 2.5: ClientController
- ⚠️ Prüfen ob Clients gefiltert werden
- ⚠️ `getDataIsolationFilter(req, 'client')` hinzufügen

#### Schritt 2.6: BranchController
- ⚠️ Prüfen ob Branches gefiltert werden
- ⚠️ `getDataIsolationFilter(req, 'branch')` hinzufügen

#### Schritt 2.7: RoleController
- ⚠️ `getAllRoles` zeigt alle Rollen
- ⚠️ **MUSS GEFILTERT WERDEN:** `getDataIsolationFilter(req, 'role')`
- ⚠️ `createRole` verwendet hardcoded `organizationId: 1`
- ⚠️ **MUSS ERWEITERT WERDEN:** `req.organizationId` verwenden

### Phase 3: Validierungen und Sicherheit

#### Schritt 3.1: Erstellen/Bearbeiten validieren
- ✅ Tasks/Requests/WorkTimes müssen nur für User der Organisation erstellt/bearbeitet werden können
- ✅ Clients müssen nur für User der Organisation erstellt werden können
- ✅ Branches müssen nur für User der Organisation erstellt werden können

#### Schritt 3.2: Zuweisungen validieren
- ✅ Tasks können nur User der Organisation zugewiesen werden
- ✅ Requests können nur User der Organisation zugewiesen werden
- ✅ Rollen können nur innerhalb der Organisation zugewiesen werden

### Phase 4: Seed-File & Standard-Organisation

#### Schritt 4.1: Seed-File prüfen
- ✅ Standard-Organisation wird erstellt
- ✅ Admin-User wird mit Organisations-Admin-Rolle verknüpft
- ✅ **STATUS:** Bereits implementiert

#### Schritt 4.2: Berechtigungen prüfen
- ✅ Alle Berechtigungen werden korrekt erstellt
- ✅ **STATUS:** Bereits implementiert

### Phase 5: Dokumentation aktualisieren

#### Schritt 5.1: Multi-Tenant Implementierungsplan aktualisieren
- ⚠️ Aktuellen Stand dokumentieren
- ⚠️ Datenisolation-Regeln dokumentieren
- ⚠️ Was funktioniert / was nicht funktioniert

#### Schritt 5.2: Berechtigungssystem-Dokumentation
- ⚠️ Organisation-spezifische Rollen dokumentieren
- ⚠️ Wie Berechtigungen pro Organisation funktionieren

## Prioritäten

### 🔴 KRITISCH (sofort):
1. **getDataIsolationFilter erweitern** (Phase 1)
   - Tasks zeigen alle der Organisation
   - Requests zeigen alle der Organisation
   - WorkTimes zeigen alle der Organisation

### 🟡 WICHTIG (nach Phase 1):
2. **Controller-Filter anpassen** (Phase 2)
   - Alle Controller prüfen und anpassen
   - Clients, Branches, Roles filtern

### 🟢 WICHTIG (parallel):
3. **Dokumentation** (Phase 5)
   - Aktuellen Stand dokumentieren
   - Regeln klar definieren

## Erwartetes Verhalten nach Umsetzung

### Szenario 1: Benutzer erstellt Organisation
1. Benutzer erstellt Organisation "MeineFirma"
2. System erstellt: Organisation + Admin/User/Hamburger Rollen
3. Benutzer wird Admin-Rolle zugewiesen (lastUsed: true)
4. Benutzer sieht:
   - ✅ Nur User seiner Organisation
   - ✅ Nur Rollen seiner Organisation
   - ✅ Nur Branches, die von Usern seiner Organisation verwendet werden
   - ✅ Alle Tasks/Requests/WorkTimes von Usern seiner Organisation
   - ✅ Nur Clients, die von Usern seiner Organisation verwendet werden

### Szenario 2: Neuer Benutzer registriert sich
1. Benutzer registriert sich
2. Erhält Hamburger-Rolle (ohne Organisation)
3. Sieht:
   - ✅ Nur eigene Daten (Tasks/Requests/WorkTimes wo er responsible/requester ist)
   - ✅ Keine User/Rollen/Branches verwaltbar

### Szenario 3: Neuer Benutzer tritt Organisation bei
1. Benutzer mit Hamburger-Rolle sendet Join-Request
2. Admin genehmigt → Hamburger-Rolle in Organisation zugewiesen
3. Benutzer wechselt zur Organisations-Rolle
4. Sieht jetzt:
   - ✅ ALLE Daten der Organisation (wie Szenario 1)

### Szenario 4: Neuer Benutzer erstellt eigene Organisation
1. Benutzer mit Hamburger-Rolle erstellt Organisation "NeueFirma"
2. System erstellt: Organisation + Admin/User/Hamburger Rollen
3. Benutzer wird Admin-Rolle zugewiesen
4. Sieht jetzt:
   - ✅ Nur Daten von "NeueFirma" (nicht von "MeineFirma")
   - ✅ Vollständig isoliert von anderen Organisationen

## Test-Plan

### Test 1: Datenisolation zwischen Organisationen
- [ ] Organisation A: Task erstellen
- [ ] Organisation B: Task sollte NICHT sichtbar sein
- [ ] Organisation A: User erstellen
- [ ] Organisation B: User sollte NICHT sichtbar sein

### Test 2: Standalone User
- [ ] Task erstellen als Standalone User
- [ ] Task sollte nur für eigenen User sichtbar sein
- [ ] Keine anderen User/Rollen/Branches sichtbar

### Test 3: Organisation-Erstellung
- [ ] Organisation erstellen
- [ ] Prüfen: Standard-Rollen vorhanden?
- [ ] Prüfen: Ersteller ist Admin?
- [ ] Prüfen: Ersteller sieht nur eigene Organisation?

### Test 4: Join-Request Flow
- [ ] Standalone User sendet Join-Request
- [ ] Admin genehmigt mit Hamburger-Rolle
- [ ] Prüfen: User hat Hamburger-Rolle in Organisation?
- [ ] Prüfen: User sieht alle Daten der Organisation?

## Risiken und Hinweise

### ⚠️ WICHTIG:
1. **Performance:** Filter über mehrere Joins können langsam sein
   - Lösung: Indizes auf `organizationId` prüfen
   - Lösung: Queries optimieren

2. **Bestehende Daten:**
   - Standalone User haben bereits Tasks/Requests/WorkTimes
   - Nach Beitritt zur Organisation sollten diese weiterhin sichtbar sein
   - Lösung: Filter muss beide Fälle abdecken

3. **Branches:**
   - Branches sind aktuell global
   - Nach Migration sollten Branches organisations-spezifisch sein
   - Lösung: Filter über Users → Roles → Organization

4. **Clients:**
   - Clients sind aktuell global
   - Sollten organisations-spezifisch sein (via WorkTimes)
   - Lösung: Filter über WorkTimes → User → Roles → Organization

## Nächste Schritte

1. ✅ **Plan erstellt** (HIER)
2. ⏳ **Plan bestätigen lassen**
3. ⏳ **Phase 1 umsetzen** (getDataIsolationFilter erweitern)
4. ⏳ **Phase 2 umsetzen** (Controller anpassen)
5. ⏳ **Phase 3 umsetzen** (Validierungen)
6. ⏳ **Phase 5 umsetzen** (Dokumentation)





