# Profil-Standard-Check - Browser-Analyse

**Datum:** 2025-12-17  
**Status:** ✅ Vollständige Browser-Analyse durchgeführt  
**URL:** https://65.109.228.106.nip.io/app/profile

---

## 📋 EXECUTIVE SUMMARY

Die Profilseite wurde im Browser getestet. Es wurden **6 kritische Probleme** und mehrere Standard-Abweichungen identifiziert.

---

## 🔴 KRITISCHE PROBLEME

### 1. Fehlende Übersetzungen (3x) - **KRITISCH**

**Problem:**
- `profile.identificationIssueDate` wird als Label-Text angezeigt (statt übersetzt)
- `profile.issuingCountry` wird als Label-Text angezeigt (statt übersetzt)
- `profile.issuingAuthority` wird als Label-Text angezeigt (statt übersetzt)

**Betroffene Dateien:**
- `frontend/src/pages/Profile.tsx` (Zeile 613, 645, 661)
- `frontend/src/components/UserManagementTab.tsx` (Zeile 1115, 1147, 1163)

**Aktueller Code:**
```tsx
// ❌ FALSCH
<label>
  {t('profile.identificationIssueDate') || 'Ausstellungsdatum'}
</label>
```

**Lösung:**
- Übersetzungskeys in `de.json`, `en.json`, `es.json` hinzufügen
- `defaultValue` in `t()` Aufrufen verwenden

---

### 2. Button-Design-Verstoß - **KRITISCH**

**Problem:**
- "Guardar" (Save) Button hat sichtbaren Text
- "Cancelar" (Cancel) Button hat sichtbaren Text

**Standard:** Buttons müssen Icon-only sein, Text nur im `title` Attribut

**Betroffene Dateien:**
- `frontend/src/pages/Profile.tsx` (Zeile 714-729)
- `frontend/src/components/LifecycleTab.tsx` (Zeile 314-331)

**Aktueller Code:**
```tsx
// ❌ FALSCH
<button type="submit">
  <CheckIcon className="h-5 w-5" />
  Guardar  {/* Text sichtbar! */}
</button>
```

**Lösung:**
```tsx
// ✅ RICHTIG
<button type="submit" title={t('common.save')}>
  <CheckIcon className="h-5 w-5" />
</button>
```

---

### 3. Feldreihenfolge weicht vom Plan ab - **WICHTIG**

**Aktuelle Reihenfolge (im Browser beobachtet):**
1. Username, Email (2 Spalten) ✅
2. Language (1 Spalte) ✅
3. Dokumenten-Upload (volle Breite) ✅
4. First Name, Last Name (2 Spalten) ❌ **SOLLTE:** Country (1 Spalte) zuerst
5. Birthday (1 Spalte) ❌ **SOLLTE:** First/Last Name (2 Spalten)
6. Country (1 Spalte) ❌ **SOLLTE:** Birthday + Country (2 Spalten)
7. Gender (1 Spalte) ❌ **SOLLTE:** Dokument-Felder
8. Document Type, Document Number, Issue Date, Expiry Date, Issuing Country, Issuing Authority
9. Phone Number (1 Spalte) ❌ **SOLLTE:** Phone + Gender (2 Spalten)
10. Bank Details (1 Spalte) ✅

**Gewünschte Reihenfolge laut `PROFILE_REORGANISATION_PLAN.md`:**
1. Username, Email (2 Spalten)
2. Language (1 Spalte)
3. Dokumenten-Upload (volle Breite)
4. **Country (1 Spalte, allein, nach Upload)**
5. **First Name, Last Name (2 Spalten)**
6. **Birthday, Country (2 Spalten - Country nochmal für manuelle Korrektur)**
7. ID-Dokument-Daten (readonly)
8. **Phone Number, Gender (2 Spalten)**
9. Bank Details (1 Spalte)

