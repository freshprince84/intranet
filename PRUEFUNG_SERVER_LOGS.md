# Prüfung Server-Logs: merchantId und Header-Setting

## Ziel
Prüfen, ob `merchantId` wirklich gesetzt wird und ob der Authorization-Header korrekt im Request ankommt.

## Befehle für Server (manuell ausführen)

### 1. SSH-Verbindung zum Server
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

### 2. Prüfe ob merchantId wirklich gesetzt wird
```bash
# Prüfe die letzten 500 Log-Zeilen für merchantId und Authorization Header
pm2 logs intranet-backend --lines 500 --nostream | grep -E "merchantId Wert|merchantId Länge|Authorization Header|Bold Payment.*POST|Bold Payment.*GET" | tail -50
```

### 3. Prüfe Settings-Loading-Timing
```bash
# Prüfe ob Settings vor dem Request geladen werden
pm2 logs intranet-backend --lines 500 --nostream | grep -E "\[BoldPayment\] Verwende|loadSettings|Erstelle Payment-Link|createForBranch" | tail -50
```

### 4. Prüfe ob Header wirklich gesetzt wird
```bash
# Prüfe alle Bold Payment Logs mit Header-Informationen
pm2 logs intranet-backend --lines 500 --nostream | grep -E "\[Bold Payment\]" | tail -50
```

### 5. Prüfe Fehler beim Settings-Loading
```bash
# Prüfe ob es Fehler beim Laden der Settings gibt
pm2 logs intranet-backend --lines 500 --nostream | grep -E "Fehler beim Laden|Error decrypting|Settings nicht gefunden" | tail -50
```

### 6. Prüfe aktuelle API-Requests (Live)
```bash
# Live-Logs für Bold Payment Requests
pm2 logs intranet-backend --lines 100 | grep -E "\[Bold Payment\]"
```

### 7. Prüfe ob merchantId verschlüsselt ist
```bash
# Prüfe ob merchantId verschlüsselt gesendet wird (enthält ":" Zeichen)
pm2 logs intranet-backend --lines 500 --nostream | grep -E "merchantId.*:" | tail -20
```

## Was zu prüfen ist

### ✅ merchantId sollte gesetzt sein:
- `merchantId Wert: "..."` sollte NICHT leer sein
- `merchantId Länge: XX` sollte > 0 sein
- `merchantId` sollte NICHT verschlüsselt sein (kein ":" Zeichen)

### ✅ Authorization Header sollte gesetzt sein:
- `Authorization Header: x-api-key ...` sollte vorhanden sein
- Header sollte NICHT leer sein
- Header sollte NICHT verschlüsselt sein

### ✅ Settings sollten vor Request geladen werden:
- `[BoldPayment] Verwende Branch-spezifische Settings` sollte vor `Erstelle Payment-Link` kommen
- `loadSettings` sollte vor API-Request kommen

### ❌ Mögliche Probleme:
- `merchantId Wert: ""` → Settings nicht geladen
- `merchantId` enthält ":" → Settings nicht entschlüsselt
- `Authorization Header: undefined` → Header nicht gesetzt
- Request kommt vor `loadSettings` → Timing-Problem

## Nächste Schritte nach Prüfung

**Wenn merchantId leer/undefined ist:**
- Settings werden nicht geladen
- Prüfe `decryptBranchApiSettings()` Funktionalität

**Wenn merchantId verschlüsselt ist:**
- Settings werden nicht entschlüsselt
- Prüfe `decryptBranchApiSettings()` für verschachtelte Settings

**Wenn Header nicht gesetzt wird:**
- Interceptor wird nicht ausgeführt
- Prüfe Request-Interceptor-Logik

**Wenn Timing-Problem:**
- Request wird vor Settings-Loading gesendet
- Prüfe `createForBranch()` und `loadSettings()` Reihenfolge

