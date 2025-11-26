# 🔧 BEHEBUNGSPLAN: Branch Settings Entschlüsselungsfehler - AUSFÜHRUNG

## 📋 Übersicht

**Problem:** Branch Settings wurden mit einem anderen ENCRYPTION_KEY verschlüsselt als der, der aktuell auf dem Server verwendet wird.

**Lösung:** Branch Settings mit aktuellem ENCRYPTION_KEY neu verschlüsseln.

---

## 🚀 SCHRITT-FÜR-SCHRITT ANLEITUNG

### Schritt 1: ENCRYPTION_KEY auf Server prüfen

**Auf Server ausführen:**
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
cd /var/www/intranet/backend
cat .env | grep ENCRYPTION_KEY
```

**Erwartetes Ergebnis:**
```
ENCRYPTION_KEY=f8795f99bb9aa67acae0c6bc5ab09bec6c7b75ff3616cff84e1c8e622eabe318
```

**Prüfung:**
- ✅ Key vorhanden?
- ✅ Key-Länge = 64 hex characters?
- ✅ Key identisch mit lokalem Key?

**Wenn Key fehlt oder falsch:**
```bash
# Key prüfen:
echo $ENCRYPTION_KEY | wc -c
# Sollte 65 sein (64 Zeichen + Newline)
```

---

### Schritt 2: Scripts auf Server hochladen

**Lokal ausführen (von Projekt-Root):**
```bash
# Test-Script hochladen
scp -i ~/.ssh/intranet_rsa backend/scripts/test-branch-decryption.ts root@65.109.228.106:/var/www/intranet/backend/scripts/

# Re-Encryption-Script hochladen (falls nicht vorhanden)
scp -i ~/.ssh/intranet_rsa backend/scripts/re-encrypt-all-api-settings.ts root@65.109.228.106:/var/www/intranet/backend/scripts/

# Verifikations-Script hochladen
scp -i ~/.ssh/intranet_rsa backend/scripts/verify-branch-decryption.ts root@65.109.228.106:/var/www/intranet/backend/scripts/
```

**ODER alle auf einmal:**
```bash
scp -i ~/.ssh/intranet_rsa backend/scripts/{test-branch-decryption.ts,re-encrypt-all-api-settings.ts,verify-branch-decryption.ts} root@65.109.228.106:/var/www/intranet/backend/scripts/
```

---

### Schritt 3: Test-Entschlüsselung (BEWEIS, dass Problem existiert)

**Auf Server ausführen:**
```bash
cd /var/www/intranet/backend
npm run ts-node scripts/test-branch-decryption.ts
```

**Erwartetes Ergebnis:**
- ❌ Alle Entschlüsselungen schlagen fehl mit "Failed to decrypt secret - invalid key or corrupted data"
- ✅ **Das beweist, dass Branch Settings mit falschem Key verschlüsselt sind!**

**Beispiel-Output:**
```
🔍 Teste Entschlüsselung von Branch Settings...
✅ ENCRYPTION_KEY ist gesetzt
================================================================================
BRANCH 3 (Manila) - Entschlüsselungstest
================================================================================
📋 Branch: Manila (ID: 3)

🔐 Bold Payment Settings:
   ❌ Entschlüsselung fehlgeschlagen
   Fehler: Failed to decrypt secret - invalid key or corrupted data
...
```

---

### Schritt 4: Re-Encryption ausführen (LÖSUNG)

**WICHTIG:** Dieses Script verschlüsselt alle Branch Settings neu mit dem aktuellen ENCRYPTION_KEY!

**Auf Server ausführen:**
```bash
cd /var/www/intranet/backend
npm run ts-node scripts/re-encrypt-all-api-settings.ts
```

**Erwartetes Ergebnis:**
```
🔐 Verschlüssele alle API Settings neu...
✅ ENCRYPTION_KEY ist gesetzt
================================================================================
1. ORGANIZATION SETTINGS - Bold Payment
================================================================================
✅ Organization Bold Payment Settings aktualisiert
   Merchant ID: CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E
   API Key: 1hDVYQqQuaeAB16kQvXRrQ
