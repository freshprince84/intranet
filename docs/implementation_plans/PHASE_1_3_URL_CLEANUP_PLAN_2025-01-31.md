# Phase 1.3: URL.createObjectURL() Cleanup - Prüfplan

**Datum:** 2025-01-31  
**Status:** 📋 PRÜFPLAN - KEINE IMPLEMENTIERUNG  
**Zweck:** Prüfung aller betroffenen Dateien vor Implementierung

---

## 🔍 PRÜFUNG: Betroffene Dateien

### Gefundene Dateien mit URL.createObjectURL():
1. `MarkdownPreview.tsx` - **HAUPTPROBLEM** (laut Analyse)
2. `InvoiceManagementTab.tsx`
3. `MonthlyReportsTab.tsx`
4. `Settings.tsx`
5. `WorktimeStats.tsx`
6. `TourExportDialog.tsx`
7. `ContractCreationModal.tsx`
8. `CertificateCreationModal.tsx`
9. `CertificateEditModal.tsx`
10. `ContractEditModal.tsx`
11. `CreateTaskModal.tsx`
12. `CreateRequestModal.tsx`
13. `EditRequestModal.tsx`
14. `EditTaskModal.tsx`
15. `LifecycleView.tsx`
16. `cerebro/ArticleEdit.tsx`
17. `InvoiceSuccessModal.tsx`
18. `InvoiceDetailModal.tsx`
19. `cerebro/AddMedia.tsx`
20. `MyDocumentsTab.tsx`

**Gesamt:** 20 Dateien

---

## 📋 PRÜFUNG: MarkdownPreview.tsx (HAUPTPROBLEM)

**Datei:** `frontend/src/components/MarkdownPreview.tsx`

**Geprüfter Code:**

**Zeile 179:** Tracking definiert
```typescript
const blobUrlsRef = React.useRef<Set<string>>(new Set());
```

**Zeile 182-189:** Cleanup-Funktion vorhanden
```typescript
React.useEffect(() => {
  return () => {
    blobUrlsRef.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    blobUrlsRef.current.clear();
  };
}, []);
```

**Zeile 304-305:** URLs werden getrackt
```typescript
const blobUrl = URL.createObjectURL(attachment.file);
blobUrlsRef.current.add(blobUrl);
```

**Erkenntnisse:**
- ✅ Tracking vorhanden: `blobUrlsRef` als `useRef<Set<string>>`
- ✅ Cleanup-Funktion vorhanden: `useEffect` mit Return-Statement
- ✅ `URL.revokeObjectURL()` wird aufgerufen
- ✅ Alle URLs werden in `blobUrlsRef.current` getrackt

**Status:** ✅ **BEREITS KORREKT IMPLEMENTIERT**

**Fazit:**
- ✅ **KEINE ÄNDERUNG NÖTIG** - Cleanup funktioniert korrekt

---

## 📋 PRÜFUNG: Weitere Dateien

### 2. InvoiceManagementTab.tsx

**Geprüfter Code (Zeilen 323-330):**
```typescript
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `Rechnung_${invoiceNumber}.pdf`;
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
window.URL.revokeObjectURL(url); // ✅ Sofort nach Verwendung
```

**Status:** ✅ **KORREKT** - `revokeObjectURL` wird direkt nach Verwendung aufgerufen

---

### 3. MyDocumentsTab.tsx

**Geprüfter Code:**

**Preview-URLs (Zeilen 137, 156):**
- Werden in State gespeichert (`setCertPreviewUrls`, `setContractPreviewUrls`)
- ✅ **Cleanup vorhanden** (Zeilen 72-87):
```typescript
useEffect(() => {
  return () => {
    setCertPreviewUrls(prev => {
      Object.values(prev).forEach(url => {
        if (url) window.URL.revokeObjectURL(url);
      });
      return {};
    });
    setContractPreviewUrls(prev => {
      Object.values(prev).forEach(url => {
        if (url) window.URL.revokeObjectURL(url);
      });
      return {};
    });
  };
}, []);
```

**Download-URLs (Zeilen 178, 208):**
- ✅ `revokeObjectURL` wird direkt nach Verwendung aufgerufen (Zeilen 185, 215)

**Status:** ✅ **KORREKT** - Alle URLs haben Cleanup

---

### 4. CreateTaskModal.tsx

**Geprüfter Code (Zeile 879):**
```typescript
<img 
  src={URL.createObjectURL(attachment.file)}
  alt={attachment.fileName}
  className="max-w-[200px] max-h-[150px] object-contain"
/>
```

