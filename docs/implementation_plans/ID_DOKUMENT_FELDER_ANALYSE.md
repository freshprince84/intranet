# ID-Dokument-Felder - Vollständige Analyse

## Übersicht: Alle Felder die mit ID-Dokumenten zu tun haben

### Kategorisierung

#### 1. Felder die von der KI erkannt werden (System Prompt)
#### 2. Felder die im Backend gesetzt werden (User-Model)
#### 3. Felder die im Frontend angezeigt werden
#### 4. Doppelte Felder (Problem!)

---

## 1. KI-Erkennung (Backend - System Prompt Zeile 130)

**Datei:** `backend/src/controllers/identificationDocumentController.ts`

Die KI erkennt folgende Felder aus dem Dokument:

| Feld | KI-Feldname | Beschreibung |
|------|-------------|--------------|
| **Dokument-Typ** | `documentType` | passport, national_id, driving_license, residence_permit, cedula_colombia |
| **Dokument-Nummer** | `documentNumber` | Die Nummer auf dem Dokument |
| **Ausstellungsdatum** | `issueDate` | ISO-Format YYYY-MM-DD |
| **Ablaufdatum** | `expiryDate` | ISO-Format YYYY-MM-DD |
| **Ausstellungsland** | `issuingCountry` | Land das das Dokument ausgestellt hat |
| **Ausstellende Behörde** | `issuingAuthority` | Behörde die das Dokument ausgestellt hat |
| **Vorname** | `firstName` | Vorname aus dem Dokument |
| **Nachname** | `lastName` | Nachname aus dem Dokument |
| **Geburtsdatum** | `birthday` | ISO-Format YYYY-MM-DD |
| **Geschlecht** | `gender` | male, female, other oder null |

---

## 2. Backend - Was wird in User-Model gesetzt? (Zeile 174-209)

**Datei:** `backend/src/controllers/identificationDocumentController.ts`

| KI-Feld | → | User-Model Feld | Mapping/Logik |
|---------|---|----------------|---------------|
| `recognizedData.firstName` | → | `user.firstName` | Direkt |
| `recognizedData.lastName` | → | `user.lastName` | Direkt |
| `recognizedData.birthday` | → | `user.birthday` | `new Date(recognizedData.birthday)` |
| `recognizedData.gender` | → | `user.gender` | Validierung: ['male', 'female', 'other'] |
| `recognizedData.documentNumber` | → | `user.identificationNumber` | Direkt |
| `recognizedData.issuingCountry` ODER `issuingCountry` (manuell) | → | `user.country` | **Mapping:** Colombia→CO, Switzerland→CH, Germany→DE, Austria→AT |

**WICHTIG:** `documentType`, `issueDate`, `expiryDate`, `issuingCountry`, `issuingAuthority` werden **NUR** im `IdentificationDocument` Model gespeichert, **NICHT** im User-Model.

---

## 3. Frontend - Was wird aktuell angezeigt?

### 3.1. Editierbare Felder (oben im Formular)

**Datei:** `frontend/src/pages/Profile.tsx`

| Feld | Position | Quelle | Editierbar? | Von KI befüllt? |
|------|----------|--------|-------------|-----------------|
| **Vorname** | Position 5 | `user.firstName` | ✅ Ja | ✅ Ja |
| **Nachname** | Position 5 | `user.lastName` | ✅ Ja | ✅ Ja |
| **Geburtsdatum** | Position 6 | `user.birthday` | ✅ Ja | ✅ Ja |
| **Land** | Position 4 | `user.country` | ✅ Ja | ✅ Ja |
| **Land** | Position 6 | `user.country` | ✅ Ja | ✅ Ja (DOPPELT!) |
| **Geschlecht** | Position 8 | `user.gender` | ✅ Ja | ✅ Ja |
| **Telefonnummer** | Position 8 | `user.phoneNumber` | ✅ Ja | ❌ Nein |

### 3.2. Readonly ID-Dokument-Daten (Position 7)

**Datei:** `frontend/src/pages/Profile.tsx` (Zeile 562-656)

| Feld | Quelle | Readonly? | Von KI befüllt? |
|------|--------|-----------|-----------------|
| **Dokument-Typ** | `latestDoc.documentType` | ✅ Ja | ✅ Ja |
| **Dokument-Nummer** | `user.identificationNumber \|\| latestDoc.documentNumber` | ✅ Ja | ✅ Ja |
| **Ausstellungsland** | `latestDoc.issuingCountry` | ✅ Ja | ✅ Ja |
| **Ausstellungsdatum** | `latestDoc.issueDate` | ✅ Ja | ✅ Ja (wenn vorhanden) |
| **Ablaufdatum** | `latestDoc.expiryDate` | ✅ Ja | ✅ Ja (wenn vorhanden) |
| **Ausstellende Behörde** | `latestDoc.issuingAuthority` | ✅ Ja | ✅ Ja (wenn vorhanden) |
| **Land** | ❌ FEHLT! | - | ✅ Ja (sollte `user.country` zeigen) |

---

## 4. Problem: Doppelte Felder

### Aktuell vorhandene Dopplungen:

1. **Vorname**
   - ✅ Editierbar: Position 5 (`user.firstName`)
   - ❌ **NICHT** bei ID-Dokument-Daten (sollte aber?)

2. **Nachname**
   - ✅ Editierbar: Position 5 (`user.lastName`)
   - ❌ **NICHT** bei ID-Dokument-Daten (sollte aber?)

3. **Geburtsdatum**
   - ✅ Editierbar: Position 6 (`user.birthday`)
   - ❌ **NICHT** bei ID-Dokument-Daten (sollte aber?)

