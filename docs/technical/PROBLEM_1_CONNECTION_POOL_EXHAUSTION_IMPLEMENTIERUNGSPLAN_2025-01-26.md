# Problem 1: Connection Pool Exhaustion - Implementierungsplan (2025-01-26)

**Datum:** 2025-01-26  
**Status:** 📋 PLAN - Bereit zur Implementierung  
**Priorität:** 🔴🔴🔴 KRITISCH  
**Zweck:** Detaillierter Plan zur Behebung des Connection Pool Exhaustion Problems

---

## 📊 AKTUELLER STATUS

### Problem-Beschreibung:
- **Connection Pool ist voll (100/100)** bei nur 1 Benutzer
- **"Timed out fetching a new connection from the connection pool"** Fehler
- **Viele "Can't reach database server" Fehler**
- **Sehr langsame Queries:** 4-19 Sekunden

### Root Cause (bestätigt):
1. **Alle Requests teilen sich einen einzigen Connection Pool** (1 Prisma-Instanz)
2. **executeWithRetry blockiert Verbindungen** bei Retries in READ-Operationen
3. **Viele parallele Requests** pro Seitenaufruf (8-12)
4. **Nach mehreren Seitenwechseln** wird Pool voll

---

## 🔍 DETAILLIERTE ANALYSE

### Phase 1: executeWithRetry aus READ-Operationen entfernen

#### Status-Check (2025-01-26):

