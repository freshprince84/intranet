# Deployment: Performance-Fix (2025-01-22)

**Ziel:** Filter-Caching und Datenbank-Indizes auf Produktiv-Server deployen

---

## 📋 DEPLOYMENT-SCHRITTE

### Schritt 1: Git Pull auf Server

```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
cd /var/www/intranet
git pull
```

---

### Schritt 2: Datenbank-Migration

```bash
cd /var/www/intranet/backend
npx prisma migrate deploy
```

**Wichtig:** Diese Migration erstellt Indizes - kann bei großen Tabellen einige Minuten dauern!

---

### Schritt 3: Prisma-Client aktualisieren

```bash
cd /var/www/intranet/backend
npx prisma generate
```

---

### Schritt 4: Backend neu bauen

```bash
cd /var/www/intranet/backend
npm run build
```

---

### Schritt 5: Server neu starten

**⚠️ WICHTIG: Nach Rücksprache mit Benutzer!**

```bash
# Backend neu starten
pm2 restart intranet-backend

# Logs prüfen
pm2 logs intranet-backend --lines 50
```

---

## ✅ ERWARTETE VERBESSERUNGEN

### Nach Deployment:

1. **Filter-Caching aktiv**
   - Filter werden gecacht (5 Minuten TTL)
   - 1 DB-Query weniger pro Request

2. **Indizes aktiv**
   - Queries verwenden Indizes
   - 50-70% schnellere Query-Execution

3. **Gesamt-Verbesserung**
   - 80-95% schneller als vorher
   - `/api/requests` sollte von 30-264s auf 0.5-2s sinken

---

## 🔍 VERIFIZIERUNG

### Nach Deployment prüfen:

1. **Performance messen**
   - Dashboard-Ladezeit prüfen
   - `/api/requests` Response-Zeit messen

2. **Logs prüfen**
   ```bash
   pm2 logs intranet-backend --lines 100 | grep -i "filter\|cache\|index"
   ```

3. **Cache-Statistiken** (optional)
   - Filter-Cache sollte Einträge haben
   - Cache-Hit-Rate sollte hoch sein

---

**Erstellt:** 2025-01-22

