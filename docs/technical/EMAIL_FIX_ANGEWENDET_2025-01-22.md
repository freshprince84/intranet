# Email Fix - Angewendet

**Datum**: 2025-01-22  
**Status**: ✅ Fix angewendet

## Durchgeführte Änderungen

### 1. Port auf 587 geändert
**Datei**: Datenbank - Branch 3 Settings  
**Änderung**: `smtpPort` von `465` auf `587` geändert  
**Script**: `backend/scripts/update-branch-3-smtp-port.ts`  
**Ergebnis**: ✅ Erfolgreich geändert

### 2. Timeout-Konfiguration hinzugefügt
**Datei**: `backend/src/services/emailService.ts` (Zeile 109-117)  
**Änderung**: 
```typescript
connectionTimeout: 10000, // 10 Sekunden
greetingTimeout: 10000, // 10 Sekunden
socketTimeout: 10000, // 10 Sekunden
```
**Ergebnis**: ✅ Code geändert

### 3. Frontend Timeout hinzugefügt
**Datei**: `frontend/src/config/axios.ts` (Zeile 8-26)  
**Änderung**: `timeout: 60000` (60 Sekunden)  
**Ergebnis**: ✅ Code geändert

## Nächste Schritte

1. **Backend neu starten** (Server-Neustart erforderlich)
2. **Frontend neu bauen** (falls nötig)
3. **Test**: Email-Versand testen mit Reservation-Einladung

## Erwartete Ergebnisse

- Email-Versand sollte funktionieren (Port 587 funktioniert)
- Timeout ist länger (10 Sekunden statt 2 Sekunden)
- Frontend wartet nicht mehr unbegrenzt (60 Sekunden Timeout)