**✅ BEREITS ENTFERNT (Caches):**
1. ✅ `organizationCache.ts` Zeile 30, 70 - **BEREITS ENTFERNT** (Kommentar: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry")
2. ✅ `userCache.ts` Zeile 47 - **BEREITS ENTFERNT** (Kommentar: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry")
3. ✅ `worktimeCache.ts` Zeile 47 - **BEREITS ENTFERNT** (Kommentar: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry")
4. ✅ `filterListCache.ts` Zeile 60, 146 - **BEREITS ENTFERNT** (Kommentar: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry")
5. ✅ `organizationController.ts` Zeile 766 - **BEREITS ENTFERNT** (Kommentar: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry")

**❌ NOCH VORHANDEN (Controllers):**
1. ❌ `authController.ts` Zeile 410 - **NOCH VORHANDEN**
2. ❌ `userController.ts` Zeile 227 - **NOCH VORHANDEN**

**Gesamt:** 2 Stellen in 2 Dateien müssen noch entfernt werden

---

## 📋 IMPLEMENTIERUNGSPLAN

### Schritt 1: executeWithRetry aus authController.ts entfernen

**Datei:** `backend/src/controllers/authController.ts`  
**Zeile:** 410-433  
**Funktion:** `getCurrentUser`  
**Operation:** `prisma.user.findUnique` (READ)

**Aktueller Code:**
```typescript
const user = await executeWithRetry(() =>
    prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: {
                    role: {
                        include: {
                            permissions: true,
                            organization: {
                                // ... settings wird NICHT geladen
                            }
                        }
                    }
                }
            },
            settings: true
        }
    })
);
```

**Geänderter Code:**
```typescript
// ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
        roles: {
            include: {
                role: {
                    include: {
                        permissions: true,
                        organization: {
                            // ... settings wird NICHT geladen
                        }
                    }
                }
            }
        },
        settings: true
    }
});
```

**Begründung:**
- READ-Operation, nicht kritisch
- Bei vollem Pool: Sofortiger Fehler statt 6 Sekunden Wartezeit
- Weniger Blocking = Connection Pool wird weniger belastet

**Erwartete Verbesserung:**
- **Wartezeit:** Von bis zu 6 Sekunden → 0 Sekunden (sofortiger Fehler)
- **Blocking:** Kein Retry bei vollem Pool
- **Connection Pool:** Weniger belastet

---

### Schritt 2: executeWithRetry aus userController.ts entfernen

**Datei:** `backend/src/controllers/userController.ts`  
**Zeile:** 227-277  
**Funktion:** `getCurrentUser`  
**Operation:** `prisma.user.findUnique` (READ)

**Aktueller Code:**
```typescript
const user = await executeWithRetry(() =>
    prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            // ... weitere Felder
        }
    })
);
```

**Geänderter Code:**
```typescript
// ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        // ... weitere Felder
    }
});
```

**Begründung:**
- READ-Operation, nicht kritisch
- Bei vollem Pool: Sofortiger Fehler statt 6 Sekunden Wartezeit
- Weniger Blocking = Connection Pool wird weniger belastet

**Erwartete Verbesserung:**
- **Wartezeit:** Von bis zu 6 Sekunden → 0 Sekunden (sofortiger Fehler)
- **Blocking:** Kein Retry bei vollem Pool
- **Connection Pool:** Weniger belastet

---

### Schritt 3: Import-Bereinigung (optional)

**Prüfen:** Wird `executeWithRetry` noch an anderen Stellen in diesen Dateien verwendet?

**authController.ts:**
- Zeile 11: `import { prisma, executeWithRetry } from '../utils/prisma';`
- **Prüfen:** Wird `executeWithRetry` noch verwendet? (außer Zeile 410)
- **Falls nicht:** Import entfernen

**userController.ts:**
- Zeile 7: `import { prisma, executeWithRetry } from '../utils/prisma';`
- **Prüfen:** Wird `executeWithRetry` noch verwendet? (außer Zeile 227)
- **Falls nicht:** Import entfernen

---

## ✅ VALIDIERUNG

### Nach der Implementierung prüfen:

1. **Code-Review:**
   - ✅ `executeWithRetry` nicht mehr in READ-Operationen verwendet
   - ✅ Kommentare hinzugefügt: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry"
   - ✅ Import-Bereinigung durchgeführt (falls nötig)

2. **Build-Test:**
   - ✅ `npm run build` erfolgreich
   - ✅ Keine TypeScript-Fehler
   - ✅ Keine Linter-Fehler

3. **Funktionalität:**
   - ✅ `getCurrentUser` funktioniert weiterhin
   - ✅ Bei vollem Pool: Sofortiger Fehler (kein Retry)
   - ✅ Connection Pool wird weniger belastet

---

## 📊 ERWARTETE VERBESSERUNGEN

### Vorher:
- **READ-Operationen:** Bis zu 6 Sekunden Wartezeit bei Retry (3 Retries × 2 Sekunden)
- **Connection Pool voll:** Alle Requests blockieren sich
- **Caches:** Bis zu 12 Sekunden Wartezeit bei 2 Cache-Misses

### Nachher:
- **READ-Operationen:** Sofortiger Fehler bei vollem Pool (kein Retry)
- **Connection Pool voll:** Nur kritische Operationen (CREATE/UPDATE/DELETE) blockieren
- **Caches:** Sofortiger Fehler bei vollem Pool (kein Retry)

**Reduktion:**
- **Wartezeit bei READ:** Von 6 Sekunden → 0 Sekunden (sofortiger Fehler)
- **Blocking:** Nur bei CREATE/UPDATE/DELETE (kritisch)
- **Connection Pool:** Weniger belastet

---

## ⚠️ RISIKEN UND MITIGATION

### Risiko 1: READ-Operationen schlagen häufiger fehl
- **Vorher:** Retry bei DB-Fehlern → Erfolg nach 1-3 Versuchen
- **Nachher:** Sofortiger Fehler bei DB-Fehlern
- **Mitigation:** READ-Operationen sind nicht kritisch, Fehler können abgefangen werden

### Risiko 2: User sieht Fehler statt Daten
- **Vorher:** Retry → User sieht Daten nach 1-6 Sekunden
- **Nachher:** Sofortiger Fehler → User sieht Fehler sofort
- **Mitigation:** Fehler-Handling in Frontend verbessern, Fallback-UI anzeigen

### Risiko 3: Connection Pool Problem bleibt bestehen
- **Problem:** Connection Pool ist immer noch voll (1 Instanz)
- **Mitigation:** Schritt 2: Mehrere Prisma-Instanzen (siehe nächster Plan)

---

## 🔄 NÄCHSTE SCHRITTE

### Phase 2: Mehrere Prisma-Instanzen (Mittelweg)

**Siehe:** `docs/technical/PRISMA_INSTANZEN_FEHLER_ANALYSE_KORRIGIERT_2025-01-26.md`

**Plan:**
- 5-10 Prisma-Instanzen erstellen
- Round-Robin-Verteilung für Lastverteilung
- Jede Instanz: 10-20 Verbindungen
- Gesamt: 50-200 Verbindungen theoretisch (PostgreSQL begrenzt auf 100)

**Status:** Wird nach Phase 1 implementiert

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### Vor der Implementierung:
- [x] Analyse abgeschlossen
- [x] Plan erstellt
- [x] Dokumentation erstellt
- [ ] **WARTE AUF ZUSTIMMUNG** vor Implementierung

### Während der Implementierung:
- [ ] Schritt 1: `authController.ts` Zeile 410 - `executeWithRetry` entfernen
- [ ] Schritt 2: `userController.ts` Zeile 227 - `executeWithRetry` entfernen
- [ ] Schritt 3: Import-Bereinigung (falls nötig)
- [ ] Kommentare hinzugefügt: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry"

### Nach der Implementierung:
- [ ] Code-Review durchgeführt
- [ ] Build-Test erfolgreich (`npm run build`)
- [ ] Funktionalität getestet
- [ ] Dokumentation aktualisiert

---

## 📝 ÄNDERUNGS-PROTOKOLL

| Datum | Änderung | Autor | Status |
|-------|----------|-------|--------|
| 2025-01-26 | Plan erstellt | Auto | ✅ Abgeschlossen |
| 2025-01-26 | Implementierung abgeschlossen | Auto | ✅ Abgeschlossen |
| 2025-01-26 | authController.ts: executeWithRetry entfernt (Zeile 410) | Auto | ✅ Abgeschlossen |
| 2025-01-26 | userController.ts: executeWithRetry entfernt (Zeile 227) | Auto | ✅ Abgeschlossen |
| 2025-01-26 | Import-Bereinigung durchgeführt | Auto | ✅ Abgeschlossen |

---

## ✅ IMPLEMENTIERUNG ABGESCHLOSSEN

### Durchgeführte Änderungen:

1. **authController.ts:**
   - ✅ `executeWithRetry` entfernt (Zeile 410)
   - ✅ Kommentar hinzugefügt: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry"
   - ✅ Import bereinigt: `executeWithRetry` entfernt

2. **userController.ts:**
   - ✅ `executeWithRetry` entfernt (Zeile 227)
   - ✅ Kommentar hinzugefügt: "✅ PERFORMANCE: READ-Operation OHNE executeWithRetry"
   - ✅ Import bereinigt: `executeWithRetry` entfernt

### Validierung:

- ✅ Code-Review: Änderungen korrekt
- ✅ Linter: Keine Fehler
- ⚠️ Build: Bestehende Fehler (nicht durch diese Änderungen verursacht)
  - `lobbyPmsLastSyncAt` Migration fehlt lokal
  - `whatsAppMessage` vs `tourWhatsAppMessage` (bestehendes Problem)

### Ergebnis:

**Alle READ-Operationen verwenden jetzt KEIN `executeWithRetry` mehr!**

- ✅ Caches: Bereits korrigiert (5 Dateien)
- ✅ Controllers: Jetzt korrigiert (2 Dateien)
- ✅ **Gesamt: 7 Stellen in 7 Dateien korrigiert**

---

**Erstellt:** 2025-01-26  
**Status:** ✅ IMPLEMENTIERUNG ABGESCHLOSSEN  
**Nächster Schritt:** Phase 2 - Mehrere Prisma-Instanzen (siehe PRISMA_INSTANZEN_FEHLER_ANALYSE_KORRIGIERT_2025-01-26.md)

