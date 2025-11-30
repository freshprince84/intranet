# Bold Payment Webhook - .nip.io Domain Problem

## Problem

**Fehler:** "Fehler beim erstellen eines webhooks" in Bold Payment Dashboard seit 2 Tagen

**URL:** `https://65.109.228.106.nip.io/api/bold-payment/webhook`

## Root Cause

**Wahrscheinlichste Ursache:** Bold Payment akzeptiert **keine `.nip.io` Domains** für Webhooks.

**Warum?**
- `.nip.io` ist eine Test-Domain (nicht für Production)
- Viele Payment-Provider validieren Domain-Formate
- `.nip.io` wird oft als "unsichere" oder "Test"-Domain abgelehnt
- Bold Payment könnte eine Whitelist von erlaubten Domain-Endungen haben

## Lösungen

### Lösung 1: Echte Domain verwenden (EMPFOHLEN für Production)

**Option A: Eigene Domain mit Cloudflare (Kostenlos)**

1. **Domain registrieren** (z.B. bei Namecheap, GoDaddy, etc.)
   - Beispiel: `intranet-lafamilia.com`

2. **Cloudflare einrichten:**
   - Domain zu Cloudflare hinzufügen
   - DNS A-Record erstellen:
     ```
     Type: A
     Name: @ (oder subdomain wie "api")
     Content: 65.109.228.106
     Proxy: ✅ (Orange Cloud aktivieren für SSL)
     ```

3. **SSL-Zertifikat:**
   - Cloudflare stellt automatisch SSL-Zertifikat bereit
   - Oder Let's Encrypt auf Server installieren

4. **Webhook-URL aktualisieren:**
   ```
   https://intranet-lafamilia.com/api/bold-payment/webhook
   ```
   Oder mit Subdomain:
   ```
   https://api.intranet-lafamilia.com/api/bold-payment/webhook
   ```

5. **Server-Konfiguration:**
   - Nginx konfigurieren für neue Domain
   - `.env` aktualisieren: `APP_URL=https://intranet-lafamilia.com`

**Option B: Subdomain bei bestehender Domain**

Falls bereits eine Domain vorhanden ist:
- Erstelle Subdomain: `api.deine-domain.com`
- DNS A-Record auf `65.109.228.106` zeigen lassen
- SSL-Zertifikat installieren

### Lösung 2: ngrok für Tests (NUR für Entwicklung)

**⚠️ WICHTIG:** Nur für Tests, nicht für Production!

1. **ngrok installieren:**
   ```bash
   # Auf Server
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update && sudo apt install ngrok
   ```

2. **ngrok starten:**
   ```bash
   ngrok http 5000 --domain=dein-ngrok-domain.ngrok.io
   ```

3. **Webhook-URL:**
   ```
   https://dein-ngrok-domain.ngrok.io/api/bold-payment/webhook
   ```

**Nachteile:**
- ngrok-Domains werden auch oft abgelehnt
- Kostenpflichtig für feste Domains
- Nicht für Production geeignet

### Lösung 3: Prüfen ob URL erreichbar ist

**Mögliche Probleme:**
1. URL ist nicht öffentlich erreichbar
2. SSL-Zertifikat ist ungültig
3. Route ist nicht korrekt registriert
4. Firewall blockiert Requests

**Prüfung:**

```bash
# 1. Prüfe ob URL erreichbar ist
curl -v https://65.109.228.106.nip.io/api/bold-payment/webhook

# 2. Prüfe SSL-Zertifikat
openssl s_client -connect 65.109.228.106.nip.io:443 -servername 65.109.228.106.nip.io

# 3. Prüfe ob Route funktioniert
curl -X POST https://65.109.228.106.nip.io/api/bold-payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Erwartete Antwort:**
```json
{
  "success": false,
  "message": "Organisation-ID oder Reservierungs-ID fehlt im Webhook"
}
```

(Das ist OK - bedeutet, dass Route funktioniert, aber Payload unvollständig ist)

### Lösung 4: Bold Payment Support kontaktieren

**Falls Domain-Format nicht das Problem ist:**

1. Kontaktiere Bold Payment Support
2. Frage nach:
   - Warum Webhook-Erstellung fehlschlägt
   - Ob `.nip.io` Domains unterstützt werden
   - Welche Domain-Formate erlaubt sind
   - Ob es spezielle Anforderungen gibt

## Sofort-Lösung: URL-Erreichbarkeit prüfen

### Schritt 1: Prüfe ob Endpunkt erreichbar ist

**Auf Server:**
```bash
# Prüfe ob Server läuft
pm2 status

