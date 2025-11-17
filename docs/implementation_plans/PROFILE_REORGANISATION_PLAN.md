# Profil-Reorganisation - Analyse & Plan

## Aktuelle Situation

### Profile.tsx - Aktuelle Reihenfolge:
1. Username, Email
2. **Country, Language** (Zeile 405-444)
3. **Dokumenten-Upload** (Zeile 446-494)
4. **Phone Number** (Zeile 496-512)
5. First Name, Last Name (Zeile 514-540)
6. Birthday (Zeile 542-554)
7. Bank Details (Zeile 556-568)
8. **Contract, Salary, Normal Working Hours** (Zeile 570-610)
9. Gender (Zeile 612-628)
10. ID-Dokument-Daten (readonly, Zeile 630-694)

### UserManagementTab.tsx - Aktuelle Reihenfolge:
- Ähnlich wie Profile.tsx, aber mit zusätzlichen Payroll-Feldern
- Contract, Salary, Normal Working Hours sind ebenfalls im Details-Tab

### LifecycleTab.tsx:
- Zeigt nur Status, Onboarding-Daten, Social Security
- **KEINE** Contract/Salary/Working Hours Felder

## Gewünschte neue Struktur

### Neue Reihenfolge in Profile.tsx & UserManagementTab.tsx:

**Layout: 2-Spalten-Grid (wie aktuell `grid grid-cols-1 sm:grid-cols-2 gap-6`)**

1. **Username, Email** (nebeneinander - 2 Spalten)
2. **Language** (allein - 1 Spalte, Country kommt später)
3. **Dokumenten-Upload** (prominent - volle Breite, `sm:col-span-2`)
4. **Country** (allein - 1 Spalte, unter Dokumenten-Upload, automatisch aus Dokument erkannt)
5. **First Name, Last Name** (nebeneinander - 2 Spalten)
6. **Birthday, Country** (nebeneinander - 2 Spalten, Country nochmal für manuelle Korrektur)
7. **ID-Dokument-Daten** (readonly, alle Felder: Nummer, Art, Ausstellungsland, Ablaufdatum, etc. - je nach Anzahl 1-2 Spalten)
8. **Phone Number, Gender** (nebeneinander - 2 Spalten)
9. **Finanzdaten** (Bank Details - 1 Spalte oder volle Breite)
10. ~~Contract, Salary, Normal Working Hours~~ → **ZU LIFECYCLE VERSCHIEBEN**

### LifecycleTab.tsx - Erweiterung:

**Neue Sektion hinzufügen:**
- **Vertragsdaten** (Contract, Salary, Normal Working Hours)
- **Vertragsbeginn** (contractStartDate - bereits vorhanden)
- **Vertragsende** (contractEndDate - bereits vorhanden)
- Alles in einem logischen Block für HR-Menschen

## Abweichungen & Aufgaben

### 1. Profile.tsx Umstrukturierung

**Zu ändern:**
- ✅ Country-Feld verschieben (von Position 2 nach Position 4, nach Dokumenten-Upload)
- ✅ Language-Feld bleibt oben allein (Position 2, 1 Spalte)
- ✅ Dokumenten-Upload bleibt prominent (Position 3, volle Breite `sm:col-span-2`)
- ✅ Country nach Dokumenten-Upload allein (Position 4, 1 Spalte)
- ✅ First Name, Last Name nebeneinander (Position 5, 2 Spalten)
- ✅ Birthday, Country nebeneinander (Position 6, 2 Spalten - Country nochmal für manuelle Korrektur)
- ✅ ID-Dokument-Daten erweitern (Position 7, je nach Anzahl 1-2 Spalten)
- ✅ Phone Number, Gender nebeneinander (Position 8, 2 Spalten)
- ✅ Bank Details allein oder volle Breite (Position 9)
- ❌ Contract, Salary, Normal Working Hours ENTFERNEN (zu Lifecycle verschieben)

