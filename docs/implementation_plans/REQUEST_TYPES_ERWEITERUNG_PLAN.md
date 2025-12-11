# Plan: Request Types Erweiterung mit Due Date Logik

## Übersicht

Erweiterung der Request Types um 4 neue Types und Implementierung einer intelligenten Due Date Logik, die basierend auf dem Request Type automatisch das Mindestdatum und Voreinstellung setzt.

---

## Neue Request Types

### Zu hinzufügende Types:
1. **event** - "Evento" (Event)
2. **permit** - "Permiso" (Erlaubnis/Genehmigung)
3. **buy_order** - "Pedido de venta" (Kaufauftrag)
4. **repair** - "Reparacion" (Reparatur)

### Due Date Regeln pro Type:

| Type | Voreinstellung | Mindestdatum |
|------|---------------|--------------|
| `vacation` | +1 Monat | +1 Monat |
| `improvement_suggestion` | +1 Woche | +1 Woche |
| `sick_leave` | +1 Woche | +1 Woche |
| `employment_certificate` | +1 Woche | +1 Woche |
| `other` | +1 Woche | +1 Woche |
| `event` | +1 Monat | +1 Monat |
| `permit` | +1 Monat | +1 Monat |
| `buy_order` | Heute | Heute |
| `repair` | Heute | Heute |

### Dropdown-Reihenfolge:

1. event
2. repair
3. improvement_suggestion
4. buy_order
5. employment_certificate
6. vacation
7. permit
8. sick_leave
9. other

---

## Implementierungsschritte

### 1. Backend: Prisma Schema erweitern

**Datei:** `backend/prisma/schema.prisma`

**Änderung:** RequestType Enum erweitern

**Aktueller Zustand:**
```prisma
enum RequestType {
  vacation
  improvement_suggestion
  sick_leave
  employment_certificate
  other
}
```

**Soll-Zustand:**
```prisma
enum RequestType {
  vacation
  improvement_suggestion
  sick_leave
  employment_certificate
  event
  permit
  buy_order
  repair
  other
}
```

**Hinweis:** Reihenfolge im Enum ist nicht relevant, da die Frontend-Reihenfolge separat definiert wird.

**Migration:** 
- Neue Migration erstellen: `npx prisma migrate dev --name add_request_types_event_permit_buy_order_repair`
- Migration auf Produktivserver anwenden

---

### 2. Frontend: Übersetzungen hinzufügen

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Änderung:** Neue Types zu `requests.types` hinzufügen

**Aktueller Zustand (de.json):**
```json
"types": {
  "vacation": "Ferienantrag",
  "improvement_suggestion": "Verbesserungsvorschlag",
  "sick_leave": "Krankmeldung",
  "employment_certificate": "Arbeitszeugnis",
  "other": "Sonstiges"
}
```

**Soll-Zustand (de.json):**
```json
"types": {
  "vacation": "Ferienantrag",
  "improvement_suggestion": "Verbesserungsvorschlag",
  "sick_leave": "Krankmeldung",
  "employment_certificate": "Arbeitszeugnis",
  "event": "Evento",
  "permit": "Permiso",
  "buy_order": "Pedido de venta",
  "repair": "Reparacion",
  "other": "Sonstiges"
}
```

**Soll-Zustand (en.json):**
```json
"types": {
  "vacation": "Vacation Request",
  "improvement_suggestion": "Improvement Suggestion",
  "sick_leave": "Sick Leave",
  "employment_certificate": "Employment Certificate",
  "event": "Event",
  "permit": "Permit",
  "buy_order": "Purchase Order",
  "repair": "Repair",
  "other": "Other"
}
```

**Soll-Zustand (es.json):**
```json
"types": {
  "vacation": "Solicitud de Vacaciones",
  "improvement_suggestion": "Sugerencia de Mejora",
  "sick_leave": "Baja por Enfermedad",
  "employment_certificate": "Certificado de Trabajo",
  "event": "Evento",
  "permit": "Permiso",
  "buy_order": "Pedido de venta",
  "repair": "Reparacion",
  "other": "Otro"
}
```

---

### 3. Frontend: Helper-Funktionen für Due Date Logik

**Datei:** `frontend/src/components/CreateRequestModal.tsx` (und `EditRequestModal.tsx`)

**Neue Funktionen hinzufügen:**

