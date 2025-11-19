# Problem-Analyse: WhatsApp-Nachricht wird nicht erstellt, angezeigt und versendet

## Problembeschreibung

Gestern hat alles funktioniert. Heute wird keine Nachricht erstellt, angezeigt und versendet. Das einzige, was dazugekommen ist, ist die Template-Funktionalität für das 24h-Fenster.

## Code-Analyse

### Ablauf in `sendMessageWithFallback` (whatsappService.ts, Zeile 429-512)

1. **Schritt 1: Session Message versuchen** (Zeile 437-445)
   ```typescript
   const sessionResult = await this.sendMessage(to, message);
   if (sessionResult) {
     return true; // ✅ Erfolg
   } else {
     throw new Error('Session Message gab false zurück'); // ❌ Problem hier!
   }
   ```

2. **Schritt 2: Fehler prüfen** (Zeile 446-452)
   ```typescript
   catch (error) {
     if (this.isOutside24HourWindowError(error)) {
       // Template-Fallback
     } else {
       throw error; // ❌ Problem: Error wird weitergeworfen
     }
   }
   ```

### Das Problem

**Kritischer Fehler in der Logik:**

1. Wenn `sendMessage` **false zurückgibt** (nicht wegen 24h-Fenster, sondern aus anderen Gründen):
   - Zeile 444: Es wird ein **normaler JavaScript Error** geworfen: `throw new Error('Session Message gab false zurück')`
   - Dieser Error ist **KEIN Axios-Error**

2. `isOutside24HourWindowError` prüft nur auf **Axios-Errors**:
   ```typescript
   private isOutside24HourWindowError(error: any): boolean {
     if (axios.isAxiosError(error)) {  // ❌ Prüft nur Axios-Errors!
       // ... prüft auf 24h-Fenster-Fehler
     }
     return false; // ❌ Gibt false zurück für normale Errors!
   }
   ```

3. **Folge:**
   - Der Error wird **nicht als 24h-Fenster-Fehler erkannt**
   - Das **Template-Fallback wird nicht ausgeführt**
   - Der Error wird **weitergeworfen** (Zeile 509)
   - Die Nachricht wird **nicht versendet**
   - **Kein Log wird erstellt** (weil der Error in `reservationNotificationService.ts` gefangen wird, aber die Nachricht wurde nie versendet)

### Wann gibt `sendMessage` false zurück?

`sendMessage` gibt false zurück, wenn:
- `sendViaWhatsAppBusiness` false zurückgibt (Zeile 241)
- `sendViaWhatsAppBusiness` gibt false zurück, wenn `response.status !== 200` (Zeile 375)

**Aber:** Normalerweise wirft `sendViaWhatsAppBusiness` einen Error, wenn etwas schiefgeht (Zeile 376-390). Es gibt nur false zurück, wenn die API einen Status != 200 zurückgibt, aber keinen Error wirft.

### Mögliche Szenarien

1. **24h-Fenster ist abgelaufen:**
   - `sendMessage` versucht Session Message
   - WhatsApp API wirft Error mit Code 131047
   - Error wird als Axios-Error erkannt
   - `isOutside24HourWindowError` gibt true zurück
   - Template-Fallback wird ausgeführt ✅

2. **Anderer Fehler (z.B. ungültige Telefonnummer, API-Key-Fehler, etc.):**
   - `sendMessage` versucht Session Message
   - WhatsApp API gibt Status != 200 zurück (ohne Error zu werfen)
   - `sendMessage` gibt false zurück
   - `sendMessageWithFallback` wirft Error: `'Session Message gab false zurück'`
   - Dieser Error ist **KEIN Axios-Error**
   - `isOutside24HourWindowError` gibt false zurück
   - Template-Fallback wird **NICHT** ausgeführt ❌
   - Error wird weitergeworfen
   - Nachricht wird nicht versendet ❌

3. **Template-Fehler:**
   - Template-Fallback wird ausgeführt
   - Aber Template fehlt oder ist falsch konfiguriert
   - `sendViaWhatsAppBusiness` wirft Error
   - Error wird weitergeworfen
   - Nachricht wird nicht versendet ❌

## Tatsächliches Problem (aus Server-Logs)

**Der Fehler ist:**
```
"Invalid OAuth access token - Cannot parse access token"
Code: 190, Type: OAuthException
```

**Das Problem:**
1. Der WhatsApp Access Token ist ungültig oder kann nicht geparst werden
2. Dieser Fehler ist **KEIN 24h-Fenster-Fehler** (Code 190 = OAuthException, nicht 131047 = 24h-Fenster)
3. `isOutside24HourWindowError` gibt **false zurück**, weil es kein 24h-Fenster-Fehler ist
4. **Template-Fallback wird NICHT ausgeführt**, weil der Fehler nicht als 24h-Fenster-Fehler erkannt wird
5. Der Error wird weitergeworfen und die Nachricht wird nicht versendet

**Warum hat es gestern funktioniert?**
- Gestern war der WhatsApp Access Token noch gültig
- Session Message hat funktioniert
- Heute ist der Token abgelaufen oder ungültig
- Session Message schlägt fehl mit OAuth-Fehler
- Template-Fallback wird nicht ausgeführt, weil der Fehler nicht als 24h-Fenster-Fehler erkannt wird

## Lösung

### Option 1: Error-Handling in `sendMessage` verbessern

Wenn `sendViaWhatsAppBusiness` false zurückgibt, sollte `sendMessage` einen Error werfen (mit Details), nicht false zurückgeben.

### Option 2: `isOutside24HourWindowError` erweitern

Auch normale Errors prüfen, die auf 24h-Fenster hinweisen könnten.

### Option 3: Template-Fallback immer versuchen

Wenn Session Message fehlschlägt, immer Template-Fallback versuchen (nicht nur bei 24h-Fenster-Fehler).

## Betroffene Dateien

- `backend/src/services/whatsappService.ts` - `sendMessageWithFallback` (Zeile 429-512)
- `backend/src/services/whatsappService.ts` - `sendMessage` (Zeile 218-249)
- `backend/src/services/whatsappService.ts` - `sendViaWhatsAppBusiness` (Zeile 294-391)
- `backend/src/services/whatsappService.ts` - `isOutside24HourWindowError` (Zeile 396-417)

