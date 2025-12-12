# Analyse: Fehlende Felder im Branch Management Sidepane

**Datum:** 2025-02-02  
**Status:** 🔍 Analyse abgeschlossen - Felder identifiziert, die nicht im Frontend angezeigt werden

---

## 🔴 PROBLEM

Beim Bearbeiten eines Branches werden einige Felder aus der Datenbank geladen, aber **nicht im Frontend angezeigt**. Diese Felder erscheinen daher als leer, obwohl sie in der DB vorhanden sind.

---

## 📋 FEHLENDE FELDER NACH TAB

### 1. **WhatsApp Tab**
**Status:** ⚠️ Teilweise fehlend

**Geladen in `handleEdit` (Zeile 379):**
- ✅ `apiSecret` - wird geladen

**Angezeigt im Frontend:**
- ✅ `provider` - wird angezeigt
- ✅ `apiKey` - wird angezeigt
- ✅ `phoneNumberId` - wird angezeigt
- ❌ `apiSecret` - wird **NICHT angezeigt** (wird geladen, aber kein Input-Feld vorhanden)
- ✅ `ai.*` - alle AI-Felder werden angezeigt

**Problem:** `apiSecret` wird geladen, aber es gibt kein Input-Feld dafür im Frontend.

---

### 2. **LobbyPMS Tab**
**Status:** 🔴 Viele Felder fehlen

**Geladen in `handleEdit` (Zeilen 391-398):**
- ✅ `apiUrl` - wird geladen und angezeigt
- ✅ `apiKey` - wird geladen und angezeigt
- ✅ `propertyId` - wird geladen und angezeigt
- ❌ `syncEnabled` - wird **NICHT geladen** und **NICHT angezeigt**
- ✅ `autoCreateTasks` - wird geladen, aber **NICHT angezeigt**
- ✅ `lateCheckInThreshold` - wird geladen, aber **NICHT angezeigt**
- ✅ `notificationChannels` - wird geladen, aber **NICHT angezeigt**
- ✅ `autoSendInvitation` - wird geladen, aber **NICHT angezeigt**

**Angezeigt im Frontend (Zeilen 1147-1192):**
- ✅ `apiUrl` - Input-Feld vorhanden
- ✅ `apiKey` - Input-Feld vorhanden
- ✅ `propertyId` - Input-Feld vorhanden
- ❌ `syncEnabled` - **FEHLT**
- ❌ `autoCreateTasks` - **FEHLT**
- ❌ `lateCheckInThreshold` - **FEHLT**
- ❌ `notificationChannels` - **FEHLT**
- ❌ `autoSendInvitation` - **FEHLT**

**Problem:** 5 Felder werden geladen, aber nicht im UI angezeigt.

---

### 3. **Door System (TTLock) Tab**
**Status:** 🔴 Mehrere Felder fehlen

**Geladen in `handleEdit` (Zeilen 405-412):**
- ✅ `clientId` - wird geladen und angezeigt
- ✅ `clientSecret` - wird geladen und angezeigt
- ✅ `username` - wird geladen und angezeigt
- ✅ `password` - wird geladen und angezeigt
- ✅ `apiUrl` - wird geladen, aber **NICHT angezeigt**
- ✅ `lockIds` - wird geladen, aber **NICHT angezeigt**
- ✅ `appName` - wird geladen, aber **NICHT angezeigt**

**Angezeigt im Frontend (Zeilen 1260-1326):**
- ✅ `clientId` - Input-Feld vorhanden
- ✅ `clientSecret` - Input-Feld vorhanden
- ✅ `username` - Input-Feld vorhanden
- ✅ `password` - Input-Feld vorhanden
- ❌ `apiUrl` - **FEHLT**
- ❌ `lockIds` - **FEHLT** (Array von Lock IDs)
- ❌ `appName` - **FEHLT**

**Problem:** 3 Felder werden geladen, aber nicht im UI angezeigt.

---

### 4. **Bold Payment Tab**
**Status:** ✅ Alle Felder vorhanden

**Geladen in `handleEdit` (Zeilen 400-403):**
- ✅ `apiKey` - wird geladen und angezeigt
- ✅ `merchantId` - wird geladen und angezeigt
- ✅ `environment` - wird geladen und angezeigt

**Angezeigt im Frontend:**
- ✅ Alle Felder werden angezeigt

---

### 5. **Email Tab**
**Status:** ✅ Alle Felder vorhanden

