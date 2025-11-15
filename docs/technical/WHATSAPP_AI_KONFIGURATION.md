# WhatsApp KI-Konfiguration - Vollständige Anleitung

## 📋 Übersicht

Diese Anleitung erklärt, wie du die KI-Funktionalität für WhatsApp-Nachrichten konfigurierst. Die KI verwendet OpenAI GPT-4o, um automatische Antworten auf WhatsApp-Nachrichten zu generieren.

---

## 1. 🔑 OpenAI API Key einrichten

### Schritt 1: OpenAI Account erstellen
1. **OpenAI Platform öffnen**: `https://platform.openai.com`
2. **Account erstellen** oder **einloggen**
3. **Dashboard öffnen**: `https://platform.openai.com/api-keys`

### Schritt 2: API Key generieren
1. **API Keys** → **Create new secret key**
2. **Name vergeben** (z.B. "WhatsApp AI - La Familia")
3. **Key kopieren** (wird nur einmal angezeigt!)
4. **WICHTIG**: Key sicher aufbewahren!

### Schritt 3: API Key im Server hinterlegen
1. **Server-Zugang** haben (Hetzner)
2. **Environment-Variable setzen**:
   ```bash
   OPENAI_API_KEY=sk-...dein-api-key...
   ```
3. **In `.env` Datei** (im `backend/` Verzeichnis):
   ```
   OPENAI_API_KEY=sk-...dein-api-key...
   ```
4. **Server neu starten** (nach Absprache mit Admin)

### Schritt 4: Billing einrichten (wichtig!)
1. **OpenAI Dashboard** → **Billing**
2. **Payment Method** hinzufügen (Kreditkarte)
3. **Usage Limits** prüfen (Standard: $5-10/Monat empfohlen)
4. **⚠️ WICHTIG**: Ohne Billing funktioniert die API nicht!

---

## 2. ⚙️ KI-Konfiguration im System

### Schritt 1: Branch öffnen
1. **Admin-Bereich** → **Niederlassungen**
2. **Branch auswählen** (z.B. "Manila")
3. **Bearbeiten** klicken

### Schritt 2: WhatsApp-Settings öffnen
1. **WhatsApp-Konfiguration** Tab
2. **KI-Konfiguration (AI)** Bereich

### Schritt 3: KI aktivieren
1. **KI aktivieren** Toggle auf **Aktiviert**
2. **Modell auswählen**:
   - `gpt-4o` (empfohlen, schnell und günstig)
   - `gpt-4` (langsamer, teurer)
   - `gpt-3.5-turbo` (schnell, günstig, weniger intelligent)

### Schritt 4: System Prompt konfigurieren
**Beispiel für La Familia Manila:**
```
Du bist ein hilfreicher Assistent für La Familia Hostel in Manila. Du hilfst Mitarbeitern bei Fragen zu Requests, Tasks und allgemeinen Anfragen. Sei freundlich, professionell und hilfreich.
```

### Schritt 5: Regeln hinzufügen
**Beispiel-Regeln:**
```
1. Antworte immer auf Spanisch, es sei denn der User fragt auf Deutsch oder Englisch
2. Sei freundlich und professionell
3. Wenn du eine Frage nicht beantworten kannst, verweise auf den Administrator
4. Verwende keine Umgangssprache oder Slang
```

### Schritt 6: Temperature & Max Tokens
- **Temperature**: `0.7` (Standard, empfohlen)
  - Niedriger (0.1-0.3): Konservativer, vorhersagbarer
  - Hoch (0.8-1.0): Kreativer, variabler
- **Max Tokens**: `500` (Standard, empfohlen)
  - Länge der Antwort in Tokens (ca. 375 Wörter)

### Schritt 7: Speichern
1. **Speichern** klicken
2. **Erfolgsmeldung** abwarten

---

## 3. 🧪 Testen

### Schritt 1: WhatsApp-Nachricht senden
1. **WhatsApp öffnen**
2. **An die WhatsApp-Nummer senden** (z.B. +573146218524)
3. **Einfache Frage stellen** (z.B. "Hola" oder "¿Cómo estás?")

### Schritt 2: Antwort prüfen
- **✅ Erfolg**: KI-Antwort sollte innerhalb von 5-10 Sekunden kommen
- **❌ Fehler**: Fehlermeldung kommt zurück

### Schritt 3: Server-Logs prüfen
Falls Fehler:
1. **Server-Logs öffnen**
2. **Nach `[WhatsApp AI Service]` suchen**
3. **Fehlermeldung prüfen**

---

## 4. 🔍 Fehlerbehebung

### Problem: "OPENAI_API_KEY nicht gesetzt"
**Lösung:**
1. Prüfe, ob `OPENAI_API_KEY` in `.env` Datei steht
2. Prüfe, ob Server neu gestartet wurde
3. Prüfe, ob Environment-Variable korrekt gesetzt ist

### Problem: "KI ist für diesen Branch nicht aktiviert"
**Lösung:**
1. Branch öffnen → Bearbeiten
2. KI-Konfiguration → KI aktivieren Toggle auf **Aktiviert**
3. Speichern

### Problem: "Fehler bei der KI-Antwort-Generierung"
**Mögliche Ursachen:**
1. **API Key ungültig** → Neuen Key generieren
2. **Billing nicht eingerichtet** → Payment Method hinzufügen
3. **Rate Limit erreicht** → Warten oder Limit erhöhen
4. **Netzwerk-Problem** → Server-Internet-Verbindung prüfen