```typescript
// Berechnet das Mindestdatum basierend auf Request Type
const getMinDateForType = (type: string): string => {
  const today = new Date();
  const minDate = new Date(today);
  
  switch (type) {
    case 'vacation':
    case 'event':
    case 'permit':
      // +1 Monat
      minDate.setMonth(minDate.getMonth() + 1);
      break;
    case 'improvement_suggestion':
    case 'sick_leave':
    case 'employment_certificate':
    case 'other':
      // +1 Woche
      minDate.setDate(minDate.getDate() + 7);
      break;
    case 'buy_order':
    case 'repair':
      // Heute
      break;
    default:
      // Default: +1 Woche
      minDate.setDate(minDate.getDate() + 7);
  }
  
  return minDate.toISOString().split('T')[0];
};

// Berechnet das Voreingestellte Datum basierend auf Request Type
const getDefaultDateForType = (type: string): string => {
  return getMinDateForType(type); // Gleiche Logik wie Mindestdatum
};
```

**Hinweis:** Diese Funktionen sollten außerhalb der Komponente definiert werden (vor der Komponente).

---

### 4. Frontend: CreateRequestModal anpassen

**Datei:** `frontend/src/components/CreateRequestModal.tsx`

#### 4.1 TypeScript Type erweitern

**Aktueller Zustand (Zeile 110):**
```typescript
type: 'other' as 'vacation' | 'improvement_suggestion' | 'sick_leave' | 'employment_certificate' | 'other',
```

**Soll-Zustand:**
```typescript
type: 'other' as 'vacation' | 'improvement_suggestion' | 'sick_leave' | 'employment_certificate' | 'event' | 'permit' | 'buy_order' | 'repair' | 'other',
```

#### 4.2 Due Date Initialisierung anpassen

**Aktueller Zustand (Zeile 170-177):**
```typescript
// 3. Fälligkeitsdatum: Datum "jetzt + 2 Wochen"
const twoWeeksFromNow = new Date();
twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
const formattedDate = twoWeeksFromNow.toISOString().split('T')[0]; // Format: YYYY-MM-DD
setFormData(prevData => ({ 
  ...prevData, 
  due_date: formattedDate 
}));
```

**Soll-Zustand:**
```typescript
// 3. Fälligkeitsdatum: Basierend auf Type (wird später beim Type-Change auch aktualisiert)
const defaultDate = getDefaultDateForType(formData.type);
setFormData(prevData => ({ 
  ...prevData, 
  due_date: defaultDate 
}));
```

#### 4.3 Type-Change Handler hinzufügen

**Neue Funktion hinzufügen:**
```typescript
const handleTypeChange = (newType: string) => {
  const newMinDate = getMinDateForType(newType);
  const newDefaultDate = getDefaultDateForType(newType);
  
  setFormData(prevData => {
    // Wenn aktuelles due_date vor dem neuen Mindestdatum liegt, setze auf neues Default-Datum
    const currentDate = prevData.due_date ? new Date(prevData.due_date) : null;
    const minDate = new Date(newMinDate);
    
    const dueDate = (currentDate && currentDate >= minDate) 
      ? prevData.due_date 
      : newDefaultDate;
    
    return {
      ...prevData,
      type: newType as any,
      due_date: dueDate
    };
  });
};
```

#### 4.4 Dropdown-Reihenfolge anpassen

**Aktueller Zustand (Zeile 690-694):**
```typescript
<option value="vacation">{t('requests.types.vacation')}</option>
<option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
<option value="sick_leave">{t('requests.types.sick_leave')}</option>
<option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
<option value="other">{t('requests.types.other')}</option>
```

**Soll-Zustand (beide Stellen: Zeile 690-694 und 920-924):**
```typescript
<option value="event">{t('requests.types.event')}</option>
<option value="repair">{t('requests.types.repair')}</option>
<option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
<option value="buy_order">{t('requests.types.buy_order')}</option>
<option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
<option value="vacation">{t('requests.types.vacation')}</option>
<option value="permit">{t('requests.types.permit')}</option>
<option value="sick_leave">{t('requests.types.sick_leave')}</option>
<option value="other">{t('requests.types.other')}</option>
```

**onChange Handler anpassen:**
```typescript
onChange={(e) => handleTypeChange(e.target.value)}
```

#### 4.5 Due Date Input mit min-Attribut

**Aktueller Zustand (Zeile 700-705):**
```typescript
<input
  type="date"
  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
  value={formData.due_date}
  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
/>
```

