# LobbyPMS API Test-Ergebnisse (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ⚠️ Problem: "400 Request Header Or Cookie Too Large"

---

## 📊 TEST-ERGEBNISSE

### Problem identifiziert

**Fehler:** `400 Request Header Or Cookie Too Large`

**Ursache:** Der Authorization Header ist zu groß (nginx-Limit überschritten)

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

### Mögliche Ursachen:

1. **API-Key zu lang:**
   - LobbyPMS API-Key könnte sehr lang sein
   - nginx hat Standard-Limit für Header-Größe (meist 4KB oder 8KB)

2. **Verschlüsselte Settings:**
   - WhatsApp Token Debug zeigt verschlüsselte Daten
   - Könnte sein, dass verschlüsselte Settings im Header landen (sollte aber nicht)

3. **Mehrfache Headers:**
   - Möglicherweise werden Headers mehrfach hinzugefügt

### Was zu prüfen ist:

1. **API-Key Länge prüfen:**
   ```bash
   # Auf Server: Prüfe Länge des API-Keys
   # (muss in Settings nachgeschaut werden)
   ```

2. **nginx Konfiguration prüfen:**
   ```bash
   # Prüfe nginx client_header_buffer_size und large_client_header_buffers
   # Standard: client_header_buffer_size 1k; large_client_header_buffers 4 8k;
   ```

3. **Authorization Header prüfen:**
   - Sollte nur `Authorization: Bearer {apiKey}` sein
   - Prüfe ob zusätzliche Daten im Header landen

---

## 💡 LÖSUNGSVORSCHLÄGE

### Lösung 1: nginx Konfiguration anpassen (Server-Admin)

**nginx Config erweitern:**
```nginx
http {
    # Erhöhe Header-Buffer-Größe
    client_header_buffer_size 4k;
    large_client_header_buffers 4 16k;
    
    # Oder spezifisch für LobbyPMS API
    location /api/lobbypms/ {
        client_header_buffer_size 8k;
        large_client_header_buffers 4 32k;
    }
}
```

**Nach Änderung:**
```bash
sudo nginx -t  # Test Konfiguration
sudo systemctl reload nginx  # Reload nginx
```

### Lösung 2: API-Key kürzen (falls möglich)

- Prüfe ob LobbyPMS kürzere API-Keys unterstützt
- Oder API-Key in Datenbank speichern, nur ID im Header senden

### Lösung 3: Alternative Authentifizierung

- Prüfe ob LobbyPMS andere Auth-Methoden unterstützt
- OAuth, API-Key als Query-Parameter, etc.

---

## 🧪 NÄCHSTE SCHRITTE

1. **nginx Konfiguration prüfen:**
   ```bash
   # Auf Server:
   cat /etc/nginx/nginx.conf | grep -A 5 "client_header"
   ```

2. **API-Key Länge prüfen:**
   - In Datenbank nachschauen
   - Oder in Settings

3. **Test erneut ausführen:**
   ```bash
   cd /var/www/intranet/backend
   npx ts-node scripts/test-lobbypms-availability.ts
   ```

4. **Falls nginx-Problem:**
   - nginx Config anpassen (siehe Lösung 1)
   - Oder Server-Admin kontaktieren

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
**Status:** ⚠️ WARTET AUF nginx KONFIGURATION ODER ALTERNATIVE LÖSUNG