**Betroffene Dateien:**
- `frontend/src/pages/Profile.tsx` (Zeile 397-710)
- `frontend/src/components/UserManagementTab.tsx` (Zeile 982-1170)

---

### 4. Dokumente-Tab: Fehlende Suchleiste/Filter/Sortierung - **WICHTIG**

**Problem:**
- Dokumente-Tab hat **KEINE** Suchleiste
- Dokumente-Tab hat **KEINE** Filter
- Dokumente-Tab hat **KEINE** Sortierung

**Standard-Command-Anforderung:** "zeile mit suchleiste" - sollte vorhanden sein

**Betroffene Dateien:**
- `frontend/src/components/IdentificationDocumentList.tsx` (Zeile 353-368)

**Aktueller Code:**
```tsx
// ❌ FEHLT: Suchleiste, Filter, Sortierung
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <button onClick={() => setShowAddForm(true)}>...</button>
    <h3>{t('identificationDocuments.title')}</h3>
  </div>
  <div /> {/* Leer - sollte Suchleiste/Filter enthalten */}
</div>
```

**Lösung:**
- Suchleiste hinzufügen (Filter nach Dokumentnummer, Typ, Land)
- Filter-Button hinzufügen (nach Status, Typ)
- Sortierung hinzufügen (nach Datum, Typ, etc.)

---

### 5. Lifecycle-Tab: Fehlende Übersetzung - **KRITISCH**

**Problem:**
- `lifecycle.contractData` wird als Label-Text angezeigt (statt übersetzt)

**Betroffene Dateien:**
- `frontend/src/components/LifecycleTab.tsx` (Zeile 222)

**Aktueller Code:**
```tsx
// ❌ FALSCH
<h3>
  {t('lifecycle.contractData') || 'Vertragsdaten'}
</h3>
```

**Lösung:**
- Übersetzungskey `lifecycle.contractData` in alle 3 Sprachen hinzufügen
- `defaultValue` verwenden

---

### 6. Tab-Buttons: Text statt Icon-only - **ZU PRÜFEN**

**Beobachtung:**
- Tab-Buttons haben Text: "Perfil", "Documento de identificación", "Ciclo de Vida", "Mi Documento"
- Standard besagt: Buttons sollten Icon-only sein

**Frage:**
- Sind Tab-Buttons eine Ausnahme vom Icon-only Standard?
- Oder sollten auch Tabs Icon-only sein mit `title` Attribut?

**Betroffene Dateien:**
- `frontend/src/pages/Profile.tsx` (Zeile 304-350)

---

## ✅ WAS FUNKTIONIERT KORREKT

### Layout & Container-Struktur
- ✅ Äußerer Wrapper: `min-h-screen dark:bg-gray-900` vorhanden
- ✅ Container: `max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6` vorhanden
- ✅ Box: `bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6` vorhanden
- ✅ Tab-Border: `border-b border-gray-200 dark:border-gray-700` vorhanden
- ✅ Tab-Content: `mt-6` vorhanden

### Design-Standards
- ✅ Farben korrekt (bg-white, dark:bg-gray-800, etc.)
- ✅ Schriftgrößen korrekt (text-xl für Überschriften, text-sm für Labels)
- ✅ Abstände korrekt (gap-6 für Grid, mb-4 für Abstände)
- ✅ Responsive Design vorhanden (sm:grid-cols-2, etc.)

### Funktionalität
- ✅ Alle 11 Dokument-Felder werden angezeigt (wenn latestDoc vorhanden)
- ✅ Dokumente-Tab zeigt Tabelle korrekt
- ✅ Tab-Navigation funktioniert
- ✅ Formular-Felder sind editierbar/nicht-editierbar korrekt

### Memory Leaks
- ✅ Keine Console-Fehler
- ✅ Cleanup in IdentificationDocumentList vorhanden (URL.revokeObjectURL)

---

## 📊 DETAILLIERTE FELDANALYSE

