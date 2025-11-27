# Server-Neustart Anleitung (2025-01-26)

**Status:** ✅ Git-Konflikt gelöst, Build erfolgreich  
**Nächster Schritt:** Server neu starten

---

## 🔄 SERVER NEU STARTEN

### Schritt 1: PM2 neu starten

**Befehl:**
```bash
pm2 restart intranet-backend
```

**Erwartetes Ergebnis:**
- `intranet-backend` wird neu gestartet
- Status sollte "online" sein

---

### Schritt 2: Status prüfen

**Befehl:**
```bash
pm2 status
```

**Erwartetes Ergebnis:**
```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 4  │ intranet-backend   │ fork     │ 13   │ online    │ 0%       │ ~60mb    │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

- Status sollte "online" sein
- Memory sollte normal sein (~60mb)

---

### Schritt 3: Logs prüfen

**Befehl:**
```bash
pm2 logs intranet-backend --lines 50 --nostream
```

**Erwartetes Verhalten:**
- Keine Fehler beim Start
- System sollte normal funktionieren
- **Weniger executeWithRetry Aufrufe** (nur bei CREATE/UPDATE/DELETE)

---

### Schritt 4: Performance-Verbesserung prüfen

**Befehl 1: Retry-Zähler prüfen (sollte niedriger sein)**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -c "\[Prisma\] Retrying"
```

**Befehl 2: DB-Verbindungsfehler prüfen**
```bash
pm2 logs intranet-backend --lines 500 --nostream | grep -c "DB connection error"
```

**Befehl 3: Connection Pool Status prüfen**
```bash
netstat -an | grep :5432 | wc -l
```

**Erwartete Verbesserung:**
- **Weniger Prisma Retries** (nur bei CREATE/UPDATE/DELETE)
- **Connection Pool weniger belastet** (weniger als 16 Verbindungen)
- **System sollte schneller sein**

---

## ✅ VERIFIKATION

### Was zu prüfen ist:

1. ✅ **Server läuft** - `pm2 status` zeigt "online"
2. ✅ **Keine Fehler** - Logs zeigen keine Fehler
3. ✅ **Weniger Retries** - executeWithRetry wird seltener aufgerufen
4. ✅ **Connection Pool** - Weniger belastet
5. ✅ **System schneller** - Seiten laden schneller

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Bereit zum Server-Neustart

