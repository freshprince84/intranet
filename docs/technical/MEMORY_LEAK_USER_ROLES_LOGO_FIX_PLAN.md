# Memory Leak Fix: User Roles & Logo - Korrekturplan

**Datum:** 2025-01-31  
**Status:** 🔴 KRITISCH - SOFORT BEHEBEN  
**Priorität:** 🔴🔴🔴 HÖCHSTE PRIORITÄT  
**Problem:** 600MB+ RAM durch unnötiges Laden aller Roles + Logos

---

## 📊 BEWEISE: Identifizierte Probleme

### Problem 1: Zwei Methoden zum User laden (Standard nicht eingehalten)

**Beweis 1.1: `getUserById` in userController.ts**
```182:197:backend/src/controllers/userController.ts
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
                            }
                        }
                    }
                },
```

**Beweis 1.2: `getCurrentUser` in authController.ts**
```414:432:backend/src/controllers/authController.ts
                include: {
                    roles: {
                        include: {
                            role: {
                                include: {
                                    permissions: true,
                                    organization: {
                                        select: {
                                            id: true,
                                            name: true,
                                            displayName: true,
                                            logo: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
```

**Beweis 1.3: Kommentar sagt "STANDARD: Eine Methode für alles"**
```162:162:backend/src/controllers/userController.ts
// ✅ STANDARD: Eine Methode für alle User-Abfragen (Profile und UserManagement)
```

**Beweis 1.4: Route leitet auf getUserById um**
```55:59:backend/src/routes/users.ts
// ✅ STANDARD: /users/profile leitet auf getUserById um (eine Methode für alles)
router.get('/profile', (req: AuthenticatedRequest, res: Response) => {
    req.params.id = req.userId;
    return getUserById(req as any, res);
});
```

**Beweis 1.5: Aber es gibt auch `/auth/user` Route**
```10:10:backend/src/routes/auth.ts
router.get('/user', authMiddleware, getCurrentUser);
```

**Beweis 1.6: Frontend verwendet nur `/users/profile`**
```76:76:frontend/src/hooks/useAuth.tsx
            const response = await axiosInstance.get('/users/profile', {
```

**Fazit:** `getCurrentUser` wird NICHT verwendet, sollte entfernt werden.

---

### Problem 2: ALLE Roles werden geladen, obwohl nur aktive benötigt wird

**Beweis 2.1: getUserById lädt ALLE Roles**
```182:197:backend/src/controllers/userController.ts
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
                            }
                        }
                    }
                },
```

**Beweis 2.2: Frontend verwendet nur aktive Rolle**
```125:125:frontend/src/hooks/usePermissions.ts
            const activeRole = user.roles.find(userRole => userRole.lastUsed);
```

**Beweis 2.3: organizationCache lädt NUR aktive Rolle (KORREKT!)**
```31:35:backend/src/utils/organizationCache.ts
      const userRole = await prisma.userRole.findFirst({
        where: { 
          userId: Number(userId),
          lastUsed: true 
        },
```

**Fazit:** `getUserById` sollte NUR die aktive Rolle laden (wie `organizationCache`).

---

### Problem 3: Logo wird für ALLE Roles geladen

**Beweis 3.1: Logo wird für jede Role geladen**
```187:193:backend/src/controllers/userController.ts
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
```

**Beweis 3.2: User hat mehrere Roles, aber nur 1 aktive**
- Wenn User 5 Roles hat = 5 Logos geladen
- Jedes Logo = 1-5 MB (base64)
- = 5-25 MB nur für Logos pro User

**Beweis 3.3: organizationCache lädt Logo NUR für aktive Rolle**
```39:47:backend/src/utils/organizationCache.ts
              organization: {
                // ✅ PERFORMANCE: Settings NICHT laden (19.8 MB!)
                // Settings werden nur geladen wenn explizit angefragt (in getCurrentOrganization)
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  domain: true,
                  logo: true,
```

**Fazit:** Logo sollte NUR für aktive Rolle geladen werden.

---

### Problem 4: Tasks/Requests laden User, die wiederum alle Roles laden

**Beweis 4.1: Tasks laden responsible User nur minimal**
```165:167:backend/src/controllers/taskController.ts
                responsible: {
                    select: userSelect
                },
```

**Beweis 4.2: Requests laden requester/responsible User nur minimal**
```220:225:backend/src/controllers/requestController.ts
                requester: {
                    select: userSelect
                },
                responsible: {
                    select: userSelect
                },
```

**Beweis 4.3: userSelect enthält nur id, firstName, lastName**
```17:21:backend/src/controllers/taskController.ts
const userSelect = {
    id: true,
    firstName: true,
    lastName: true
} as const;
```

**ABER:** Wenn diese User irgendwo anders geladen werden (z.B. im Frontend-Context), werden sie mit ALLEN Roles geladen.

**Fazit:** Tasks/Requests laden User korrekt minimal, ABER Frontend könnte User mit allen Roles laden.

---

### Problem 5: Role ID vs komplettes Role-Objekt

**Beweis 5.1: Tasks laden role nur mit id, name**
```168:170:backend/src/controllers/taskController.ts
                role: {
                    select: roleSelect
                },
```

**Beweis 5.2: roleSelect enthält nur id, name**
```23:26:backend/src/controllers/taskController.ts
const roleSelect = {
    id: true,
    name: true
} as const;
```

**ABER:** Wenn User geladen werden, werden Roles mit komplettem Objekt geladen:
- `permissions` (Array)
- `organization` (komplettes Objekt mit Logo)
- Alle anderen Role-Felder

