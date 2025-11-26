# Behebungsplan: Branch Settings Entschlüsselungsfehler

**Erstellt:** 26.11.2025  
**Status:** Bereit zur Implementierung  
**Priorität:** 🔴 KRITISCH

## 🔴 Problem: Zu 100% bewiesen

**Root Cause:** `decryptBranchApiSettings()` entschlüsselt verschachtelte Settings nicht.

### Beweise:

1. **Branch Settings Struktur (verschachtelt):**
   ```typescript
   // Wie in re-encrypt-all-api-settings.ts Zeile 89-95 gespeichert:
   {
     boldPayment: {
       apiKey: "encrypted",
       merchantId: "encrypted",
       environment: "production"
     }
   }
   ```

2. **decryptBranchApiSettings() prüft nur Root-Level:**
   ```typescript
   // backend/src/utils/encryption.ts Zeile 377-388
   const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', ...];
   for (const field of encryptedFields) {
     if (decrypted[field] && ...) {  // ← Prüft nur decrypted.apiKey, decrypted.merchantId
       decrypted[field] = decryptSecret(decrypted[field]);
     }
   }
   // ❌ NICHT geprüft: decrypted.boldPayment.apiKey, decrypted.boldPayment.merchantId
   ```

3. **boldPaymentService.ts verwendet verschlüsselte Werte:**
   ```typescript
   // backend/src/services/boldPaymentService.ts Zeile 78-83
   const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
   const boldPaymentSettings = settings?.boldPayment || settings;
   // boldPaymentSettings.apiKey und boldPaymentSettings.merchantId sind VERSCHLÜSSELT!
   this.merchantId = boldPaymentSettings.merchantId;  // ← Verschlüsselt!
   // Wird an API gesendet → 403 Forbidden
   ```

4. **Server-Logs beweisen:**
   - `403 Forbidden - Missing Authentication Token`
   - Verschlüsselte `merchantId` wird an API gesendet

**Beweis-Script:** `backend/scripts/prove-branch-encryption-bug.ts` - Führt direkten Beweis durch

---

## 📋 Behebungsplan

### Phase 1: Problem bestätigen (5 Min)

**Ziel:** Finale Bestätigung des Problems

**Schritte:**
1. Script ausführen: `npm run ts-node backend/scripts/prove-branch-encryption-bug.ts`
2. Prüfen ob verschlüsselte Werte ausgegeben werden
3. Bestätigen dass `decryptBranchApiSettings()` verschachtelte Felder nicht entschlüsselt

**Erwartetes Ergebnis:**
- `apiKey: 🔒 IMMER NOCH VERSCHLÜSSELT! ❌`
- `merchantId: 🔒 IMMER NOCH VERSCHLÜSSELT! ❌`

---

### Phase 2: Fix implementieren (15 Min)

**Ziel:** `decryptBranchApiSettings()` erweitern um verschachtelte Settings zu entschlüsseln

**Datei:** `backend/src/utils/encryption.ts`

**Änderung:**

```typescript
export const decryptBranchApiSettings = (settings: any): any => {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const decrypted = { ...settings };

  // Versuche alle möglichen verschlüsselten Felder zu entschlüsseln
  const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
  
  // 1. Root-Level Felder entschlüsseln (wie bisher)
  for (const field of encryptedFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
      try {
        decrypted[field] = decryptSecret(decrypted[field]);
      } catch (error) {
        console.error(`Error decrypting ${field}:`, error);
        // Bei Fehler: Feld bleibt wie es ist
      }
    }
  }

  // 2. NEU: Verschachtelte Settings entschlüsseln
  // Bold Payment
  if (decrypted.boldPayment && typeof decrypted.boldPayment === 'object') {
    const boldPaymentUpdates: any = {};
    if (decrypted.boldPayment.apiKey && typeof decrypted.boldPayment.apiKey === 'string' && decrypted.boldPayment.apiKey.includes(':')) {
      try {
        boldPaymentUpdates.apiKey = decryptSecret(decrypted.boldPayment.apiKey);
      } catch (error) {
        console.error('Error decrypting boldPayment.apiKey:', error);
      }
    }
    if (decrypted.boldPayment.merchantId && typeof decrypted.boldPayment.merchantId === 'string' && decrypted.boldPayment.merchantId.includes(':')) {
      try {
        boldPaymentUpdates.merchantId = decryptSecret(decrypted.boldPayment.merchantId);
      } catch (error) {
        console.error('Error decrypting boldPayment.merchantId:', error);
      }
    }
    if (Object.keys(boldPaymentUpdates).length > 0) {
      decrypted.boldPayment = {
        ...decrypted.boldPayment,
        ...boldPaymentUpdates
      };
    }
  }

  // LobbyPMS
  if (decrypted.lobbyPms && typeof decrypted.lobbyPms === 'object') {
    if (decrypted.lobbyPms.apiKey && typeof decrypted.lobbyPms.apiKey === 'string' && decrypted.lobbyPms.apiKey.includes(':')) {
      try {
        decrypted.lobbyPms = {
          ...decrypted.lobbyPms,
          apiKey: decryptSecret(decrypted.lobbyPms.apiKey)
        };
      } catch (error) {
        console.error('Error decrypting lobbyPms.apiKey:', error);
      }
    }
  }

  // TTLock/Door System
  if (decrypted.doorSystem && typeof decrypted.doorSystem === 'object') {
    const doorSystemFields = ['clientId', 'clientSecret', 'username', 'password'];
    for (const field of doorSystemFields) {
      if (decrypted.doorSystem[field] && typeof decrypted.doorSystem[field] === 'string' && decrypted.doorSystem[field].includes(':')) {
        try {
          decrypted.doorSystem = {
            ...decrypted.doorSystem,
            [field]: decryptSecret(decrypted.doorSystem[field])
          };
        } catch (error) {
          console.error(`Error decrypting doorSystem.${field}:`, error);
        }
      }
    }
  }

  // SIRE
  if (decrypted.sire && typeof decrypted.sire === 'object') {
    if (decrypted.sire.apiKey && typeof decrypted.sire.apiKey === 'string' && decrypted.sire.apiKey.includes(':')) {
      try {
        decrypted.sire = {
          ...decrypted.sire,
          apiKey: decryptSecret(decrypted.sire.apiKey)
        };
      } catch (error) {
        console.error('Error decrypting sire.apiKey:', error);
      }
    }
    if (decrypted.sire.apiSecret && typeof decrypted.sire.apiSecret === 'string' && decrypted.sire.apiSecret.includes(':')) {
      try {
        decrypted.sire = {
          ...decrypted.sire,
          apiSecret: decryptSecret(decrypted.sire.apiSecret)
        };
      } catch (error) {
        console.error('Error decrypting sire.apiSecret:', error);
      }
    }
  }

  // Email IMAP Password (bereits vorhanden, bleibt unverändert)
  if (decrypted.imap?.password && typeof decrypted.imap.password === 'string' && decrypted.imap.password.includes(':')) {
    try {
      decrypted.imap = {
        ...decrypted.imap,
        password: decryptSecret(decrypted.imap.password)
      };
    } catch (error) {
      console.error('Error decrypting imap.password:', error);
    }
  }

  return decrypted;
};
```