================================================================================
2. BRANCH SETTINGS - Manila (Branch 3)
================================================================================
✅ Manila Branch Settings aktualisiert:
   Bold Payment: ✅
   LobbyPMS: ✅
   TTLock: ✅
   WhatsApp: ✅
================================================================================
3. BRANCH SETTINGS - Parque Poblado (Branch 4)
================================================================================
✅ Parque Poblado Branch Settings aktualisiert:
   Bold Payment: ✅
   LobbyPMS: ✅
   WhatsApp: ✅
================================================================================
✅ ALLE API SETTINGS ERFOLGREICH NEU VERSCHLÜSSELT!
```

**Wenn Fehler auftreten:**
- Prüfe ENCRYPTION_KEY (Schritt 1)
- Prüfe, ob Branches existieren (ID 3 und 4)
- Prüfe Datenbank-Verbindung

---

### Schritt 5: Verifikation (Prüfen, ob Lösung funktioniert)

**Auf Server ausführen:**
```bash
cd /var/www/intranet/backend
npm run ts-node scripts/verify-branch-decryption.ts
```

**Erwartetes Ergebnis:**
```
✅ Verifiziere Entschlüsselung nach Re-Encryption...
✅ ENCRYPTION_KEY ist gesetzt
================================================================================
BRANCH 3 (Manila) - Verifikation
================================================================================
📋 Branch: Manila (ID: 3)
   ✅ Bold Payment: Entschlüsselung erfolgreich
      Merchant ID: CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E...
   ✅ LobbyPMS: Entschlüsselung erfolgreich
      API Key: 8LwykKjLq7uziBRLxL1INGCLSsKfYWc5KIXTnRqZ28wTvSQehrIsToUJ3a5V...
   ✅ TTLock: Entschlüsselung erfolgreich
      Client ID: c0128d6b496a4f848d06970a65210e8a...
   ✅ WhatsApp: Entschlüsselung erfolgreich
      API Key: EAAQYZBTYO0aQBP4Ov03fO3XLw225s3tPTWpu2J9EaI9ChMFNdCkI4i839NmofBchVHguTZA5rlRdZAkPyd2PccBnHwlpZCxutcuDSsvHBbITYgiosjuN2Al4i2vcTT5uZA6pzd230a4wDQhwEwcuG6kGUgE4zCZBo0ohPylGXAGDkhf97FPQKs40HvtevJ5hXZBqAZDZD...
================================================================================
BRANCH 4 (Parque Poblado) - Verifikation
================================================================================
📋 Branch: Parque Poblado (ID: 4)
   ✅ Bold Payment: Entschlüsselung erfolgreich
      Merchant ID: CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E...
   ✅ LobbyPMS: Entschlüsselung erfolgreich
      API Key: Q3LiVD4A6438JatGPmNkBUPrErWM2HIU3KrJ0O2BoIWpNW3Q0l3ZC1JmRtri...
   ✅ WhatsApp: Entschlüsselung erfolgreich
      API Key: EAAQYZBTYO0aQBP4Ov03fO3XLw225s3tPTWpu2J9EaI9ChMFNdCkI4i839NmofBchVHguTZA5rlRdZAkPyd2PccBnHwlpZCxutcuDSsvHBbITYgiosjuN2Al4i2vcTT5uZA6pzd230a4wDQhwEwcuG6kGUgE4zCZBo0ohPylGXAGDkhf97FPQKs40HvtevJ5hXZBqAZDZD...
