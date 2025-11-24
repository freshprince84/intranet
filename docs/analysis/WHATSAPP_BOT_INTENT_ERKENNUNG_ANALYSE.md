# WhatsApp Bot - Intent-Erkennung & Dynamische Datenabfrage

**Datum:** 2025-01-22  
**Status:** Analyse - Nichts geändert

---

## 📋 Anforderung

Der Bot soll aus der WhatsApp-Nachricht verstehen, was abgefragt wird, und dann die entsprechenden Daten laden.

**Beispiel:**
- "solicitudes abiertas de hoy" → Requests mit `status = 'open'` & `dueDate = today`
- "wie lange habe ich heute gearbeitet" → Arbeitszeiten für heute
- "welche cerebro artikel gibt es zu notfällen" → Cerebro-Artikel mit Tag "notfall"

**Frage:** Wäre das ein MCP Server? Oder wie müsste man das machen?

---

## 🔍 Aktuelle Implementierung

### Was existiert bereits:

1. **OpenAI Chat Completions API**
   - Verwendet: `gpt-4o` Model
   - Format: System Prompt + User Message → AI Response
   - **KEIN Function Calling** implementiert

2. **MCP Server im Projekt**
   - `mcp-servers/deployment/` - Für Deployment
   - `mcp.json` - Konfiguration für Postgres MCP Server
   - **ABER:** MCP Server sind für **Cursor/Claude**, nicht für WhatsApp Bot

3. **Keywords (statisch)**
   - "requests" → Direkte Antwort
   - "todos" → Direkte Antwort
   - **ABER:** Keine dynamische Intent-Erkennung

---

## 💡 Optionen zur Implementierung

### Option 1: OpenAI Function Calling ⭐ EMPFOHLEN

**Was ist das?**
- OpenAI unterstützt "Function Calling" / "Tools"
- KI kann Funktionen aufrufen, die dann Daten laden
- Funktionen werden als JSON Schema definiert

**Wie funktioniert es?**

1. **Funktionen definieren:**
```typescript
const functions = [
  {
    name: "get_requests",
    description: "Holt Requests basierend auf Filtern",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "in_progress", "done"] },
        dueDate: { type: "string", description: "Datum im Format YYYY-MM-DD" },
        userId: { type: "number" }
      }
    }
  },
  {
    name: "get_worktime",
    description: "Holt Arbeitszeiten für einen User",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "number" },
        date: { type: "string", description: "Datum im Format YYYY-MM-DD" }
      }
    }
  },
  {
    name: "get_cerebro_articles",
    description: "Holt Cerebro-Artikel basierend auf Suchbegriffen",
    parameters: {
      type: "object",
      properties: {
        searchTerm: { type: "string" },
        tags: { type: "array", items: { type: "string" } }
      }
    }
  }
];
```

2. **OpenAI API Call mit Functions:**
```typescript
const response = await axios.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message }
  ],
  tools: functions.map(f => ({
    type: 'function',
    function: f
  })),
  tool_choice: 'auto' // KI entscheidet, ob Funktionen aufgerufen werden sollen
});
```

3. **Funktionsaufrufe verarbeiten:**
```typescript
const message = response.data.choices[0].message;

// Prüfe ob KI Funktionen aufrufen möchte
if (message.tool_calls) {
  for (const toolCall of message.tool_calls) {
    if (toolCall.function.name === 'get_requests') {
      const args = JSON.parse(toolCall.function.arguments);
      const requests = await getRequestsFromDB(args);
      // Füge Ergebnis in Conversation ein
    }
  }
  // Erneuter API Call mit Funktionsergebnissen
}
```

**Vorteile:**
- ✅ KI entscheidet selbst, welche Daten benötigt werden
- ✅ Dynamisch - keine statischen Keywords nötig
- ✅ Natürliche Sprache funktioniert ("solicitudes abiertas de hoy")
- ✅ Bereits von OpenAI unterstützt
- ✅ Keine zusätzliche Infrastruktur nötig

**Nachteile:**
- ⚠️ Mehr API Calls (kann teurer sein)
- ⚠️ Komplexere Implementierung

---

### Option 2: MCP Server für WhatsApp Bot

**Was ist das?**
- Separater MCP Server, der Tools für WhatsApp Bot bereitstellt
- WhatsApp Bot würde als MCP Client fungieren

**Wie funktioniert es?**

1. **MCP Server erstellen:**
```typescript
// mcp-servers/whatsapp-bot-tools/
const server = new Server({
  name: "whatsapp-bot-tools",
  version: "1.0.0"
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_requests",
        description: "Holt Requests basierend auf Filtern",
        inputSchema: { /* ... */ }
      },
      // ...
    ]
  };
});
```

2. **WhatsApp Bot als MCP Client:**
- Bot würde MCP Server aufrufen
- KI würde Tools über MCP aufrufen

**Vorteile:**
- ✅ Trennung von Concerns
- ✅ Wiederverwendbar für andere Clients

**Nachteile:**
- ❌ Komplexer (MCP Server + Client)
- ❌ Zusätzliche Infrastruktur
- ❌ Nicht direkt für WhatsApp Bot gedacht
- ❌ MCP ist primär für Cursor/Claude, nicht für Production-Bots

---

### Option 3: Intent-Erkennung + Context-Generierung

**Was ist das?**
- Zwei-Phasen-Ansatz:
  1. Intent-Erkennung: KI erkennt, was User will
  2. Context-Generierung: Backend lädt Daten basierend auf Intent
  3. Antwort-Generierung: KI generiert Antwort mit Daten

**Wie funktioniert es?**

