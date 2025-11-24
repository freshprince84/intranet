# WhatsApp Bot - Function Calling Implementierung

**Datum:** 2025-01-22  
**Status:** Plan - Bereit zur Implementierung  
**Kosten:** ~$10/Monat (Hybrid-Ansatz, 100 Abfragen/Tag)

---

## 📋 Übersicht

Implementierung von OpenAI Function Calling für dynamische Datenabfrage im WhatsApp Bot.

**Ziel:**
- KI versteht natürliche Sprache ("solicitudes abiertas de hoy")
- KI ruft Funktionen auf, die Daten laden
- Daten werden basierend auf User-Berechtigungen gefiltert
- KI generiert Antwort mit den Daten

**Kosten:**
- Hybrid-Ansatz: ~$10/Monat (100 Abfragen/Tag)
- Function Calling: ~$14/Monat (100 Abfragen/Tag)

---

## 🎯 Anforderungen

### Funktionen, die implementiert werden müssen:

1. **get_requests** - Holt Requests
   - Filter: status, dueDate, userId, branchId
   - Berechtigung: `table_requests` (read)

2. **get_todos** - Holt Todos/Tasks
   - Filter: status, dueDate, userId, branchId
   - Berechtigung: `table_tasks` (read)

3. **get_worktime** - Holt Arbeitszeiten
   - Filter: userId, date, branchId
   - Berechtigung: `page_worktracker` (read)

4. **get_cerebro_articles** - Holt Cerebro-Artikel
   - Filter: searchTerm, tags, userId (für Berechtigungen)
   - Berechtigung: `cerebro` (read)

5. **get_user_info** - Holt User-Informationen
   - Filter: userId
   - Keine spezielle Berechtigung (eigene Daten)

---

## 📐 Architektur

### Flow-Diagramm

```
User sendet WhatsApp-Nachricht
  ↓
Message Handler prüft Keywords
  ↓
Falls kein Keyword → KI-Antwort mit Function Calling
  ↓
OpenAI API Call #1 (mit Function Definitions)
  ↓
KI entscheidet: Function Call nötig?
  ├─ JA → Backend führt Function aus
  │        ↓
  │        Prüft Berechtigungen
  │        ↓
  │        Lädt Daten aus DB
  │        ↓
  │        Filtert basierend auf Rolle
  │        ↓
  │        OpenAI API Call #2 (mit Function Results)
  │        ↓
  │        KI generiert Antwort
  │        ↓
  │        Antwort an User
  └─ NEIN → KI generiert direkte Antwort
             ↓
             Antwort an User
```

---

## 🔧 Implementierungsplan

### Phase 1: Function Definitions

**Datei:** `backend/src/services/whatsappAiService.ts`

**Aufgabe:**
- Funktionen als JSON Schema definieren
- Function Definitions Array erstellen

**Funktionen:**
```typescript
const functionDefinitions = [
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
  },
  // ... weitere Funktionen
];
```

---

### Phase 2: Function Implementations

**Datei:** `backend/src/services/whatsappFunctionHandlers.ts` (NEU)

**Aufgabe:**
- Funktionen implementieren, die Daten laden
- Berechtigungen prüfen
- Daten filtern

**Struktur:**
```typescript
export class WhatsAppFunctionHandlers {
  static async get_requests(
    args: any,
    userId: number,
    roleId: number,
    branchId: number
  ): Promise<any> {
    // 1. Prüfe Berechtigung
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
    
    // 2. Parse Arguments
    const status = args.status;
    const dueDate = args.dueDate === 'today' 
      ? new Date() 
      : args.dueDate ? new Date(args.dueDate) : undefined;
    const targetUserId = args.userId || userId;
    
    // 3. Lade Daten
    const requests = await prisma.request.findMany({
      where: {
        requesterId: targetUserId,
        branchId: branchId,
        ...(status && { status }),
        ...(dueDate && { dueDate })
      },
      include: {
        requester: { select: { firstName: true, lastName: true } },
        responsible: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // 4. Formatiere für KI
    return requests.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      dueDate: r.dueDate?.toISOString().split('T')[0],
      requester: `${r.requester.firstName} ${r.requester.lastName}`,
      responsible: r.responsible ? `${r.responsible.firstName} ${r.responsible.lastName}` : null
    }));
  }
  
  // ... weitere Funktionen
}
```

