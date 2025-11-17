# ID-Dokument-Felder - Korrigierte Analyse & Plan

## Problem-Erkenntnis

### ❌ Meine Fehler:
1. **Country-Feld kopiert statt verschoben** → erscheint jetzt 2x (Position 4 und 6)
2. **Nicht erkannt:** `issuingCountry` und `country` sind dasselbe!
   - Backend setzt: `user.country` aus `issuingCountry` (Zeile 206)
   - `latestDoc.issuingCountry` = roher Wert
   - `user.country` = gemappter Wert (CO, CH, DE, AT)
   - **→ Beide Felder müssen weg oder zu einem zusammengeführt werden!**
3. **Reihenfolge falsch** - nicht wie angefordert implementiert

---

## Korrekte Analyse

### Backend-Logik (identificationDocumentController.ts Zeile 182-209):

```
KI erkennt: issuingCountry (z.B. "Colombia")
    ↓
Backend mappt: "Colombia" → "CO"
    ↓
Backend setzt: user.country = "CO"
```

**Ergebnis:**
- `latestDoc.issuingCountry` = "Colombia" (roher Wert aus Dokument)
- `user.country` = "CO" (gemappter Code)
- **→ Sie repräsentieren dasselbe Land, nur unterschiedlich formatiert!**

---

## Aktuelle Situation im Frontend

### ❌ Falsch - Editierbare Country-Felder (müssen weg):

**Position 4 (Zeile 477-496):** Country-Feld nach Dokumenten-Upload
```tsx
{/* 4. Country (allein - 1 Spalte, unter Dokumenten-Upload, automatisch erkannt) */}
<select name="country" ...> // ❌ MUSS WEG
```

**Position 6 (Zeile 542-560):** Country-Feld bei Birthday
```tsx
{/* 6. Birthday, Country (nebeneinander - 2 Spalten, Country nochmal für manuelle Korrektur) */}
<select name="country" ...> // ❌ MUSS WEG
```

### ✅ Korrekt - ID-Dokument-Daten (muss angepasst werden):

**Position 7 (Zeile 562-656):** ID-Dokument-Daten
- ✅ Dokument-Typ (readonly)
- ✅ Dokument-Nummer (readonly)
- ❌ **issuingCountry** (readonly) - sollte "Land" heißen und `user.country` zeigen
- ✅ Ausstellungsdatum (readonly, wenn vorhanden)
- ✅ Ablaufdatum (readonly, wenn vorhanden)
- ❌ **Ausstellende Behörde** - wird nicht benötigt (sollte weg)

### ❌ Fehlt bei ID-Dokument-Daten:

- ❌ Vorname (readonly, zeigt `user.firstName`)
- ❌ Nachname (readonly, zeigt `user.lastName`)
- ❌ Geburtsdatum (readonly, zeigt `user.birthday`)
- ❌ Geschlecht (readonly, zeigt `user.gender`)

---

## Gewünschte Lösung

### Reihenfolge bei ID-Dokument-Daten (genau wie angefordert):

1. **Vorname** (readonly, `user.firstName`)
2. **Nachname** (readonly, `user.lastName`)
3. **Geburtsdatum** (readonly, `user.birthday`)
4. **Land** (readonly, `user.country` als Country-Name) ← **NICHT "Ausstellungsland"!**
5. **Geschlecht** (readonly, `user.gender`)
6. **Dokument-Typ** (readonly, `latestDoc.documentType`)
7. **Dokument-Nummer** (readonly, `user.identificationNumber || latestDoc.documentNumber`)
8. **Ausstellungsdatum** (readonly, `latestDoc.issueDate`, wenn vorhanden)
9. **Ablaufdatum** (readonly, `latestDoc.expiryDate`, wenn vorhanden)

**NICHT anzeigen:**
- ❌ Ausstellende Behörde (wird nicht benötigt)
- ❌ issuingCountry (wird durch "Land" ersetzt)