================================================================================
✅ ALLE ENTSCHLÜSSELUNGEN ERFOLGREICH!
✅ Problem behoben!
```

**Wenn Fehler auftreten:**
- Re-Encryption nochmal ausführen (Schritt 4)
- Prüfe ENCRYPTION_KEY (Schritt 1)

---

### Schritt 6: PM2 Restart (nur wenn nötig)

**WICHTIG:** Server-Neustart nur nach Absprache mit User!

**Auf Server ausführen (NUR wenn User zustimmt):**
```bash
pm2 restart intranet-backend
pm2 logs intranet-backend --lines 100 --nostream | tail -50
```

**ODER:** User fragt, ob Server neu gestartet werden soll.

**Warum Restart?**
- Server lädt ENCRYPTION_KEY beim Start
- Nach Re-Encryption sollten neue Settings sofort funktionieren
- Restart stellt sicher, dass alles neu geladen wird

---

### Schritt 7: API-Funktionalität testen

**Nach Re-Encryption prüfen:**
```bash
# Auf Server ausführen:
pm2 logs intranet-backend --lines 500 --nostream | grep -iE "\[Bold Payment\]|\[TTLock\]|\[WhatsApp\]|\[LobbyPMS\]|error decrypting" | tail -100
```

**Erwartetes Ergebnis:**
- ✅ Keine "Error decrypting" Fehler mehr
- ✅ API-Aufrufe erfolgreich
- ✅ Scheduler funktioniert

**ODER Live-Logs beobachten:**
```bash
pm2 logs intranet-backend --lines 0
# Drücke Ctrl+C zum Beenden
```

**Was zu prüfen:**
- ✅ Keine "Error decrypting" Fehler
- ✅ "[BoldPayment] Verwende Branch-spezifische Settings" → erfolgreich
- ✅ "[TTLock] Verwende Branch-spezifische Settings" → erfolgreich
- ✅ "[LobbyPMS] Verwende Branch-spezifische Settings" → erfolgreich
- ✅ "[WhatsApp Service] Branch Settings geladen" → erfolgreich

---

## 🔍 TROUBLESHOOTING

### Problem: "ENCRYPTION_KEY ist nicht korrekt gesetzt"

**Lösung:**
```bash
# Prüfe .env Datei:
cat /var/www/intranet/backend/.env | grep ENCRYPTION_KEY

# Prüfe Key-Länge:
cat /var/www/intranet/backend/.env | grep ENCRYPTION_KEY | cut -d'=' -f2 | wc -c
# Sollte 65 sein (64 Zeichen + Newline)

# Wenn Key fehlt oder falsch:
# Key aus lokaler .env kopieren und auf Server setzen
```

### Problem: "Branch nicht gefunden"

**Lösung:**
```bash
# Prüfe Branches in Datenbank:
cd /var/www/intranet/backend
npx prisma studio
# ODER:
npx prisma db execute --stdin << EOF
SELECT id, name FROM "Branch" WHERE id IN (3, 4);
EOF
```

### Problem: "Failed to decrypt secret" nach Re-Encryption

**Lösung:**
1. Prüfe ENCRYPTION_KEY (Schritt 1)
2. Führe Re-Encryption nochmal aus (Schritt 4)
3. Prüfe, ob Script auf Server ausgeführt wurde (nicht lokal!)

### Problem: Scripts können nicht ausgeführt werden

**Lösung:**
```bash
# Prüfe, ob Scripts vorhanden:
ls -la /var/www/intranet/backend/scripts/*.ts

# Prüfe npm/ts-node:
cd /var/www/intranet/backend
npm run ts-node --version

# Falls ts-node fehlt:
npm install
```

---

## ✅ CHECKLISTE

- [ ] Schritt 1: ENCRYPTION_KEY geprüft
- [ ] Schritt 2: Scripts auf Server hochgeladen
- [ ] Schritt 3: Test-Entschlüsselung ausgeführt (beweist Problem)
- [ ] Schritt 4: Re-Encryption ausgeführt
- [ ] Schritt 5: Verifikation ausgeführt (beweist Lösung)
- [ ] Schritt 6: PM2 Restart (optional, nach Absprache)
- [ ] Schritt 7: API-Funktionalität getestet

---

## 📝 ZUSAMMENFASSUNG

**Problem:** Branch Settings wurden mit falschem ENCRYPTION_KEY verschlüsselt.

**Lösung:** 
1. Test-Script ausführen → beweist Problem
2. Re-Encryption-Script ausführen → löst Problem
3. Verifikations-Script ausführen → beweist Lösung

**Ergebnis:** Alle Branch Settings können wieder entschlüsselt werden, APIs funktionieren wieder.

---

## 🔗 VERWEISE

- Detaillierte Analyse: `ANALYSE_API_AUSFAELLE_2025-11-25.md`
- Re-Encryption-Script: `backend/scripts/re-encrypt-all-api-settings.ts`
- Test-Script: `backend/scripts/test-branch-decryption.ts`
- Verifikations-Script: `backend/scripts/verify-branch-decryption.ts`

