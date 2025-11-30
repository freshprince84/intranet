# Performance-Analyse: Warum sind die Seiten immer noch langsam?

## ⚠️ WICHTIG: HAUPTPROBLEM GELÖST (2025-01-29)

**✅ Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

---

## Datum der Analyse
Nach Prisma-Instanzen-Refactoring (alle 71 Dateien auf zentrale Instanz umgestellt)

## 🔴🔴 KRITISCH: Connection Pool fehlt

### Problem
Die zentrale Prisma-Instanz (`backend/src/utils/prisma.ts`) hat **KEINE Connection Pool Konfiguration**.

**Aktueller Code:**
```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
```

**Verwendet Standardwerte:**
- `connection_limit: 5` (nur 5 Verbindungen!)
- `pool_timeout: 10` (10 Sekunden Timeout)

### Impact
- **Bei gleichzeitigen Requests**: Pool ist schnell erschöpft
- **Requests blockieren sich**: Warten auf freie Verbindung
- **Timeout-Fehler**: "Timed out fetching a new connection from the connection pool"
- **Server wird langsam/unerreichbar**: Bei mehr als 5 gleichzeitigen Requests

### Lösung
Connection Pool in `DATABASE_URL` konfigurieren:

**In `.env` Datei (auf Server):**
```
DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=20"
```

**Oder alternativ in Prisma Client (nicht empfohlen, da DATABASE_URL Vorrang hat):**
```typescript
new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=20&pool_timeout=20'
    }
  }
})
```

**Empfohlene Werte:**
- `connection_limit: 20-30` (statt 5)
- `pool_timeout: 20` (statt 10)

---

## 🔴 KRITISCH: Server muss neu gestartet werden

### Problem
Die Prisma-Instanz wurde geändert (zentrale Instanz erstellt), aber der Server läuft noch mit dem alten Code.

### Impact
- **Alte Prisma-Instanzen laufen noch**: Server verwendet noch die alten 71 Instanzen
- **Refactoring ist nicht aktiv**: Änderungen werden nicht verwendet
- **Performance-Verbesserung greift nicht**: Zentrale Instanz wird nicht genutzt

### Lösung
**Server muss neu gestartet werden**, damit:
1. Die neue zentrale Prisma-Instanz geladen wird
2. Alle 71 Dateien die zentrale Instanz verwenden
3. Nur noch 1 Connection Pool statt 71 existiert

**WICHTIG**: Nach Server-Neustart sollte die Performance deutlich besser sein (1 Pool statt 71).

---

## ✅ GELÖST: NotificationSettings N+1 Problem

### Status
**Bereits implementiert!**

- `notificationSettingsCache.ts` existiert und wird verwendet
- `notificationController.ts` verwendet den Cache
- `settingsController.ts` invalidiert den Cache bei Updates

**Impact**: 80-90% Verbesserung bei Notification-Queries (von 100 Queries auf ~2-5 Queries)

---

## ✅ GELÖST: Attachments werden bereits mitgeladen

### Status
**Bereits implementiert!**

**Backend lädt Attachments bereits mit:**
- `taskController.ts` (Zeile 107-111): `attachments: { orderBy: { uploadedAt: 'desc' } }`
- `requestController.ts` (Zeile 151-155): `attachments: { orderBy: { uploadedAt: 'desc' } }`

**Das bedeutet:**
- Backend liefert Attachments bereits in der Response
- Frontend sollte keine separaten Requests mehr machen müssen
- **Falls Frontend trotzdem separate Requests macht**: Frontend-Code muss angepasst werden

**Zu prüfen:**
- Macht das Frontend noch separate Attachment-Requests?
- Falls ja: Frontend-Code anpassen, um Attachments aus der Response zu verwenden

---

## 🟡 HOCH: Client-seitiges Filtering

### Problem
- Backend liefert **ALLE** Requests/Tasks (kann 1000+ sein)
- Frontend filtert clientseitig
- Standardfilter wird **nach dem Laden** angewendet