---

## Editierbare Felder (oben im Formular)

### Position 5: Vorname, Nachname (nebeneinander)
- ✅ Vorname (editierbar, `user.firstName`)
- ✅ Nachname (editierbar, `user.lastName`)

### Position 6: Geburtsdatum (allein, da Country weg ist)
- ✅ Geburtsdatum (editierbar, `user.birthday`)

### Position 8: Telefonnummer, Geschlecht (nebeneinander)
- ✅ Telefonnummer (editierbar, `user.phoneNumber`)
- ✅ Geschlecht (editierbar, `user.gender`)

**KEINE Country-Felder mehr oben!**

---

## Zu implementierende Änderungen

### 1. Profile.tsx

**Zu entfernen:**
- ❌ Country-Feld Position 4 (nach Dokumenten-Upload, Zeile 477-496)
- ❌ Country-Feld Position 6 (bei Birthday, Zeile 542-560)
- ❌ issuingCountry-Feld bei ID-Dokument-Daten (Zeile 595-606)
- ❌ Ausstellende Behörde bei ID-Dokument-Daten (Zeile 638-651)

**Hinzuzufügen bei ID-Dokument-Daten (Position 7):**
- ✅ Vorname (readonly, `user.firstName`)
- ✅ Nachname (readonly, `user.lastName`)
- ✅ Geburtsdatum (readonly, `user.birthday`)
- ✅ Land (readonly, `user.country` als Country-Name)
- ✅ Geschlecht (readonly, `user.gender`)

**Reihenfolge bei ID-Dokument-Daten:**
1. Vorname
2. Nachname
3. Geburtsdatum
4. Land
5. Geschlecht
6. Dokument-Typ
7. Dokument-Nummer
8. Ausstellungsdatum (wenn vorhanden)
9. Ablaufdatum (wenn vorhanden)

**Anpassen:**
- Position 6: Geburtsdatum allein (kein Country mehr daneben)

### 2. UserManagementTab.tsx

**Gleiche Änderungen wie Profile.tsx:**
- ❌ Country-Felder entfernen (Position 4 und 6)
- ✅ ID-Dokument-Daten mit korrekter Reihenfolge
- ✅ Vorname, Nachname, Geburtsdatum, Land, Geschlecht hinzufügen
- ❌ issuingCountry und Ausstellende Behörde entfernen

### 3. Backend

**Keine Änderungen nötig!**
- ✅ Country wird bereits korrekt aus issuingCountry gesetzt
- ✅ Mapping funktioniert

---

## Zusammenfassung

### Was entfernt wird:
1. ❌ Country-Feld Position 4 (nach Dokumenten-Upload)
2. ❌ Country-Feld Position 6 (bei Birthday)
3. ❌ issuingCountry-Feld bei ID-Dokument-Daten
4. ❌ Ausstellende Behörde bei ID-Dokument-Daten

### Was hinzugefügt wird:
1. ✅ Vorname bei ID-Dokument-Daten (readonly)
2. ✅ Nachname bei ID-Dokument-Daten (readonly)
3. ✅ Geburtsdatum bei ID-Dokument-Daten (readonly)
4. ✅ Land bei ID-Dokument-Daten (readonly, zeigt `user.country`)
5. ✅ Geschlecht bei ID-Dokument-Daten (readonly)

### Korrekte Reihenfolge:
1. Vorname
2. Nachname
3. Geburtsdatum
4. Land
5. Geschlecht
6. Dokument-Typ
7. Dokument-Nummer
8. Ausstellungsdatum
9. Ablaufdatum

### Prinzip:
- **Alle Felder die von KI erkannt werden → bei ID-Dokument-Daten (readonly)**
- **Keine Dopplungen**
- **Land = issuingCountry (dasselbe, nur anders formatiert)**
- **Nur EIN Land-Feld (bei ID-Dokument-Daten, nicht oben)**

