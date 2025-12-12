# Nginx 413 Fehler Fix - Dokumenten-Upload

**Datum:** 2025-02-02  
**Problem:** 413 "Request Entity Too Large" beim Upload von Identifikationsdokumenten  
**Ursache:** Nginx `client_max_body_size` ist zu klein für Base64-kodierte Bilder

---

## Warum ist das jetzt nötig, obwohl es früher funktioniert hat?

### Mögliche Gründe:

1. **Nginx wurde aktualisiert/neu installiert:**
   - Bei Nginx-Updates wird die Standard-Konfiguration zurückgesetzt
   - Standard `client_max_body_size` ist 1M
   - Die Konfiguration wurde nicht wiederhergestellt

2. **Bildgröße hat sich geändert:**
   - Moderne Smartphone-Kameras machen größere Bilder (oft >2MB)
   - Base64-Kodierung macht Bilder ~33% größer (2MB → ~2.6MB)
   - Früher waren Bilder vielleicht kleiner oder wurden komprimiert

3. **Nginx-Konfiguration wurde zurückgesetzt:**
   - Server-Update/Neustart
   - Konfigurationsdatei wurde überschrieben
   - Backup wurde nicht wiederhergestellt

4. **Lokale Tests vs. Produktionsserver:**
   - Lokal (ohne Nginx) funktioniert es immer
   - Auf Produktionsserver (mit Nginx) blockiert Nginx große Requests
   - Früher wurde vielleicht lokal getestet

5. **Andere Upload-Methode:**
   - Früher wurde vielleicht direkt als Datei-Upload verwendet (multipart/form-data)
   - Jetzt wird Base64 als JSON gesendet (größer)
   - Direkte Uploads gehen direkt an Express, Base64-JSON geht durch Nginx

---

## Technische Erklärung

### Base64-Kodierung macht Bilder größer:

- **Original-Bild:** 1MB
- **Base64-kodiert:** ~1.33MB (33% größer)
- **JSON-Request:** ~1.35MB (mit JSON-Overhead)

### Nginx Standard-Limit:

- **Standard:** `client_max_body_size 1M` (1 Megabyte)
- **Benötigt:** Mindestens 10M für Dokumenten-Uploads
- **Empfohlen:** 10M (reicht für die meisten Dokumente)

---

## Fix: Terminal-Befehle

### Schritt 1: Aktive Nginx-Konfiguration finden

```bash
# Prüfe welche Konfigurationsdatei aktiv ist
ls -la /etc/nginx/sites-enabled/

# Oder prüfe die aktuelle Konfiguration
sudo nginx -T | grep -A 20 "location /api"
```

**Erwartete Ausgabe:**
- `/etc/nginx/sites-enabled/intranet` (oder `default`)
- Zeigt die aktuelle `location /api` Konfiguration

---

### Schritt 2: Nginx-Konfigurationsdatei öffnen

```bash
# Öffne die aktive Konfigurationsdatei
sudo nano /etc/nginx/sites-available/intranet
```

**Falls andere Datei:**
```bash
# Prüfe welche Datei verwendet wird
cat /etc/nginx/sites-enabled/intranet

# Öffne die entsprechende Datei
sudo nano /etc/nginx/sites-available/[dateiname]
```

---

### Schritt 3: `client_max_body_size` hinzufügen

**Finde die `location /api` Sektion und füge hinzu:**

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
    
    # ✅ FIX: Upload-Limit für Dokumenten-Uploads
    client_max_body_size 10M;
}
```

**Wichtig:**
- Muss innerhalb von `location /api { }` stehen
- Kann auch global in `server { }` Block gesetzt werden (gilt dann für alle locations)

---

### Schritt 4: Nginx-Konfiguration testen

```bash
# Teste die Syntax
sudo nginx -t
```

**Erwartete Ausgabe:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Bei Fehlern:**
- Prüfe die Syntax (fehlende `;`, falsche Klammern, etc.)
- Korrigiere die Datei und teste erneut

---

### Schritt 5: Nginx neu laden

```bash
# Nginx neu laden (ohne Downtime - bestehende Verbindungen bleiben bestehen)
sudo systemctl reload nginx
```

**Alternative (falls reload nicht funktioniert):**
```bash
# Nginx komplett neu starten (kurzer Downtime)
sudo systemctl restart nginx
```

---

### Schritt 6: Prüfen ob Nginx läuft

```bash
# Status prüfen
sudo systemctl status nginx
```

**Erwartete Ausgabe:**
```
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since ...
```

---

### Schritt 7: Prüfen ob Fix funktioniert

```bash
# Prüfe ob client_max_body_size gesetzt ist
sudo nginx -T | grep -A 5 "location /api" | grep client_max_body_size
```

**Erwartete Ausgabe:**
```
client_max_body_size 10M;
```

---

## Alternative: Global setzen (für alle Locations)

Falls `client_max_body_size` für alle API-Endpunkte gelten soll:

```bash
# Öffne Nginx-Konfiguration
sudo nano /etc/nginx/sites-available/intranet
```

**Füge im `server { }` Block hinzu (vor den locations):**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # ✅ Global: Upload-Limit für alle Requests
    client_max_body_size 10M;
    
    location / {
        # ...
    }
    
    location /api {
        # ...
    }
}
```

---

## Troubleshooting

### Problem: Nginx startet nicht nach Änderung

**Lösung:**
```bash
# Prüfe Syntax-Fehler
sudo nginx -t

# Prüfe Logs
sudo tail -n 50 /var/log/nginx/error.log

# Stelle alte Konfiguration wieder her
sudo cp /etc/nginx/sites-available/intranet.backup /etc/nginx/sites-available/intranet
sudo systemctl reload nginx
```

### Problem: Fix funktioniert nicht

**Prüfe:**
1. Ist die richtige Konfigurationsdatei aktiv?
   ```bash
   sudo nginx -T | grep "location /api"
   ```

2. Wurde Nginx wirklich neu geladen?
   ```bash
   sudo systemctl status nginx
   ```

3. Gibt es mehrere `location /api` Blöcke?
   ```bash
   sudo nginx -T | grep -A 10 "location /api"
   ```
   → `client_max_body_size` muss in ALLEN `/api` locations stehen

4. Wird vielleicht eine andere Location verwendet?
   ```bash
   sudo tail -n 100 /var/log/nginx/access.log | grep document-recognition
   ```

---

## Verifikation

### Test: Dokumenten-Upload sollte jetzt funktionieren

1. Öffne Profil-Seite
2. Lade ein Identifikationsdokument hoch
3. Klicke auf "Daten automatisch erkennen"
4. Sollte jetzt funktionieren (kein 413 Fehler mehr)

### Prüfe Browser-Console:

**Vorher (Fehler):**
```
Failed to load resource: the server responded with a status of 413 (Request Entity Too Large)
```

**Nachher (Erfolg):**
```
✅ Dokumentenerkennung erfolgreich
```

---

## Zusammenfassung

**Problem:** Nginx blockiert große Requests (Base64-kodierte Bilder)  
**Lösung:** `client_max_body_size 10M;` in Nginx-Konfiguration  
**Warum jetzt:** Nginx wurde aktualisiert/neu konfiguriert oder Bilder sind größer geworden

**Terminal-Befehle:**
```bash
sudo nano /etc/nginx/sites-available/intranet
# → client_max_body_size 10M; hinzufügen
sudo nginx -t
sudo systemctl reload nginx
```

