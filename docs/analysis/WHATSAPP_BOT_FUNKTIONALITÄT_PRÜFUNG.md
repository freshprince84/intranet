# WhatsApp Bot - Funktionalitätsprüfung

**Datum:** 2025-01-22  
**Status:** Analyse - Nichts geändert

---

## 📋 Anforderungen

Der Bot soll folgende Funktionen unterstützen:
1. "wer bin ich" - User-Identifikation
2. "wie lange habe ich heute gearbeitet" - Arbeitszeiten
3. "welche todos habe ich offen" - Todos
4. "welche requests gibt es zu türfallen" - Requests
5. "welche cerebro artikel gibt es zu notfällen" - Cerebro-Artikel

**Wichtig:** Alles entlang der Berechtigungen/Rollen.

---

## ✅ Was funktioniert bereits

### 1. Keywords "requests" und "todos"
**Status:** ✅ **FUNKTIONIERT**

**Implementierung:**
- Keywords: "requests", "todos", "to do's"
- Handler: `handleRequestsKeyword()` und `handleTodosKeyword()`
- Zeigt Liste aller Requests/Tasks für den User
- Funktioniert nur für authentifizierte User (mit Telefonnummer)

**Code:**
```typescript
// backend/src/services/whatsappMessageHandler.ts
if (normalizedText === 'requests') {
  if (user) {
    return await this.handleRequestsKeyword(user.id, branchId, conversation);
  }
  return await this.getLanguageResponse(branchId, normalizedPhone, 'requests_require_auth');
}
```

---

## ❌ Was NICHT funktioniert

### 1. "wer bin ich" / User-Identifikation
**Status:** ❌ **NICHT IMPLEMENTIERT**

**Problem:**
- Kein Keyword für "wer bin ich" / "who am I"
- KI hat keinen Zugriff auf User-Informationen im System Prompt
- `conversationContext` enthält nur `userId`, aber keine User-Details

**Was fehlt:**
- Keyword-Handler für "wer bin ich"
- Oder: Context-Generierung, die User-Informationen in System Prompt einfügt

**Aktueller Stand:**
- User wird identifiziert (`identifyUser()`)
- `userId` wird an KI übergeben (`conversationContext.userId`)
- Aber: KI hat keine User-Details (Name, Email, etc.)

---

### 2. "wie lange habe ich heute gearbeitet" / Arbeitszeiten
**Status:** ❌ **NICHT IMPLEMENTIERT**

**Problem:**
- Kein Keyword für "arbeitszeit", "worktime", "horas"
- KI hat keinen Zugriff auf Arbeitszeiten-Daten
- Keine Funktion, die Arbeitszeiten lädt und in System Prompt einfügt

**Was fehlt:**
- Keyword-Handler: `handleWorktimeKeyword(userId, branchId)`
- Funktion: Lädt aktuelle Arbeitszeit, letzte Arbeitszeiten, Überstunden
- Oder: Context-Generierung, die Arbeitszeiten in System Prompt einfügt

**Aktueller Stand:**
- WorkTime-Model existiert
- Worktime-Controller existiert (für API)
- Aber: Keine Integration in WhatsApp Bot

---

### 3. "welche cerebro artikel gibt es zu notfällen" / Cerebro-Integration
**Status:** ❌ **NICHT IMPLEMENTIERT**

**Problem:**
- KI hat keinen Zugriff auf Cerebro-Artikel
- Keine Funktion, die Cerebro-Artikel lädt (mit Berechtigungen)
- Keine Context-Injection für Cerebro-Inhalte

**Was fehlt:**
- Funktion: `getCerebroContentForUser(userId, roleId, branchId)`
- Berechtigungsprüfung via `checkUserPermission()`
- Context-Generierung, die Cerebro-Artikel in System Prompt einfügt

**Aktueller Stand:**
- Cerebro-Model existiert
- Berechtigungssystem existiert (`checkUserPermission()`)
- Aber: Keine Integration in WhatsApp Bot

---

### 4. Context-Generierung für KI
**Status:** ❌ **NICHT IMPLEMENTIERT**

**Problem:**
- `buildSystemPrompt()` fügt nur `conversationContext` hinzu (JSON)
- Keine dynamische Context-Generierung
- Keine Funktion, die User-Daten, Arbeitszeiten, Cerebro-Artikel lädt

**Was fehlt:**
- Funktion: `buildUserContext(userId, branchId)`
- Lädt:
  - User-Informationen (Name, Email, Rollen)
  - Offene Requests (mit Berechtigung)
  - Offene Tasks (mit Berechtigung)
  - Aktuelle Arbeitszeit
  - Cerebro-Artikel (mit Berechtigung)
- Fügt in System Prompt ein