**Soll-Zustand (beide Stellen: Zeile 700-705 und 930-935):**
```typescript
<input
  type="date"
  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm"
  value={formData.due_date}
  min={getMinDateForType(formData.type)}
  onChange={(e) => {
    const selectedDate = e.target.value;
    const minDate = getMinDateForType(formData.type);
    // Validierung: Datum darf nicht vor Mindestdatum liegen
    if (selectedDate && selectedDate < minDate) {
      // Setze auf Mindestdatum falls ungültig
      setFormData({ ...formData, due_date: minDate });
    } else {
      setFormData({ ...formData, due_date: selectedDate });
    }
  }}
/>
```

---

### 5. Frontend: EditRequestModal anpassen

**Datei:** `frontend/src/components/EditRequestModal.tsx`

#### 5.1 TypeScript Type erweitern

**Aktueller Zustand (Zeile 146):**
```typescript
const [type, setType] = useState<'vacation' | 'improvement_suggestion' | 'sick_leave' | 'employment_certificate' | 'other'>(request.type || 'other');
```

**Soll-Zustand:**
```typescript
const [type, setType] = useState<'vacation' | 'improvement_suggestion' | 'sick_leave' | 'employment_certificate' | 'event' | 'permit' | 'buy_order' | 'repair' | 'other'>(request.type || 'other');
```

#### 5.2 Type-Change Handler hinzufügen

**Neue Funktion hinzufügen (ähnlich wie in CreateRequestModal):**
```typescript
const handleTypeChange = (newType: string) => {
  const newMinDate = getMinDateForType(newType);
  const newDefaultDate = getDefaultDateForType(newType);
  
  setType(newType as any);
  
  // Wenn aktuelles dueDate vor dem neuen Mindestdatum liegt, setze auf neues Default-Datum
  const currentDate = dueDate ? new Date(dueDate) : null;
  const minDate = new Date(newMinDate);
  
  if (!currentDate || currentDate < minDate) {
    setDueDate(newDefaultDate);
  }
};
```

#### 5.3 Dropdown-Reihenfolge anpassen

**Aktueller Zustand (Zeile 965-969):**
```typescript
<option value="vacation">{t('requests.types.vacation')}</option>
<option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
<option value="sick_leave">{t('requests.types.sick_leave')}</option>
<option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
<option value="other">{t('requests.types.other')}</option>
```

**Soll-Zustand:**
```typescript
<option value="event">{t('requests.types.event')}</option>
<option value="repair">{t('requests.types.repair')}</option>
<option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
<option value="buy_order">{t('requests.types.buy_order')}</option>
<option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
<option value="vacation">{t('requests.types.vacation')}</option>
<option value="permit">{t('requests.types.permit')}</option>
<option value="sick_leave">{t('requests.types.sick_leave')}</option>
<option value="other">{t('requests.types.other')}</option>
```

**onChange Handler anpassen:**
```typescript
onChange={(e) => handleTypeChange(e.target.value)}
```

#### 5.4 Due Date Input mit min-Attribut

**Aktueller Zustand (Zeile 975-980):**
```typescript
<input
  type="date"
  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
  value={dueDate}
  onChange={(e) => setDueDate(e.target.value)}
/>
```

**Soll-Zustand:**
```typescript
<input
  type="date"
  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
  value={dueDate}
  min={getMinDateForType(type)}
  onChange={(e) => {
    const selectedDate = e.target.value;
    const minDate = getMinDateForType(type);
    // Validierung: Datum darf nicht vor Mindestdatum liegen
    if (selectedDate && selectedDate < minDate) {
      // Setze auf Mindestdatum falls ungültig
      setDueDate(minDate);
    } else {
      setDueDate(selectedDate);
    }
  }}
/>
```

#### 5.5 Helper-Funktionen importieren

Die Helper-Funktionen `getMinDateForType` und `getDefaultDateForType` müssen auch hier verfügbar sein. Entweder:
- In eine separate Utility-Datei auslagern (empfohlen)
- Oder in beiden Dateien duplizieren

**Empfehlung:** Neue Datei `frontend/src/utils/requestDateHelpers.ts` erstellen.

---

### 6. Frontend: Requests.tsx - Icons hinzufügen

**Datei:** `frontend/src/components/Requests.tsx`

