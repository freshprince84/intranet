# WhatsApp Bot Touren-Probleme - Detaillierter Behebungsplan

**Datum:** 2025-01-26  
**Status:** Planung  
**Ziel:** Behebung der identifizierten Probleme ohne Beeinflussung der Gesamtfunktionalität

---

## 📋 Identifizierte Probleme

### Problem 1: Bot erkennt "Guatapé" nicht als Tour-Name
**Symptom:** User sagt "Guatapé" → Bot antwortet generisch statt Touren zu suchen  
**Ursache:** `get_tours()` hat keinen Suchparameter für Tour-Namen

### Problem 2: Bot verwechselt Tour-Buchung mit Hotel-Reservierung
**Symptom:** User sagt "ich will die 2. buchen" → Bot fragt nach Check-in/Check-out statt Tour-Datum  
**Ursache:** System Prompt unterscheidet nicht klar genug zwischen Tour-Datum und Check-in/Check-out

### Problem 3: Bot nutzt `get_tours()` nicht automatisch bei "reservar un tour"
**Symptom:** User sagt "Quisiera reservar un tour" → Bot fragt nach Tour-Name statt erst Touren zu zeigen  
**Ursache:** System Prompt gibt keine klare Anweisung für diesen Fall

### Problem 4: Bot erkennt Intent nicht korrekt
**Symptom:** Bot versteht nicht, dass "Guatapé" ein Tour-Name ist  
**Ursache:** Keine Suchfunktion in `get_tours()`

---

## 🔧 Detaillierter Behebungsplan

### Phase 1: `get_tours()` erweitern um Suchfunktion

#### Schritt 1.1: Function Definition erweitern
**Datei:** `backend/src/services/whatsappAiService.ts`  
**Zeile:** ~439-463 (get_tours Function Definition)

**Änderung:**
- Neuen Parameter `search` oder `title` hinzufügen
- Beschreibung: "Suchbegriff für Tour-Titel oder -Beschreibung (optional)"

**Vorher:**
```typescript
properties: {
  type: { ... },
  availableFrom: { ... },
  availableTo: { ... },
  limit: { ... }
}
```

**Nachher:**
```typescript
properties: {
  type: { ... },
  availableFrom: { ... },
  availableTo: { ... },
  limit: { ... },
  search: {
    type: 'string',
    description: 'Suchbegriff für Tour-Titel oder -Beschreibung (optional). Verwende diesen Parameter wenn der User einen Tour-Namen oder Ort nennt (z.B. "Guatapé", "Medellín", "Tour 1").'
  }
}
```

**Risiko:** ⚠️ NIEDRIG - Nur neuer optionaler Parameter, keine Breaking Changes

---

#### Schritt 1.2: Function Handler erweitern
**Datei:** `backend/src/services/whatsappFunctionHandlers.ts`  
**Zeile:** ~696-755 (get_tours Handler)

**Änderung:**
- Suchlogik hinzufügen: Wenn `args.search` vorhanden, filtere nach `title` oder `description` (case-insensitive)

**Vorher:**
```typescript
const where: any = {
  isActive: true,
  OR: [
    { branchId: branchId },
    { branchId: null }
  ]
};
```

**Nachher:**
```typescript
const where: any = {
  isActive: true,
  OR: [
    { branchId: branchId },
    { branchId: null }
  ]
};

// Suchfilter (optional)
if (args.search && args.search.trim()) {
  const searchTerm = args.search.trim();
  // Kombiniere Branch-Filter UND Suchfilter mit AND
  where.AND = [
    {
      OR: [
        { branchId: branchId },
        { branchId: null }
      ]
    },
    {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { location: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }
  ];
  // Entferne das alte OR, da es jetzt in AND ist
  delete where.OR;
}
```

**WICHTIG:** 
- Wenn `search` vorhanden: Verwende `AND` mit Branch-Filter UND Suchfilter
- Wenn `search` NICHT vorhanden: Verwende `OR` für Branch-Filter (wie vorher)

**Risiko:** ⚠️ NIEDRIG - Nur Erweiterung der WHERE-Clause, keine Breaking Changes

---

### Phase 2: System Prompt erweitern

#### Schritt 2.1: Tour-Suchfunktion dokumentieren
**Datei:** `backend/src/services/whatsappAiService.ts`  
**Zeile:** ~651-656 (get_tours Beispiele im System Prompt)

**Änderung:**
- Beispiele für Suchfunktion hinzufügen

**Vorher:**
```typescript
prompt += '  Beispiele:\n';
prompt += '    - "welche touren gibt es?" → get_tours({})\n';
prompt += '    - "zeige mir alle touren" → get_tours({})\n';
prompt += '    - "¿qué tours tienen disponibles?" → get_tours({})\n';
```

