# WhatsApp Bot: Tours, Services, Events Integration

**Datum:** 2025-01-22  
**Status:** Analyse & Empfehlungen

---

## 📋 Frage

Wo werden Informationen zu Tours, Services, Verkäufen, Events etc. her abgerufen? Aus Cerebro? Oder muss das in einen Prompt? Oder sonst irgendwie?

---

## 🔍 Analyse: Aktuelle Möglichkeiten

### 1. Cerebro (Wiki-System)

**Status:** ✅ Bereits vorhanden
- Cerebro ist ein internes Wiki-System mit Artikeln (`CerebroCarticle`)
- Artikel sind **öffentlich lesbar** (kein Filter wenn kein userId)
- Artikel haben: Titel, Inhalt (Markdown/HTML), Slug, Tags, Media, Links

**Vorteile:**
- ✅ Bereits vorhanden
- ✅ Kann strukturiert verwaltet werden
- ✅ Kann Media/Links enthalten
- ✅ Öffentlich zugänglich (auch für Gäste)

**Nachteile:**
- ❌ KI kann nicht direkt auf Cerebro zugreifen (müsste implementiert werden)
- ❌ Aktuell nur als URLs in `sources` Array verwendbar

**Verwendung:**
- Erstelle Cerebro-Artikel für:
  - Tours (z.B. "Tours in Medellin")
  - Services (z.B. "Services - Laundry, Breakfast, etc.")
  - Events (z.B. "Events - Weekly Activities")
  - Verkäufe (z.B. "Products - Merchandise")
- Füge Artikel-URLs in `sources` Array hinzu:
  ```json
  {
    "sources": [
      "https://app.example.com/cerebro/tours-medellin",
      "https://app.example.com/cerebro/services",
      "https://app.example.com/cerebro/events"
    ]
  }
  ```

### 2. Sources Array (URLs)

**Status:** ✅ Bereits implementiert
- `sources` Array im AI-Config kann URLs enthalten
- URLs werden im System Prompt aufgelistet
- KI wird angewiesen, diese Quellen als Referenz zu verwenden

**Vorteile:**
- ✅ Bereits implementiert
- ✅ Flexibel (kann externe URLs sein)
- ✅ Kann Cerebro-Artikel-URLs enthalten

**Nachteile:**
- ❌ KI kann URLs nicht direkt abrufen (nur als Referenz)
- ❌ Muss manuell aktualisiert werden

**Verwendung:**
```json
{
  "ai": {
    "sources": [
      "https://app.example.com/cerebro/tours-medellin",
      "https://app.example.com/cerebro/services",
      "https://example.com/external-tours-page"
    ]
  }
}
```

### 3. Direkt im System Prompt

**Status:** ✅ Möglich, aber nicht empfohlen
- Informationen können direkt im System Prompt stehen
- Wird bei jeder KI-Anfrage mitgesendet

**Vorteile:**
- ✅ Sofort verfügbar für KI
- ✅ Keine zusätzliche Implementierung nötig

**Nachteile:**
- ❌ Prompt wird sehr lang (höhere Kosten)
- ❌ Schwer zu warten (muss manuell aktualisiert werden)
- ❌ Nicht strukturiert

**Verwendung:**
```json
{
  "ai": {
    "systemPrompt": "Du bist ein hilfreicher Assistent für Gäste in Medellin.\n\nVerfügbare Tours:\n- Tour 1: ...\n- Tour 2: ...\n\nServices:\n- Service 1: ...\n..."
  }
}
```

### 4. Dynamische Context-Injection (Zukünftig)

**Status:** ❌ Noch nicht implementiert
- KI-Service könnte Cerebro-Artikel dynamisch laden
- Artikel-Inhalte werden in System Prompt eingefügt
- Automatisch aktualisiert

**Vorteile:**
- ✅ Automatisch aktualisiert
- ✅ Strukturiert
- ✅ KI hat direkten Zugriff auf Inhalte

