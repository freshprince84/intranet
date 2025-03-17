# Automatische Dokumentenerkennung mit OCR

Diese Komponente ermöglicht das automatische Erkennen von Daten aus Identifikationsdokumenten wie Reisepässen, Personalausweisen und Führerscheinen.

## Funktionsweise

1. Der Benutzer lädt ein Bild eines Dokuments hoch oder nimmt ein Foto auf.
2. Die OCR-Engine (Tesseract.js) extrahiert den Text aus dem Bild.
3. Reguläre Ausdrücke werden verwendet, um relevante Informationen zu extrahieren:
   - Dokumenttyp
   - Dokumentnummer
   - Ausstellungsland
   - Ausstellende Behörde
   - Ausstellungsdatum
   - Ablaufdatum

## Installation

Für die vollständige Funktionalität muss Tesseract.js installiert werden:

```bash
npm install tesseract.js
```

## Verwendung

Die OCR-Funktionalität ist direkt in das Formular für Identifikationsdokumente integriert. Nach dem Hochladen eines Bildes oder dem Aufnehmen eines Fotos kann der Benutzer auf "Daten automatisch erkennen" klicken, um die Felder automatisch auszufüllen.

## Erkennungsraten

Die Genauigkeit der automatischen Erkennung hängt stark von der Qualität des Bildes und der Klarheit des Dokuments ab. Die folgenden Tipps können die Erkennungsrate verbessern:

1. Gute Beleuchtung beim Fotografieren
2. Deutlicher Kontrast zwischen Text und Hintergrund
3. Kein Glare oder Reflexionen auf dem Dokument
4. Dokument vollständig im Bild und nicht abgeschnitten

## Unterstützte Dokumente

Die aktuelle Implementierung unterstützt:
- Reisepässe (deutsch/international)
- Personalausweise (deutsch/international)
- Führerscheine (deutsch/international)

## Datenschutz

Alle Bildverarbeitung findet vollständig im Browser des Benutzers statt. Die Bilder werden nicht an einen Server gesendet, und die extrahierten Daten werden nur auf Anfrage des Benutzers gespeichert.

## Zukünftige Verbesserungen

Für bessere Erkennungsraten könnte die Implementierung in Zukunft erweitert werden:

1. Vorverarbeitung von Bildern zur Verbesserung der Lesbarkeit
2. Unterstützung für mehr Dokumenttypen und Formate
3. Erkennung von Gesichtsbildern und Biometriedaten
4. Integration einer spezialisierten Dokumenten-API (z.B. AWS Textract, Google Cloud Vision) für höhere Genauigkeit

## Implementation

Die Hauptkomponenten der OCR-Implementierung sind:

- `documentRecognition.ts`: Hauptlogik für die Dokumentenerkennung
- `tesseractWorker.ts`: Worker-Management für Tesseract.js
- Integration in `IdentificationDocumentForm.tsx`: UI-Integration 