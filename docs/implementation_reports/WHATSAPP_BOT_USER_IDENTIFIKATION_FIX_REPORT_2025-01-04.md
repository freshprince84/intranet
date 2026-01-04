# WhatsApp Bot - User Identifikation Fix Report

**Datum:** 2025-01-04  
**Status:** ✅ **BEHOBEN**  
**Commit:** `c70f8126`

---

## 📋 Problem

Der WhatsApp Bot konnte registrierte User nicht identifizieren, obwohl die Telefonnummer korrekt im Profil hinterlegt war. Dies führte zu Fehlermeldungen wie:

- "Du musst registriert sein, um Todos abzurufen. Bitte füge deine Telefonnummer zu deinem Profil hinzu."
- "Lo siento, parece que no tengo acceso a tus datos personales..."

**Symptome:**
- `get_user_info()`, `get_todos()`, `get_requests()` etc. warfen immer `userId null` Fehler
- User wurde in der DB gefunden, aber `userId` wurde nicht an Function Handlers übergeben

---

## 🔍 Root Cause Analyse

### Problem 1: `userId` und `roleId` wurden nicht an Function Handlers übergeben

**Ursache:**
- `userId` und `roleId` wurden in `whatsappMessageHandler.ts` korrekt ermittelt
- ABER: Sie wurden nie zu `mergedContext` hinzugefügt
- `mergedContext` wurde an `WhatsAppAiService.generateResponse()` übergeben
- `WhatsAppAiService` extrahierte `userId` und `roleId` aus `conversationContext` (Zeile 330-331)
- Da diese nicht vorhanden waren, waren sie immer `null`

**Code-Stelle:**
```typescript
// backend/src/services/whatsappAiService.ts:328-333
const functionParams: any[] = [
  functionArgs,
  conversationContext?.userId || null,  // ❌ War immer null!
  conversationContext?.roleId || null,   // ❌ War immer null!
  branchId
];
```

### Problem 2: `ConversationContext` Interface hatte keine `userId` und `roleId` Felder

**Ursache:**
- TypeScript Interface `ConversationContext` hatte keine `userId` und `roleId` Properties
- Code konnte diese nicht hinzufügen ohne TypeScript-Fehler

---

## ✅ Lösung

### 1. `ConversationContext` Interface erweitert

**Datei:** `backend/src/services/chatbot/MessageParserService.ts`

```typescript
export interface ConversationContext {
  language: string; // IMMER vorhanden
  userId?: number | null; // ✅ NEU: User ID (für Function Handlers)
  roleId?: number | null; // ✅ NEU: Role ID (für Function Handlers)
  booking?: { ... };
  tour?: { ... };
}
```

### 2. `userId` und `roleId` zu `mergedContext` hinzugefügt

**Datei:** `backend/src/services/whatsappMessageHandler.ts`

```typescript
// KRITISCH: Füge userId und roleId zu mergedContext hinzu (für Function Handlers)
if (user) {
  mergedContext.userId = user.id;
  mergedContext.roleId = roleId;
  logger.log('[WhatsApp Message Handler] ✅ userId und roleId zu mergedContext hinzugefügt:', {
    userId: user.id,
    roleId: roleId
  });
} else {
  logger.warn('[WhatsApp Message Handler] ⚠️ KEIN USER GEFUNDEN - userId und roleId werden NICHT zu mergedContext hinzugefügt!');
}
```

**Wichtig:** Dies passiert BEVOR `mergedContext` an `generateResponse()` übergeben wird (Zeile 267).

### 3. Logging hinzugefügt

**Zweck:** Besseres Debugging für zukünftige Probleme

- Log wenn `userId` und `roleId` gesetzt werden
- Warnung wenn User nicht gefunden wird

---

## 🧪 Test

**Vorher:**
- User sendet "todos abiertos" → Fehler: "Du musst registriert sein..."
- User sendet "quien soy" → Fehler: "Lo siento, parece que no tengo acceso..."

**Nachher:**
- User sendet "todos abiertos" → ✅ Liste der Todos wird angezeigt
- User sendet "quien soy" → ✅ User-Informationen werden angezeigt

---

## 📊 Datenbank-Prüfung

**User gefunden:**
- Patrick Ammann (ID: 16) mit Telefonnummer `+41787192338`
- User ist in Branch ID 3 (Manila) und ID 4 (Parque Poblado)
- WhatsApp Conversations zeigen: User ist bereits identifiziert

**Problem war NICHT die Datenbank, sondern die Übergabe der Daten!**

---

## 🔗 Verwandte Dateien

- `backend/src/services/whatsappMessageHandler.ts` - User-Identifikation und Context-Erstellung
- `backend/src/services/whatsappAiService.ts` - Function Handler Aufrufe
- `backend/src/services/whatsappFunctionHandlers.ts` - Function Implementierungen
- `backend/src/services/chatbot/MessageParserService.ts` - ConversationContext Interface

---

## ✅ Status

**BEHOBEN** - User-Identifikation funktioniert jetzt korrekt. `userId` und `roleId` werden an alle Function Handlers übergeben.

---

## 📝 Lessons Learned

1. **Context-Übergabe prüfen:** Wenn Daten nicht ankommen, prüfe die gesamte Kette (Handler → Service → Functions)
2. **TypeScript Interfaces:** Erweitere Interfaces, wenn neue Properties benötigt werden
3. **Logging:** Logging an kritischen Stellen hilft beim Debugging

---

## 🚀 Nächste Schritte

- ✅ Fix implementiert
- ✅ Getestet
- ✅ Dokumentiert