### Profil-Tab - Aktuelle Feldreihenfolge (im Browser beobachtet):

1. **Username** (editierbar) ✅
2. **Email** (editierbar) ✅
3. **Language** (editierbar, required) ✅
4. **Dokumenten-Upload** (volle Breite) ✅
5. **First Name** (readonly, aus Dokument) ✅
6. **Last Name** (readonly, aus Dokument) ✅
7. **Birthday** (readonly, aus Dokument) ✅
8. **Country** (readonly, aus Dokument) ❌ **SOLLTE:** Nach Upload allein stehen
9. **Gender** (editierbar) ❌ **SOLLTE:** Mit Phone Number in 2 Spalten
10. **Document Type** (readonly) ✅
11. **Document Number** (readonly) ✅
12. **Issue Date** (readonly) ✅ **ABER:** Übersetzung fehlt!
13. **Expiry Date** (readonly) ✅
14. **Issuing Country** (readonly) ✅ **ABER:** Übersetzung fehlt!
15. **Issuing Authority** (readonly) ✅ **ABER:** Übersetzung fehlt!
16. **Phone Number** (editierbar) ❌ **SOLLTE:** Mit Gender in 2 Spalten
17. **Bank Details** (editierbar) ✅

---

## 📋 IMPLEMENTIERUNGSPLAN

### Phase 1: Kritische Übersetzungen (PRIORITÄT: HOCH)

**Dateien:**
- `frontend/src/i18n/locales/de.json`
- `frontend/src/i18n/locales/en.json`
- `frontend/src/i18n/locales/es.json`

**Hinzuzufügen:**
```json
{
  "profile": {
    "identificationIssueDate": "Ausstellungsdatum",
    "issuingCountry": "Ausstellungsland",
    "issuingAuthority": "Ausstellende Behörde"
  },
  "lifecycle": {
    "contractData": "Vertragsdaten"
  }
}
```

**Code-Änderungen:**
- `Profile.tsx` Zeile 613: `{t('profile.identificationIssueDate', { defaultValue: 'Ausstellungsdatum' })}`
- `Profile.tsx` Zeile 645: `{t('profile.issuingCountry', { defaultValue: 'Ausstellungsland' })}`
- `Profile.tsx` Zeile 661: `{t('profile.issuingAuthority', { defaultValue: 'Ausstellende Behörde' })}`
- `UserManagementTab.tsx` Zeile 1115, 1147, 1163: Gleiche Änderungen
- `LifecycleTab.tsx` Zeile 222: `{t('lifecycle.contractData', { defaultValue: 'Vertragsdaten' })}`

---

### Phase 2: Button-Design korrigieren (PRIORITÄT: HOCH)

**Dateien:**
- `frontend/src/pages/Profile.tsx` (Zeile 714-729)
- `frontend/src/components/LifecycleTab.tsx` (Zeile 314-331)

**Änderungen:**
```tsx
// VORHER:
<button type="submit" className="...">
  <CheckIcon className="h-5 w-5" />
  Guardar
</button>

// NACHHER:
<button type="submit" className="..." title={t('common.save')}>
  <CheckIcon className="h-5 w-5" />
</button>
```

---

### Phase 3: Feldreihenfolge korrigieren (PRIORITÄT: MITTEL)

**Dateien:**
- `frontend/src/pages/Profile.tsx` (Zeile 397-710)
- `frontend/src/components/UserManagementTab.tsx` (Zeile 982-1170)

**Neue Reihenfolge implementieren:**
1. Username, Email (2 Spalten)
2. Language (1 Spalte)
3. Dokumenten-Upload (volle Breite)
4. **Country (1 Spalte, allein)**
5. **First Name, Last Name (2 Spalten)**
6. **Birthday, Country (2 Spalten - Country nochmal)**
7. Dokument-Felder (readonly)
8. **Phone Number, Gender (2 Spalten)**
9. Bank Details (1 Spalte)

---

