# ✅ TTLock Funktionierende Lösung - VOLLSTÄNDIGE DOKUMENTATION

**Datum**: 2025-11-18  
**Status**: ✅ **FUNKTIONIEREND** - Getestet und bestätigt!

**✅ KRITISCH - startDate**: Muss IMMER auf heute 00:00:00 gesetzt werden (`new Date()`), NICHT auf checkInDate (`new Date(startDate)`)! Die API akzeptiert kein startDate, das früher als heute ist!

## 🎯 WICHTIG - DIESE LÖSUNG FUNKTIONIERT!

**GETESTETE CODES:**
- ✅ Code `1462371` (7-stellig) - **FUNKTIONIERT AN DER TÜR!** (getestet am 18.11.2025)
- ✅ Code `3304358` (7-stellig) - **ZWEITER TEST ERFOLGREICH!**

## ✅ EXAKTE KONFIGURATION (JEDES DETAIL MUSS GENAU SO SEIN!)

### 1. API-Endpunkt
- ✅ **Endpunkt**: `/v3/keyboardPwd/get` (NICHT `/v3/keyboardPwd/add`!)
- ❌ **NICHT VERWENDEN**: `/v3/keyboardPwd/add` - erfordert Gateway/App-Sync

### 2. Parameter (EXAKT WIE GETESTET)

```typescript
// ✅ FUNKTIONIERENDE LÖSUNG (GETESTET: Code 1462371 & 3304358)
const accessToken = await this.getAccessToken();
const currentTimestamp = Date.now(); // Millisekunden

// ✅ KRITISCH: startDate muss IMMER auf heute 00:00:00 gesetzt werden, NICHT auf checkInDate!
// Die API akzeptiert kein startDate, das früher als heute ist!
// WICHTIG: startDate muss in der Vergangenheit liegen (heute 00:00:00)
let actualStartDate = new Date(); // ✅ IMMER heute (NICHT new Date(startDate)!)
actualStartDate.setHours(0, 0, 0, 0); // Heute 00:00:00

// WICHTIG: endDate muss mindestens 1 Tag nach startDate liegen
let actualEndDate = new Date(endDate);
if (actualEndDate.getTime() <= actualStartDate.getTime()) {
  actualEndDate = new Date(actualStartDate);
  actualEndDate.setDate(actualEndDate.getDate() + 1); // +1 Tag
}

const payload = new URLSearchParams();
payload.append('clientId', this.clientId || '');
payload.append('accessToken', accessToken);
payload.append('lockId', lockId.toString());
// ✅ KRITISCH: keyboardPwd NICHT setzen - API generiert automatisch!
payload.append('keyboardPwdName', passcodeName || 'Guest Passcode');
payload.append('keyboardPwdType', '3'); // ✅ 3 = period (temporärer Passcode)
payload.append('startDate', actualStartDate.getTime().toString()); // Millisekunden
payload.append('endDate', actualEndDate.getTime().toString()); // Millisekunden
payload.append('addType', '1'); // ✅ 1 = via phone bluetooth
payload.append('date', currentTimestamp.toString()); // Millisekunden

// ✅ KRITISCH: Request an /v3/keyboardPwd/get senden (NICHT /v3/keyboardPwd/add!)
const response = await axiosInstance.post('/v3/keyboardPwd/get', payload, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});

// Passcode aus Response extrahieren
const generatedPasscode = response.data.keyboardPwd || response.data.passcode;
const keyboardPwdId = response.data.keyboardPwdId;

if (generatedPasscode) {
  return generatedPasscode.toString();
}
```

### 3. Kritische Parameter (MÜSSEN GENAU SO SEIN!)

| Parameter | Wert | Kritisch? | Warum? |
|-----------|------|-----------|--------|
| **Endpunkt** | `/v3/keyboardPwd/get` | ✅ JA | Nur dieser Endpunkt funktioniert ohne Gateway/App-Sync! |
| **`keyboardPwd`** | **NICHT setzen** | ✅ JA | Wenn gesetzt, funktioniert es NICHT ohne Gateway/App-Sync! |
| **`keyboardPwdType`** | `3` (period) | ✅ JA | `2` (permanent) funktioniert NICHT ohne Gateway/App-Sync! |
| **`startDate`** | **IMMER heute 00:00:00** (Millisekunden) | ✅ JA | **KRITISCH**: Muss IMMER auf heute 00:00:00 gesetzt werden, NICHT auf checkInDate! Die API akzeptiert kein startDate, das früher als heute ist! |
| **`endDate`** | Mindestens 1 Tag später (Millisekunden) | ✅ JA | Muss mindestens 1 Tag nach `startDate` liegen! |
| **`addType`** | `1` (via phone bluetooth) | ✅ JA | `2` (via gateway/WiFi) funktioniert NICHT ohne Gateway! |
| **`date`** | Aktueller Timestamp (Millisekunden) | ✅ JA | Muss in Millisekunden sein (nicht Sekunden)! |
| **Passcode-Länge** | Variabel (API generiert) | ✅ JA | NICHT selbst generieren - API bestimmt die Länge! |

## ❌ NICHT FUNKTIONIERENDE METHODEN (ALLE ANDEREN)

**ALLE FOLGENDEN METHODEN FUNKTIONIEREN NICHT - NICHT VERWENDEN!**

1. ❌ `/v3/keyboardPwd/add` - erfordert Gateway/App-Sync
2. ❌ `keyboardPwdType: 2` (permanent) - funktioniert nicht ohne Gateway/App-Sync
3. ❌ `keyboardPwd` Parameter setzen - funktioniert nicht ohne Gateway/App-Sync
4. ❌ 9-stellige permanente Passcodes (`keyboardPwdType: 2`)
5. ❌ 10-stellige period Passcodes mit `/v3/keyboardPwd/add`
6. ❌ `addType: 2` (via gateway/WiFi) - kein Gateway vorhanden
7. ❌ Benutzerdefinierte Passcodes (4-9 Ziffern) - erfordern Gateway/App-Sync

## ✅ GETESTET UND FUNKTIONIERT

- ✅ Code `1462371` (7-stellig) funktioniert an der Tür - getestet am 18.11.2025
- ✅ Code `3304358` (7-stellig) - zweiter Test erfolgreich
- ✅ Erstellt über `/v3/keyboardPwd/get` Endpunkt
- ✅ Kein Gateway erforderlich
- ✅ Keine App-Synchronisation erforderlich
- ✅ Funktioniert sofort nach Erstellung

## 📝 WICHTIGE HINWEISE

1. **NUR diese Lösung verwenden** - alle anderen Methoden funktionieren nicht!
2. **Jedes Detail muss genau so sein** - keine Abweichungen erlaubt!
3. **Passcode-Länge variabel** - API bestimmt die Länge (z.B. 7-stellig)
4. **Kein Gateway erforderlich** - funktioniert ohne Gateway!
5. **Keine App-Synchronisation erforderlich** - funktioniert ohne App-Sync!
6. **Funktioniert sofort** - keine Wartezeit erforderlich!
7. **✅ KRITISCH - startDate**: Muss IMMER auf heute 00:00:00 gesetzt werden (`new Date()`), NICHT auf checkInDate (`new Date(startDate)`)! Die API akzeptiert kein startDate, das früher als heute ist!

## 🔗 Referenzen

- Hauptdokumentation: `docs/implementation_plans/TTLOCK_INTEGRATION_DOKUMENTATION.md`
- Code-Implementierung: `backend/src/services/ttlockService.ts`
- Test-Script: `backend/scripts/create-auto-passcode-no-sync.ts`