**Aktueller Stand:**
- `buildSystemPrompt()` existiert
- `conversationContext` wird übergeben
- Aber: Keine dynamische Context-Generierung

---

## 📊 Zusammenfassung

### ✅ Funktioniert:
- Keywords "requests" und "todos" (direkte Antworten)
- User-Identifikation (für Keywords)

### ❌ Funktioniert NICHT:
- "wer bin ich" - Kein Keyword, keine Context-Generierung
- "wie lange habe ich heute gearbeitet" - Kein Keyword, keine Context-Generierung
- "welche cerebro artikel gibt es zu notfällen" - Keine Cerebro-Integration
- Context-Generierung für KI - Keine Implementierung

### ⚠️ Problem:
Die KI kann aktuell **NICHT** auf folgende Informationen zugreifen:
- User-Details (Name, Email, Rollen)
- Arbeitszeiten
- Cerebro-Artikel
- Requests/Tasks (nur über Keywords, nicht über KI)

**Ausnahme:** Keywords "requests" und "todos" funktionieren direkt.

---

## 🔍 Detaillierte Analyse

### 1. System Prompt aktuell

**Code:** `backend/src/services/whatsappAiService.ts` - `buildSystemPrompt()`

**Was wird hinzugefügt:**
- System Prompt aus Konfiguration
- Regeln
- Quellen (URLs)
- Conversation Context (nur JSON mit `userId` und `conversationState`)

**Was fehlt:**
- User-Informationen
- Arbeitszeiten
- Cerebro-Artikel
- Requests/Tasks (außer über Keywords)

### 2. Conversation Context aktuell

**Code:** `backend/src/services/whatsappMessageHandler.ts` - Zeile 108

```typescript
{ userId: user?.id, conversationState: conversation.state, groupId: groupId }
```

**Enthält:**
- `userId` - Nur die ID, keine Details
- `conversationState` - Aktueller State
- `groupId` - Group ID (für Gruppen)

**Fehlt:**
- User-Details (Name, Email, Rollen)
- Arbeitszeiten
- Cerebro-Artikel
- Requests/Tasks

### 3. Keywords aktuell

**Code:** `backend/src/services/whatsappMessageHandler.ts` - Zeilen 55-91

**Vorhanden:**
- "requests" → `handleRequestsKeyword()`
- "todos" → `handleTodosKeyword()`
- "request" → `startRequestCreation()`
- "todo" → `startTaskCreation()`
- "code", "código", etc. → `handleGuestCodeRequest()`

**Fehlt:**
- "wer bin ich" / "who am I"
- "arbeitszeit" / "worktime" / "horas"
- Keine Cerebro-Keywords

---

## 🎯 Was muss implementiert werden

### Option 1: Keywords erweitern
- Keyword "wer bin ich" → Handler, der User-Info zurückgibt
- Keyword "arbeitszeit" → Handler, der Arbeitszeiten zurückgibt
- Keyword "cerebro" → Handler, der Cerebro-Artikel zurückgibt

**Vorteil:** Direkte Antworten, schnell
**Nachteil:** Nur für spezifische Keywords, nicht flexibel

### Option 2: Context-Generierung (Empfohlen)
- Funktion `buildUserContext(userId, branchId)` erstellen
- Lädt alle relevanten Daten (User, Arbeitszeiten, Cerebro, Requests, Tasks)
- Fügt in System Prompt ein
- KI kann dann auf alle Informationen zugreifen

**Vorteil:** Flexibel, KI kann alle Fragen beantworten
**Nachteil:** Mehr Implementierung, höhere Token-Kosten

### Option 3: Hybrid
- Keywords für direkte Antworten (schnell)
- Context-Generierung für KI (flexibel)

**Vorteil:** Beste aus beiden Welten
**Nachteil:** Mehr Code

---

## 📝 Empfehlung

**Implementiere Option 2 (Context-Generierung):**
1. Erstelle `buildUserContext(userId, branchId)`
2. Lädt User-Informationen, Arbeitszeiten, Cerebro-Artikel (mit Berechtigungen)
3. Fügt in System Prompt ein
4. KI kann dann alle Fragen beantworten

**Zusätzlich:** Optionale Keywords für schnelle Antworten:
- "wer bin ich" → Direkte Antwort
- "arbeitszeit" → Direkte Antwort

---

## ✅ Fazit

**Aktueller Stand:**
- ✅ Keywords "requests" und "todos" funktionieren
- ❌ Alle anderen Funktionen fehlen
- ❌ KI hat keinen Zugriff auf User-Daten, Arbeitszeiten, Cerebro-Artikel

**Benötigt:**
- Context-Generierung für KI
- Optional: Zusätzliche Keywords

