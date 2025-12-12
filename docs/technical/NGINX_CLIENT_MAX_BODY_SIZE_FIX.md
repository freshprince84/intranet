# Nginx client_max_body_size Fix - 413 Fehler beheben

## Problem

**Fehler:** `413 Request Entity Too Large` beim Upload von Identifikationsdokumenten

**Ursache:** Nginx blockiert große Requests (standardmäßig 1MB Limit). KI-basierte Dokumentenerkennung sendet Base64-kodierte Bilder, die 2-5MB groß sind.

---

## Warum ist das jetzt nötig?

### Vorher (OCR - Tesseract.js):
- **Clientseitige Verarbeitung**: Bilder wurden NICHT an den Server gesendet
- Tesseract.js lief komplett im Browser
- Keine großen Requests → Kein Problem mit Nginx

### Jetzt (OpenAI GPT-4o):
- **Serverseitige Verarbeitung**: Bilder werden als Base64-String an `/api/document-recognition` gesendet
- Base64-kodierte Bilder sind sehr groß (2-5MB für ein Foto)
- Nginx blockiert Requests >1MB standardmäßig → 413 Fehler

**Fazit:** Die Umstellung von clientseitiger OCR auf serverseitige KI-Erkennung macht große Requests notwendig, daher ist `client_max_body_size` jetzt erforderlich.

---

## Lösung: Terminal-Befehle

### Schritt 1: Finde die Nginx-Konfigurationsdatei

```bash
# Finde die aktive Konfiguration
sudo nginx -T | grep -B 5 "location /api"
```

Oder prüfe die Standard-Pfade:
```bash
# Standard-Pfad auf Hetzner/Ubuntu
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

### Schritt 2: Öffne die Konfigurationsdatei

```bash
# Öffne die Konfigurationsdatei (meist "intranet" oder "default")
sudo nano /etc/nginx/sites-available/intranet
```

Falls die Datei anders heißt:
```bash
# Liste alle verfügbaren Konfigurationen
ls /etc/nginx/sites-available/
# Dann öffne die richtige Datei
sudo nano /etc/nginx/sites-available/[dateiname]
```

### Schritt 3: Füge client_max_body_size hinzu

Suche nach dem `location /api` Block und füge `client_max_body_size 10M;` hinzu:

```nginx
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # ✅ FIX: Erhöhe Upload-Limit für Dokumenten-Uploads
    client_max_body_size 10M;
}
```

**Wichtig:** Die Zeile muss innerhalb des `location /api` Blocks sein!

### Schritt 4: Prüfe die Syntax

```bash
sudo nginx -t
```

**Erwartete Ausgabe:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Falls Fehler: Korrigiere die Syntax und prüfe erneut.

### Schritt 5: Lade Nginx neu (ohne Neustart)

```bash
sudo systemctl reload nginx
```

**Alternative (falls reload nicht funktioniert):**
```bash
sudo systemctl restart nginx
```

### Schritt 6: Prüfe ob Nginx läuft

```bash
sudo systemctl status nginx
```

**Erwartete Ausgabe:**
```
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
```

---

## Verifikation

### Prüfe ob die Änderung aktiv ist

```bash
sudo nginx -T | grep -A 10 "location /api" | grep "client_max_body_size"
```

**Erwartete Ausgabe:**
```
client_max_body_size 10M;
```

### Teste den Upload

1. Öffne die Profil-Seite im Browser
2. Lade ein Identifikationsdokument hoch
3. Klicke auf "Daten automatisch erkennen"
4. **Erwartung:** Kein 413-Fehler mehr, Upload funktioniert

---

## Troubleshooting

### Problem: Nginx-Konfiguration nicht gefunden

```bash
# Finde alle Nginx-Konfigurationsdateien
sudo find /etc/nginx -name "*.conf" -type f

# Prüfe welche Konfiguration aktiv ist
sudo nginx -T | head -20
```

### Problem: Syntax-Fehler nach Änderung

```bash
# Prüfe die Syntax
sudo nginx -t

# Zeige die Fehler-Details
sudo nginx -t 2>&1 | grep -A 5 "error"
```

### Problem: Nginx startet nicht

```bash
# Prüfe die Logs
sudo tail -50 /var/log/nginx/error.log

# Prüfe den Status
sudo systemctl status nginx
```

### Problem: Änderung hat keine Wirkung

```bash
# Stelle sicher, dass Nginx neu geladen wurde
sudo systemctl reload nginx

# Prüfe ob die Änderung wirklich aktiv ist
sudo nginx -T | grep "client_max_body_size"
```

---

## Alternative: Global setzen (nicht empfohlen)

Falls Sie `client_max_body_size` für alle Locations setzen wollen (nicht empfohlen):

```bash
# Öffne die Haupt-Konfiguration
sudo nano /etc/nginx/nginx.conf

# Füge in den http-Block ein:
http {
    # ... andere Einstellungen ...
    client_max_body_size 10M;
}
```

**⚠️ WICHTIG:** Dies setzt das Limit für ALLE Requests, nicht nur für `/api`. Besser: Nur in `location /api` setzen.

---

## Zusammenfassung

**Problem:** 413 Fehler bei Dokumenten-Upload  
**Ursache:** Nginx blockiert große Requests (Base64-Bilder sind 2-5MB)  
**Lösung:** `client_max_body_size 10M;` in `location /api` hinzufügen  
**Warum jetzt:** Umstellung von clientseitiger OCR auf serverseitige KI-Erkennung

**Befehle:**
1. `sudo nano /etc/nginx/sites-available/intranet`
2. `client_max_body_size 10M;` in `location /api` hinzufügen
3. `sudo nginx -t` (Syntax prüfen)
4. `sudo systemctl reload nginx` (Neu laden)

