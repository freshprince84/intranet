# Deployment-Anleitung: executeWithRetry Fix (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment  
**Änderung:** disconnect/connect Logik aus `executeWithRetry` entfernt

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
git pull
```

**Erwartetes Ergebnis:**
- Neuer Commit wird gepullt: "Performance: disconnect/connect Logik aus executeWithRetry entfernt"
- Datei `backend/src/utils/prisma.ts` wurde geändert

---

### Schritt 2: Backend neu bauen

**Im Backend-Verzeichnis:**
```bash
cd /var/www/intranet/backend
npm run build
```

**Erwartetes Ergebnis:**
- TypeScript wird kompiliert
- Neue `dist/utils/prisma.js` wird erstellt
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
- Bei DB-Fehlern: Retry mit Delay, aber keine disconnect/connect Logik

**Performance prüfen:**
- System sollte wieder schnell sein
- Ladezeiten sollten < 2 Sekunden sein
- Keine 30+ Sekunden Wartezeiten mehr

---

## 🔍 WAS WURDE GEÄNDERT?

### Datei: `backend/src/utils/prisma.ts`

**Vorher:**
```typescript
if (attempt < maxRetries) {
  try {
    await prisma.$disconnect();  // ← ENTFERNT
    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    await prisma.$connect();     // ← ENTFERNT
  }
}
```

**Nachher:**
```typescript
if (attempt < maxRetries) {
  // Retry mit Delay - Prisma reconnect automatisch
  await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
  console.log(`[Prisma] Retrying after ${attempt} attempt(s) - Prisma will reconnect automatically`);
}
```

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **Request-Zeit bei DB-Fehler:** 12-90 Sekunden
- **System:** Praktisch unbrauchbar
- **Ladezeiten:** 30+ Sekunden

### Nachher:
- **Request-Zeit bei DB-Fehler:** 0.5-3 Sekunden
- **System:** Wieder nutzbar
- **Ladezeiten:** < 2 Sekunden

**Reduktion:** 95-97% schneller

---

## ⚠️ WICHTIG

**Server muss neu gestartet werden:**
- Änderungen werden erst nach Server-Neustart aktiv
- PM2 restart ist erforderlich

**Keine Breaking Changes:**
- Alle bestehenden Verwendungen von `executeWithRetry` funktionieren weiterhin
- Nur interne Logik wurde optimiert

---

## 🆘 BEI PROBLEMEN

**Falls Server nicht startet:**
```bash
pm2 logs intranet-backend --lines 100
```

**Falls Fehler auftreten:**
- Prüfe Logs auf Fehlermeldungen
- Prüfe ob `backend/dist/utils/prisma.js` existiert
- Prüfe ob TypeScript-Kompilierung erfolgreich war

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment

