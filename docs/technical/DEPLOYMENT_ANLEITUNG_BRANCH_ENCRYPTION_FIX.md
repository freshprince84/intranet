# Deployment-Anleitung: Branch Encryption Fix

**Datum:** 26.11.2025  
**Fix:** `decryptBranchApiSettings()` entschlüsselt jetzt verschachtelte Settings

---

## 📋 Übersicht

Diese Anleitung führt dich Schritt für Schritt durch:
1. ✅ Script committen und pushen
2. ✅ Code auf Server pullen
3. ✅ Fix testen (Beweis-Script)
4. ✅ Fix implementieren (Code-Änderung)
5. ✅ Build und Deployment
6. ✅ Verifikation

**Geschätzte Zeit:** ~30-45 Minuten

---

## 🔧 Phase 1: Lokale Vorbereitung (5 Min)

### Schritt 1.1: Script committen

**Auf deinem lokalen Rechner:**

```bash
# 1. Prüfe Status
git status

# 2. Füge neue Dateien hinzu
git add backend/scripts/prove-branch-encryption-bug.ts
git add BEHEBUNGSPLAN_BRANCH_ENCRYPTION_BUG.md
git add DEPLOYMENT_ANLEITUNG_BRANCH_ENCRYPTION_FIX.md

# 3. Committe
git commit -m "Add: Branch Encryption Bug Proof Script and Fix Plan"
```

### Schritt 1.2: Code pushen

```bash
# Push zu GitHub
git push origin main
# (oder dein Branch-Name, falls du auf einem Branch arbeitest)
```

**✅ Prüfung:** Gehe zu GitHub und verifiziere, dass die Dateien gepusht wurden.

---

## 🖥️ Phase 2: Auf Server verbinden (2 Min)

### Schritt 2.1: SSH-Verbindung

**Auf deinem lokalen Rechner:**

```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

**✅ Prüfung:** Du solltest jetzt auf dem Server sein (Prompt zeigt `root@...`).

---

## 📥 Phase 3: Code auf Server pullen (3 Min)

### Schritt 3.1: Git Pull

**Auf dem Server (SSH-Session):**

```bash
# 1. Ins Projekt-Verzeichnis wechseln
cd /var/www/intranet

# 2. Lokale Änderungen stashen (falls vorhanden)
git stash

# 3. Neueste Änderungen pullen
git pull

# 4. Stash wieder anwenden (falls gestasht wurde)
git stash pop
```

**✅ Prüfung:** 
```bash
# Prüfe ob Script vorhanden ist
ls -la backend/scripts/prove-branch-encryption-bug.ts
# Sollte die Datei anzeigen
```

---

## 🧪 Phase 4: Problem bestätigen (5 Min)

### Schritt 4.1: Beweis-Script ausführen

**Auf dem Server (SSH-Session):**

```bash
# 1. Ins Backend-Verzeichnis wechseln
cd /var/www/intranet/backend

# 2. Script ausführen
npx ts-node scripts/prove-branch-encryption-bug.ts
```

**Erwartetes Ergebnis (VOR dem Fix):**
```
❌❌❌ BEWEIS: apiKey ist IMMER NOCH VERSCHLÜSSELT!
❌❌❌ BEWEIS: merchantId ist IMMER NOCH VERSCHLÜSSELT!
```

**✅ Prüfung:** Script zeigt, dass verschlüsselte Werte nicht entschlüsselt werden.

---

## 🔨 Phase 5: Fix implementieren (15 Min)

### Schritt 5.1: Code-Änderung

**WICHTIG:** Du musst jetzt die Code-Änderung in `backend/src/utils/encryption.ts` machen.

**Option A: Auf Server direkt editieren (nicht empfohlen)**
```bash
nano backend/src/utils/encryption.ts
# Oder
vi backend/src/utils/encryption.ts
```

**Option B: Lokal editieren und nochmal pushen (EMPFOHLEN)**

**Auf deinem lokalen Rechner (neues Terminal):**

1. Öffne `backend/src/utils/encryption.ts`
2. Finde die Funktion `decryptBranchApiSettings` (ca. Zeile 369)
3. Füge den Code aus `BEHEBUNGSPLAN_BRANCH_ENCRYPTION_BUG.md` Phase 2 hinzu
4. Committe und pushe:

```bash
git add backend/src/utils/encryption.ts
git commit -m "Fix: decryptBranchApiSettings entschlüsselt jetzt verschachtelte Settings"
git push origin main
```

5. Auf Server nochmal pullen:

**Auf dem Server (SSH-Session):**
```bash
cd /var/www/intranet
git pull
```

### Schritt 5.2: Fix prüfen

**Auf dem Server (SSH-Session):**

```bash
# Prüfe ob Code-Änderung vorhanden ist
grep -A 5 "boldPayment" backend/src/utils/encryption.ts
# Sollte die neue Logik zeigen
```

---

## 🧪 Phase 6: Fix testen (5 Min)

### Schritt 6.1: Beweis-Script erneut ausführen

**Auf dem Server (SSH-Session):**

```bash
cd /var/www/intranet/backend
npx ts-node scripts/prove-branch-encryption-bug.ts
```

**Erwartetes Ergebnis (NACH dem Fix):**
```
✅ apiKey: 🔓 ENTSCHLÜSSELT ✅
✅ merchantId: 🔓 ENTSCHLÜSSELT ✅
```

**✅ Prüfung:** Script zeigt, dass Werte jetzt entschlüsselt werden.

### Schritt 6.2: Zusätzliche Tests

**Auf dem Server (SSH-Session):**

```bash
# Teste alle Branch Settings
npx ts-node scripts/check-all-api-settings-decryption.ts
```

**Erwartetes Ergebnis:**
- Alle Settings können entschlüsselt werden
- Keine Fehler

---

## 🏗️ Phase 7: Build und Deployment (10 Min)

### Schritt 7.1: Backend bauen

**Auf dem Server (SSH-Session):**

```bash
cd /var/www/intranet/backend

# 1. Prisma Client generieren (falls Schema geändert wurde)
npx prisma generate

# 2. TypeScript kompilieren
npm run build
```

**✅ Prüfung:** Build sollte ohne Fehler durchlaufen.

### Schritt 7.2: Frontend bauen (optional, falls Frontend-Änderungen)

**Auf dem Server (SSH-Session):**

```bash
cd /var/www/intranet/frontend
npm run build
```

**Hinweis:** Falls keine Frontend-Änderungen gemacht wurden, kann dieser Schritt übersprungen werden.

---

## 🔄 Phase 8: Server neu starten (2 Min)

### Schritt 8.1: PM2 Prozess neu starten

**⚠️ WICHTIG:** Du musst den Server neu starten! (Laut Regeln darf ich das nicht selbst machen)

**Auf dem Server (SSH-Session):**

```bash
# Backend-Dienst über PM2 neu starten
pm2 restart intranet-backend

# Status prüfen
pm2 status
```

**✅ Prüfung:** 
- `pm2 status` sollte `online` für `intranet-backend` zeigen
- Keine Fehler in der Status-Ausgabe

---

## ✅ Phase 9: Verifikation (10 Min)

### Schritt 9.1: Server-Logs prüfen

**Auf dem Server (SSH-Session):**

```bash
# Prüfe Logs auf Fehler
pm2 logs intranet-backend --lines 100 --nostream | grep -i "bold\|payment\|403\|error"

# Sollte KEINE 403 Forbidden Fehler mehr zeigen
# Sollte KEINE "Error decrypting" Fehler mehr zeigen
```

**✅ Prüfung:** Keine 403 Forbidden oder Entschlüsselungsfehler in Logs.

### Schritt 9.2: API testen (optional)

**Falls möglich, teste einen API-Call:**

```bash
# Beispiel: Prüfe ob Bold Payment Service funktioniert
# (Dieser Test hängt von deiner API-Struktur ab)
curl -X GET "http://localhost:5000/api/..." -H "Authorization: Bearer ..."
```

**✅ Prüfung:** API-Calls sollten funktionieren (keine 403 Forbidden).

### Schritt 9.3: Live-Test (optional)

**Im Browser oder via API-Client:**
- Teste eine Reservierung mit Payment-Link-Erstellung
- Sollte jetzt funktionieren

**✅ Prüfung:** Payment-Links werden erfolgreich erstellt.

---

## 🔄 Rollback (falls nötig)

Falls der Fix Probleme verursacht:

### Schritt R.1: Git Revert

**Auf dem Server (SSH-Session):**

```bash
cd /var/www/intranet
git log --oneline -5  # Zeige letzte Commits
git revert HEAD  # Revert letzten Commit
git pull  # Falls nötig
```

### Schritt R.2: Rebuild und Restart

```bash
cd /var/www/intranet/backend
npm run build
pm2 restart intranet-backend
```

---

## 📝 Checkliste

- [ ] Script committen und pushen
- [ ] Auf Server verbinden (SSH)
- [ ] Git pull auf Server
- [ ] Beweis-Script ausführen (zeigt verschlüsselte Werte)
- [ ] Fix implementieren (Code-Änderung)
- [ ] Fix nochmal pushen (falls lokal gemacht)
- [ ] Git pull auf Server (falls lokal gemacht)
- [ ] Beweis-Script erneut ausführen (zeigt entschlüsselte Werte)
- [ ] Backend builden
- [ ] PM2 Prozess neu starten
- [ ] Logs prüfen (keine Fehler)
- [ ] API testen (optional)

---

## ⚠️ Wichtige Hinweise

1. **Server-Restart:** Du musst den Server selbst neu starten (ich darf das nicht)
2. **Backup:** Falls möglich, mache ein Backup vor dem Deployment
3. **Testen:** Teste den Fix gründlich bevor du in Produktion gehst
4. **Monitoring:** Beobachte die Logs nach dem Deployment

---

## 🆘 Troubleshooting

### Problem: Script kann nicht ausgeführt werden

```bash
# Prüfe ob ts-node installiert ist
npm list ts-node

# Falls nicht, installiere es
npm install --save-dev ts-node
```

### Problem: Build schlägt fehl

```bash
# Prüfe TypeScript-Fehler
npm run build

# Prüfe ob alle Dependencies installiert sind
npm install
```

### Problem: PM2 startet nicht

```bash
# Prüfe PM2 Status
pm2 status

# Prüfe Logs
pm2 logs intranet-backend --lines 50

# Falls nötig, starte manuell
pm2 start ecosystem.config.js
```

---

## ✅ Erfolg!

Wenn alles funktioniert:
- ✅ Keine 403 Forbidden Fehler mehr
- ✅ Payment-Links werden erfolgreich erstellt
- ✅ Alle Branch Settings können entschlüsselt werden
- ✅ Server läuft stabil

**🎉 Fix erfolgreich deployed!**

