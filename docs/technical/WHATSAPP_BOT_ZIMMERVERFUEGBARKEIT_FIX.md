# WhatsApp Bot Zimmerverfügbarkeit - Fix

**Datum:** 2025-01-26  
**Problem:** Bot antwortete, dass er keinen Zugriff auf Zimmerverfügbarkeit hat

---

## 🔍 PROBLEM IDENTIFIZIERT

**Symptom:**
- Bot antwortete: "Ich kann keine Hotelzimmerverfügbarkeiten überprüfen"
- Function `check_room_availability` wurde nicht aufgerufen

**Ursache:**
1. Function Calling war nur für Mitarbeiter aktiviert (`isEmployee` Check)
2. System Prompt zeigte Function nur für Mitarbeiter an
3. Function Handler erwartete `userId` (konnte null sein)

---

## ✅ LÖSUNG IMPLEMENTIERT

### 1. Function Calling für ALLE aktiviert

**Datei:** `backend/src/services/whatsappAiService.ts`

**Vorher:**
```typescript
const isEmployee = !!conversationContext?.userId;
const functionDefinitions = isEmployee ? this.getFunctionDefinitions() : [];
```

**Nachher:**
```typescript
// Für Zimmerverfügbarkeit: Function auch für Gäste aktivieren
const functionDefinitions = this.getFunctionDefinitions();
```

**Grund:** Zimmerverfügbarkeit sollte auch für Gäste verfügbar sein!

### 2. System Prompt verbessert

**Datei:** `backend/src/services/whatsappAiService.ts`

**Änderungen:**
- `check_room_availability` wird jetzt IMMER im System Prompt erwähnt (auch für Gäste)
- Explizite Anweisung: "Verwende IMMER diese Function wenn der User nach Zimmerverfügbarkeit fragt!"
- Mehr Beispiele in verschiedenen Sprachen:
  - Spanisch: "tienen habitacion para hoy?"
  - Deutsch: "Haben wir Zimmer frei vom 1.2. bis 3.2.?"
  - Zimmerart-Filter: "gibt es Dorm-Zimmer frei?"

**Wichtig:**
```
WICHTIG: Wenn der User nach Zimmerverfügbarkeit fragt, verwende IMMER check_room_availability!
Antworte NICHT, dass du keinen Zugriff hast - nutze stattdessen die Function!
```

### 3. Function Handler angepasst

**Datei:** `backend/src/services/whatsappAiService.ts`

**Vorher:**
```typescript
const result = await (WhatsAppFunctionHandlers as any)[functionName](
  functionArgs,
  conversationContext.userId,
  conversationContext.roleId,
  branchId
);
```

**Nachher:**
```typescript
// WICHTIG: check_room_availability kann auch ohne userId aufgerufen werden
const result = await (WhatsAppFunctionHandlers as any)[functionName](
  functionArgs,
  conversationContext?.userId || null,
  conversationContext?.roleId || null,
  branchId
);
```

**Grund:** `check_room_availability` funktioniert auch ohne userId (für Gäste)

---

## 🧪 TESTEN

### 1. Bot über WhatsApp testen

**Nachrichten senden:**
- "tienen habitacion para hoy?" (Spanisch)
- "Haben wir Zimmer frei vom 1.2. bis 3.2.?" (Deutsch)
- "gibt es Dorm-Zimmer frei?" (Deutsch)
- "¿tienen habitaciones privadas disponibles?" (Spanisch)

**Erwartetes Verhalten:**
- Bot sollte `check_room_availability` Function aufrufen
- Bot sollte Verfügbarkeit und Preise anzeigen
- Bot sollte NICHT sagen, dass er keinen Zugriff hat

### 2. Function direkt testen

```bash
cd /var/www/intranet/backend
npx ts-node scripts/test-check-room-availability-function.ts
```

---

## 📝 DATEIEN GEÄNDERT

1. `backend/src/services/whatsappAiService.ts`
   - Function Calling für alle aktiviert
   - System Prompt verbessert
   - Function Handler angepasst

---

## ⚠️ WICHTIGE HINWEISE

1. **Andere Functions bleiben Mitarbeiter-only:**
   - `get_requests`, `get_todos`, `get_worktime`, etc. sind weiterhin nur für Mitarbeiter
   - Nur `check_room_availability` ist für alle verfügbar

2. **Server-Neustart erforderlich:**
   - Nach Änderungen muss der Server neu gestartet werden
   - Oder: Code wird automatisch neu geladen (falls Hot-Reload aktiviert)

3. **Function Definition:**
   - `check_room_availability` ist in `getFunctionDefinitions()` registriert
   - Wird automatisch für alle verfügbar gemacht

---

**Erstellt:** 2025-01-26  
**Status:** ✅ IMPLEMENTIERT - BEREIT ZUM TESTEN