---

### Phase 3: OpenAI API erweitern

**Datei:** `backend/src/services/whatsappAiService.ts`

**Aufgabe:**
- `tools` Parameter zu API Call hinzufügen
- `tool_calls` in Response verarbeiten
- Funktionen ausführen
- Erneuter API Call mit Ergebnissen

**Änderungen:**

1. **Function Definitions hinzufügen:**
```typescript
private static getFunctionDefinitions(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'get_requests',
        description: 'Holt Requests (Solicitudes) für einen User...',
        parameters: { /* ... */ }
      }
    },
    // ... weitere Funktionen
  ];
}
```

2. **API Call erweitern:**
```typescript
const response = await axios.post(
  'https://api.openai.com/v1/chat/completions',
  {
    model: aiConfig.model || 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    tools: this.getFunctionDefinitions(),
    tool_choice: 'auto', // KI entscheidet, ob Functions aufgerufen werden sollen
    temperature: aiConfig.temperature ?? 0.7,
    max_tokens: aiConfig.maxTokens || 500
  },
  // ...
);
```

3. **Tool Calls verarbeiten:**
```typescript
const message = response.data.choices[0].message;

if (message.tool_calls && message.tool_calls.length > 0) {
  // Führe Funktionen aus
  const toolResults = [];
  
  for (const toolCall of message.tool_calls) {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);
    
    try {
      const result = await WhatsAppFunctionHandlers[functionName](
        functionArgs,
        conversationContext.userId,
        conversationContext.roleId,
        branchId
      );
      
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify(result)
      });
    } catch (error) {
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify({ error: error.message })
      });
    }
  }
  
  // Erneuter API Call mit Function Results
  const finalResponse = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: aiConfig.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
        { role: 'assistant', content: null, tool_calls: message.tool_calls },
        ...toolResults
      ],
      temperature: aiConfig.temperature ?? 0.7,
      max_tokens: aiConfig.maxTokens || 500
    },
    // ...
  );
  
  return {
    message: finalResponse.data.choices[0].message.content,
    language
  };
} else {
  // Keine Function Calls, direkte Antwort
  return {
    message: message.content,
    language
  };
}
```

---

### Phase 4: User Context erweitern

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Aufgabe:**
- User-Informationen (Rollen) in `conversationContext` hinzufügen
- Benötigt für Berechtigungsprüfung

**Änderungen:**
```typescript
// In handleIncomingMessage(), nach User-Identifikation:
const user = await this.identifyUser(normalizedPhone, branchId);

// Lade User mit Rollen
const userWithRoles = await prisma.user.findUnique({
  where: { id: user.id },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    roles: {
      select: {
        roleId: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }
  }
});

// Erweitere conversationContext
const conversationContext = {
  userId: userWithRoles?.id,
  roleId: userWithRoles?.roles[0]?.roleId, // Erste Rolle (oder alle?)
  userName: userWithRoles ? `${userWithRoles.firstName} ${userWithRoles.lastName}` : null,
  conversationState: conversation.state,
  groupId: groupId
};
```

---

### Phase 5: Hybrid-Ansatz (Keywords + Function Calling)

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

**Aufgabe:**
- Keywords für häufige Anfragen beibehalten
- Function Calling für komplexe Anfragen

**Keywords (beibehalten):**
- "requests" → Direkte Antwort (schnell & günstig)
- "todos" → Direkte Antwort (schnell & günstig)
- "wer bin ich" → Direkte Antwort (neu)
- "arbeitszeit" → Direkte Antwort (neu)

**Function Calling (für komplexe Anfragen):**
- "solicitudes abiertas de hoy" → Function Calling
- "welche todos habe ich offen" → Function Calling
- "wie lange habe ich heute gearbeitet" → Function Calling
- "welche cerebro artikel gibt es zu notfällen" → Function Calling