### Phase 4: Dokumente-Tab: Suchleiste/Filter/Sortierung hinzufügen (PRIORITÄT: MITTEL)

**Dateien:**
- `frontend/src/components/IdentificationDocumentList.tsx`

**Hinzuzufügen:**
- Suchleiste (Filter nach Dokumentnummer, Typ, Land)
- Filter-Button (nach Status, Typ)
- Sortierung (nach Datum, Typ)

**Layout:**
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-3">
    <button onClick={() => setShowAddForm(true)}>...</button>
    <h3>{t('identificationDocuments.title')}</h3>
  </div>
  <div className="flex items-center gap-2">
    <input
      type="text"
      placeholder={t('common.search')}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="border rounded px-2 py-1 text-sm w-40"
    />
    <button onClick={toggleFilter} title={t('common.filter')}>
      <FunnelIcon className="h-5 w-5" />
    </button>
    <button onClick={toggleSort} title={t('common.sort')}>
      <ArrowsUpDownIcon className="h-5 w-5" />
    </button>
  </div>
</div>
```

---

### Phase 5: Tab-Buttons prüfen (PRIORITÄT: NIEDRIG)

**Frage klären:**
- Sollen Tab-Buttons Icon-only sein?
- Oder sind Tab-Buttons eine Ausnahme?

**Wenn Icon-only:**
- Icons für jeden Tab hinzufügen
- Text in `title` Attribut verschieben

---

## ✅ TEST-CHECKLISTE

### Übersetzungen:
- [ ] `profile.identificationIssueDate` in de, en, es hinzugefügt
- [ ] `profile.issuingCountry` in de, en, es hinzugefügt
- [ ] `profile.issuingAuthority` in de, en, es hinzugefügt
- [ ] `lifecycle.contractData` in de, en, es hinzugefügt
- [ ] Alle 3 Sprachen im Browser getestet

### Button-Design:
- [ ] Save-Button ist Icon-only (nur CheckIcon)
- [ ] Cancel-Button ist Icon-only (nur XMarkIcon)
- [ ] `title` Attribute vorhanden
- [ ] LifecycleTab Buttons korrigiert

### Feldreihenfolge:
- [ ] Country steht nach Upload allein
- [ ] First/Last Name nebeneinander
- [ ] Birthday + Country nebeneinander
- [ ] Phone + Gender nebeneinander
- [ ] Reihenfolge in Profile.tsx und UserManagementTab.tsx identisch

### Dokumente-Tab:
- [ ] Suchleiste vorhanden
- [ ] Filter-Button vorhanden
- [ ] Sortierung vorhanden
- [ ] Funktionalität getestet

---

## 📝 ZUSAMMENFASSUNG

**Gefundene Probleme:**
1. ✅ **3 fehlende Übersetzungen** (identificationIssueDate, issuingCountry, issuingAuthority)
2. ✅ **1 fehlende Übersetzung** (lifecycle.contractData)
3. ✅ **2 Button-Design-Verstöße** (Save, Cancel haben Text)
4. ✅ **Feldreihenfolge weicht ab** (Country, First/Last, Birthday, Phone/Gender)
5. ✅ **Dokumente-Tab: Keine Suchleiste/Filter/Sortierung**
6. ⚠️ **Tab-Buttons: Text statt Icon-only** (muss geklärt werden)

**Was funktioniert:**
- ✅ Layout & Container-Struktur korrekt
- ✅ Design-Standards (Farben, Schriftgrößen, Abstände) korrekt
- ✅ Alle 11 Dokument-Felder werden angezeigt
- ✅ Keine Console-Fehler
- ✅ Memory Leaks: Cleanup vorhanden

**Priorität:**
1. **HOCH:** Übersetzungen, Button-Design
2. **MITTEL:** Feldreihenfolge, Dokumente-Tab Suchleiste
3. **NIEDRIG:** Tab-Buttons (muss geklärt werden)