**Geladen in `handleEdit` (Zeilen 414-430):**
- ✅ Alle SMTP-Felder werden geladen und angezeigt
- ✅ Alle IMAP-Felder werden geladen und angezeigt

---

### 6. **Messages Tab**
**Status:** ✅ Alle Felder vorhanden (gerade implementiert)

**Geladen in `handleEdit` (Zeilen 432-444):**
- ✅ `messageTemplates` - wird geladen und angezeigt
- ✅ `autoSendReservationInvitation` - wird geladen und angezeigt

---

## 📊 ZUSAMMENFASSUNG

### Felder, die geladen werden, aber NICHT angezeigt werden:

1. **WhatsApp Tab:**
   - `apiSecret` (1 Feld)

2. **LobbyPMS Tab:**
   - `syncEnabled` (wird nicht mal geladen!)
   - `autoCreateTasks`
   - `lateCheckInThreshold`
   - `notificationChannels`
   - `autoSendInvitation`
   (5 Felder)

3. **Door System Tab:**
   - `apiUrl`
   - `lockIds` (Array)
   - `appName`
   (3 Felder)

**Gesamt:** 9 Felder fehlen im Frontend

---

## 🔍 DETAILLIERTE CODE-ANALYSE

### handleEdit Funktion (Zeilen 364-446)

**Geladen, aber nicht angezeigt:**
- `whatsappSettings.apiSecret` (Zeile 379) - ✅ geladen, ❌ nicht angezeigt
- `lobbyPmsSettings.autoCreateTasks` (Zeile 395) - ✅ geladen, ❌ nicht angezeigt
- `lobbyPmsSettings.lateCheckInThreshold` (Zeile 396) - ✅ geladen, ❌ nicht angezeigt
- `lobbyPmsSettings.notificationChannels` (Zeile 397) - ✅ geladen, ❌ nicht angezeigt
- `lobbyPmsSettings.autoSendInvitation` (Zeile 398) - ✅ geladen, ❌ nicht angezeigt
- `doorSystemSettings.apiUrl` (Zeile 410) - ✅ geladen, ❌ nicht angezeigt
- `doorSystemSettings.lockIds` (Zeile 411) - ✅ geladen, ❌ nicht angezeigt
- `doorSystemSettings.appName` (Zeile 412) - ✅ geladen, ❌ nicht angezeigt

**Nicht geladen (fehlt komplett):**
- `lobbyPmsSettings.syncEnabled` - ❌ wird nicht geladen (fehlt in Zeile 391-398)

---

## 📝 CODE-STELLEN FÜR FEHLENDE FELDER

### WhatsApp Tab - apiSecret fehlt
**Zeile 379:** `apiSecret: existingWhatsapp.apiSecret || ''` - wird geladen
**Frontend:** Kein Input-Feld zwischen Zeile 938 (nach phoneNumberId) und Zeile 960 (vor AI Configuration)

### LobbyPMS Tab - 5 Felder fehlen
**Zeilen 395-398:** Werden geladen
**Frontend Zeilen 1147-1192:** Nur 3 Felder (apiUrl, apiKey, propertyId) werden angezeigt
**Fehlende Felder:**
- `syncEnabled` - Checkbox (wird nicht mal geladen!)
- `autoCreateTasks` - Checkbox
- `lateCheckInThreshold` - Time Input (HH:MM Format)
- `notificationChannels` - Multi-Select (email, whatsapp)
- `autoSendInvitation` - Checkbox

### Door System Tab - 3 Felder fehlen
**Zeilen 410-412:** Werden geladen
**Frontend Zeilen 1260-1326:** Nur 4 Felder (clientId, clientSecret, username, password) werden angezeigt
**Fehlende Felder:**
- `apiUrl` - Text Input (Standard: 'https://euopen.ttlock.com')
- `lockIds` - Array Input (mehrere Lock IDs)
- `appName` - Text Input (Standard: 'TTLock')

---

## 🔍 CODE-STELLEN

### handleEdit (Zeilen 364-446):
- Lädt alle Settings korrekt
- ABER: `syncEnabled` wird nicht geladen (fehlt in Zeile 391-398)

### Frontend Tabs:
- **WhatsApp Tab (Zeilen 874-1137):** Fehlt `apiSecret` Input-Feld
- **LobbyPMS Tab (Zeilen 1141-1200):** Fehlen 5 Felder
- **Door System Tab (Zeilen 1260-1328):** Fehlen 3 Felder

---

## ⚠️ HINWEIS

**NICHT ÄNDERN** - Nur Analyse durchführen!