# Prüfe ob Route registriert ist
pm2 logs intranet-backend | grep "bold-payment"
```

**Von außen:**
```bash
# Test-Request
curl -X POST https://65.109.228.106.nip.io/api/bold-payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  -v
```

**Erwartete Antwort:**
- Status Code: 200 oder 400 (nicht 404!)
- Response Body: JSON mit `success` Feld

### Schritt 2: Prüfe SSL-Zertifikat

```bash
# Prüfe SSL
curl -vI https://65.109.228.106.nip.io/api/bold-payment/webhook 2>&1 | grep -i "SSL\|certificate\|verify"
```

**Probleme:**
- "SSL certificate problem" → Zertifikat ungültig
- "SSL connect error" → SSL-Konfiguration fehlerhaft

### Schritt 3: Prüfe Nginx-Konfiguration

**Auf Server:**
```bash
# Prüfe Nginx-Config
sudo nginx -t

# Prüfe ob Domain korrekt konfiguriert ist
cat /etc/nginx/sites-available/* | grep -i "65.109.228.106.nip.io"
```

## Empfohlene Lösung (Production)

### 1. Eigene Domain einrichten

**Schritte:**
1. Domain registrieren (z.B. `intranet-lafamilia.com`)
2. Cloudflare einrichten (kostenlos, SSL inklusive)
3. DNS A-Record auf `65.109.228.106` zeigen lassen
4. Nginx konfigurieren für neue Domain
5. SSL-Zertifikat installieren (Cloudflare oder Let's Encrypt)

### 2. Server-Konfiguration aktualisieren

**`.env` Datei:**
```env
APP_URL=https://intranet-lafamilia.com
```

**Nginx-Konfiguration:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name intranet-lafamilia.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name intranet-lafamilia.com;

    ssl_certificate /etc/letsencrypt/live/intranet-lafamilia.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/intranet-lafamilia.com/privkey.pem;

    # ... restliche Konfiguration ...
}
```

### 3. Webhook-URL in Bold Payment

```
https://intranet-lafamilia.com/api/bold-payment/webhook
```

## Alternative: Temporäre Workaround

**Bis echte Domain eingerichtet ist:**

1. **LobbyPMS-Sync verwenden** (siehe `LOBBYPMS_SYNC_STATUS_UPDATE.md`)
   - Status-Updates über LobbyPMS-Synchronisation
   - Funktioniert ohne Webhooks

2. **Manuelle Synchronisation:**
   ```bash
   npx ts-node scripts/sync-reservation-18241537.ts
   ```

## Checkliste

- [ ] URL ist öffentlich erreichbar (curl Test)
- [ ] SSL-Zertifikat ist gültig
- [ ] Route ist registriert (`/api/bold-payment/webhook`)
- [ ] Server antwortet (nicht 404)
- [ ] `.nip.io` Domain wird von Bold Payment akzeptiert (wenn nicht → echte Domain)
- [ ] Echte Domain eingerichtet (falls `.nip.io` nicht funktioniert)
- [ ] Nginx konfiguriert für neue Domain
- [ ] `.env` aktualisiert mit neuer Domain
- [ ] Webhook in Bold Payment Dashboard erstellt

## Nächste Schritte

1. **Sofort:** Prüfe URL-Erreichbarkeit (siehe "Sofort-Lösung")
2. **Kurzfristig:** Kontaktiere Bold Payment Support (falls URL erreichbar ist)
3. **Mittelfristig:** Echte Domain einrichten (empfohlen für Production)
4. **Workaround:** LobbyPMS-Sync verwenden (bis Webhook funktioniert)

## Dokumentation

- `docs/technical/BOLD_PAYMENT_WEBHOOK_SETUP.md` - Webhook-Setup-Anleitung
- `docs/technical/LOBBYPMS_SYNC_STATUS_UPDATE.md` - Alternative via LobbyPMS-Sync

