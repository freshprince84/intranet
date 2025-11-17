# Country-Feld Korrektur - Analyse & Plan

## Problemstellung

Das Country-Feld wurde an falscher Stelle platziert:
- ❌ **FALSCH**: Country bei Position 4 (nach Dokumenten-Upload, editierbar)
- ❌ **FALSCH**: Country bei Position 6 (bei Birthday, editierbar)
- ✅ **RICHTIG**: Country soll bei ID-Dokument-Daten sein (readonly, wie die anderen ID-Felder)

## Aktuelle Implementierung - Analyse

### Backend - KI-Erkennung (✅ Bereits implementiert)

**Datei:** `backend/src/controllers/identificationDocumentController.ts`

**Zeile 130:** System Prompt für KI:
```
"issuingCountry, issuingAuthority, firstName, lastName, birthday..."
```
→ KI erkennt `issuingCountry` ✅

**Zeile 182-209:** Country wird aus issuingCountry gesetzt:
```typescript
// Setze country aus issuingCountry (falls vorhanden)
const countryToMap = recognizedData.issuingCountry || issuingCountry;
if (countryToMap) {
  const countryMapping: Record<string, string> = {
    'Colombia': 'CO',
    'Switzerland': 'CH',
    // ...
  };
  const mappedCountry = countryMapping[issuingCountryStr] || issuingCountryStr.toUpperCase();
  if (['CO', 'CH', 'DE', 'AT'].includes(mappedCountry)) {
    userUpdateData.country = mappedCountry; // ✅ Wird gesetzt
  }
}
```
→ **Country wird automatisch aus issuingCountry gesetzt** ✅

### Frontend - Aktuelle Anzeige

**Datei:** `frontend/src/pages/Profile.tsx`

**Position 4 (Zeile 477-496):** ❌ Country-Feld nach Dokumenten-Upload (editierbar)
```tsx
{/* 4. Country (allein - 1 Spalte, unter Dokumenten-Upload, automatisch erkannt) */}
<div>
  <select name="country" ...> // ❌ Editierbar
```

**Position 6 (Zeile 542-560):** ❌ Country-Feld bei Birthday (editierbar)
```tsx
{/* 6. Birthday, Country (nebeneinander - 2 Spalten, Country nochmal für manuelle Korrektur) */}
<div>
  <select name="country" ...> // ❌ Editierbar
```

**Position 7 (Zeile 562-656):** ID-Dokument-Daten (readonly)
- ✅ documentType (readonly)
- ✅ documentNumber (readonly)
- ✅ issuingCountry (readonly) - zeigt `latestDoc.issuingCountry`
- ✅ issueDate (readonly)
- ✅ expiryDate (readonly)
- ✅ issuingAuthority (readonly)
- ❌ **FEHLT**: Country (readonly) - soll `user.country` zeigen

### UserManagementTab.tsx

Gleiche Struktur wie Profile.tsx - muss ebenfalls angepasst werden.

## Gewünschte Lösung

### Country-Feld bei ID-Dokument-Daten

**Position:** Bei den ID-Dokument-Daten (readonly, wie die anderen)

**Anzeige:**
- Label: "Land" / "Country"
- Wert: `user.country` (nicht `latestDoc.issuingCountry`)
- Format: Country-Code (CO, CH, DE, AT) → Anzeige als Country-Name
- Stil: readonly (wie die anderen ID-Felder)

**Befüllung:**
- Automatisch von KI aus `issuingCountry` → `user.country`
- Backend setzt bereits `user.country` aus `issuingCountry` ✅

## Zu implementierende Änderungen

### 1. Profile.tsx

**Zu entfernen:**
- ❌ Country-Feld bei Position 4 (nach Dokumenten-Upload)
- ❌ Country-Feld bei Position 6 (bei Birthday)

**Hinzuzufügen:**
- ✅ Country-Feld bei ID-Dokument-Daten (Position 7, readonly)
  - Zeigt `user.country`
  - Formatiert als Country-Name (nicht Code)
  - readonly wie die anderen ID-Felder

**Code-Struktur:**
```tsx
{/* 7. ID-Dokument-Daten (readonly, alle Felder) */}
{user.identificationDocuments && user.identificationDocuments.length > 0 && (
  <>
    {/* documentType */}
    {/* documentNumber */}
    {/* issuingCountry */}
    {/* country - NEU HINZUFÜGEN */}
    <div>
      <label>Land</label>
      <input
        value={user.country ? COUNTRIES.find(c => c.code === user.country)?.name || user.country : '-'}
        readOnly
        disabled
        className="bg-gray-100 dark:bg-gray-800"
      />
    </div>
    {/* issueDate */}
    {/* expiryDate */}
    {/* issuingAuthority */}
  </>
)}
```

### 2. UserManagementTab.tsx

**Gleiche Änderungen wie Profile.tsx:**
- ❌ Country-Feld entfernen (Position 4 und 6)
- ✅ Country-Feld zu ID-Dokument-Daten hinzufügen (readonly)

### 3. Backend - Prüfung

**Status:** ✅ Bereits korrekt implementiert
- KI erkennt `issuingCountry` ✅
- Backend setzt `user.country` aus `issuingCountry` ✅
- Mapping funktioniert (Colombia → CO, etc.) ✅

**Keine Änderungen nötig!**

## Implementierungsreihenfolge

1. **Profile.tsx anpassen**
   - Country-Feld bei Position 4 entfernen
   - Country-Feld bei Position 6 entfernen
   - Country-Feld zu ID-Dokument-Daten hinzufügen (readonly)

2. **UserManagementTab.tsx anpassen**
   - Gleiche Änderungen wie Profile.tsx

3. **Testing**
   - Dokument hochladen → Country wird automatisch gesetzt
   - Country erscheint bei ID-Dokument-Daten (readonly)
   - Keine editierbaren Country-Felder mehr vorhanden

## Offene Fragen

**Keine** - alles ist klar definiert.