**Nachher:**
```typescript
prompt += '  WICHTIG: Wenn der User einen Tour-Namen oder Ort nennt (z.B. "Guatapé", "Medellín", "Tour 1"), verwende den search-Parameter!\n';
prompt += '  Beispiele:\n';
prompt += '    - "welche touren gibt es?" → get_tours({})\n';
prompt += '    - "zeige mir alle touren" → get_tours({})\n';
prompt += '    - "¿qué tours tienen disponibles?" → get_tours({})\n';
prompt += '    - "Guatapé" → get_tours({ search: "Guatapé" })\n';
prompt += '    - "tours a Medellín" → get_tours({ search: "Medellín" })\n';
prompt += '    - "quiero reservar un tour a Guatapé" → get_tours({ search: "Guatapé" })\n';
```

**Risiko:** ✅ KEIN RISIKO - Nur Text-Erweiterung

---

#### Schritt 2.2: Tour-Buchung vs. Zimmer-Reservierung klarer unterscheiden
**Datei:** `backend/src/services/whatsappAiService.ts`  
**Zeile:** ~662-667 (book_tour Beispiele) und ~697-699 (Unterscheidungs-Regeln)

**Änderung:**
- Explizite Anweisung: Bei Tour-Buchung nach TOUR-DATUM fragen, NICHT nach Check-in/Check-out

**Vorher:**
```typescript
prompt += '\n- book_tour: Erstelle eine Tour-Buchung (tourId, tourDate, numberOfParticipants, customerName, customerPhone/customerEmail)\n';
prompt += '  WICHTIG: Verwende diese Function wenn der User eine Tour buchen möchte!\n';
prompt += '  WICHTIG: Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde)\n';
```

**Nachher:**
```typescript
prompt += '\n- book_tour: Erstelle eine Tour-Buchung (tourId, tourDate, numberOfParticipants, customerName, customerPhone/customerEmail)\n';
prompt += '  WICHTIG: Verwende diese Function wenn der User eine Tour buchen möchte!\n';
prompt += '  WICHTIG: Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde)\n';
prompt += '  WICHTIG: Bei Tour-Buchung fragst du nach TOUR-DATUM (tourDate), NICHT nach Check-in/Check-out!\n';
prompt += '  WICHTIG: Check-in/Check-out ist nur für ZIMMER-Reservierungen (create_room_reservation)!\n';
```

**Risiko:** ✅ KEIN RISIKO - Nur Text-Erweiterung

---

#### Schritt 2.3: "reservar un tour" Workflow dokumentieren
**Datei:** `backend/src/services/whatsappAiService.ts`  
**Zeile:** ~696-697 (Tour-Regeln)

**Änderung:**
- Anweisung hinzufügen: Wenn User "reservar un tour" sagt, zuerst get_tours() aufrufen

**Vorher:**
```typescript
prompt += '\nWICHTIG: Wenn der User nach Touren fragt, verwende IMMER get_tours oder get_tour_details!';
prompt += '\nWICHTIG: Wenn der User eine Tour buchen möchte, verwende IMMER book_tour!';
```

**Nachher:**
```typescript
prompt += '\nWICHTIG: Wenn der User nach Touren fragt, verwende IMMER get_tours oder get_tour_details!';
prompt += '\nWICHTIG: Wenn der User "reservar un tour", "tour buchen", "quiero reservar un tour" sagt, rufe ZUERST get_tours() auf, um verfügbare Touren zu zeigen!';
prompt += '\nWICHTIG: Wenn der User eine Tour buchen möchte (z.B. "ich will die 2. buchen" oder "quiero reservar la tour 2"), verwende IMMER book_tour!';
prompt += '\nWICHTIG: Bei book_tour fragst du nach TOUR-DATUM (tourDate), NICHT nach Check-in/Check-out!';
```

**Risiko:** ✅ KEIN RISIKO - Nur Text-Erweiterung

---

#### Schritt 2.4: Function Description für book_tour erweitern
**Datei:** `backend/src/services/whatsappAiService.ts`  
**Zeile:** ~485-521 (book_tour Function Definition)

**Änderung:**
- Description erweitern mit expliziter Anweisung zu tourDate

**Vorher:**
```typescript
description: 'Erstellt eine Tour-Reservation/Buchung. Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde). Wenn Zahlung nicht innerhalb der Frist erfolgt, wird die Buchung automatisch storniert. Benötigt: tourId, tourDate, numberOfParticipants, customerName, und mindestens eine Kontaktinformation (customerPhone oder customerEmail).',
```

**Nachher:**
```typescript
description: 'Erstellt eine Tour-Reservation/Buchung. Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde). Wenn Zahlung nicht innerhalb der Frist erfolgt, wird die Buchung automatisch storniert. Benötigt: tourId, tourDate (Datum der Tour, NICHT Check-in/Check-out!), numberOfParticipants, customerName, und mindestens eine Kontaktinformation (customerPhone oder customerEmail). WICHTIG: tourDate ist das Datum der Tour, nicht Check-in/Check-out!',
```

**Risiko:** ✅ KEIN RISIKO - Nur Text-Erweiterung

---

