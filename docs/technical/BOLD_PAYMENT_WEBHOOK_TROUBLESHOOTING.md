# Bold Payment Webhook - Troubleshooting Guide

## Problem: "Por el momento no es posible crear el webhook"

**Fehler:** Webhook kann nicht im Bold Payment Dashboard erstellt werden.

## Mögliche Ursachen

### 1. Endpunkt nicht erreichbar

**Prüfung:**
```bash
# Test von außen (z.B. von deinem Computer)
curl -X POST "https://65.109.228.106.nip.io/api/bold-payment/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  -v

# Erwartete Antwort:
# Status: 200
# Body: {"success": true, "message": "Webhook received"}
```

**Falls nicht erreichbar:**
- Prüfe Firewall-Regeln
- Prüfe Nginx-Konfiguration
- Prüfe ob Server läuft

### 2. SSL-Zertifikat-Problem

**Prüfung:**
```bash
# Test SSL-Zertifikat
openssl s_client -connect 65.109.228.106.nip.io:443 -showcerts

# Prüfe ob Zertifikat gültig ist
```

**Falls Problem:**
- `.nip.io` Domains haben möglicherweise selbst-signierte Zertifikate
- Bold Payment akzeptiert möglicherweise keine selbst-signierten Zertifikate
- **Lösung:** Echte Domain mit gültigem SSL-Zertifikat verwenden

### 3. CORS-Problem

**Prüfung:**
```bash
# Test OPTIONS-Request (CORS Preflight)
curl -X OPTIONS "https://65.109.228.106.nip.io/api/bold-payment/webhook" \
  -H "Origin: https://bold.co" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Erwartete Antwort:
# Status: 200
# Headers: Access-Control-Allow-Origin, Access-Control-Allow-Methods
```

**Falls Problem:**
- OPTIONS-Request wird nicht unterstützt
- CORS-Header fehlen
- **Lösung:** OPTIONS-Route hinzufügen (bereits implementiert)

### 4. Test-Request beim Erstellen schlägt fehl

**Mögliches Problem:**
- Bold Payment sendet einen Test-Request beim Erstellen
- Dieser Request schlägt fehl (z.B. Timeout, Fehler-Response)
- Webhook wird nicht erstellt

**Prüfung:**
- Server-Logs prüfen beim Versuch, Webhook zu erstellen
- Prüfe ob Request ankommt

### 5. URL-Format wird nicht akzeptiert

**Mögliches Problem:**
- `.nip.io` Domain wird von Bold Payment nicht akzeptiert
- IP-Adresse wird nicht akzeptiert
- **Lösung:** Echte Domain verwenden

## Debugging-Schritte

### Schritt 1: Server-Logs prüfen

```bash
# Auf Server:
pm2 logs intranet-backend | grep -i "bold.*payment.*webhook"

# Erwartete Logs:
# [Bold Payment Webhook] Request erhalten: { method: 'POST', ... }
# [Bold Payment Webhook] POST Request - Empfangen: ...
```

**Falls keine Logs:**
- Request kommt nicht an
- Problem liegt vor dem Server (Firewall, Nginx, etc.)

### Schritt 2: Endpunkt manuell testen

```bash
# Test GET-Request
curl -X GET "https://65.109.228.106.nip.io/api/bold-payment/webhook" -v

# Test POST-Request
curl -X POST "https://65.109.228.106.nip.io/api/bold-payment/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  -v

# Test OPTIONS-Request
curl -X OPTIONS "https://65.109.228.106.nip.io/api/bold-payment/webhook" \
  -H "Origin: https://bold.co" \
  -v
```

### Schritt 3: Nginx-Logs prüfen

```bash
# Auf Server:
tail -f /var/log/nginx/access.log | grep "bold-payment/webhook"
tail -f /var/log/nginx/error.log | grep "bold-payment/webhook"
```

### Schritt 4: Firewall prüfen

```bash
# Auf Server:
sudo ufw status
sudo iptables -L -n | grep 443
```

## Lösungen

### Lösung 1: Echte Domain einrichten (EMPFOHLEN)

**Problem:** `.nip.io` Domains werden möglicherweise nicht akzeptiert.

**Lösung:**
1. Domain registrieren (z.B. `intranet-lafamilia.com`)
2. Cloudflare einrichten (kostenlos)
3. DNS A-Record auf `65.109.228.106` zeigen lassen
4. SSL automatisch von Cloudflare
5. Webhook-URL: `https://intranet-lafamilia.com/api/bold-payment/webhook`

### Lösung 2: Bold Payment Support kontaktieren

**Frage stellen:**
- Warum kann der Webhook nicht erstellt werden?
- Welche Fehlermeldung gibt es auf Bold Payment Seite?
- Wird `.nip.io` Domain unterstützt?
- Welche Anforderungen gibt es für Webhook-URLs?
- Sendet Bold Payment einen Test-Request beim Erstellen?

### Lösung 3: Alternative: LobbyPMS-Sync verwenden

**Falls Webhook nicht funktioniert:**
- Status-Updates über LobbyPMS-Synchronisation
- Funktioniert ohne Webhooks
- Siehe: `docs/technical/LOBBYPMS_SYNC_STATUS_UPDATE.md`

## Implementierte Fixes

### 1. GET-Request-Unterstützung
- ✅ GET-Request für Validierung hinzugefügt
- ✅ Challenge-Response unterstützt

### 2. OPTIONS-Request-Unterstützung
- ✅ OPTIONS-Request für CORS Preflight hinzugefügt
- ✅ CORS-Header werden gesetzt

### 3. Sofortige Response
- ✅ Antwort innerhalb von 2 Sekunden
- ✅ Verarbeitung asynchron

### 4. Verbessertes Logging
- ✅ Alle Requests werden geloggt
- ✅ Headers, Query-Parameter, Body werden geloggt

## Nächste Schritte

1. **Server-Logs prüfen** beim Versuch, Webhook zu erstellen
2. **Endpunkt manuell testen** (GET, POST, OPTIONS)
3. **Bold Payment Support kontaktieren** falls Problem weiterhin besteht
4. **Echte Domain einrichten** als langfristige Lösung

## Dokumentation

- `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Setup-Anleitung
- `docs/technical/BOLD_PAYMENT_WEBHOOK_2SEKUNDEN_FIX.md` - 2-Sekunden-Timeout-Fix
- `docs/technical/BOLD_PAYMENT_WEBHOOK_VALIDATION_FIX.md` - GET-Request-Fix
- `docs/technical/BOLD_PAYMENT_WEBHOOK_TROUBLESHOOTING.md` - Dieser Guide