### Problem: "401 Unauthorized" (OpenAI API)
**Lösung:**
1. API Key prüfen (korrekt kopiert?)
2. Billing prüfen (Payment Method vorhanden?)
3. Neuen API Key generieren

### Problem: "429 Too Many Requests" (OpenAI API)
**Lösung:**
1. **Rate Limit erreicht** → Warten (ca. 1 Minute)
2. **Usage Limit erreicht** → Billing prüfen, Limit erhöhen
3. **Zu viele Anfragen** → Weniger Nachrichten senden

---

## 5. 💰 Kosten

### OpenAI GPT-4o Preise (Stand 2024):
- **Input**: $2.50 pro 1M Tokens
- **Output**: $10.00 pro 1M Tokens

### Beispiel-Kosten:
- **1 Nachricht** (ca. 50 Tokens Input + 100 Tokens Output):
  - Input: $0.000125
  - Output: $0.001
  - **Gesamt: ~$0.001125 pro Nachricht**

- **1000 Nachrichten/Monat**: ~$1.13
- **10.000 Nachrichten/Monat**: ~$11.30

### Empfehlung:
- **Usage Limit**: $5-10/Monat für den Start
- **Monitoring**: OpenAI Dashboard → Usage prüfen
- **Alerts**: Bei 80% des Limits benachrichtigen lassen

---

## 6. 📊 Monitoring

### OpenAI Dashboard:
1. **Usage prüfen**: `https://platform.openai.com/usage`
2. **API Keys verwalten**: `https://platform.openai.com/api-keys`
3. **Billing prüfen**: `https://platform.openai.com/account/billing`

### Server-Logs:
- **KI-Antworten**: `[WhatsApp AI Service]` in Logs
- **Fehler**: `[WhatsApp AI Service] OpenAI API Fehler:`
- **Status**: `[WhatsApp AI Service] Status:` und `Data:`

---

## 7. ✅ Checkliste

### Vor der Aktivierung:
- [ ] OpenAI Account erstellt
- [ ] API Key generiert
- [ ] API Key in `.env` Datei hinterlegt
- [ ] Server neu gestartet (nach Absprache)
- [ ] Billing eingerichtet (Payment Method)
- [ ] Usage Limit gesetzt ($5-10/Monat)

### Konfiguration:
- [ ] Branch geöffnet
- [ ] WhatsApp-Settings → KI-Konfiguration
- [ ] KI aktiviert Toggle auf **Aktiviert**
- [ ] Modell ausgewählt (gpt-4o empfohlen)
- [ ] System Prompt eingegeben
- [ ] Regeln hinzugefügt
- [ ] Temperature & Max Tokens gesetzt
- [ ] Gespeichert

### Test:
- [ ] WhatsApp-Nachricht gesendet
- [ ] KI-Antwort erhalten (innerhalb 5-10 Sekunden)
- [ ] Server-Logs geprüft (keine Fehler)

---

## 8. 🆘 Support

### OpenAI Support:
- **Dokumentation**: `https://platform.openai.com/docs`
- **API Reference**: `https://platform.openai.com/docs/api-reference`
- **Support**: Über OpenAI Dashboard

### System-Support:
- **Server-Logs prüfen** für Fehlermeldungen
- **Environment-Variablen prüfen**
- **Branch-Konfiguration prüfen**

---

## 9. 📝 Beispiel-Konfiguration

### Vollständige Beispiel-Konfiguration für La Familia Manila:

```json
{
  "provider": "whatsapp-business-api",
  "apiKey": "...",
  "phoneNumberId": "...",
  "ai": {
    "enabled": true,
    "model": "gpt-4o",
    "systemPrompt": "Du bist ein hilfreicher Assistent für La Familia Hostel in Manila. Du hilfst Mitarbeitern bei Fragen zu Requests, Tasks und allgemeinen Anfragen. Sei freundlich, professionell und hilfreich.",
    "rules": [
      "Antworte immer auf Spanisch, es sei denn der User fragt auf Deutsch oder Englisch",
      "Sei freundlich und professionell",
      "Wenn du eine Frage nicht beantworten kannst, verweise auf den Administrator",
      "Verwende keine Umgangssprache oder Slang"
    ],
    "sources": [],
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

---

## 10. ⚠️ Wichtige Hinweise

### Sicherheit:
- **API Key nie teilen** oder in Code committen
- **Nur verschlüsselt speichern** (wird automatisch gemacht)
- **Regelmäßig rotieren** (alle 3-6 Monate)

### Performance:
- **Timeout**: 30 Sekunden (automatisch)
- **Rate Limits**: OpenAI Limits beachten
- **Kosten**: Usage regelmäßig prüfen

### Best Practices:
- **System Prompt klar definieren**
- **Regeln spezifisch formulieren**
- **Temperature nicht zu hoch** (max. 0.8)
- **Max Tokens begrenzen** (500-1000 empfohlen)

---

## 🎯 Zusammenfassung

1. **OpenAI Account** erstellen und **API Key** generieren
2. **API Key** in Server `.env` Datei hinterlegen
3. **Billing** einrichten (Payment Method)
4. **Branch** öffnen → **KI aktivieren** → **Konfigurieren**
5. **Testen** mit WhatsApp-Nachricht
6. **Monitoring** im OpenAI Dashboard

**Fertig!** 🎉