#### Schritt 2.5: tourDate Parameter Description erweitern
**Datei:** `backend/src/services/whatsappAiService.ts`  
**Zeile:** ~494-496 (tourDate Parameter)

**Änderung:**
- Description erweitern mit expliziter Abgrenzung zu Check-in/Check-out

**Vorher:**
```typescript
tourDate: {
  type: 'string',
  description: 'Datum der Tour (ISO-Format, z.B. "2025-01-27T10:00:00Z" oder "2025-01-27")'
},
```

**Nachher:**
```typescript
tourDate: {
  type: 'string',
  description: 'Datum der Tour (ISO-Format, z.B. "2025-01-27T10:00:00Z" oder "2025-01-27"). WICHTIG: Dies ist das TOUR-DATUM, NICHT Check-in/Check-out! Check-in/Check-out wird nur für Zimmer-Reservierungen verwendet!'
},
```

**Risiko:** ✅ KEIN RISIKO - Nur Text-Erweiterung

---

### Phase 3: Kontext-Erkennung verbessern

#### Schritt 3.1: System Prompt erweitern für Tour-Namen-Erkennung
**Datei:** `backend/src/services/whatsappAiService.ts`  
**Zeile:** ~696-705 (Tour-Regeln)

**Änderung:**
- Anweisung hinzufügen: Wenn User nur einen Namen/Ort sagt, prüfe ob es ein Tour-Name ist

**Vorher:**
```typescript
prompt += '\nWICHTIG: Wenn get_tours mehrere Touren zurückgibt, zeige ALLE Touren in der Antwort an!';
```

**Nachher:**
```typescript
prompt += '\nWICHTIG: Wenn get_tours mehrere Touren zurückgibt, zeige ALLE Touren in der Antwort an!';
prompt += '\nWICHTIG: Wenn der User nur einen Namen oder Ort sagt (z.B. "Guatapé", "Medellín"), prüfe ZUERST ob es ein Tour-Name ist mit get_tours({ search: "Name" })!';
prompt += '\nWICHTIG: Wenn get_tours() keine Ergebnisse liefert, dann kann es ein Zimmer-Name sein (verwende check_room_availability)!';
```

**Risiko:** ✅ KEIN RISIKO - Nur Text-Erweiterung

---

## 📊 Zusammenfassung der Änderungen

### Dateien die geändert werden müssen:

1. **`backend/src/services/whatsappAiService.ts`**
   - Function Definition `get_tours` erweitern (search-Parameter)
   - Function Definition `book_tour` erweitern (tourDate Description)
   - System Prompt erweitern (mehrere Stellen)

2. **`backend/src/services/whatsappFunctionHandlers.ts`**
   - `get_tours()` Handler erweitern (Suchlogik)

### Risiko-Bewertung:

- ✅ **KEIN RISIKO:** System Prompt Änderungen (nur Text)
- ⚠️ **NIEDRIGES RISIKO:** Function Definition Erweiterungen (nur neue optionale Parameter)
- ⚠️ **NIEDRIGES RISIKO:** Handler Erweiterungen (nur WHERE-Clause Erweiterung)

### Breaking Changes:

- ❌ **KEINE** - Alle Änderungen sind rückwärtskompatibel

### Test-Szenarien:

1. ✅ User sagt "Guatapé" → Bot ruft `get_tours({ search: "Guatapé" })` auf
2. ✅ User sagt "Quisiera reservar un tour" → Bot ruft `get_tours({})` auf
3. ✅ User sagt "ich will die 2. buchen" → Bot fragt nach Tour-Datum, nicht Check-in/Check-out
4. ✅ User sagt "reservar tour a Guatapé" → Bot ruft `get_tours({ search: "Guatapé" })` auf

---

## 🎯 Implementierungsreihenfolge

1. **Phase 1.1:** Function Definition erweitern (get_tours search-Parameter)
2. **Phase 1.2:** Function Handler erweitern (Suchlogik)
3. **Phase 2.1-2.5:** System Prompt erweitern (alle Stellen)
4. **Phase 3.1:** Kontext-Erkennung verbessern

**WICHTIG:** Alle Änderungen können parallel gemacht werden, da sie unabhängig sind!

---

## ✅ Erfolgskriterien

- [ ] Bot erkennt "Guatapé" als Tour-Name und ruft `get_tours({ search: "Guatapé" })` auf
- [ ] Bot ruft bei "reservar un tour" automatisch `get_tours({})` auf
- [ ] Bot fragt bei Tour-Buchung nach Tour-Datum, nicht Check-in/Check-out
- [ ] Bot unterscheidet klar zwischen Tour-Buchung und Zimmer-Reservierung
- [ ] Keine Regression bei bestehenden Funktionen (Zimmer-Buchung, etc.)

---

## 📝 Notizen

- Alle Änderungen sind rückwärtskompatibel
- Keine Datenbank-Änderungen erforderlich
- Keine Migration erforderlich
- Keine Frontend-Änderungen erforderlich
- Keine Breaking Changes

