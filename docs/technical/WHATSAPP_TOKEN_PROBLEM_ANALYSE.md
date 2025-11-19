# Problem-Analyse: WhatsApp Access Token "Cannot parse access token"

## Problem

WhatsApp API gibt folgenden Fehler zurück:
```
"Invalid OAuth access token - Cannot parse access token"
Code: 190, Type: OAuthException
```

## Beobachtungen aus Logs

1. **Token wird geladen:**
   - `apiKeyLength: 1018` - Sehr lang für einen Access Token
   - `apiKeyContainsColon: true` - Token enthält Doppelpunkt
   - `apiKeyStart: '7bc5f44838594d2e6ae9475a34d074'` - Hex-Format (verschlüsselt)

2. **Token wird verwendet:**
   - Authorization Header wird erstellt: `Bearer 7bc5f44838594d2e6ae9475a34d0741e:7dbfa3a8f2...`
   - Token-Länge: 1025 Zeichen (mit "Bearer " Präfix)

3. **Fehler tritt auf:**
   - Sowohl bei Session Message als auch bei Template Message
   - Gleicher Fehler: "Cannot parse access token"

## Mögliche Ursachen

### 1. Token ist doppelt verschlüsselt

**Szenario:**
- Token wurde verschlüsselt gespeichert
- Beim erneuten Speichern wurde der bereits verschlüsselte Token nochmal verschlüsselt
- Entschlüsselung gibt einen falschen Wert zurück

**Prüfung:**
- Token-Länge 1018 Zeichen ist sehr lang für einen verschlüsselten Token
- Normalerweise sollte ein verschlüsselter Token ~200-400 Zeichen lang sein

### 2. Token wurde mit falschem ENCRYPTION_KEY verschlüsselt

**Szenario:**
- Token wurde mit einem ENCRYPTION_KEY verschlüsselt
- Server verwendet einen anderen ENCRYPTION_KEY
- Entschlüsselung gibt einen falschen Wert zurück

**Prüfung:**
- ENCRYPTION_KEY auf Server prüfen
- ENCRYPTION_KEY beim Speichern prüfen

### 3. Token-Format ist falsch

**Szenario:**
- Token wurde nicht richtig formatiert beim Speichern
- Token enthält zusätzliche Zeichen oder Leerzeichen
- WhatsApp API kann Token nicht parsen

**Prüfung:**
- Token nach Entschlüsselung prüfen
- Token sollte nur alphanumerische Zeichen enthalten

### 4. Token ist tatsächlich ungültig

**Szenario:**
- Token wurde ausgetauscht, aber ist ungültig
- Token wurde mit falschen Berechtigungen erstellt
- Token ist abgelaufen (obwohl Benutzer sagt, er ist unbeschränkt)

**Prüfung:**
- Token direkt bei WhatsApp API testen
- Token-Berechtigungen prüfen

## Lösung

### Schritt 1: Token-Entschlüsselung debuggen

Füge Logging hinzu, um zu sehen, was nach der Entschlüsselung herauskommt:

```typescript
// In decryptApiSettings, nach Zeile 283:
console.log('[WhatsApp] Token nach Entschlüsselung:', {
  length: decrypted.whatsapp.apiKey.length,
  start: decrypted.whatsapp.apiKey.substring(0, 30),
  end: decrypted.whatsapp.apiKey.substring(decrypted.whatsapp.apiKey.length - 30),
  containsColon: decrypted.whatsapp.apiKey.includes(':'),
  isValidFormat: /^[A-Za-z0-9]+$/.test(decrypted.whatsapp.apiKey)
});
```

### Schritt 2: Token direkt testen

Erstelle ein Test-Script, das den Token direkt bei WhatsApp API testet:

```typescript
// Test-Script: test-whatsapp-token.ts
const token = '...'; // Entschlüsselter Token
const response = await axios.get('https://graph.facebook.com/v18.0/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Schritt 3: Token neu speichern

Wenn Token doppelt verschlüsselt ist:
1. Token entschlüsseln (manuell oder per Script)
2. Token unverschlüsselt speichern (ohne Verschlüsselung)
3. Oder Token mit korrektem ENCRYPTION_KEY neu verschlüsseln

## Empfohlene Vorgehensweise

1. **Token-Entschlüsselung debuggen** - Logging hinzufügen
2. **Token direkt testen** - Mit Test-Script prüfen
3. **Token neu speichern** - Falls doppelt verschlüsselt oder falsch formatiert

