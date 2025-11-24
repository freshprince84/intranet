# WhatsApp KI-Bot - Nutzungsanleitung

**Datum:** 2025-01-22  
**Status:** Aktueller Stand und Nutzung

---

## 📋 Wie funktioniert alles?

### Aktueller Stand

**✅ Was funktioniert bereits:**

1. **Gast-Code-Versand (Einzel-Chats)**
   - Gäste können per WhatsApp ihren Code anfordern
   - Funktioniert in **Einzel-Chats** (direkte Nachricht an die WhatsApp-Nummer)
   - Keywords: "code", "código", "pin", "password", "verloren", "lost", "perdido", "acceso"

2. **Mitarbeiter-Keywords (Einzel-Chats)**
   - Mitarbeiter können "requests" oder "todos" schreiben
   - Bot zeigt Liste ihrer Requests/Tasks
   - Funktioniert nur für User mit Telefonnummer im Profil

3. **KI-Antworten (Einzel-Chats)**
   - Bot antwortet automatisch auf Fragen
   - Verwendet OpenAI GPT-4o
   - Sprach-Erkennung automatisch

**❌ Was noch NICHT funktioniert:**

1. **WhatsApp-Gruppen für Gäste**
   - Gruppen-Erkennung ist noch NICHT implementiert
   - Bot erkennt aktuell NICHT, ob Nachricht aus Gruppe kommt
   - Konfiguration wurde vorbereitet, aber Gruppen-Erkennung fehlt noch

---

## 🎯 Wie können Gäste es nutzen? (Aktuell)

### Einzel-Chat (funktioniert bereits)

**Schritt 1: Gast schreibt direkt an WhatsApp-Nummer**
- Gast öffnet WhatsApp
- Sucht die WhatsApp-Nummer (z.B. +573146218524)
- Startet Einzel-Chat

**Schritt 2: Gast sendet Keyword**
- Gast schreibt: "code" oder "código" oder "pin"
- Bot identifiziert Gast automatisch

**Schritt 3: Bot antwortet**
- **Falls Telefonnummer vorhanden:** Bot sendet sofort Code + Links
- **Falls keine Telefonnummer:** Bot fragt nach Name, Land, Geburtsdatum
- Bot sendet dann Code + Links (Payment & Check-in falls nötig)

**Beispiel-Konversation:**

```
Gast: code
Bot: Hola Juan Pérez!

Por favor, realiza el pago:
https://payment-link.com/...

Realiza el check-in en línea:
https://app.lobbypms.com/checkinonline/...

Tu código de acceso: 1234567890

¡Te esperamos!
```

**Falls keine Telefonnummer:**

```
Gast: code
Bot: No encontré tu reservación con tu número de teléfono. 
     Por favor, proporciona los siguientes datos:
     
     ¿Cuál es tu nombre?

Gast: Juan
Bot: Gracias, Juan. ¿Cuál es tu apellido?

Gast: Pérez
Bot: Gracias. ¿De qué país eres?

Gast: Colombia
Bot: [Sucht Reservation] → Sendet Code + Links
```

---

## 🎯 Wie können Mitarbeiter es nutzen? (Aktuell)

### Voraussetzung
- Mitarbeiter muss Telefonnummer im Profil haben
- Telefonnummer muss im Format `+573001234567` sein (mit Ländercode)

### Nutzung

**Schritt 1: Mitarbeiter schreibt direkt an WhatsApp-Nummer**
- Mitarbeiter öffnet WhatsApp
- Sucht die WhatsApp-Nummer
- Startet Einzel-Chat

**Schritt 2: Mitarbeiter sendet Keyword**
- "requests" → Liste aller Requests
- "todos" → Liste aller Tasks
- "request" → Startet Request-Erstellung
- "todo" → Startet Task-Erstellung

**Schritt 3: Bot antwortet**
- Bot zeigt Liste oder startet Erstellung

**Beispiel:**

```
Mitarbeiter: requests
Bot: 📋 Tus Requests:

• Urlaubsantrag - ⏳ Pendiente
• Gehaltserhöhung - ✅ Aprobado
• Neue Ausrüstung - 🔧 Mejorar
```

---

## ⚠️ Was fehlt noch? (Gruppen-Erkennung)

### Problem
- Gruppen-Erkennung ist noch **NICHT implementiert**
- Bot erkennt aktuell **NICHT**, ob Nachricht aus Gruppe kommt
- Konfiguration wurde vorbereitet (`guestGroup.ai`), aber Gruppen-Erkennung fehlt

### Was muss noch implementiert werden:

1. **Gruppen-Erkennung im Webhook**
   - Webhook muss `group_id` aus WhatsApp-Webhook extrahieren
   - Prüfen, ob Nachricht aus Gruppe kommt
   - Identifizieren, welche Gruppe es ist (via `group_id` → `guestGroup.groupId`)

2. **Message Handler für Gruppen**
   - Unterscheidung: Einzel-Chat vs. Gruppe
   - Für Gruppen: Verwende `guestGroup.ai` Konfiguration
   - Für Einzel-Chats: Verwende normale `ai` Konfiguration

3. **Group ID konfigurieren**
   - WhatsApp Group ID in `guestGroup.groupId` eintragen
   - Format: `120363123456789012@g.us`

---