1. **Intent-Erkennung:**
```typescript
// Erster API Call: Intent erkennen
const intentResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'Erkenne den Intent der Nachricht. Antworte nur mit JSON: { intent: "...", filters: {...} }' },
    { role: 'user', content: message }
  ],
  response_format: { type: "json_object" }
});

const intent = JSON.parse(intentResponse.data.choices[0].message.content);
// intent = { intent: "get_requests", filters: { status: "open", dueDate: "2025-01-22" } }
```

2. **Daten laden:**
```typescript
if (intent.intent === 'get_requests') {
  const requests = await getRequestsFromDB(intent.filters);
}
```

3. **Antwort generieren:**
```typescript
// Zweiter API Call: Antwort mit Daten generieren
const response = await axios.post('https://api.openai.com/v1/chat/completions', {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
    { role: 'assistant', content: `Daten: ${JSON.stringify(requests)}` }
  ]
});
```

**Vorteile:**
- ✅ Klare Trennung: Intent → Daten → Antwort
- ✅ Kontrolle über Datenabfrage

**Nachteile:**
- ❌ Zwei API Calls (teurer)
- ❌ Komplexer
- ❌ Intent-Erkennung kann fehlerhaft sein

---

### Option 4: Hybrid (Function Calling + Keywords)

**Was ist das?**
- Keywords für häufige Anfragen (schnell)
- Function Calling für komplexe Anfragen (flexibel)

**Vorteile:**
- ✅ Beste aus beiden Welten
- ✅ Schnell für häufige Anfragen
- ✅ Flexibel für komplexe Anfragen

**Nachteile:**
- ⚠️ Mehr Code
- ⚠️ Zwei verschiedene Wege

---

## 🎯 Empfehlung

### **Option 1: OpenAI Function Calling** ⭐

**Warum?**
1. **Natürlich:** KI versteht natürliche Sprache direkt
2. **Dynamisch:** Keine statischen Keywords nötig
3. **Standard:** Von OpenAI unterstützt
4. **Einfach:** Keine zusätzliche Infrastruktur
5. **Flexibel:** Funktioniert für alle Anfragen

**Implementierung:**

1. **Funktionen definieren:**
   - `get_requests(filters)` - Holt Requests
   - `get_todos(filters)` - Holt Todos
   - `get_worktime(userId, date)` - Holt Arbeitszeiten
   - `get_cerebro_articles(searchTerm, tags)` - Holt Cerebro-Artikel
   - `get_user_info(userId)` - Holt User-Informationen

2. **Berechtigungen prüfen:**
   - In jeder Funktion: Prüfe User-Berechtigungen
   - Filtere Daten basierend auf Rollen

3. **OpenAI API erweitern:**
   - Füge `tools` Parameter hinzu
   - Verarbeite `tool_calls` in Response
   - Führe Funktionen aus
   - Erneuter API Call mit Ergebnissen

**Beispiel-Flow:**

```
User: "solicitudes abiertas de hoy"
  ↓
OpenAI API Call mit Functions
  ↓
KI entscheidet: get_requests({ status: "open", dueDate: "2025-01-22" })
  ↓
Backend: Führt get_requests() aus
  - Prüft Berechtigungen
  - Lädt Daten aus DB
  - Filtert basierend auf User-Rolle
  ↓
OpenAI API Call mit Ergebnissen
  ↓
KI generiert Antwort: "Tienes 3 solicitudes abiertas de hoy: ..."
```

---

## 📊 Vergleich

| Option | Komplexität | Kosten | Flexibilität | Empfehlung |
|--------|-------------|--------|--------------|------------|
| Function Calling | Mittel | Mittel | ⭐⭐⭐⭐⭐ | ✅ **EMPFOHLEN** |
| MCP Server | Hoch | Niedrig | ⭐⭐⭐ | ❌ Zu komplex |
| Intent-Erkennung | Hoch | Hoch | ⭐⭐⭐ | ❌ Zwei API Calls |
| Hybrid | Mittel | Niedrig | ⭐⭐⭐⭐ | ⚠️ Optional |

---

## 🔧 Technische Details

### Function Calling Schema (Beispiel)

```typescript
{
  name: "get_requests",
  description: "Holt Requests (Solicitudes) für einen User. Filtere nach Status, Datum, etc.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "in_progress", "done", "cancelled"],
        description: "Status des Requests"
      },
      dueDate: {
        type: "string",
        description: "Fälligkeitsdatum im Format YYYY-MM-DD. Verwende 'today' für heute."
      },
      userId: {
        type: "number",
        description: "User ID (optional, verwendet aktuellen User wenn nicht angegeben)"
      }
    }
  }
}
```

### Berechtigungsprüfung

```typescript
async function get_requests(args: any, userId: number, roleId: number) {
  // Prüfe Berechtigung
  const hasPermission = await checkUserPermission(
    userId,
    roleId,
    'table_requests',
    'read',
    'table'
  );
  
  if (!hasPermission) {
    throw new Error('Keine Berechtigung für Requests');
  }
  
  // Lade Daten
  const requests = await prisma.request.findMany({
    where: {
      requesterId: args.userId || userId,
      status: args.status,
      dueDate: args.dueDate === 'today' ? new Date() : args.dueDate
    }
  });
  
  return requests;
}
```

---

## ✅ Fazit

**Empfehlung: OpenAI Function Calling**

- ✅ Kein MCP Server nötig (MCP ist für Cursor/Claude, nicht für Production-Bots)
- ✅ Direkte Integration in OpenAI API
- ✅ Natürliche Sprache funktioniert
- ✅ Dynamisch und flexibel
- ✅ Berechtigungen können in Funktionen geprüft werden

**Nächste Schritte:**
1. Funktionen definieren (get_requests, get_todos, get_worktime, get_cerebro_articles)
2. OpenAI API erweitern (tools Parameter)
3. Tool Calls verarbeiten
4. Berechtigungen prüfen
5. Daten laden und zurückgeben

