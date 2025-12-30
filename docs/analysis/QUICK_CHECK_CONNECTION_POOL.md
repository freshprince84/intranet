# Quick Check: Connection Pool auf Server prüfen

**Problem:** Script `check-connection-pool.ts` ist noch nicht auf dem Server

**Lösung:** Verwende das bestehende Script `check-database-url.ts` (sollte bereits vorhanden sein)

---

## SCHNELL-CHECK (ohne Git Pull)

### Schritt 1: Bestehendes Script verwenden

```bash
cd /var/www/intranet/backend
npx ts-node scripts/check-database-url.ts
```

**Das prüft bereits:**
- ✅ `connection_limit` vorhanden?
- ✅ `pool_timeout` vorhanden?
- ✅ Empfohlene Werte

---

### Schritt 2: .env direkt prüfen

```bash
cd /var/www/intranet/backend
grep DATABASE_URL .env
```

**Erwartetes Format:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public"
```

**Oder (wenn erweitert):**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20"
```

---

### Schritt 3: Prüfe ob Connection Pool Parameter vorhanden sind

**Suche nach `connection_limit`:**
```bash
grep -o "connection_limit=[0-9]*" .env
```

**Suche nach `pool_timeout`:**
```bash
grep -o "pool_timeout=[0-9]*" .env
```

**Erwartetes Ergebnis:**
- **Wenn gefunden:** `connection_limit=20` und `pool_timeout=20` → ✅ OK
- **Wenn nicht gefunden:** → ❌ Connection Pool fehlt!

---

## FALLS CONNECTION POOL FEHLT

### .env Datei bearbeiten

```bash
cd /var/www/intranet/backend
nano .env
```

**Finde:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public"
```

**Ändere zu:**
```
DATABASE_URL="postgresql://intranetuser:password@localhost:5432/intranet?schema=public&connection_limit=20&pool_timeout=20"
```

**⚠️ WICHTIG:** Verwende `&` (nicht `?`) wenn bereits `?schema=public` vorhanden ist!

**Speichern:** `Ctrl+O`, `Enter`, `Ctrl+X`

---

### Server neu starten

```bash
pm2 restart intranet-backend
pm2 status
```

---

### Erneut prüfen

```bash
npx ts-node scripts/check-database-url.ts
```

**Erwartetes Ergebnis:**
```
✅ connection_limit: Vorhanden (20)
✅ pool_timeout: Vorhanden (20)
```

---

## ALTERNATIVE: Neues Script deployen

**Falls das bestehende Script nicht funktioniert:**

1. **Git Pull auf Server:**
```bash
cd /var/www/intranet
git pull
```

2. **Script ausführen:**
```bash
cd backend
npx ts-node scripts/check-connection-pool.ts
```

---

**Erstellt:** 2025-01-26  
**Status:** Quick Check Anleitung



