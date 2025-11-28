# WhatsApp Bot Debug - Befehle für Server

**Datum:** 2025-01-26  
**Zweck:** Probleme mit Zimmerverfügbarkeits-Abfrage debuggen

---

## 🔍 DEBUG-BEFEHLE

### Schritt 1: Server-Logs prüfen (letzte WhatsApp-Nachrichten)

```bash
# Prüfe Backend-Logs für WhatsApp-Nachrichten
cd /var/www/intranet/backend
tail -n 200 logs/*.log 2>/dev/null | grep -i "whatsapp\|check_room_availability\|Function Call" | tail -n 50

# Oder wenn Logs in Console:
# Prüfe PM2 Logs (falls verwendet)
pm2 logs intranet-backend --lines 100 --nostream | grep -i "whatsapp\|check_room_availability\|Function Call"
```

### Schritt 2: Spezifische Logs prüfen

```bash
# Prüfe WhatsApp AI Service Logs
cd /var/www/intranet/backend
tail -n 500 /var/log/syslog 2>/dev/null | grep -i "WhatsApp AI Service" | tail -n 50

# Oder direkt in Console (wenn Server läuft):
# Die Logs sollten in der Console erscheinen wenn eine Nachricht kommt
```

### Schritt 3: Prüfe ob mehrere Function Calls gemacht werden

```bash
# Suche nach "Function Calls erkannt" in Logs
cd /var/www/intranet/backend
grep -r "Function Calls erkannt" logs/ 2>/dev/null | tail -n 20

# Oder in PM2:
pm2 logs intranet-backend --lines 200 --nostream | grep "Function Calls erkannt"
```

### Schritt 4: Prüfe Spracherkennung

```bash
# Suche nach "Spracherkennung" in Logs
cd /var/www/intranet/backend
grep -r "Spracherkennung" logs/ 2>/dev/null | tail -n 20

# Oder in PM2:
pm2 logs intranet-backend --lines 200 --nostream | grep "Spracherkennung"
```

### Schritt 5: Prüfe LobbyPMS API Calls

```bash
# Suche nach LobbyPMS API Calls
cd /var/www/intranet/backend
grep -r "LobbyPMS.*available-rooms" logs/ 2>/dev/null | tail -n 20

# Oder in PM2:
pm2 logs intranet-backend --lines 200 --nostream | grep "LobbyPMS.*available-rooms"
```

### Schritt 6: Prüfe Function Arguments (welches Datum wird übergeben?)

```bash
# Suche nach "Führe Function aus" in Logs
cd /var/www/intranet/backend
grep -r "Führe Function aus" logs/ 2>/dev/null | tail -n 20

# Oder in PM2:
pm2 logs intranet-backend --lines 200 --nostream | grep "Führe Function aus"
```

### Schritt 7: Prüfe ob generateResponse mehrmals aufgerufen wird

```bash
# Suche nach "generateResponse" Aufrufen
cd /var/www/intranet/backend
grep -r "generateResponse\|WhatsApp AI Service.*Generiere" logs/ 2>/dev/null | tail -n 30

# Oder in PM2:
pm2 logs intranet-backend --lines 200 --nostream | grep "generateResponse\|WhatsApp AI Service"
```

---

## 📋 ALLE BEFEHLE IN EINER REIHE

```bash
# 1. Ins Verzeichnis wechseln
cd /var/www/intranet/backend

# 2. Prüfe alle relevanten Logs (wenn PM2 verwendet wird)
pm2 logs intranet-backend --lines 500 --nostream | grep -E "WhatsApp|check_room_availability|Function Call|Spracherkennung|LobbyPMS.*available-rooms|Führe Function aus" | tail -n 100

# 3. Oder wenn Logs in Dateien:
tail -n 1000 logs/*.log 2>/dev/null | grep -E "WhatsApp|check_room_availability|Function Call|Spracherkennung|LobbyPMS.*available-rooms|Führe Function aus" | tail -n 100
```

---

## 🧪 TEST: Sende Test-Nachricht und prüfe Logs in Echtzeit

```bash
# 1. Öffne Logs in Echtzeit (in einem Terminal)
pm2 logs intranet-backend --lines 0

# 2. In einem anderen Terminal (oder auf dem Handy):
# Sende WhatsApp-Nachricht: "Haben wir Zimmer frei heute?"

# 3. Beobachte die Logs und kopiere alle relevanten Einträge:
# - "WhatsApp AI Service" Einträge
# - "Function Calls erkannt"
# - "Führe Function aus" (mit args)
# - "Spracherkennung"
# - "LobbyPMS" Einträge
# - "Function Ergebnis"
```

---

## 📝 WAS ZU PRÜFEN IST

1. **3 Nachrichten Problem:**
   - Wie viele "Function Calls erkannt" Einträge gibt es?
   - Wie viele "generateResponse" Aufrufe?
   - Gibt es mehrere "tool_calls" in einem Request?

2. **Falsche Daten Problem:**
   - Welches Datum wird in "Führe Function aus" übergeben? (args)
   - Wird "today" oder "heute" als String übergeben oder bereits als Datum?

3. **Sprache Problem:**
   - Was zeigt "Spracherkennung" für "Haben wir Zimmer frei heute?"?
   - Wird "de" erkannt oder "es"?

4. **Performance:**
   - Welche start_date und end_date werden an LobbyPMS übergeben?
   - Wie groß ist der Zeitraum?

---

**Erstellt:** 2025-01-26


