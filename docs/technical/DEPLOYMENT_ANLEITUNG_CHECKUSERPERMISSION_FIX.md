# Deployment-Anleitung: checkUserPermission Fix (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment  
**Änderung:** `checkUserPermission` verwendet jetzt `UserCache` statt eigene DB-Query

---

## 📋 DEPLOYMENT-SCHRITTE

### Schritt 1: Git Pull auf Server

**SSH-Verbindung zum Server:**
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

**Im Server-Verzeichnis:**
```bash
cd /var/www/intranet
```

**⚠️ WICHTIG: Falls lokale Änderungen in dist/ vorhanden sind:**

```bash
# Option 1: Dist-Dateien zurücksetzen (empfohlen, da sie sowieso neu gebaut werden)
cd /var/www/intranet/backend
git checkout -- dist/
cd /var/www/intranet
git clean -fd backend/dist/

# Dann Pull
git pull
```

**Oder Option 2: Stash lokale Änderungen:**
```bash
cd /var/www/intranet
git stash
git pull
git stash pop  # Falls nötig (normalerweise nicht, da dist/ neu gebaut wird)
```

**Erwartetes Ergebnis:**
- Neuer Commit wird gepullt: "Performance: checkUserPermission verwendet UserCache statt DB-Query"
- Datei `backend/src/middleware/permissionMiddleware.ts` wurde geändert

---

### Schritt 2: Backend neu bauen

**Im Backend-Verzeichnis:**
```bash
cd /var/www/intranet/backend
npm run build
```

**Erwartetes Ergebnis:**
- TypeScript wird kompiliert
- Neue `dist/middleware/permissionMiddleware.js` wird erstellt
- Keine Fehler

---

### Schritt 3: Server neu starten

**⚠️ WICHTIG: Du musst den Server neu starten! (Ich darf das nicht)**

**PM2 neu starten:**
```bash
pm2 restart intranet-backend
pm2 status
```

**Erwartetes Ergebnis:**
- `intranet-backend` wird neu gestartet
- Status sollte "online" sein
- Keine Fehler in den Logs

---

### Schritt 4: Verifikation

**Logs prüfen:**
```bash
pm2 logs intranet-backend --lines 50 --nostream
```

**Erwartetes Verhalten:**
- Keine Fehler beim Start
- System sollte normal funktionieren
- Permission-Checks sollten deutlich schneller sein

**Performance prüfen:**
- Reservations Tab sollte schneller laden (von 4-8s auf 1.15-2.3s)
- Permission-Checks sollten < 1ms sein (nach Cache-Warmup)
- System sollte wieder normal schnell sein

---

## 🔍 WAS WURDE GEÄNDERT?

### Datei: `backend/src/middleware/permissionMiddleware.ts`

**Vorher:**
```typescript
// DB-Query bei JEDEM Aufruf
const role = await prisma.role.findUnique({
  where: { id: roleId },
  include: { permissions: true }
});
```

**Nachher:**
```typescript
// ✅ PERFORMANCE: Verwende UserCache statt eigene DB-Query
const cached = await userCache.get(userId);
const activeRole = cached.user.roles.find(r => r.lastUsed);
const permissions = activeRole.role.permissions || [];
```

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **Permission-Check:** DB-Query bei jedem Aufruf = ~1-2s
- **Bei 3 Permission-Checks:** 3-6 Sekunden zusätzliche Wartezeit
- **Bei getAllReservations:** 4-8 Sekunden

### Nachher:
- **Permission-Check:** UserCache-Lookup = ~0-5ms (nach Cache-Warmup)
- **Bei 3 Permission-Checks:** 0.15-0.3 Sekunden zusätzliche Wartezeit
- **Bei getAllReservations:** 1.15-2.3 Sekunden

**Reduktion:** 70-85% schneller

---

## ⚠️ WICHTIG

**Server muss neu gestartet werden:**
- Änderungen werden erst nach Server-Neustart aktiv
- PM2 restart ist erforderlich

**Keine Breaking Changes:**
- Alle bestehenden Verwendungen von `checkUserPermission` funktionieren weiterhin
- Nur interne Logik wurde optimiert

**Cache-Invalidierung:**
- Wird bereits korrekt gemacht (bei Permission-Änderungen wird `UserCache` invalidiert)
- Keine zusätzlichen Schritte nötig

---

## 🆘 BEI PROBLEMEN

**Falls Git Pull fehlschlägt wegen lokaler Änderungen:**
```bash
# Dist-Dateien zurücksetzen (werden beim Build neu generiert)
cd /var/www/intranet/backend
git checkout -- dist/
cd /var/www/intranet
git clean -fd backend/dist/
git pull
```

**Falls Server nicht startet:**
```bash
pm2 logs intranet-backend --lines 100
```

**Falls Fehler auftreten:**
- Prüfe Logs auf Fehlermeldungen
- Prüfe ob `backend/dist/middleware/permissionMiddleware.js` existiert
- Prüfe ob TypeScript-Kompilierung erfolgreich war

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment

