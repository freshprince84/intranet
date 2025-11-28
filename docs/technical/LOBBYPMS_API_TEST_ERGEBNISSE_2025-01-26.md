# LobbyPMS API Test-Ergebnisse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ⚠️ Problem: "400 Request Header Or Cookie Too Large"

---

## 📊 TEST-ERGEBNISSE

### Problem identifiziert

**Fehler:** `400 Request Header Or Cookie Too Large`

**WICHTIG:** Die API wird direkt aufgerufen (nicht über nginx), daher ist nginx wahrscheinlich NICHT das Problem!

**Mögliche Ursachen:**
1. **LobbyPMS API selbst hat ein Limit** - Die API-Server von LobbyPMS könnten ein Header-Limit haben
2. **API-Key ist extrem lang** - Der API-Key könnte mehrere KB lang sein
3. **Proxy/Reverse-Proxy** - Falls ein Proxy zwischen Server und LobbyPMS API ist

**Betroffene Tests:**
- ❌ Verfügbarkeits-API (`/api/v2/available-rooms`) - Alle 7 Tests fehlgeschlagen
- ❌ Reservierungserstellungs-API - Alle 16 Tests fehlgeschlagen
- ⚠️ Stornierungs-API - Nicht getestet (keine Reservierung mit lobbyReservationId gefunden)

### Branch-Problem behoben

**Problem:** Test verwendete "Alianza Paisa" (ID: 17), existiert nicht in LobbyPMS

**Lösung:** Test-Scripts angepasst, verwenden jetzt nur:
- Manila (ID: 3)
- Parque Poblado (ID: 4)

---

## 🔍 ANALYSE: Request Header zu groß

### WICHTIG: nginx ist wahrscheinlich NICHT das Problem!

**Grund:** Die API wird direkt aufgerufen:
```typescript
// In lobbyPmsService.ts
const instance = axios.create({
  baseURL: this.apiUrl, // z.B. 'https://api.lobbypms.com'
  headers: {
    'Authorization': `Bearer ${this.apiKey}`
  }
});
```

**Das bedeutet:**
- Request geht direkt zu `https://api.lobbypms.com`
- NICHT über nginx auf dem Server
- nginx-Limit sollte also nicht greifen

### Mögliche echte Ursachen:

1. **LobbyPMS API-Server hat ein Limit:**
   - Die API-Server von LobbyPMS könnten selbst ein Header-Limit haben
   - Oder sie verwenden nginx/Proxy mit Limit

2. **API-Key ist extrem lang:**
   - Prüfe Länge des API-Keys
   - Falls > 4KB, könnte das Problem sein

3. **Verschlüsselte Daten im Header:**
   - Unwahrscheinlich, aber prüfen ob versehentlich verschlüsselte Settings im Header landen

---

## 💡 LÖSUNGSVORSCHLÄGE (OHNE nginx-Anpassung)

### Lösung 1: API-Key Länge prüfen (ZUERST!)

**Test-Script erstellen:**
```bash
# Auf Server: Prüfe API-Key Länge
cd /var/www/intranet/backend
npx ts-node -e "
import { prisma } from './src/utils/prisma';
import { decryptBranchApiSettings } from './src/utils/encryption';

async function checkApiKeyLength() {
  const branch = await prisma.branch.findFirst({
    where: { id: { in: [3, 4] } },
    select: { id: true, name: true, lobbyPmsSettings: true }
  });
  
  if (!branch?.lobbyPmsSettings) {
    console.log('Keine Settings gefunden');
    return;
  }
  
  const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
  const apiKey = settings?.lobbyPms?.apiKey || settings?.apiKey;
  
  if (apiKey) {
    console.log(\`Branch: \${branch.name}\`);
    console.log(\`API-Key Länge: \${apiKey.length} Zeichen\`);
    console.log(\`API-Key Länge: \${(apiKey.length / 1024).toFixed(2)} KB\`);
    console.log(\`Authorization Header: \${('Bearer ' + apiKey).length} Zeichen\`);
  }
  
  await prisma.\$disconnect();
}

checkApiKeyLength();
"
```

**Wenn API-Key > 4KB:**
- Problem identifiziert
- Lösung: Siehe unten