**Wichtig:**
- Alle verschachtelten Settings-Strukturen abdecken
- Fehlerbehandlung beibehalten (Feld bleibt verschlüsselt bei Fehler)
- Konsistent mit bestehender `imap.password` Logik

---

### Phase 3: Test lokal (10 Min)

**Ziel:** Fix lokal testen bevor Deployment

**Schritte:**
1. Code-Änderung implementieren
2. Script ausführen: `npm run ts-node backend/scripts/prove-branch-encryption-bug.ts`
3. Prüfen ob Werte jetzt entschlüsselt werden

**Erwartetes Ergebnis:**
- `apiKey: 🔓 ENTSCHLÜSSELT ✅`
- `merchantId: 🔓 ENTSCHLÜSSELT ✅`

**Zusätzliche Tests:**
```bash
# Teste alle Branch Settings
npm run ts-node backend/scripts/check-all-api-settings-decryption.ts

# Teste Bold Payment Service direkt
npm run ts-node backend/scripts/debug-bold-payment-service-load.ts
```

---

### Phase 4: Deployment auf Server (5 Min)

**Ziel:** Fix auf Produktivserver deployen

**Schritte:**
1. Code committen und pushen
2. Auf Server deployen (gemäß `docs/technical/SERVER_UPDATE.md`)
3. PM2 Prozess neu starten (wird vom User gemacht)

**Wichtig:**
- ⚠️ **NICHT selbst Server neu starten!** User macht das.
- Nur Code deployen, User startet Server neu.

---

### Phase 5: Verifikation auf Server (10 Min)

**Ziel:** Bestätigen dass Fix funktioniert

**Schritte:**
1. Script auf Server ausführen (via SSH):
   ```bash
   cd /var/www/intranet/backend
   npm run ts-node scripts/prove-branch-encryption-bug.ts
   ```
2. Prüfe Server-Logs:
   ```bash
   pm2 logs intranet-backend --lines 100 --nostream | grep -i "bold\|payment\|403"
   ```
3. Teste API-Call manuell (wenn möglich)

**Erwartetes Ergebnis:**
- Keine verschlüsselten Werte mehr in Logs
- Keine 403 Forbidden Fehler mehr
- API-Calls funktionieren

---

## ✅ Erfolgskriterien

1. ✅ `decryptBranchApiSettings()` entschlüsselt verschachtelte Settings
2. ✅ Bold Payment API-Calls funktionieren (keine 403 Forbidden mehr)
3. ✅ Alle Branch Settings können korrekt entschlüsselt werden
4. ✅ Keine Regression bei bestehenden Features

---

## 🔄 Rollback-Plan

Falls Fix Probleme verursacht:

1. **Sofort:** Git revert des Commits
2. **Deployment:** Alte Version deployen
3. **Server:** PM2 Prozess neu starten (User macht das)

**Risiko:** Niedrig - Fix ist isoliert und rückwärtskompatibel (Root-Level Felder werden weiterhin entschlüsselt)

---

## 📝 Notizen

- Fix ist rückwärtskompatibel (Root-Level Felder funktionieren weiterhin)
- Alle verschachtelten Settings-Strukturen müssen abgedeckt werden
- Test-Script `prove-branch-encryption-bug.ts` kann für zukünftige Tests verwendet werden

---

## ⏱️ Geschätzte Zeit

- **Phase 1:** 5 Min
- **Phase 2:** 15 Min
- **Phase 3:** 10 Min
- **Phase 4:** 5 Min (nur Deployment, kein Server-Restart)
- **Phase 5:** 10 Min

**Gesamt:** ~45 Minuten