**Aktueller Zustand (Zeile 47-61):**
```typescript
const getRequestTypeIcon = (type?: string): string => {
  switch (type) {
    case 'vacation':
      return '🏖️';
    case 'improvement_suggestion':
      return '💡';
    case 'sick_leave':
      return '🤒';
    case 'employment_certificate':
      return '📄';
    case 'other':
    default:
      return '📝';
  }
};
```

**Soll-Zustand:**
```typescript
const getRequestTypeIcon = (type?: string): string => {
  switch (type) {
    case 'vacation':
      return '🏖️';
    case 'improvement_suggestion':
      return '💡';
    case 'sick_leave':
      return '🤒';
    case 'employment_certificate':
      return '📄';
    case 'event':
      return '📅';
    case 'permit':
      return '📋';
    case 'buy_order':
      return '🛒';
    case 'repair':
      return '🔧';
    case 'other':
    default:
      return '📝';
  }
};
```

---

### 7. Frontend: FilterRow.tsx - Filter-Dropdown erweitern

**Datei:** `frontend/src/components/FilterRow.tsx`

**Aktueller Zustand (Zeile 398-402):**
```typescript
<option value="vacation">{t('requests.types.vacation')}</option>
<option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
<option value="sick_leave">{t('requests.types.sick_leave')}</option>
<option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
<option value="other">{t('requests.types.other')}</option>
```

**Soll-Zustand:**
```typescript
<option value="event">{t('requests.types.event')}</option>
<option value="repair">{t('requests.types.repair')}</option>
<option value="improvement_suggestion">{t('requests.types.improvement_suggestion')}</option>
<option value="buy_order">{t('requests.types.buy_order')}</option>
<option value="employment_certificate">{t('requests.types.employment_certificate')}</option>
<option value="vacation">{t('requests.types.vacation')}</option>
<option value="permit">{t('requests.types.permit')}</option>
<option value="sick_leave">{t('requests.types.sick_leave')}</option>
<option value="other">{t('requests.types.other')}</option>
```

---

### 8. Frontend: Utility-Datei für Date-Helpers erstellen

**Neue Datei:** `frontend/src/utils/requestDateHelpers.ts`

**Inhalt:**
```typescript
/**
 * Berechnet das Mindestdatum für due_date basierend auf Request Type
 * @param type - Der Request Type
 * @returns Datum im Format YYYY-MM-DD
 */
export const getMinDateForType = (type: string): string => {
  const today = new Date();
  const minDate = new Date(today);
  
  switch (type) {
    case 'vacation':
    case 'event':
    case 'permit':
      // +1 Monat
      minDate.setMonth(minDate.getMonth() + 1);
      break;
    case 'improvement_suggestion':
    case 'sick_leave':
    case 'employment_certificate':
    case 'other':
      // +1 Woche
      minDate.setDate(minDate.getDate() + 7);
      break;
    case 'buy_order':
    case 'repair':
      // Heute (keine Änderung)
      break;
    default:
      // Default: +1 Woche
      minDate.setDate(minDate.getDate() + 7);
  }
  
  return minDate.toISOString().split('T')[0];
};

/**
 * Berechnet das Voreingestellte Datum für due_date basierend auf Request Type
 * @param type - Der Request Type
 * @returns Datum im Format YYYY-MM-DD
 */
export const getDefaultDateForType = (type: string): string => {
  return getMinDateForType(type); // Gleiche Logik wie Mindestdatum
};
```

**Import in CreateRequestModal.tsx und EditRequestModal.tsx:**
```typescript
import { getMinDateForType, getDefaultDateForType } from '../../utils/requestDateHelpers';
```

---

### 9. Backend: TypeScript Types aktualisieren (optional)

**Datei:** `backend/src/controllers/requestController.ts`

**Prüfen:** Ob TypeScript-Interfaces für RequestType erweitert werden müssen. Prisma generiert diese automatisch, daher sollte keine manuelle Änderung nötig sein.

---

### 10. Mobile App: Types aktualisieren (optional)

**Datei:** `IntranetMobileApp/src/types/index.ts`

**Hinweis:** Die Mobile App scheint ein eigenes RequestType Enum zu haben (Zeile 67-72), das nicht mit dem Backend übereinstimmt. Dies sollte separat geprüft und ggf. synchronisiert werden.

**Aktueller Zustand:**
```typescript
export enum RequestType {
  vacation = 'vacation',
  sick = 'sick',
  equipment = 'equipment',
  training = 'training',
  other = 'other'
}
```

