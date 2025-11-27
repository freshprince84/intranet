# Kritische Analyse: Widersprüche und Erkenntnisse

## 🔴 WIDERSPRUCH GEFUNDEN:

### ✅ WAS FUNKTIONIERT:

1. **Scripts verwenden `Authorization: x-api-key ${merchantId}`** → ✅ Funktionieren
   - `test-bold-payment-direct.ts`: Zeile 41
   - `test-bold-payment-branch-settings.ts`: Zeile 87
   - Alle Scripts verwenden: `'Authorization': 'x-api-key ${merchantId}'`

2. **curl mit `Authorization: x-api-key ...`** → ✅ 200 OK
   - Test 3.2 zeigt: `< HTTP/2 200`

3. **curl mit `x-api-key: ...`** → ❌ 401 Unauthorized
   - Test 3.1 zeigt: `< HTTP/2 401`

### ❌ WAS FUNKTIONIERT NICHT:

1. **Server-Logs zeigen BEIDE Formate wurden verwendet:**
   - Zeile 667: `Authorization Header: x-api-key ...` → ❌ 403 Forbidden
   - Zeile 714: `"x-api-key": "..."` → ❌ 403 Forbidden

2. **Code wurde geändert:**
   - Source: `config.headers['x-api-key'] = this.merchantId;` (Zeile 827) → ❌ FALSCH!
   - Kompiliert: `config.headers['x-api-key'] = this.merchantId;` (Zeile 802) → ❌ FALSCH!

---

## 🎯 KRITISCHE FRAGE: WARUM FUNKTIONIERT CURL, ABER NICHT DER SERVER?

### Mögliche Erklärungen:

1. **Payload ist anders:**
   - curl sendet: `{"amount_type":"CLOSE","amount":{"currency":"COP","total_amount":10000,...}}`
   - Server sendet: `{"amount_type":"CLOSE","amount":{"currency":"COP","total_amount":561024,...}}`
   - **ABER:** Warum sollte das 403 verursachen? (403 = Authentifizierung, nicht Payload)

2. **Andere Header werden gesendet:**
   - Axios sendet automatisch: `Accept: application/json, text/plain, */*`
   - Axios sendet automatisch: `User-Agent: axios/...`
   - **Möglicherweise:** API blockiert bestimmte User-Agents?

3. **IP/Origin wird blockiert:**
   - Server-IP wird blockiert?
   - **ABER:** Scripts laufen auch auf dem Server und funktionieren!

4. **Rate Limiting:**
   - Zu viele Requests von Server-IP?
   - **ABER:** Scripts laufen auch auf dem Server und funktionieren!

5. **Axios sendet andere Encoding/Content-Type:**
   - **ABER:** Beide verwenden `Content-Type: application/json`

6. **Response-Interceptor ändert die Antwort:**
   - Gibt es einen Response-Interceptor, der 200 in 403 ändert?
   - **ABER:** Das würde nicht erklären, warum curl funktioniert

---

## 🔍 WICHTIGE ERKENNTNISSE AUS LOGS:

### Logs zeigen ZWEI verschiedene Requests:

**Request 1 (Zeile 667-677):**
```
[Bold Payment] Authorization Header: x-api-key CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E
"Authorization": "x-api-key CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E"
```
→ ❌ 403 Forbidden

**Request 2 (Zeile 711-715):**
```
"x-api-key": "CTkrL5f5IxvMpX722zXivqnd1KU5VyoNBOFQFUUnf-E"
```
→ ❌ 403 Forbidden

**Das bedeutet:**
- Der Code wurde geändert (von `Authorization` zu `x-api-key`)
- BEIDE Formate geben 403 zurück
- **ABER:** curl mit `Authorization: x-api-key ...` funktioniert!

---

## 🎯 HYPOTHESE: AXIOS SENDET ANDERE HEADER

### Mögliche Ursache:

**Axios sendet automatisch zusätzliche Header, die die API ablehnt:**

1. **User-Agent:**
   - Axios sendet: `User-Agent: axios/1.6.0`
   - curl sendet: `User-Agent: curl/7.68.0`
   - **Möglicherweise:** API blockiert axios User-Agent?

2. **Accept Header:**
   - Axios sendet: `Accept: application/json, text/plain, */*`
   - curl sendet: `Accept: */*`
   - **Möglicherweise:** API erwartet spezifischen Accept Header?

3. **Andere Header:**
   - Axios sendet möglicherweise: `Accept-Encoding: gzip, deflate, br`
   - Axios sendet möglicherweise: `Connection: keep-alive`
   - **Möglicherweise:** API blockiert bestimmte Header-Kombinationen?

---

## 🔍 WARUM FUNKTIONIEREN SCRIPTS, ABER NICHT DER SERVER?

### Scripts vs. Server:

**Scripts:**
- Verwenden `axios.post()` direkt
- Setzen Header manuell: `headers: { 'Authorization': 'x-api-key ...' }`
- ✅ Funktionieren

**Server:**
- Verwenden `this.axiosInstance.post()`
- Header wird im Request-Interceptor gesetzt
- ❌ Funktionieren nicht

**Unterschied:**
- Scripts: Axios-Instance wird direkt erstellt
- Server: Axios-Instance wird mit Interceptor erstellt
- **Möglicherweise:** Interceptor ändert etwas am Request?

---

## 🔍 TTLOCK PROBLEM - GLEICHE URSACHE?

### TTLock verwendet andere Authentifizierung:

- TTLock verwendet OAuth 2.0 (Access Token)
- Bold Payment verwendet API-Key
- **ABER:** Beide verwenden Axios mit Interceptor

**Mögliche gemeinsame Ursache:**
- Axios-Instance wird nicht korrekt erstellt?
- Interceptor wird nicht ausgeführt?
- Settings werden nicht korrekt geladen?

---

## 📋 NÄCHSTE PRÜFUNGEN:

### 1. Prüfe ob Axios andere Header sendet:

```bash
# Auf Server: Erstelle Test-Script das EXAKT den Server-Code verwendet
# Aber: Logge ALLE Header die gesendet werden
```

### 2. Prüfe ob Response-Interceptor die Antwort ändert:

```bash
# Prüfe ob es einen Response-Interceptor gibt, der 200 in 403 ändert
```

### 3. Prüfe ob es einen Proxy/Middleware gibt:

```bash
# Prüfe ob nginx oder ein anderer Proxy die Request ändert
```

### 4. Vergleiche Script-Request vs. Server-Request:

```bash
# Erstelle Test-Script das EXAKT den Server-Code verwendet
# Aber: Logge ALLE Header und vergleiche mit Script
```

---

## 🎯 FAZIT:

**Meine Erkenntnisse sind NICHT vollständig stimmig:**

1. ✅ Scripts verwenden `Authorization: x-api-key ...` → Funktionieren
2. ✅ curl verwendet `Authorization: x-api-key ...` → Funktioniert (200 OK)
3. ❌ Server verwendet `Authorization: x-api-key ...` → 403 Forbidden
4. ❌ Server verwendet `x-api-key: ...` → 403 Forbidden

**Das bedeutet:**
- Header-Format ist NICHT das Problem (curl funktioniert)
- Es muss etwas ANDERES sein, das nur beim Server-Request passiert
- Möglicherweise: Axios sendet andere Header?
- Möglicherweise: Response-Interceptor ändert die Antwort?
- Möglicherweise: Proxy/Middleware ändert die Request?

**Nächster Schritt:**
- Prüfe EXAKTEN Request-Header (was wird wirklich gesendet?)
- Prüfe ob Response-Interceptor die Antwort ändert
- Prüfe ob es einen Proxy/Middleware gibt




