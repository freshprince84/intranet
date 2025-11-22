# getUserLanguage Optimierung - Implementierung

**Datum**: 2025-11-22  
**Status**: ✅ Implementiert

## Problem

Die `getUserLanguage` Funktion wurde sehr häufig aufgerufen (719x in kurzer Zeit) und machte in 100% der Fälle unnötig komplexe Datenbank-Queries mit mehreren Joins, obwohl in 99.8% der Fälle `User.language` bereits gesetzt war.

**Performance-Impact:**
- Komplexe Query: ~5-20ms (User → roles → role → organization → settings)
- Einfache Query: ~0.165ms (nur User.language)
- **30-120x langsamer als nötig!**

## Lösung

### 1. Query-Optimierung

**Vorher:**
```typescript
// Lädt IMMER komplexe Query mit Joins
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    language: true,
    roles: { /* komplexe Joins */ }
  }
});
```

**Nachher:**
```typescript
// 1. Zuerst nur User.language prüfen (schnell!)
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { language: true }
});

// 2. Nur wenn User.language leer, dann komplexe Query
if (!user.language) {
  // Komplexe Query mit Joins für Organisation-Sprache
}
```

**Erwartete Verbesserung:** 50-80% weniger CPU-Last

### 2. In-Memory Cache

**Implementierung:**
- `backend/src/services/userLanguageCache.ts`
- TTL: 10 Minuten
- Singleton-Pattern

**Features:**
- Automatische Cache-Invalidierung bei User-Updates
- Cache-Statistiken für Monitoring
- Thread-safe (Node.js Single-Thread)

**Erwartete Verbesserung:** Zusätzlich 80-90% weniger DB-Queries

## Implementierte Dateien

### 1. `backend/src/services/userLanguageCache.ts`
- Cache-Klasse mit TTL (10 Minuten)
- Methoden: `get()`, `set()`, `invalidate()`, `clear()`, `getStats()`

### 2. `backend/src/utils/translations.ts`
- Optimierte `getUserLanguage()` Funktion
- Zuerst Cache prüfen
- Dann einfache Query (User.language)
- Nur bei Bedarf komplexe Query (Organisation-Sprache)
- Automatisches Caching aller Ergebnisse

### 3. `backend/src/controllers/userController.ts`
- Cache-Invalidierung bei User-Updates:
  - `updateUserById()` - wenn `language` aktualisiert wird
  - `updateProfile()` - wenn `language` aktualisiert wird
  - `updateUserRoles()` - wenn Rollen geändert werden (Organisation könnte sich ändern)
  - `updateUser()` - wenn `language` aktualisiert wird

## Performance-Verbesserung

**Vorher:**
- 719 Aufrufe × 5-20ms = **3.6-14.4 Sekunden CPU-Zeit**
- Bei 172.7% CPU-Last = System blockiert

**Nachher (erwartet):**
- 99.8% der Aufrufe: Cache-Hit (0ms) oder einfache Query (0.165ms)
- 0.2% der Aufrufe: Komplexe Query (5-20ms)
- **Erwartete Gesamtverbesserung: 95-99% weniger CPU-Last**

## Cache-Invalidierung

Der Cache wird automatisch invalidiert bei:
1. **User.language Updates** - Direkte Sprache-Änderung
2. **User-Rollen Updates** - Organisation könnte sich ändern → Organisation-Sprache könnte sich ändern

**Manuelle Invalidierung:**
```typescript
import { userLanguageCache } from '../services/userLanguageCache';

// Einzelnen User invalidieren
userLanguageCache.invalidate(userId);

// Gesamten Cache leeren
userLanguageCache.clear();
```

## Monitoring

Cache-Statistiken abrufen:
```typescript
const stats = userLanguageCache.getStats();
// { size: 50, validEntries: 48 }
```

## Testing

**Lokales Testing:**
1. Code kompilieren: `cd backend && npm run build`
2. Backend starten
3. Logs prüfen: `getUserLanguage` sollte jetzt viel seltener komplexe Queries machen

**Production:**
1. Code deployen
2. CPU-Last überwachen (sollte deutlich sinken)
3. Cache-Statistiken prüfen

## Nächste Schritte

Falls weitere Optimierungen nötig:
1. **Batch-Operations optimieren** - `createReservationTask` könnte getUserLanguage für mehrere User auf einmal laden
2. **Redis-Cache** - Falls In-Memory-Cache nicht ausreicht (bei mehreren Backend-Instanzen)

---

**Erstellt**: 2025-11-22  
**Autor**: Claude (Auto)  
**Status**: ✅ Implementiert und dokumentiert

