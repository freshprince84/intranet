# Cerebro-System: Korrigierte Analyse nach Code-Überprüfung

## Präzise Status-Übersicht

Nach genauer Code- und Dokumentationsprüfung zeigt sich ein anderes Bild als zuerst angenommen.

---

## 1. Tag-System

### ✅ **VORHANDEN:**
- **Datenmodell:** `CerebroTag` existiert im Schema
- **Backend-Suche:** Tags werden bereits in der `searchArticles`-Funktion durchsucht:
  ```typescript
  tags: {
    some: {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }
  }
  ```
- **Backend-Abruf:** Tags werden beim Abrufen von Artikeln mitgeladen:
  ```typescript
  tags: true  // in getArticleById und getArticleBySlug
  ```
- **Frontend-Interface:** `CerebroArticleDetail` hat `tags: string[]` Feld

### ❌ **FEHLT:**
- **Backend Tag-Management API:**
  - Kein `cerebroTagsController.ts` ❌
  - Keine Routes für Tag-CRUD ❌
  - Keine Endpunkte zum Hinzufügen/Entfernen von Tags zu Artikeln ❌
  
- **Frontend Tag-UI:**
  - Keine Tag-Anzeige in `ArticleView.tsx` ❌
  - Keine Tag-Verwaltung in `ArticleEdit.tsx` ❌
  - Keine Tag-Filter in `ArticleList.tsx` ❌
  - Keine Tag-Selektor-Komponente ❌

**Fazit:** Tags werden als Datenstruktur verwendet und in der Suche berücksichtigt, aber es gibt KEINE Möglichkeit, Tags zu verwalten oder anzuzeigen.

---

## 2. Publishing/Workflow

### ✅ **VORHANDEN:**
- **Datenmodell:** `isPublished` Feld existiert (default: false)
- **Backend:** Feld wird gesetzt/aktualisiert:
  - `createArticle`: `isPublished = false` (default)
  - `updateArticle`: `isPublished` kann geändert werden

### ❌ **FEHLT KOMPLETT:**
- **Backend Filterung:**
  - `getAllArticles()` gibt **ALLE** Artikel zurück, unabhängig von `isPublished` ❌
  - `getArticleBySlug()` gibt **ALLE** Artikel zurück ❌
  - `getArticleById()` gibt **ALLE** Artikel zurück ❌
  - `getArticlesStructure()` filtert **NICHT** nach `isPublished` ❌
  - `searchArticles()` filtert **NICHT** nach `isPublished` ❌
  
- **Frontend:**
  - Kein `isPublished` Feld in `ArticleEdit.tsx` ❌
  - Keine Filterung in `ArticleList.tsx` ❌
  - Keine Entwurf-Kennzeichnung in `ArticleView.tsx` ❌
  - Keine Preview-Funktion ❌

**Fazit:** `isPublished` existiert im Datenmodell und kann gesetzt werden, aber es hat **KEINE Auswirkung** auf die Anzeige oder Filterung.

---

## 3. Request-Integration

### ✅ **VORHANDEN:**
- **Datenmodell:** `RequestCerebroCarticle` existiert im Schema
- **Backend:** Beim Löschen von Artikeln werden Request-Verknüpfungen gelöscht:
  ```typescript
  DELETE FROM "RequestCerebroCarticle" WHERE "carticleId" = ${articleId}
  ```
- **Frontend Interface:** `CerebroArticleDetail` hat:
  ```typescript
  requests: {
    id: string;
    title: string;
  }[];
  ```
- **Frontend Anzeige:** `ArticleView.tsx` zeigt "Verknüpfte Requests" (aber hardcoded "Keine Requests verknüpft")

### ❌ **FEHLT KOMPLETT:**
- **Backend API:**
  - Keine Endpunkte in `requestController.ts` für Cerebro-Verknüpfungen ❌
  - Keine Routes in `requests.ts` ❌
  - Keine Funktionen wie:
    - `getRequestCarticles()` ❌
    - `linkRequestToCarticle()` ❌
    - `unlinkRequestFromCarticle()` ❌

- **Frontend:**
  - Keine Integration von `CerebroArticleSelector` in Request-Modals ❌
  - Keine echte Anzeige verknüpfter Requests in `ArticleView.tsx` (nur Platzhalter) ❌