## 🔧 Was musst du noch machen?

### 1. Gruppen-Erkennung implementieren (FEHLT NOCH)

**Status:** ❌ **NICHT implementiert**

**Was fehlt:**
- Webhook erkennt aktuell keine Gruppen-Nachrichten
- Message Handler unterscheidet nicht zwischen Einzel-Chat und Gruppe

**Was muss implementiert werden:**
- Webhook muss `group_id` aus Webhook-Body extrahieren
- Prüfen, ob `group_id` mit `guestGroup.groupId` übereinstimmt
- Falls ja: Verwende `guestGroup.ai` Konfiguration
- Falls nein: Verwende normale `ai` Konfiguration

### 2. Group ID konfigurieren (NACH Implementierung)

**Schritt 1: WhatsApp Group ID herausfinden**
- Öffne WhatsApp-Gruppe
- Group ID ist im Format: `120363123456789012@g.us`
- Kann aus Webhook-Logs extrahiert werden (wenn erste Nachricht kommt)

**Schritt 2: Group ID eintragen**
- Via Frontend: Branch-Konfiguration → WhatsApp → Gäste-Gruppe → Group ID
- Oder direkt in DB: `guestGroup.groupId`

### 3. Cerebro-Artikel erstellen (später)

- Erstelle Artikel für Tours, Services, Events, Products
- Füge URLs in `guestGroup.ai.sources` hinzu

---

## 📱 Aktuelle Nutzung (Einzel-Chats)

### Für Gäste:

**So funktioniert es:**
1. Gast öffnet WhatsApp
2. Sucht WhatsApp-Nummer (z.B. +573146218524)
3. Startet Einzel-Chat
4. Schreibt: "code" oder "código"
5. Bot identifiziert Gast (via Telefonnummer oder Abfragen)
6. Bot sendet Code + Links (falls nötig)

**Keywords:**
- "code", "código", "codigo"
- "pin", "password"
- "verloren", "lost", "perdido"
- "acceso"

### Für Mitarbeiter:

**So funktioniert es:**
1. Mitarbeiter öffnet WhatsApp
2. Sucht WhatsApp-Nummer
3. Startet Einzel-Chat
4. Schreibt Keyword:
   - "requests" → Liste aller Requests
   - "todos" → Liste aller Tasks
   - "request" → Erstelle neuen Request
   - "todo" → Erstelle neuen Task
5. Bot antwortet entsprechend

**Voraussetzung:**
- Telefonnummer muss im Profil eingetragen sein
- Format: `+573001234567` (mit Ländercode)

---

## 🚫 Was funktioniert NOCH NICHT?

### WhatsApp-Gruppen

**Status:** ❌ **NICHT implementiert**

**Problem:**
- Bot erkennt nicht, ob Nachricht aus Gruppe kommt
- Gruppen-Erkennung fehlt im Webhook
- Message Handler unterscheidet nicht zwischen Einzel-Chat und Gruppe

**Was passiert aktuell:**
- Wenn jemand in einer Gruppe schreibt, wird es wie Einzel-Chat behandelt
- Bot verwendet normale `ai` Konfiguration (nicht `guestGroup.ai`)
- Funktioniert, aber nicht optimal für Gäste-Gruppen

**Lösung:**
- Gruppen-Erkennung implementieren (siehe oben)
- Dann: Bot verwendet `guestGroup.ai` für Gruppen-Nachrichten

---

## ✅ Zusammenfassung

### Was funktioniert:
- ✅ Gast-Code-Versand in Einzel-Chats
- ✅ Mitarbeiter-Keywords in Einzel-Chats
- ✅ KI-Antworten in Einzel-Chats
- ✅ Mehrstufige Gast-Identifikation (Name, Land, Geburtsdatum)
- ✅ Status-Prüfung (Zahlung & Check-in)
- ✅ Link-Versand (Payment & Check-in Links)

### Was fehlt noch:
- ❌ Gruppen-Erkennung (Webhook erkennt keine Gruppen)
- ❌ Group ID Konfiguration (kann noch nicht genutzt werden)
- ❌ Cerebro-Artikel (müssen noch erstellt werden)

### Was du noch machen musst:
1. **Gruppen-Erkennung implementieren lassen** (wichtig!)
2. **Group ID konfigurieren** (nach Implementierung)
3. **Cerebro-Artikel erstellen** (später)
4. **URLs in sources hinzufügen** (nach Artikel-Erstellung)

---

## 🎯 Nächste Schritte

1. **Gruppen-Erkennung implementieren** (muss noch gemacht werden)
2. **Group ID herausfinden und eintragen** (nach Implementierung)
3. **Testen:** Bot in Gruppe hinzufügen → Test-Nachricht senden
4. **Cerebro-Artikel erstellen** (später)
5. **URLs hinzufügen** (nach Artikel-Erstellung)

---

## 📞 Support

Falls etwas nicht funktioniert:
1. Prüfe Server-Logs: `[WhatsApp Webhook]` und `[WhatsApp Message Handler]`
2. Prüfe, ob Branch WhatsApp Settings korrekt konfiguriert sind
3. Prüfe, ob KI aktiviert ist (`ai.enabled: true`)
4. Prüfe, ob OpenAI API Key gesetzt ist (`OPENAI_API_KEY`)



