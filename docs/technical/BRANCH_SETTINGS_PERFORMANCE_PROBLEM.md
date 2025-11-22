# Branch Settings Performance-Problem - Erklärung

## Was sind Branch Settings?

**Branch Settings** sind verschlüsselte Konfigurationsdaten, die für jede Niederlassung (Branch) gespeichert werden. Sie enthalten API-Keys und Secrets für verschiedene Services:

- **WhatsApp Settings**: API-Keys für WhatsApp-Integration
- **LobbyPMS Settings**: API-Keys für LobbyPMS-Reservierungssystem
- **Bold Payment Settings**: API-Keys für Zahlungsabwicklung
- **Door System Settings**: Credentials für Türsystem (TTLock)
- **Email Settings**: SMTP/IMAP-Credentials für E-Mail

## Warum sind sie verschlüsselt?

Die Settings enthalten **sensitive Daten** (API-Keys, Passwörter), die sicher gespeichert werden müssen. Daher werden sie mit **AES-256-GCM** verschlüsselt in der Datenbank gespeichert.

## Das Performance-Problem

### Vor der Migration (vor 20.11.2025)

- Branch Settings wurden **nicht überall** verwendet
- Entschlüsselung passierte **selten** (nur bei spezifischen API-Calls)
- System war schnell, obwohl `/api/worktime/active` schon lange existierte

### Nach der Migration (20.11.2025)

**Was passiert jetzt:**

1. **Bei jedem `/api/branches` Request:**
   - Alle Branches werden geladen
   - **Alle Settings werden entschlüsselt** (WhatsApp, LobbyPMS, BoldPayment, DoorSystem, Email)
   - Bei 10 Branches = 50 Entschlüsselungen pro Request!

2. **Bei jedem Service-API-Call:**
   - Services (WhatsApp, LobbyPMS, etc.) rufen `loadSettings()` auf
   - Settings werden aus DB geladen und **entschlüsselt**
   - Passiert bei **jedem** API-Call

3. **Bei `/api/worktime/active`:**
   - Lädt Branch-Daten mit `include: { branch: true }`
   - Wenn Branch-Settings geladen werden, werden sie entschlüsselt

### Warum ist Entschlüsselung langsam?

**AES-256-GCM Verschlüsselung ist CPU-intensiv:**
- Jede Entschlüsselung kostet CPU-Zyklen
- Bei 214 Requests/Minute für `/api/worktime/active` = viele Entschlüsselungen
- Kombiniert mit anderen Requests = **Hunderte Entschlüsselungen pro Minute**

### Das Resultat

- **CPU-Last: 200%** (2 Cores voll ausgelastet)
- **System ist praktisch unbrauchbar langsam**
- **Korrelierung**: Performance-Verschlechterung begann nach Branch-Settings-Migration (20.11.2025)

## Die Lösung: Branch-Settings-Cache

### Was macht der Cache?

1. **Erste Entschlüsselung:**
   - Settings werden entschlüsselt und im Memory-Cache gespeichert
   - Cache-Key: `branch-${branchId}-${settingsType}`

2. **Weitere Requests:**
   - Settings werden aus Cache geladen (keine Entschlüsselung nötig)
   - **80-90% weniger CPU-Last** durch Entschlüsselung

3. **Cache-TTL:**
   - 10 Minuten (Settings ändern sich selten)
   - Cache wird automatisch invalidiert bei Updates

### Erwartete Verbesserung

- **80-90% weniger Entschlüsselungen**
- **Deutlich niedrigere CPU-Last**
- **System sollte wieder normal schnell sein**

## Implementierung

### 1. Cache-Service erstellt
- `backend/src/services/branchSettingsCache.ts`
- Singleton-Pattern (eine Instanz für alle)

### 2. branchController.ts angepasst
- Verwendet Cache für Entschlüsselung in `getAllBranches()`
- Cache-Invalidierung bei `updateBranch()`

### 3. Services angepasst
- `whatsappService.ts` verwendet Cache
- Weitere Services folgen (LobbyPMS, BoldPayment, TTLock)

### 4. Cache-Invalidierung
- Bei Settings-Updates wird Cache automatisch invalidiert
- Garantiert, dass Änderungen sofort sichtbar sind

---

**Erstellt**: 2025-11-22  
**Status**: Implementiert - Cache aktiv  
**Erwartete Verbesserung**: 80-90% weniger CPU-Last durch Entschlüsselung

