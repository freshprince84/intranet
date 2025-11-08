# PDF-Generierung Test-Plan

## Übersicht
Dieses Dokument beschreibt den Test-Plan für die PDF-Generierung von Arbeitszeugnissen und Arbeitsverträgen.

## Implementierte Features

### 1. DocumentService (`backend/src/services/documentService.ts`)
- ✅ `generateCertificate()` - Generiert Arbeitszeugnis-PDF
- ✅ `generateContract()` - Generiert Arbeitsvertrag-PDF
- ✅ Automatische Verzeichniserstellung (`uploads/certificates`, `uploads/contracts`, `uploads/document-templates`)
- ✅ PDF-Generierung mit PDFKit
- ✅ Template-System (Grundstruktur vorhanden, noch nicht vollständig implementiert)

### 2. Integration in LifecycleService
- ✅ `createCertificate()` - Generiert automatisch PDF, falls `pdfPath` nicht angegeben
- ✅ `createContract()` - Generiert automatisch PDF, falls `pdfPath` nicht angegeben
- ✅ Rückwärtskompatibel: Manuell hochgeladene PDFs werden weiterhin unterstützt

### 3. API-Endpoints
- ✅ `POST /api/users/:id/lifecycle/certificates` - Erstellt Arbeitszeugnis (mit optionaler PDF-Generierung)
- ✅ `POST /api/users/:id/lifecycle/contracts` - Erstellt Arbeitsvertrag (mit optionaler PDF-Generierung)
- ✅ `GET /api/users/:id/lifecycle/certificates/:certId/download` - Lädt PDF herunter
- ✅ `GET /api/users/:id/lifecycle/contracts/:contractId/download` - Lädt PDF herunter

## Test-Szenarien

### Test 1: Automatische PDF-Generierung für Arbeitszeugnis
**Ziel:** Überprüfen, ob ein Arbeitszeugnis automatisch generiert wird, wenn kein `pdfPath` angegeben wird.

**Schritte:**
1. Als HR/Admin einloggen
2. Zu einem User navigieren (z.B. User-Management)
3. Lebenszyklus-Tab öffnen
4. Neues Arbeitszeugnis erstellen (ohne PDF-Upload)
5. Prüfen, ob PDF automatisch generiert wurde
6. PDF herunterladen und Inhalt überprüfen

**Erwartetes Ergebnis:**
- Certificate wird erstellt
- PDF-Datei existiert im `uploads/certificates` Verzeichnis
- PDF enthält korrekte Daten (User-Name, Organisation, Datum, etc.)

### Test 2: Automatische PDF-Generierung für Arbeitsvertrag
**Ziel:** Überprüfen, ob ein Arbeitsvertrag automatisch generiert wird, wenn kein `pdfPath` angegeben wird.

**Schritte:**
1. Als HR/Admin einloggen
2. Zu einem User navigieren
3. Lebenszyklus-Tab öffnen
4. Neuen Arbeitsvertrag erstellen (ohne PDF-Upload)
   - Startdatum angeben
   - Optional: Enddatum, Gehalt, Arbeitsstunden, Position
5. Prüfen, ob PDF automatisch generiert wurde
6. PDF herunterladen und Inhalt überprüfen

**Erwartetes Ergebnis:**
- Contract wird erstellt
- PDF-Datei existiert im `uploads/contracts` Verzeichnis
- PDF enthält korrekte Vertragsdaten

### Test 3: Manueller PDF-Upload (Rückwärtskompatibilität)
**Ziel:** Überprüfen, dass manuell hochgeladene PDFs weiterhin funktionieren.

**Schritte:**
1. Als HR/Admin einloggen
2. Neues Arbeitszeugnis erstellen
3. PDF-Datei manuell hochladen
4. Prüfen, ob das hochgeladene PDF verwendet wird (nicht generiert)

**Erwartetes Ergebnis:**
- Certificate wird mit dem hochgeladenen PDF erstellt
- Keine automatische PDF-Generierung

### Test 4: PDF-Download
**Ziel:** Überprüfen, ob PDFs korrekt heruntergeladen werden können.

**Schritte:**
1. Als User/HR/Admin einloggen
2. Zu einem Certificate/Contract navigieren
3. Download-Button klicken
4. PDF öffnen und Inhalt überprüfen

**Erwartetes Ergebnis:**
- PDF wird korrekt heruntergeladen
- Dateiname ist korrekt (`arbeitszeugnis-{id}.pdf` oder `arbeitsvertrag-{id}.pdf`)
- PDF-Inhalt ist korrekt

### Test 5: Custom Text für Arbeitszeugnis
**Ziel:** Überprüfen, ob custom Text in PDFs verwendet wird.

**Schritte:**
1. Als HR/Admin einloggen
2. Neues Arbeitszeugnis erstellen
3. Custom Text eingeben
4. PDF generieren lassen
5. PDF überprüfen

**Erwartetes Ergebnis:**
- Custom Text erscheint im PDF statt Standard-Text

### Test 6: Fehlerbehandlung
**Ziel:** Überprüfen, ob Fehler korrekt behandelt werden.

**Test 6a: User nicht gefunden**
- Versuche, Certificate für nicht-existierenden User zu erstellen
- Erwartetes Ergebnis: Fehlermeldung

**Test 6b: Lebenszyklus nicht gefunden**
- Versuche, Certificate für User ohne Lebenszyklus zu erstellen
- Erwartetes Ergebnis: Fehlermeldung

**Test 6c: PDF-Datei nicht gefunden**
- Versuche, nicht-existierendes PDF herunterzuladen
- Erwartetes Ergebnis: 404 Fehler

## Bekannte Einschränkungen

1. **Template-System:** Grundstruktur vorhanden, aber noch nicht vollständig implementiert
   - `loadTemplate()` und `saveTemplate()` existieren, werden aber noch nicht verwendet
   - PDFs werden aktuell mit festem Layout generiert

2. **PDF-Layout:** Aktuell einfaches Layout, kann später mit Templates erweitert werden

3. **Signaturen:** Unterschriften werden aktuell als Platzhalter angezeigt

## Nächste Schritte

1. ✅ PDF-Generierung implementiert
2. ⏳ Template-System vollständig implementieren
3. ⏳ API-Endpoints für Template-Verwaltung erstellen
4. ⏳ Signaturen-Integration
5. ⏳ Erweiterte PDF-Layouts