---

### Phase 6: System Prompt erweitern

**Datei:** `backend/src/services/whatsappAiService.ts` - `buildSystemPrompt()`

**Aufgabe:**
- System Prompt erweitern mit Informationen zu verfügbaren Funktionen
- Anweisungen für KI, wann Funktionen verwendet werden sollen

**Erweiterung:**
```typescript
prompt += '\n\nVerfügbare Funktionen:\n';
prompt += '- get_requests: Hole Requests basierend auf Filtern\n';
prompt += '- get_todos: Hole Todos/Tasks basierend auf Filtern\n';
prompt += '- get_worktime: Hole Arbeitszeiten für einen User\n';
prompt += '- get_cerebro_articles: Hole Cerebro-Artikel basierend auf Suchbegriffen\n';
prompt += '- get_user_info: Hole User-Informationen\n';
prompt += '\nVerwende diese Funktionen, wenn der User nach spezifischen Daten fragt.';
prompt += '\nBeispiel: "solicitudes abiertas de hoy" → get_requests({ status: "open", dueDate: "today" })';
```

---

## 📝 Detaillierte Function Definitions

### 1. get_requests

```typescript
{
  name: "get_requests",
  description: "Holt Requests (Solicitudes) für einen User. Filtere nach Status, Datum, etc. Verwende 'today' für heute, 'this_week' für diese Woche.",
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
        description: "Fälligkeitsdatum im Format YYYY-MM-DD. Verwende 'today' für heute, 'this_week' für diese Woche."
      },
      userId: {
        type: "number",
        description: "User ID (optional, verwendet aktuellen User wenn nicht angegeben)"
      }
    }
  }
}
```

### 2. get_todos

```typescript
{
  name: "get_todos",
  description: "Holt Todos/Tasks für einen User. Filtere nach Status, Datum, etc.",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "in_progress", "improval", "quality_control", "done"],
        description: "Status des Todos"
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

### 3. get_worktime

```typescript
{
  name: "get_worktime",
  description: "Holt Arbeitszeiten für einen User. Zeigt aktuelle Arbeitszeit, Arbeitszeiten für ein bestimmtes Datum, oder Arbeitszeiten für einen Zeitraum.",
  parameters: {
    type: "object",
    properties: {
      date: {
        type: "string",
        description: "Datum im Format YYYY-MM-DD. Verwende 'today' für heute. Wenn nicht angegeben, zeigt aktuelle Arbeitszeit."
      },
      startDate: {
        type: "string",
        description: "Startdatum für Zeitraum (Format: YYYY-MM-DD)"
      },
      endDate: {
        type: "string",
        description: "Enddatum für Zeitraum (Format: YYYY-MM-DD)"
      },
      userId: {
        type: "number",
        description: "User ID (optional, verwendet aktuellen User wenn nicht angegeben)"
      }
    }
  }
}
```

### 4. get_cerebro_articles

```typescript
{
  name: "get_cerebro_articles",
  description: "Holt Cerebro-Artikel basierend auf Suchbegriffen oder Tags. Prüft automatisch Berechtigungen des Users.",
  parameters: {
    type: "object",
    properties: {
      searchTerm: {
        type: "string",
        description: "Suchbegriff für Titel oder Inhalt"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Tags zum Filtern (z.B. ['notfall', 'emergency'])"
      },
      limit: {
        type: "number",
        description: "Maximale Anzahl der Artikel (Standard: 10)",
        default: 10
      }
    }
  }
}
```

### 5. get_user_info

```typescript
{
  name: "get_user_info",
  description: "Holt Informationen über einen User (Name, Email, Rollen). Wenn keine userId angegeben, verwendet aktuellen User.",
  parameters: {
    type: "object",
    properties: {
      userId: {
        type: "number",
        description: "User ID (optional, verwendet aktuellen User wenn nicht angegeben)"
      }
    }
  }
}
```

---

## 🔐 Berechtigungsprüfung

### Implementierung in Function Handlers

**Pattern:**
```typescript
// 1. Prüfe Berechtigung
const hasPermission = await checkUserPermission(
  userId,
  roleId,
  'table_requests', // Entity
  'read', // Required Access
  'table' // Entity Type
);