**Nachteile:**
- ❌ Muss implementiert werden
- ❌ Höhere Token-Kosten (mehr Context)

**Implementierung (Zukünftig):**
```typescript
// In whatsappAiService.ts
const cerebroArticles = await prisma.cerebroCarticle.findMany({
  where: {
    tags: { some: { name: { in: ['tour', 'service', 'event'] } } },
    isPublished: true
  }
});

// Füge Artikel-Inhalte in System Prompt ein
prompt += '\n\nVerfügbare Informationen:\n';
cerebroArticles.forEach(article => {
  prompt += `\n${article.title}:\n${article.content}\n`;
});
```

---

## 💡 Empfehlung

### Für Gäste-Gruppen (WhatsApp-Gruppe):

**Option 1: Cerebro + Sources (Empfohlen)**
1. Erstelle Cerebro-Artikel für:
   - Tours in Medellin
   - Services (Laundry, Breakfast, etc.)
   - Events (Weekly Activities)
   - Verkäufe (Merchandise)
2. Füge Artikel-URLs in `guestGroup.ai.sources` hinzu
3. KI wird angewiesen, diese Quellen als Referenz zu verwenden

**Vorteile:**
- ✅ Strukturiert verwaltbar
- ✅ Kann von mehreren Personen bearbeitet werden
- ✅ Kann Media/Links enthalten
- ✅ Bereits vorhanden

**Nachteile:**
- ⚠️ KI kann URLs nicht direkt abrufen (nur als Referenz)
- ⚠️ Muss manuell aktualisiert werden

**Option 2: Direkt im System Prompt (Für kleine Mengen)**
- Wenn nur wenige Tours/Services: Direkt im Prompt
- Beispiel: "Verfügbare Tours: Tour 1, Tour 2, Tour 3"

**Option 3: Dynamische Context-Injection (Zukünftig)**
- Implementiere dynamisches Laden von Cerebro-Artikeln
- Artikel-Inhalte werden automatisch in System Prompt eingefügt

---

## 🎯 Konkrete Schritte

### Schritt 1: Cerebro-Artikel erstellen

1. **Tours in Medellin**
   - Titel: "Tours in Medellin"
   - Slug: `tours-medellin`
   - Inhalt: Liste aller verfügbaren Tours mit Beschreibungen, Preisen, etc.

2. **Services**
   - Titel: "Services - Laundry, Breakfast, etc."
   - Slug: `services`
   - Inhalt: Alle verfügbaren Services

3. **Events**
   - Titel: "Events - Weekly Activities"
   - Slug: `events`
   - Inhalt: Aktuelle Events und Aktivitäten

4. **Verkäufe**
   - Titel: "Products - Merchandise"
   - Slug: `products`
   - Inhalt: Verfügbare Produkte zum Verkauf

### Schritt 2: URLs in Sources hinzufügen

**Was sind die URLs?**
- Die URLs sind Links zu Cerebro-Artikeln, die du später erstellst
- Format: `https://65.109.228.106.nip.io/cerebro/[slug]`
- Beispiel: `https://65.109.228.106.nip.io/cerebro/tours-medellin`
- Diese URLs zeigen auf öffentlich zugängliche Cerebro-Artikel (ohne Login)

**Wie funktioniert es?**
- Die KI bekommt diese URLs im System Prompt als "Verfügbare Quellen"
- Die KI wird angewiesen, diese Quellen als Referenz zu verwenden
- **WICHTIG:** Die KI kann die URLs NICHT direkt abrufen - sie sind nur als Referenz gedacht
- Du musst die Informationen entweder:
  - **Option A:** Direkt im System Prompt haben (für kleine Mengen)
  - **Option B:** In Cerebro-Artikeln haben und die URLs als Referenz angeben (für größere Mengen)

**Wo füge ich die URLs hinzu?**

