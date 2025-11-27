# Log-Fehler Analyse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Viele DB-Verbindungsfehler  
**Quelle:** Server-Logs Zeile 77-664

---

## 🔴 GEFUNDENE FEHLER

### Fehler 1: "Can't reach database server" (HÄUFIG)

```
Can't reach database server at `localhost:5432`
[Prisma] DB connection error (attempt 1/3)
[Prisma] DB connection error (attempt 2/3)
[Prisma] DB connection error (attempt 3/3)
```

**Häufigkeit:** Sehr häufig (mehrfach in den Logs)

**Betroffene Queries:**
- `prisma.organization.findUnique()` - getLifecycleRoles
- `prisma.workTime.findFirst()` - WorktimeCache
- `prisma.workTime.findMany()` - Automatische Überprüfung
- `prisma.notification.count()` - Notifications Router
- `prisma.filterGroup.findMany()` - FilterListCache

**Ursachen:**
1. **Connection Pool ist voll** → Neue Requests können keine Verbindung bekommen
2. **DB-Server ist überlastet** → Kann keine neuen Verbindungen akzeptieren
3. **executeWithRetry macht Retries** → Verschlimmert die Überlastung

**Impact:**
- System wird langsam
- Requests schlagen fehl
- Caches schlagen fehl (WorktimeCache, OrganizationCache, etc.)

---

### Fehler 2: WorktimeCache Fehler

```
[WorktimeCache] Fehler beim Laden für User 16: PrismaClientKnownRequestError:
Invalid `prisma.workTime.findFirst()` invocation:
Can't reach database server at `localhost:5432`
```

**Ursache:**
- WorktimeCache verwendet `executeWithRetry`
- Bei DB-Fehler macht Retry (attempt 1/3, 2/3, 3/3)
- Cache schlägt fehl → System wird langsamer

**Lösung:**
- executeWithRetry aus WorktimeCache entfernen
- Sofortiger Fehler statt Retry

---

### Fehler 3: OrganizationCache Fehler

```
Error in getLifecycleRoles: PrismaClientKnownRequestError:
Invalid `prisma.organization.findUnique()` invocation:
Can't reach database server at `localhost:5432`
```

**Ursache:**
- OrganizationCache verwendet `executeWithRetry`
- Bei DB-Fehler macht Retry
- Cache schlägt fehl → System wird langsamer

**Lösung:**
- executeWithRetry aus OrganizationCache entfernen
- Sofortiger Fehler statt Retry

---

### Fehler 4: FilterListCache Fehler

```
[Prisma] DB connection error (attempt 2/3):
Invalid `prisma.filterGroup.findMany()` invocation:
Can't reach database server at `localhost:5432`
```

**Ursache:**
- FilterListCache verwendet `executeWithRetry`
- Bei DB-Fehler macht Retry
- Cache schlägt fehl → System wird langsamer

**Lösung:**
- executeWithRetry aus FilterListCache entfernen
- Sofortiger Fehler statt Retry

---

### Fehler 5: Notification Router Fehler

```
prisma:error
Invalid `prisma.notification.count()` invocation:
Can't reach database server at `localhost:5432`
```

**Ursache:**
- Notification Router macht Query ohne executeWithRetry
- Bei DB-Fehler schlägt Query sofort fehl
- **ABER:** executeWithRetry würde das Problem verschlimmern!

**Lösung:**
- **KEIN executeWithRetry hinzufügen!**
- Sofortiger Fehler ist besser als Retry

---

## 🔍 ROOT CAUSE ANALYSE

### Warum passieren diese Fehler?

**Antwort:** Connection Pool ist voll + DB-Server ist überlastet!

**Begründung:**
1. **Connection Pool ist voll (100/100)**
   - Alle 100 Verbindungen sind belegt
   - Neue Requests können keine Verbindung bekommen
   - **Problem:** Alle Requests teilen sich einen Pool (1 Instanz)

2. **DB-Server ist überlastet**
   - Kann keine neuen Verbindungen akzeptieren
   - Bestehende Verbindungen werden nicht schnell genug freigegeben
   - **Problem:** Zu viele gleichzeitige Requests

3. **executeWithRetry macht Retries**
   - Bei DB-Fehler macht Retry (attempt 1/3, 2/3, 3/3)
   - Mehr Retries = Mehr Requests = Mehr Überlastung
   - **Problem:** Verschlimmert die Überlastung

---

## 💡 LÖSUNGEN

### Lösung 1: executeWithRetry aus READ-Operationen entfernen (SOFORT)

**Siehe:** `docs/technical/EXECUTEWITHRETRY_VOLLSTAENDIGE_ANALYSE_2025-01-26.md`

**Betroffene Dateien:**
- `backend/src/utils/organizationCache.ts` (2 Stellen)
- `backend/src/services/userCache.ts` (1 Stelle)
- `backend/src/services/worktimeCache.ts` (1 Stelle)
- `backend/src/services/filterListCache.ts` (2 Stellen)
- `backend/src/controllers/organizationController.ts` (1 Stelle)
- `backend/src/controllers/authController.ts` (1 Stelle)
- `backend/src/controllers/userController.ts` (1 Stelle)

**Begründung:**
- READ-Operationen blockieren nicht bei vollem Pool
- Sofortiger Fehler statt 6 Sekunden Wartezeit
- Weniger Retries = Weniger Überlastung

### Lösung 2: Mehrere Prisma-Instanzen verwenden (KRITISCH)

**Siehe:** `docs/technical/PRISMA_INSTANZEN_FEHLER_ANALYSE_KORRIGIERT_2025-01-26.md`

**Optionen:**
1. **Zurück zu 70+ Instanzen** (EINFACHSTE LÖSUNG - System war vorher schnell!)
2. **Mittelweg - 5-10 Instanzen** (Kompromiss)

**Empfehlung:** **Option 1 - Zurück zu 70+ Instanzen!**

**Begründung:**
- System war vorher schnell
- Mehrere Pools = Bessere Lastverteilung
- Weniger Blocking
- **Wenn es funktioniert hat, warum ändern?**

### Lösung 3: PostgreSQL max_connections prüfen

**Frage:** Ist PostgreSQL `max_connections` auf 100 begrenzt?

**Prüfen:**
```sql
SHOW max_connections;
```

**Falls nötig erhöhen:**
```sql
ALTER SYSTEM SET max_connections = 200;
```

**ABER:** Mehr Verbindungen = Mehr Ressourcen-Verbrauch

---

## 📊 ZUSAMMENFASSUNG

### Gefundene Fehler:

1. ✅ **"Can't reach database server"** - Sehr häufig
2. ✅ **WorktimeCache Fehler** - executeWithRetry macht Retries
3. ✅ **OrganizationCache Fehler** - executeWithRetry macht Retries
4. ✅ **FilterListCache Fehler** - executeWithRetry macht Retries
5. ✅ **Notification Router Fehler** - Query schlägt fehl

### Root Cause:

1. **Connection Pool ist voll (100/100)**
2. **DB-Server ist überlastet**
3. **executeWithRetry macht Retries** → Verschlimmert die Überlastung

### Lösungen:

1. **executeWithRetry aus READ-Operationen entfernen** (SOFORT)
2. **Mehrere Prisma-Instanzen verwenden** (KRITISCH)
3. **PostgreSQL max_connections prüfen** (OPTIONAL)

---

**Erstellt:** 2025-01-26  
**Status:** 🔴🔴🔴 KRITISCH - Viele DB-Verbindungsfehler  
**Nächster Schritt:** executeWithRetry entfernen + Mehrere Prisma-Instanzen verwenden