**Erkenntnisse:**
- ⚠️ **PROBLEM:** `URL.createObjectURL()` wird aufgerufen, aber kein `revokeObjectURL()`
- ⚠️ **PROBLEM:** URL wird direkt im `src` Attribut verwendet, nicht getrackt
- ⚠️ **PROBLEM:** Bei jedem Render wird neue URL erstellt, alte wird nicht freigegeben

**Status:** ❌ **PROBLEM GEFUNDEN** - Cleanup fehlt

**Geplante Änderung:**
- URLs mit `useRef` tracken
- Cleanup-Funktion im `useEffect` hinzufügen
- Oder: URLs beim Entfernen des Attachments freigeben

---

### 5. EditTaskModal.tsx

**Geprüfter Code:**

**Zeile 636 (Download):**
```typescript
const url = window.URL.createObjectURL(new Blob([response.data]));
const link = document.createElement('a');
link.href = url;
link.setAttribute('download', attachment.fileName);
document.body.appendChild(link);
link.click();
link.remove();
// ❌ KEIN revokeObjectURL
```

**Zeile 1139 (Bildvorschau):**
```typescript
<img 
  src={URL.createObjectURL(attachment.file)}
  alt={attachment.fileName}
/>
// ❌ KEIN revokeObjectURL
```

**Status:** ❌ **PROBLEM GEFUNDEN** - Cleanup fehlt an beiden Stellen

**Geplante Änderung:**
- Download: `revokeObjectURL` direkt nach `link.remove()` hinzufügen
- Bildvorschau: URLs mit `useRef` tracken und Cleanup hinzufügen

---

## ✅ FAZIT DER PRÜFUNG

**Dateien mit korrektem Cleanup:**
- ✅ MarkdownPreview.tsx
- ✅ InvoiceManagementTab.tsx
- ✅ MyDocumentsTab.tsx

**Dateien mit fehlendem Cleanup:**
- ❌ CreateTaskModal.tsx (Bildvorschau)
- ❌ EditTaskModal.tsx (Download + Bildvorschau)

**Weitere Dateien zu prüfen:**
- [ ] MonthlyReportsTab.tsx
- [ ] Settings.tsx
- [ ] WorktimeStats.tsx
- [ ] TourExportDialog.tsx
- [ ] ContractCreationModal.tsx
- [ ] CertificateCreationModal.tsx
- [ ] CertificateEditModal.tsx
- [ ] ContractEditModal.tsx
- [ ] CreateRequestModal.tsx
- [ ] EditRequestModal.tsx
- [ ] LifecycleView.tsx
- [ ] cerebro/ArticleEdit.tsx
- [ ] InvoiceSuccessModal.tsx
- [ ] InvoiceDetailModal.tsx
- [ ] cerebro/AddMedia.tsx

**Status:** ⏸️ **TEILWEISE GEPRÜFT** - Weitere Dateien müssen noch geprüft werden

---

## 📋 PRÜFUNGS-CHECKLISTE

### Vor Implementierung:
- [x] MarkdownPreview.tsx geprüft → ✅ Korrekt
- [x] InvoiceManagementTab.tsx geprüft → ✅ Korrekt
- [x] MyDocumentsTab.tsx geprüft → ✅ Korrekt
- [x] CreateTaskModal.tsx geprüft → ❌ Cleanup fehlt
- [x] EditTaskModal.tsx geprüft → ❌ Cleanup fehlt
- [ ] Weitere 15 Dateien müssen noch geprüft werden
- [ ] Geplante Änderungen dokumentiert (nach vollständiger Prüfung)
- [ ] Bestätigung des Benutzers eingeholt

### Nach Implementierung:
- [ ] Code-Änderungen dokumentiert
- [ ] Funktionalität getestet
- [ ] Memory-Verbrauch geprüft
- [ ] Linter-Fehler geprüft

---

## ⚠️ WICHTIGE HINWEISE

1. **Nichts implementieren** bis alle Prüfungen abgeschlossen sind
2. **Keine Vermutungen** - Nur dokumentieren was tatsächlich im Code steht
3. **Alle Änderungen vorher dokumentieren** im Prüfplan
4. **Bestätigung einholen** vor Implementierung

---

## 📝 NOTIZEN

- Dieser Plan wartet auf Prüfung der betroffenen Dateien
- Nach Prüfung werden die geplanten Änderungen hier dokumentiert
- Erst dann wird implementiert

