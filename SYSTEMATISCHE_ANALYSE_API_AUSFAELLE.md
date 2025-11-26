# Systematische Analyse: API-Ausfälle seit 26.11.2025

**Erstellt:** 26.11.2025 18:40 UTC  
**Status:** 🔴 KRITISCH - Alle APIs funktionieren nicht  
**Dauer:** ~24 Stunden

---

## 📋 ZUSAMMENFASSUNG ALLER ERKENNTNISSE

### ✅ WAS FUNKTIONIERT:

1. **Environment-Variablen:** ✅ ALLE vorhanden
   - DATABASE_URL: ✅
   - ENCRYPTION_KEY: ✅ (64 Zeichen)
   - JWT_SECRET: ✅
   - Alle anderen: ✅

2. **Entschlüsselung:** ✅ Funktioniert
   - ENCRYPTION_KEY ist korrekt
   - Settings können entschlüsselt werden

3. **Settings in DB:** ✅ Unverschlüsselt
   - `boldPayment.apiKey`: Unverschlüsselt (keine ":")
   - `boldPayment.merchantId`: Unverschlüsselt (keine ":")
   - Werte sind direkt verwendbar

4. **Fix implementiert:** ✅
   - `decryptBranchApiSettings()` entschlüsselt jetzt verschachtelte Settings
   - Fix ist im kompilierten Code vorhanden

5. **Script-Tests:** ✅ Funktionieren
   - `test-bold-payment-api-manual.ts`: Status 200 ✅
   - `test-bold-payment-branch-settings.ts`: Status 200 ✅
   - `debug-bold-payment-service-exact.ts`: Status 200 ✅
   - **ALLE Tests funktionieren mit denselben Werten!**

### ❌ WAS FUNKTIONIERT NICHT:

1. **Server zeigt 403 Forbidden:** ❌
   - Bold Payment: 403 Forbidden
   - TTLock: Fehler (muss noch geprüft werden)
   - Alle APIs: Betroffen seit ~24h

2. **Echte Requests schlagen fehl:** ❌
   - Payment-Link-Erstellung: 403 Forbidden
   - Reservierung 12443: Fehler

### 🔍 WIDERSPRUCH:

**Script-Tests funktionieren, aber Server nicht!**

- **Tests verwenden:** `Authorization: x-api-key CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E`
- **Server verwendet:** `Authorization: x-api-key CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E`
- **Derselbe Header, derselbe Wert!**
- **Tests:** Status 200 ✅
- **Server:** Status 403 ❌

---

## 🔴 MÖGLICHE URSACHEN (systematisch geprüft):

### ❌ AUSGESCHLOSSEN:

1. ❌ **ENCRYPTION_KEY fehlt/falsch** → Geprüft: ✅ Vorhanden und korrekt
2. ❌ **Settings verschlüsselt** → Geprüft: ✅ Unverschlüsselt in DB
3. ❌ **Environment-Variablen fehlen** → Geprüft: ✅ Alle vorhanden
4. ❌ **Fix nicht implementiert** → Geprüft: ✅ Fix im Code vorhanden
5. ❌ **Falscher merchantId-Wert** → Geprüft: ✅ Derselbe Wert wie in Tests

### ⚠️ NOCH ZU PRÜFEN:

1. ⚠️ **Header-Format unterschiedlich?**
   - Tests: `Authorization: x-api-key ...`
   - Server: `Authorization: x-api-key ...`
   - **GLEICH** → Aber vielleicht wird es anders gesendet?

2. ⚠️ **IP-Adresse/Origin-Problem?**
   - API könnte Requests von Server-IP ablehnen
   - Rate-Limiting?
   - Firewall-Regel?

3. ⚠️ **Timing-Problem?**
   - Settings werden zu spät geladen?
   - Caching-Problem?

4. ⚠️ **Axios-Konfiguration?**
   - Tests verwenden direkten axios-Call
   - Server verwendet Axios-Instance mit Interceptors
   - **Unterschied in der Konfiguration?**

---

## 🔍 NÄCHSTE SYSTEMATISCHE PRÜFUNG:

### Schritt 1: Prüfe EXAKTEN Request-Header (was wird wirklich gesendet?)