**Impact:**
- Große JSON-Responses (mehrere MB)
- Lange Übertragungszeiten
- Hoher Memory-Verbrauch im Browser

### Lösung
- Server-seitiges Filtering für Standardfilter
- Nur gefilterte Daten laden
- Hintergrund-Laden der restlichen Daten (optional)

**Geschätzte Verbesserung**: 80-90% (von ~5MB auf ~250KB Datenübertragung)

---

## Zusammenfassung: Was muss getan werden?

### SOFORT (kritisch):

1. **Connection Pool konfigurieren**
   - `DATABASE_URL` auf Server anpassen: `?connection_limit=20&pool_timeout=20`
   - Oder: Prisma Client Code anpassen (weniger empfohlen)

2. **Server neu starten**
   - Damit die zentrale Prisma-Instanz aktiv wird
   - Damit alle 71 Dateien die zentrale Instanz verwenden
   - **OHNE Server-Neustart funktioniert das Refactoring nicht!**

### Nach Server-Neustart prüfen:

1. **Logs prüfen**:
   - Gibt es noch "Timed out fetching a new connection" Fehler?
   - Werden Queries schneller ausgeführt?
   - Gibt es Connection Pool Warnungen?

2. **Performance testen**:
   - Wie lange dauert das Laden einer Seite?
   - Gibt es noch Timeouts?
   - Werden Requests schneller verarbeitet?

### Mittelfristig (wenn immer noch langsam):

3. **Frontend prüfen** (Attachments)
   - Backend lädt Attachments bereits mit
   - Prüfen: Macht Frontend noch separate Attachment-Requests?
   - Falls ja: Frontend-Code anpassen, um Attachments aus Response zu verwenden

4. **Server-seitiges Filtering** implementieren
   - Standardfilter beim Laden anwenden
   - Nur gefilterte Daten übertragen

---

## Erwartete Verbesserung nach Server-Neustart

### Vorher (71 Prisma-Instanzen):
- 71 Connection Pools (je 5 Verbindungen = 355 mögliche Verbindungen!)
- Connection Pool Timeouts
- Server wird blockiert
- Sehr langsam

### Nachher (1 zentrale Prisma-Instanz + Server-Neustart):
- 1 Connection Pool (20 Verbindungen)
- Keine Connection Pool Timeouts (bei normaler Last)
- Server stabil
- **Erwartete Verbesserung: 50-70% schneller**

### Nach Connection Pool Konfiguration:
- 1 Connection Pool (20-30 Verbindungen)
- Keine Timeouts auch bei hoher Last
- **Erwartete Verbesserung: 70-90% schneller**

---

## Was die Logs sagen sollten

### Vor Server-Neustart:
- Viele "Timed out fetching a new connection" Fehler
- Connection Pool Timeout Warnungen
- Langsame Query-Zeiten

### Nach Server-Neustart (ohne Connection Pool Fix):
- Weniger Connection Pool Timeouts (aber noch möglich bei hoher Last)
- Schnellere Query-Zeiten
- Stabilerer Server

### Nach Connection Pool Fix + Server-Neustart:
- Keine Connection Pool Timeouts
- Schnelle Query-Zeiten
- Stabiler Server auch bei hoher Last

---

## Nächste Schritte

1. ✅ **Prisma-Instanzen konsolidiert** (DONE)
2. ⏳ **Connection Pool konfigurieren** (FEHLT - muss gemacht werden)
3. ⏳ **Server neu starten** (KRITISCH - muss gemacht werden)
4. ⏳ **Logs prüfen** (nach Neustart)
5. ⏳ **Performance testen** (nach Neustart)
6. ⏳ **Frontend prüfen** (Attachments - Backend lädt bereits mit, Frontend muss prüfen)
7. ⏳ **Server-seitiges Filtering** (falls immer noch langsam)