**Methode 1: Via Script (automatisch)**
```bash
# Script wurde bereits ausgeführt - guestGroup.ai wurde erstellt
# URLs müssen manuell hinzugefügt werden, sobald Cerebro-Artikel existieren
```

**Methode 2: Via Frontend (manuell)**
1. Öffne Branch-Konfiguration im Frontend
2. Gehe zu WhatsApp-Konfiguration → Gäste-Gruppe
3. Füge URLs in "Sources" Array hinzu:
   ```
   https://65.109.228.106.nip.io/cerebro/tours-medellin
   https://65.109.228.106.nip.io/cerebro/services
   https://65.109.228.106.nip.io/cerebro/events
   https://65.109.228.106.nip.io/cerebro/products
   ```

**Methode 3: Direkt in Datenbank (für Entwickler)**
In Branch WhatsApp Settings → `guestGroup.ai.sources`:
```json
{
  "guestGroup": {
    "ai": {
      "sources": [
        "https://65.109.228.106.nip.io/cerebro/tours-medellin",
        "https://65.109.228.106.nip.io/cerebro/services",
        "https://65.109.228.106.nip.io/cerebro/events",
        "https://65.109.228.106.nip.io/cerebro/products"
      ]
    }
  }
}
```

### Schritt 3: System Prompt erweitern

**Was ist damit gemeint?**
- Der System Prompt ist die Anweisung für die KI, wie sie sich verhalten soll
- Er wird automatisch bei jeder KI-Anfrage mitgesendet
- Er enthält: Rollenbeschreibung, Regeln, verfügbare Quellen, etc.

**Status: ✅ BEREITS ERLEDIGT**
- Das Script `setup-guest-group-ai.ts` wurde ausgeführt
- Der System Prompt wurde automatisch erstellt/erweitert
- Enthält bereits:
  - Rollenbeschreibung: "Du bist ein hilfreicher Assistent für Gäste in Medellin..."
  - Gast-Code-Versand-Informationen
  - Regeln für die Kommunikation
  - Hinweise zu Tours, Services, Events

**Was wurde erstellt:**
```json
{
  "guestGroup": {
    "ai": {
      "enabled": true,
      "model": "gpt-4o",
      "systemPrompt": "Du bist ein hilfreicher Assistent für Gäste in Medellin...",
      "rules": [
        "Antworte immer auf Spanisch...",
        "Sei freundlich, hilfreich und professionell",
        ...
      ],
      "sources": [],
      "temperature": 0.7,
      "maxTokens": 500
    }
  }
}
```

**Falls du den Prompt manuell anpassen möchtest:**
- Öffne Branch-Konfiguration im Frontend
- Gehe zu WhatsApp-Konfiguration → Gäste-Gruppe
- Bearbeite "System Prompt"

---

## 📝 Zusammenfassung

**Aktuell empfohlen:**
1. ✅ **Cerebro-Artikel erstellen** für Tours, Services, Events, Verkäufe
2. ✅ **URLs in `sources` Array** hinzufügen (für Gäste-Gruppen: `guestGroup.ai.sources`)
3. ✅ **System Prompt erweitern** mit Anweisung, Quellen zu verwenden

**Zukünftig (Optional):**
- Dynamische Context-Injection implementieren
- KI lädt Cerebro-Artikel automatisch und fügt Inhalte in System Prompt ein

**Wichtig:**
- Cerebro-Artikel sind öffentlich lesbar (auch für Gäste)
- URLs müssen öffentlich zugänglich sein (ohne Login)
- Artikel sollten mit Tags versehen werden (z.B. "tour", "service", "event")

---

## 🔧 Script zum Aktualisieren

Das Script `update-whatsapp-ai-prompt-guest.ts` aktualisiert bereits den Prompt für Gast-Code-Versand.

Für Tours/Services/Events muss die Konfiguration manuell in der Branch-Konfiguration angepasst werden (Frontend oder direkt in DB).