**Auf Server:**
```bash
# Aktiviere detailliertes Logging für Axios
# Oder: Prüfe mit tcpdump/wireshark was wirklich gesendet wird
```

### Schritt 2: Vergleiche Axios-Konfiguration

**Tests verwenden:**
```typescript
axios.post(url, payload, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `x-api-key ${merchantId}`
  }
});
```

**Server verwendet:**
```typescript
// Axios-Instance mit Interceptors
config.headers.Authorization = `x-api-key ${this.merchantId}`;
```

**Möglicher Unterschied:** Axios-Instance könnte Header anders formatieren!

### Schritt 3: Prüfe ob API-Key/merchantId wirklich derselbe ist

**Logs zeigen:**
- `[Bold Payment] Authorization Header: x-api-key CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E`

**Tests verwenden:**
- `CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E`

**Prüfung:** Sind es wirklich identische Werte? (keine versteckten Zeichen?)

---

## 📝 BEWEISE AUS LOGS:

**Zeile 902, 966:**
```
[Bold Payment] Authorization Header: x-api-key CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E
```

**Zeile 891-901:**
```
[Bold Payment] API Error: {
  status: 403,
  statusText: 'Forbidden',
  data: { message: 'Forbidden' }
}
```

**Zeile 951:**
```
[BoldPayment] Verwende Branch-spezifische Settings für Branch 3
```

**FAZIT:** 
- Settings werden geladen ✅
- Header wird gesetzt ✅
- **ABER:** API gibt 403 zurück ❌

---

## 🎯 HYPOTHESE:

**Das Problem ist NICHT:**
- ❌ Entschlüsselung
- ❌ Environment-Variablen
- ❌ Settings-Werte
- ❌ Code-Fix

**Das Problem IST wahrscheinlich:**
- ⚠️ **Axios-Instance-Konfiguration** (Header wird anders gesendet als in Tests)
- ⚠️ **Oder:** API erkennt Request nicht (IP/Origin-Problem)
- ⚠️ **Oder:** Versteckte Zeichen im Header-String

---

## 🔧 SOFORT-MASSNAHME:

**1. Prüfe EXAKTEN Request (was wird wirklich gesendet?):**

Erweitere Logging in `boldPaymentService.ts`:
```typescript
// Zeige EXAKTEN Header-String (mit Länge, Zeichen)
console.log(`[Bold Payment] Header EXAKT:`, JSON.stringify(config.headers.Authorization));
console.log(`[Bold Payment] Header Länge:`, config.headers.Authorization?.length);
console.log(`[Bold Payment] Header Bytes:`, Buffer.from(config.headers.Authorization || '').toString('hex'));
```

**2. Teste mit EXAKT derselben Axios-Konfiguration wie Server:**

Erstelle Test-Script, das EXAKT die Axios-Instance wie der Service verwendet.

**3. Prüfe ob API-Key wirklich identisch ist:**

Vergleiche Byte-für-Byte die Werte aus Tests und Server.

---

## 📋 CHECKLISTE - WAS WURDE BEREITS GEPRÜFT:

- [x] Environment-Variablen vorhanden
- [x] ENCRYPTION_KEY korrekt
- [x] Settings in DB unverschlüsselt
- [x] Fix implementiert
- [x] Fix im kompilierten Code
- [x] Script-Tests funktionieren
- [x] Server verwendet Branch Settings
- [x] Header wird gesetzt
- [ ] **EXAKTER Request-Header (was wird wirklich gesendet?)**
- [ ] **Axios-Konfiguration Vergleich**
- [ ] **Byte-für-Byte Vergleich der Werte**

---

## ⚠️ WICHTIG:

**NICHT MEHR PRÜFEN:**
- ❌ Environment-Variablen (bereits geprüft)
- ❌ Entschlüsselung (bereits geprüft)
- ❌ Settings-Werte (bereits geprüft)
- ❌ Fix-Implementierung (bereits geprüft)

**NUR NOCH PRÜFEN:**
- ✅ **EXAKTER Request (was wird wirklich gesendet?)**
- ✅ **Axios-Konfiguration-Unterschied**
- ✅ **Byte-für-Byte Vergleich**