4. **Geschlecht**
   - ✅ Editierbar: Position 8 (`user.gender`)
   - ❌ **NICHT** bei ID-Dokument-Daten (sollte aber?)

5. **Land (Country)**
   - ✅ Editierbar: Position 4 (`user.country`) - **FALSCH!**
   - ✅ Editierbar: Position 6 (`user.country`) - **FALSCH! (DOPPELT!)**
   - ❌ **FEHLT** bei ID-Dokument-Daten - **SOLLTE DA SEIN!**

6. **Dokument-Nummer**
   - ✅ Readonly: Position 7 (`user.identificationNumber \|\| latestDoc.documentNumber`)
   - ✅ Keine Dopplung (gut!)

---

## 5. Gewünschte Lösung - Alle ID-Dokument-Felder gleich

### Prinzip:
**Alle Felder die von der KI aus dem Dokument erkannt werden, sollen bei den ID-Dokument-Daten (readonly) angezeigt werden.**

### Vollständige Liste der ID-Dokument-Daten (readonly):

| Feld | Quelle | Format | Anzeige |
|------|--------|--------|---------|
| **Dokument-Typ** | `latestDoc.documentType` | Text | Direkt |
| **Dokument-Nummer** | `user.identificationNumber \|\| latestDoc.documentNumber` | Text | Direkt |
| **Vorname** | `user.firstName` | Text | Direkt (von KI gesetzt) |
| **Nachname** | `user.lastName` | Text | Direkt (von KI gesetzt) |
| **Geburtsdatum** | `user.birthday` | Date | Format: YYYY-MM-DD (von KI gesetzt) |
| **Geschlecht** | `user.gender` | Text | male → "Männlich", female → "Weiblich", other → "Andere" (von KI gesetzt) |
| **Land** | `user.country` | Text | Country-Code → Country-Name (CO → "Colombia", etc.) (von KI gesetzt) |
| **Ausstellungsland** | `latestDoc.issuingCountry` | Text | Direkt (von KI erkannt) |
| **Ausstellungsdatum** | `latestDoc.issueDate` | Date | Format: YYYY-MM-DD (von KI erkannt, wenn vorhanden) |
| **Ablaufdatum** | `latestDoc.expiryDate` | Date | Format: YYYY-MM-DD (von KI erkannt, wenn vorhanden) |
| **Ausstellende Behörde** | `latestDoc.issuingAuthority` | Text | Direkt (von KI erkannt, wenn vorhanden) |

### Reihenfolge bei ID-Dokument-Daten:

1. Dokument-Typ
2. Dokument-Nummer
3. Vorname (readonly, von KI)
4. Nachname (readonly, von KI)
5. Geburtsdatum (readonly, von KI)
6. Geschlecht (readonly, von KI)
7. Land (readonly, von KI) ← **NEU HINZUFÜGEN**
8. Ausstellungsland (readonly, von KI)
9. Ausstellungsdatum (readonly, von KI, wenn vorhanden)
10. Ablaufdatum (readonly, von KI, wenn vorhanden)
11. Ausstellende Behörde (readonly, von KI, wenn vorhanden)

---

## 6. Was muss geändert werden?

### 6.1. Entfernen (aus editierbaren Bereichen):

- ❌ Country-Feld bei Position 4 (nach Dokumenten-Upload)
- ❌ Country-Feld bei Position 6 (bei Birthday)

### 6.2. Hinzufügen (zu ID-Dokument-Daten):

- ✅ Vorname (readonly, zeigt `user.firstName`)
- ✅ Nachname (readonly, zeigt `user.lastName`)
- ✅ Geburtsdatum (readonly, zeigt `user.birthday`)
- ✅ Geschlecht (readonly, zeigt `user.gender`)
- ✅ Land (readonly, zeigt `user.country` als Country-Name)

### 6.3. Editierbare Felder bleiben:

- ✅ Vorname (Position 5) - editierbar
- ✅ Nachname (Position 5) - editierbar
- ✅ Geburtsdatum (Position 6) - editierbar
- ✅ Geschlecht (Position 8) - editierbar
- ✅ Telefonnummer (Position 8) - editierbar

**ABER:** Diese Felder werden auch bei ID-Dokument-Daten angezeigt (readonly), damit man sieht was die KI erkannt hat.

---

## 7. Konsistenz-Prinzip

### Alle ID-Dokument-Felder funktionieren gleich:

1. **KI erkennt** → Feld aus Dokument
2. **Backend setzt** → In User-Model (wenn relevant) ODER in IdentificationDocument
3. **Frontend zeigt** → Bei ID-Dokument-Daten (readonly)
4. **Keine Dopplungen** → Jedes Feld nur einmal bei ID-Dokument-Daten
5. **Alle gleich** → Alle readonly, alle von KI befüllt, alle gleich formatiert

---

## 8. Zusammenfassung

### Aktuell:
- ❌ Country fehlt bei ID-Dokument-Daten
- ❌ Country ist doppelt (Position 4 und 6, editierbar)
- ❌ Vorname, Nachname, Geburtsdatum, Geschlecht fehlen bei ID-Dokument-Daten
- ✅ Dokument-Typ, Dokument-Nummer, Ausstellungsland, etc. sind korrekt

### Gewünscht:
- ✅ Alle KI-erkannten Felder bei ID-Dokument-Daten (readonly)
- ✅ Keine Dopplungen
- ✅ Alle gleich formatiert (readonly, grauer Hintergrund)
- ✅ Country bei ID-Dokument-Daten (nicht editierbar oben)