### Lösung 2: Alternative Authentifizierung prüfen

**LobbyPMS könnte unterstützen:**
- API-Key als Query-Parameter: `?api_key=...`
- API-Key als Cookie
- OAuth Token (kürzer)

**Test:**
```typescript
// Statt Header:
headers: { 'Authorization': `Bearer ${apiKey}` }

// Versuche Query-Parameter:
params: { api_key: apiKey }
```

### Lösung 3: API direkt testen (ohne unser System)

**Mit curl testen:**
```bash
# Auf Server:
curl -X GET "https://api.lobbypms.com/api/v2/available-rooms?start_date=2025-02-01" \
  -H "Authorization: Bearer {API_KEY}" \
  -H "Content-Type: application/json" \
  -v
```

**Wenn curl auch "400 Request Header Or Cookie Too Large" gibt:**
- Problem liegt bei LobbyPMS API selbst
- Nicht unser System

**Wenn curl funktioniert:**
- Problem liegt in unserem Code
- Prüfe ob zusätzliche Headers hinzugefügt werden

### Lösung 4: API-Key kürzen (falls möglich)

- Prüfe ob LobbyPMS kürzere API-Keys generieren kann
- Oder API-Key in Session speichern, nur Session-ID senden

---

## ⚖️ VOR- UND NACHTEILE: nginx-Anpassung

### ❌ Warum nginx-Anpassung NICHT nötig ist:

1. **API wird direkt aufgerufen:**
   - Request geht direkt zu `https://api.lobbypms.com`
   - NICHT über nginx auf unserem Server
   - nginx-Limit sollte nicht greifen

2. **Problem liegt wahrscheinlich bei LobbyPMS:**
   - Die API-Server von LobbyPMS haben vermutlich selbst ein Limit
   - nginx-Anpassung auf unserem Server hilft nicht

### ✅ Falls doch nginx-Anpassung nötig (nur wenn Proxy verwendet wird):

**Vorteile:**
- Löst Problem, wenn ein Proxy zwischen Server und API ist
- Erlaubt größere Header für zukünftige APIs

**Nachteile:**
- Server-Konfiguration ändern (Wartungsaufwand)
- Könnte andere Probleme verursachen
- Sicherheitsrisiko wenn zu groß (DoS-Angriffe mit großen Headers)
- Muss bei jedem Server-Update geprüft werden

**Empfehlung:** Nur wenn wirklich nötig (z.B. wenn Proxy verwendet wird)

---

## 🧪 NÄCHSTE SCHRITTE (OHNE nginx-Anpassung)

### Schritt 1: API-Key Länge prüfen

```bash
# Auf Server:
cd /var/www/intranet/backend
npx ts-node scripts/check-api-key-length.ts
```

### Schritt 2: API direkt mit curl testen

```bash
# Hole API-Key aus DB (siehe Script oben)
# Dann:
curl -X GET "https://api.lobbypms.com/api/v2/available-rooms?start_date=2025-02-01" \
  -H "Authorization: Bearer {API_KEY_HIER_EINFÜGEN}" \
  -H "Content-Type: application/json" \
  -v
```

### Schritt 3: Alternative Auth-Methoden testen

Falls API-Key zu lang:
- Query-Parameter testen
- Cookie testen
- OAuth prüfen

### Schritt 4: LobbyPMS Support kontaktieren

Falls Problem bei LobbyPMS API liegt:
- Support kontaktieren
- Nach Header-Limit fragen
- Nach alternativen Auth-Methoden fragen

---

## 📝 TEST-SCRIPTS KORRIGIERT

**Änderungen:**
- ✅ Nur Branches Manila (ID: 3) und Parque Poblado (ID: 4) verwenden
- ✅ Bessere Fehlermeldungen

**Dateien:**
- `backend/scripts/test-lobbypms-availability.ts`
- `backend/scripts/test-lobbypms-create-booking.ts`
- `backend/scripts/test-lobbypms-cancel-booking.ts`

---

**Erstellt:** 2025-01-26  
**Status:** ⚠️ PROBLEM ANALYSIEREN - nginx-Anpassung wahrscheinlich NICHT nötig