**Hinweis:** Dies ist ein separates Thema und sollte in einem eigenen Plan behandelt werden, da die Mobile App offenbar andere Types verwendet.

---

## Implementierungsreihenfolge

1. **Backend:**
   - Prisma Schema erweitern
   - Migration erstellen und testen

2. **Frontend: Utility-Datei:**
   - `requestDateHelpers.ts` erstellen

3. **Frontend: Übersetzungen:**
   - Alle 3 Sprachdateien aktualisieren

4. **Frontend: CreateRequestModal:**
   - Type erweitern
   - Helper-Funktionen importieren
   - Type-Change Handler hinzufügen
   - Dropdown-Reihenfolge anpassen
   - Due Date Input mit min-Attribut

5. **Frontend: EditRequestModal:**
   - Type erweitern
   - Helper-Funktionen importieren
   - Type-Change Handler hinzufügen
   - Dropdown-Reihenfolge anpassen
   - Due Date Input mit min-Attribut

6. **Frontend: Requests.tsx:**
   - Icons für neue Types hinzufügen

7. **Frontend: FilterRow.tsx:**
   - Filter-Dropdown erweitern

8. **Testing:**
   - Alle neuen Types testen
   - Due Date Logik testen
   - Type-Wechsel testen
   - Mindestdatum-Validierung testen

---

## Test-Checkliste

- [ ] Alle 4 neuen Types sind im Prisma Schema vorhanden
- [ ] Migration erfolgreich durchgeführt
- [ ] Übersetzungen für alle 3 Sprachen vorhanden
- [ ] CreateRequestModal: Neue Types im Dropdown in korrekter Reihenfolge
- [ ] CreateRequestModal: Due Date wird basierend auf Type voreingestellt
- [ ] CreateRequestModal: Due Date Mindestdatum wird basierend auf Type gesetzt
- [ ] CreateRequestModal: Type-Wechsel aktualisiert Due Date korrekt
- [ ] CreateRequestModal: Datum vor Mindestdatum kann nicht ausgewählt werden
- [ ] EditRequestModal: Neue Types im Dropdown in korrekter Reihenfolge
- [ ] EditRequestModal: Due Date Mindestdatum wird basierend auf Type gesetzt
- [ ] EditRequestModal: Type-Wechsel aktualisiert Due Date korrekt
- [ ] EditRequestModal: Datum vor Mindestdatum kann nicht ausgewählt werden
- [ ] Requests.tsx: Icons für neue Types werden korrekt angezeigt
- [ ] FilterRow.tsx: Neue Types im Filter-Dropdown in korrekter Reihenfolge
- [ ] Alle Due Date Regeln funktionieren korrekt:
  - [ ] vacation: +1 Monat
  - [ ] improvement_suggestion: +1 Woche
  - [ ] sick_leave: +1 Woche
  - [ ] employment_certificate: +1 Woche
  - [ ] other: +1 Woche
  - [ ] event: +1 Monat
  - [ ] permit: +1 Monat
  - [ ] buy_order: Heute
  - [ ] repair: Heute

---

## Wichtige Hinweise

1. **Migration:** Die Prisma Migration muss auf dem Produktivserver angewendet werden. Vorher mit dem Benutzer absprechen.

2. **Type-Wechsel:** Wenn ein User den Type ändert und das aktuelle Due Date vor dem neuen Mindestdatum liegt, wird automatisch das neue Default-Datum gesetzt.

3. **Browser-Validierung:** Das `min` Attribut im date input verhindert die Auswahl von Daten vor dem Mindestdatum im Browser-UI, zusätzlich wird im onChange Handler validiert.

4. **Reihenfolge:** Die Dropdown-Reihenfolge muss in allen 3 Stellen identisch sein:
   - CreateRequestModal (2x: Desktop & Mobile)
   - EditRequestModal
   - FilterRow

5. **Icons:** Die Icons sind Vorschläge und können bei Bedarf angepasst werden:
   - event: 📅
   - permit: 📋
   - buy_order: 🛒
   - repair: 🔧

---

## Offene Fragen / Klärungsbedarf

1. **Mobile App:** Die Mobile App hat ein anderes RequestType Enum. Soll dies synchronisiert werden? (Separates Thema)

2. **Icons:** Sind die vorgeschlagenen Icons in Ordnung oder sollen andere verwendet werden?

3. **Validierung:** Soll beim Speichern zusätzlich im Backend validiert werden, dass das Due Date nicht vor dem Mindestdatum liegt?