if (!hasPermission) {
  throw new Error('Keine Berechtigung für Requests');
}

// 2. Lade Daten
// 3. Filtere basierend auf Rolle (falls nötig)
```

**Berechtigungen pro Function:**

| Function | Entity | Entity Type | Access |
|----------|--------|-------------|--------|
| get_requests | `table_requests` | `table` | `read` |
| get_todos | `table_tasks` | `table` | `read` |
| get_worktime | `page_worktracker` | `page` | `read` |
| get_cerebro_articles | `cerebro` | `cerebro` | `read` |
| get_user_info | - | - | - (eigene Daten) |

---

## 🧪 Testing

### Test-Szenarien

1. **Einfache Anfrage:**
   - User: "requests"
   - Erwartung: Keyword-Handler (direkte Antwort, kein API Call)

2. **Komplexe Anfrage:**
   - User: "solicitudes abiertas de hoy"
   - Erwartung: Function Calling → get_requests({ status: "open", dueDate: "today" })

3. **Berechtigung:**
   - User ohne Berechtigung fragt nach Requests
   - Erwartung: Fehler-Meldung, keine Daten

4. **Mehrere Functions:**
   - User: "welche requests und todos habe ich offen"
   - Erwartung: Zwei Function Calls → get_requests() + get_todos()

5. **Fehlerbehandlung:**
   - Function wirft Fehler
   - Erwartung: Fehler-Meldung an KI, KI erklärt Fehler an User

---

## 📊 Monitoring

### Logging

**Zu loggen:**
- Function Calls (welche Function, welche Argumente)
- Function Results (Anzahl der Ergebnisse)
- Fehler (welche Function, welcher Fehler)
- API Calls (Anzahl, Tokens, Kosten)

**Log-Format:**
```
[WhatsApp Function Calling] Function: get_requests
[WhatsApp Function Calling] Arguments: { status: "open", dueDate: "today" }
[WhatsApp Function Calling] Results: 3 requests found
[WhatsApp Function Calling] API Calls: 2 (Intent + Response)
[WhatsApp Function Calling] Tokens: 750 input, 150 output
```

---

## 💰 Kosten-Monitoring

### Tracking

**Implementierung:**
- Token-Zähler pro Request
- Kosten-Berechnung pro Request
- Tägliche/Monatliche Statistiken

**Speicherung:**
- Optional: In Datenbank speichern
- Oder: Nur in Logs

**Alerts:**
- Bei Überschreitung von Limits warnen
- Tägliche Kosten-Übersicht

---

## ✅ Checkliste

### Vor Implementierung:
- [ ] OpenAI API Key vorhanden
- [ ] Billing eingerichtet
- [ ] Usage Limits gesetzt
- [ ] Berechtigungssystem verstanden

### Implementierung:
- [ ] Function Definitions erstellt
- [ ] Function Handlers implementiert
- [ ] Berechtigungen geprüft
- [ ] OpenAI API erweitert
- [ ] Tool Calls verarbeitet
- [ ] User Context erweitert
- [ ] System Prompt erweitert
- [ ] Hybrid-Ansatz implementiert

### Testing:
- [ ] Einfache Anfragen getestet
- [ ] Komplexe Anfragen getestet
- [ ] Berechtigungen getestet
- [ ] Fehlerbehandlung getestet
- [ ] Kosten getrackt

### Deployment:
- [ ] Code deployed
- [ ] Monitoring aktiviert
- [ ] Alerts konfiguriert
- [ ] Dokumentation aktualisiert

---

## 📚 Referenzen

- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
- Kosten-Analyse: `docs/analysis/WHATSAPP_BOT_KOSTEN_ANALYSE.md`
- Intent-Erkennung Analyse: `docs/analysis/WHATSAPP_BOT_INTENT_ERKENNUNG_ANALYSE.md`
- Funktionalitätsprüfung: `docs/analysis/WHATSAPP_BOT_FUNKTIONALITÄT_PRÜFUNG.md`