**Zu implementieren:**
- Automatische Country-Erkennung aus Dokument (issuingCountry → country)
- Backend prüfen: Wird country bereits aus issuingCountry gesetzt?

### 2. UserManagementTab.tsx Umstrukturierung

**Zu ändern:**
- ✅ Gleiche Reihenfolge wie Profile.tsx
- ✅ Contract, Salary, Normal Working Hours ENTFERNEN (zu Lifecycle verschieben)
- ✅ Payroll-Felder bleiben (sind separate Sektion)

### 3. LifecycleTab.tsx Erweiterung

**Hinzuzufügen:**
- ✅ Neue Sektion "Vertragsdaten" / "Contract Data"
- ✅ Contract (Dropdown mit CONTRACT_TYPES)
- ✅ Salary (Zahleneingabe)
- ✅ Normal Working Hours (Zahleneingabe)
- ✅ Contract Start Date (bereits vorhanden, aber in dieser Sektion anzeigen)
- ✅ Contract End Date (bereits vorhanden, aber in dieser Sektion anzeigen)
- ✅ Edit-Funktionalität für HR-Menschen

**Backend-Endpoint prüfen:**
- Gibt es bereits einen Endpoint zum Update von Contract/Salary/Working Hours im Lifecycle?
- Oder müssen wir updateProfile/updateUser erweitern?

### 4. Backend-Anpassungen

**Zu prüfen/implementieren:**
- ✅ `identificationDocumentController.ts`: Wird `country` aus `issuingCountry` automatisch gesetzt?
  - Aktuell: `issuingCountry` wird erkannt, aber `user.country` wird NICHT aktualisiert
  - **MUSS IMPLEMENTIERT WERDEN**: `userUpdateData.country = recognizedData.issuingCountry || recognizedData.country`

**Zu prüfen:**
- Lifecycle-Endpoint: Kann Contract/Salary/Working Hours dort gespeichert werden?
- Oder bleiben diese im User-Model und werden nur im Lifecycle-Tab angezeigt/editiert?

### 5. Konsistenz zwischen Profile.tsx und UserManagementTab.tsx

**Sicherstellen:**
- ✅ Gleiche Feldreihenfolge
- ✅ Gleiche Feldnamen/Labels
- ✅ Gleiche Validierung
- ✅ Gleiche automatische Befüllung

## Implementierungsreihenfolge

1. **Backend: Country-Erkennung implementieren**
   - `identificationDocumentController.ts` erweitern
   - `country` aus `issuingCountry` setzen

2. **Profile.tsx umstrukturieren**
   - Felder neu anordnen
   - Contract/Salary/Working Hours entfernen
   - Country-Logik anpassen

3. **UserManagementTab.tsx umstrukturieren**
   - Gleiche Reihenfolge wie Profile.tsx
   - Contract/Salary/Working Hours entfernen

4. **LifecycleTab.tsx erweitern**
   - Vertragsdaten-Sektion hinzufügen
   - Edit-Funktionalität implementieren
   - Backend-Endpoint prüfen/erweitern

5. **Testing**
   - Dokumenten-Upload → Country wird automatisch gesetzt
   - Felder in richtiger Reihenfolge
   - Contract/Salary/Working Hours nur in Lifecycle
   - Konsistenz zwischen Profile und UserManagement

## Offene Fragen

1. **Backend-Endpoint für Lifecycle-Contract-Update:**
   - Existiert bereits ein Endpoint?
   - Oder verwenden wir `updateUser` mit Lifecycle-Context?

2. **Country-Feld:**
   - Soll `country` aus `issuingCountry` automatisch gesetzt werden?
   - Oder nur als Vorschlag angezeigt werden?

3. **ID-Dokument-Daten:**
   - Welche Felder sollen angezeigt werden?
   - Aktuell: documentType, documentNumber, issuingCountry, expiryDate
   - Sollen auch issueDate, issuingAuthority angezeigt werden?