**Fazit:** Datenmodell und Frontend-Interface sind vorhanden, aber die komplette Backend-API und Frontend-Integration fehlen.

---

## Zusammenfassung: Was wirklich fehlt

### ❌ **Komplett fehlend:**

1. **Tag-Management:**
   - Backend Controller und Routes für Tag-CRUD
   - Frontend Tag-Selektor und Anzeige
   - Tag-Verwaltung im Editor

2. **Publishing-Filterung:**
   - Backend Filterung nach `isPublished` in ALLEN Endpunkten
   - Frontend UI für `isPublished` (Checkbox, Status-Anzeige, Filter)

3. **Request-Integration:**
   - Backend API-Endpunkte (analog zu Task-Integration)
   - Frontend Integration in Request-Modals

---

## Was bereits funktioniert (Korrektur zur ersten Analyse)

### ✅ **Tags:**
- Tags werden in der Suche durchsucht
- Tags werden beim Artikel-Abruf mitgeladen
- Interface ist vorhanden

### ✅ **isPublished:**
- Feld kann gesetzt/aktualisiert werden
- Datenmodell funktioniert

### ✅ **Requests:**
- Datenmodell ist vorhanden
- Interface ist vorhanden
- Beim Löschen werden Verknüpfungen entfernt

---

## Priorisierte To-Do-Liste (korrigiert)

### 1. Publishing-Filterung (Kritisch)
**Warum zuerst:** Das `isPublished`-Feld existiert, wird aber nicht verwendet. Alle Artikel werden immer angezeigt, was wahrscheinlich nicht gewünscht ist.

**Benötigt:**
- Backend: Filterung in `getAllArticles`, `getArticleBySlug`, `getArticleById`, `getArticlesStructure`, `searchArticles`
- Backend: Berechtigungsprüfung (wer darf Entwürfe sehen?)
- Frontend: `isPublished` Checkbox in `ArticleEdit.tsx`
- Frontend: Filter in `ArticleList.tsx`
- Frontend: Status-Anzeige in `ArticleView.tsx`

### 2. Tag-Management (Wichtig)
**Warum:** Tags werden bereits in der Suche verwendet, aber können nicht verwaltet werden.

**Benötigt:**
- Backend: `cerebroTagsController.ts` mit CRUD-Operationen
- Backend: Routes in `cerebro.ts`
- Backend: Endpunkte zum Hinzufügen/Entfernen von Tags zu Artikeln
- Frontend: Tag-Selektor-Komponente
- Frontend: Tag-Anzeige in `ArticleView.tsx`
- Frontend: Tag-Verwaltung in `ArticleEdit.tsx`
- Frontend: Tag-Filter in `ArticleList.tsx`

### 3. Request-Integration (Wichtig)
**Warum:** Task-Integration ist vorhanden, Request-Integration sollte analog funktionieren.

**Benötigt:**
- Backend: Endpunkte in `requestController.ts` (analog zu Task-Integration)
- Backend: Routes in `requests.ts`
- Frontend: Integration von `CerebroArticleSelector` in Request-Modals
- Frontend: Anzeige verknüpfter Requests in `ArticleView.tsx` (ersetzt Platzhalter)

---

## Geschätzte Komplexität (korrigiert)

1. **Publishing-Filterung:** ~4-5 Stunden
   - Backend: ~2-3 Stunden (Filterung + Berechtigungen)
   - Frontend: ~2 Stunden (UI-Elemente)

2. **Tag-Management:** ~6-8 Stunden
   - Backend: ~3-4 Stunden (Controller + Routes)
   - Frontend: ~3-4 Stunden (Komponenten + Integration)

3. **Request-Integration:** ~3-4 Stunden
   - Backend: ~1-2 Stunden (analog zu Tasks)
   - Frontend: ~2 Stunden (Integration)

**Gesamt:** ~13-17 Stunden

---

## Wichtigste Erkenntnis

Die erste Analyse war zu optimistisch. Viele Features sind **im Datenmodell vorhanden** und **teilweise implementiert**, aber die **kritischen Teile fehlen komplett**:

- Tags können nicht verwaltet werden (trotz vorhandener Suche)
- `isPublished` hat keine Wirkung (trotz vorhandenem Feld)
- Requests können nicht verknüpft werden (trotz vorhandenem Datenmodell)

Es handelt sich also um **unvollständige Features**, nicht um komplett fehlende.