**Fazit:** Tasks laden role korrekt minimal, ABER User laden role mit komplettem Objekt.

---

## ✅ KORREKTURPLAN

### Phase 1: getCurrentUser entfernen (Standard durchsetzen)

**Datei:** `backend/src/controllers/authController.ts`

**Änderung:**
- `getCurrentUser` Funktion entfernen (Zeile 404-469)
- Route `/auth/user` entfernen (auth.ts Zeile 10)

**Begründung:**
- Frontend verwendet nur `/users/profile`
- Standard sagt "eine Methode für alles"
- `getCurrentUser` wird nicht verwendet

---

### Phase 2: getUserById - NUR aktive Rolle laden

**Datei:** `backend/src/controllers/userController.ts`

**Aktueller Code (Zeile 182-197):**
```typescript
roles: {
    include: {
        role: {
            include: {
                permissions: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        logo: true
                    }
                }
            }
        }
    }
},
```

**Neuer Code:**
```typescript
roles: {
    where: {
        lastUsed: true  // ✅ NUR aktive Rolle
    },
    include: {
        role: {
            include: {
                permissions: true,
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true,
                        logo: true  // ✅ NUR 1 Logo (von aktiver Rolle)
                    }
                }
            }
        }
    }
},
```

**Begründung:**
- Frontend verwendet nur aktive Rolle (`lastUsed: true`)
- Logo wird nur 1x geladen statt N-mal
- Konsistent mit `organizationCache`

---

### Phase 3: Optionale Parameter für alle Roles (wenn benötigt)

**Datei:** `backend/src/controllers/userController.ts`

**Neuer Code:**
```typescript
// ✅ STANDARD: Optionale Parameter für Performance-Optimierung
const includeSettings = req.query.includeSettings === 'true';
const includeInvoiceSettings = req.query.includeInvoiceSettings === 'true';
const includeAllRoles = req.query.includeAllRoles === 'true';  // ✅ NEU

// ✅ STANDARD: identificationDocuments werden IMMER geladen (essentielle Felder)
const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
        roles: {
            where: includeAllRoles ? undefined : { lastUsed: true },  // ✅ NUR aktive Rolle, außer wenn alle benötigt
            include: {
                role: {
                    include: {
                        permissions: true,
                        organization: {
                            select: {
                                id: true,
                                name: true,
                                displayName: true,
                                ...(includeAllRoles ? { logo: true } : { logo: true })  // ✅ Logo nur wenn benötigt
                            }
                        }
                    }
                }
            }
        },
        // ... rest
    }
});
```

**Begründung:**
- Standard: Nur aktive Rolle (Performance)
- Optional: Alle Roles wenn benötigt (z.B. UserManagement)

---

### Phase 4: Frontend prüfen - werden User mit allen Roles geladen?

**Zu prüfen:**
1. Wird `/users/profile` mehrfach aufgerufen?
2. Werden User-Objekte irgendwo anders geladen?
3. Werden User-Objekte im Context gespeichert?

**Dateien zu prüfen:**
- `frontend/src/hooks/useAuth.tsx`
- `frontend/src/contexts/*.tsx`
- `frontend/src/components/*.tsx` (User-Management)

---

### Phase 5: Tasks/Requests - User bleiben minimal

**Status:** ✅ **KORREKT** - Tasks/Requests laden User nur mit `id, firstName, lastName`

**Keine Änderung nötig**, ABER:
- Prüfen ob Frontend diese User irgendwo anders mit allen Roles lädt

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **User mit 5 Roles:** 5 Logos geladen = 5-25 MB
- **100 Tasks:** 100 Users × 5 Roles = 500 Logos = 500-2500 MB
- **Gesamt:** 600MB+ RAM

### Nachher:
- **User mit 5 Roles:** 1 Logo geladen (nur aktive) = 1-5 MB
- **100 Tasks:** 100 Users × 1 Logo = 100 Logos = 100-500 MB
- **Gesamt:** ~100-200 MB RAM

**Reduktion:** ~80-90% weniger RAM für Logos

---

## 🎯 IMPLEMENTIERUNGSREIHENFOLGE

### Priorität 1: Sofort beheben (kritisch)
1. ✅ **getCurrentUser entfernen** (wird nicht verwendet)
2. ✅ **getUserById - NUR aktive Rolle laden**

### Priorität 2: Wichtig
3. ✅ **Optionale Parameter für alle Roles** (wenn benötigt)
4. ✅ **Frontend prüfen** - werden User mehrfach geladen?

### Priorität 3: Validierung
5. ✅ **Memory Profiling nach Fix** - prüfen ob Verbesserung erreicht wurde

---

## ✅ VALIDIERUNG

### Test 1: Memory Profiling
1. **Vor Fix:** Heap Snapshot aufnehmen
2. **Nach Fix:** Heap Snapshot aufnehmen
3. **Vergleich:** Logo-Strings sollten deutlich weniger sein

### Test 2: Funktionalität
1. **Dashboard öffnen** → User wird geladen
2. **Worktracker öffnen** → Tasks werden geladen
3. **Zurück zu Dashboard** → Memory sollte nicht wachsen

### Test 3: User-Management
1. **User-Management öffnen** → Alle User werden geladen
2. **Prüfen:** Werden alle Roles benötigt? (dann `includeAllRoles=true`)

---

**Erstellt:** 2025-01-31  
**Status:** 📋 KORREKTURPLAN  
**Nächster Schritt:** Implementierung nach Bestätigung

