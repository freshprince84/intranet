# Fix-Plan: PayrollComponent - Tab "Nomina" lädt nicht

## Problem-Analyse

### Identifizierte Probleme:

1. **Kritisches Problem: `hasPermission` in useEffect Dependencies**
   - `hasPermission` wird in der Dependency-Liste des `useEffect` verwendet (Zeile 42)
   - `hasPermission` ist eine Funktion, die bei jedem Render neu erstellt wird (nicht mit `useCallback` stabilisiert)
   - Dies führt zu einer Endlosschleife: useEffect → Render → neue hasPermission → useEffect → ...
   - **Folge**: Die Komponente lädt nicht oder bleibt im Loading-State hängen

2. **Fehlende Wartezeit auf Berechtigungen**
   - `permissionsLoading` wird nicht aus `usePermissions` extrahiert
   - Die Komponente prüft Berechtigungen, bevor diese geladen sind
   - **Folge**: Falsche Berechtigungsprüfung oder fehlende Daten

3. **Fehlender useRef für einmaligen Load**
   - Kein Mechanismus, der sicherstellt, dass `loadPayrollData` nur einmal ausgeführt wird
   - Bei jedem `permissionsLoading`-Change würde neu geladen werden
   - **Folge**: Unnötige API-Calls oder mehrfache Loads

4. **Fehlende Dependency für `loadPayrollData`**
   - `loadPayrollData` wird im `useEffect` verwendet, ist aber nicht in der Dependency-Liste
   - **Folge**: ESLint-Warnungen und potenzielle Bugs

5. **Fehlender Loading-State für Berechtigungen**
   - Keine Anzeige, während Berechtigungen geladen werden
   - **Folge**: Benutzer sieht nichts oder falschen Zustand

## Bewährtes Muster (aus anderen Komponenten)

### Referenz-Implementierungen:
- `JoinRequestsList.tsx` (Zeilen 64-196)
- `OrganizationSettings.tsx` (Zeilen 36-104)

### Korrektes Muster:
1. `permissionsLoading` aus `usePermissions` extrahieren
2. Warten auf `permissionsLoading === false` im `useEffect`
3. `useRef` für einmaligen Load verwenden (`hasInitialLoadRef`)
4. `hasPermission` NICHT in Dependencies, sondern nur innerhalb des `useEffect` aufrufen
5. Optional: `loadPayrollData` mit `useCallback` stabilisieren
6. Loading-State für Berechtigungen anzeigen

## Implementierungsplan

### Schritt 1: Imports erweitern
- `useRef` zu React-Imports hinzufügen
- `useCallback` zu React-Imports hinzufügen (optional, für `loadPayrollData`)

### Schritt 2: usePermissions Hook erweitern
- `loading: permissionsLoading` aus `usePermissions` extrahieren
- Aktuell: `const { hasPermission } = usePermissions();`
- Neu: `const { hasPermission, loading: permissionsLoading } = usePermissions();`

### Schritt 3: useRef für einmaligen Load hinzufügen
- `const hasInitialLoadRef = useRef(false);` nach den State-Deklarationen

### Schritt 4: loadPayrollData mit useCallback stabilisieren (optional)
- `loadPayrollData` in `useCallback` wrappen
- Dependencies: `[t]` (für Übersetzungen)

### Schritt 5: useEffect umstrukturieren
**Aktueller Code (FEHLERHAFT):**
```typescript
useEffect(() => {
  if (hasPermission('payroll', 'read')) {
    loadPayrollData();
  } else {
    setLoading(false);
  }
}, [hasPermission]);
```

**Neuer Code (KORREKT):**
```typescript
useEffect(() => {
  // Warte bis Berechtigungen geladen sind
  if (permissionsLoading) {
    return;
  }

  // Prüfe Berechtigung direkt (nicht in Dependencies!)
  const hasPermissionToView = hasPermission('payroll', 'read');
  
  if (!hasPermissionToView) {
    setLoading(false);
    hasInitialLoadRef.current = true; // Verhindere weitere Versuche
    return;
  }

  // Nur einmal beim initialen Load ausführen
  if (hasInitialLoadRef.current) {
    return;
  }

  // Markiere als geladen und lade Daten
  hasInitialLoadRef.current = true;
  loadPayrollData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [permissionsLoading]); // Nur permissionsLoading als Dependency
```

### Schritt 6: Loading-State für Berechtigungen hinzufügen
**Vor dem bestehenden `if (!hasPermission('payroll', 'read'))` Check:**
```typescript
if (permissionsLoading) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-700 dark:text-gray-300">
          {t('common.loadingPermissions', { defaultValue: 'Berechtigungen werden geladen...' })}
        </span>
      </div>
    </div>
  );
}
```

### Schritt 7: Cleanup für mountedRef (optional, aber empfohlen)
- `const mountedRef = useRef(true);` hinzufügen
- In `useEffect` prüfen: `if (!mountedRef.current) return;`
- Cleanup-Funktion: `return () => { mountedRef.current = false; };`
- In `loadPayrollData` prüfen, ob Component noch gemountet ist

## Detaillierte Code-Änderungen

### Datei: `frontend/src/components/PayrollComponent.tsx`

#### Änderung 1: Imports
```typescript
// ALT:
import React, { useState, useEffect } from 'react';

// NEU:
import React, { useState, useEffect, useRef, useCallback } from 'react';
```

#### Änderung 2: usePermissions Hook
```typescript
// ALT:
const { hasPermission } = usePermissions();

// NEU:
const { hasPermission, loading: permissionsLoading } = usePermissions();
```

#### Änderung 3: useRef hinzufügen
```typescript
// Nach den State-Deklarationen (nach Zeile 30):
const hasInitialLoadRef = useRef(false);
const mountedRef = useRef(true);
```

#### Änderung 4: loadPayrollData mit useCallback (optional)
```typescript
// ALT:
const loadPayrollData = async () => {
  // ... bestehender Code ...
};

// NEU:
const loadPayrollData = useCallback(async () => {
  if (!mountedRef.current) return;
  
  try {
    setLoading(true);
    // Temporäre Mock-Daten bis zur Umstrukturierung
    setTimeout(() => {
      if (!mountedRef.current) return;
      
      const now = new Date();
      const monthNames = [
        t('months.january'), t('months.february'), t('months.march'),
        t('months.april'), t('months.may'), t('months.june'),
        t('months.july'), t('months.august'), t('months.september'),
        t('months.october'), t('months.november'), t('months.december')
      ];
      const monthName = monthNames[now.getMonth()];
      setPayrollData({
        totalHours: 160,
        totalEarnings: 8000,
        deductions: 1200,
        netPay: 6800,
        period: `${monthName} ${now.getFullYear()}`
      });
      setLoading(false);
    }, 500);
  } catch (error: any) {
    if (!mountedRef.current) return;
    console.error('Fehler beim Laden der Lohndaten:', error);
    setError(t('payroll.payrollComponent.loadError'));
    setLoading(false);
  }
}, [t]);
```

#### Änderung 5: useEffect umstrukturieren
```typescript
// ALT (Zeilen 36-42):
useEffect(() => {
  if (hasPermission('payroll', 'read')) {
    loadPayrollData();
  } else {
    setLoading(false);
  }
}, [hasPermission]);

// NEU:
useEffect(() => {
  // Cleanup beim Unmount
  return () => {
    mountedRef.current = false;
  };
}, []);

useEffect(() => {
  // Warte bis Berechtigungen geladen sind
  if (permissionsLoading) {
    return;
  }

  // Prüfe Berechtigung direkt (nicht in Dependencies!)
  const hasPermissionToView = hasPermission('payroll', 'read');
  
  if (!hasPermissionToView) {
    setLoading(false);
    hasInitialLoadRef.current = true; // Verhindere weitere Versuche
    return;
  }

  // Nur einmal beim initialen Load ausführen
  if (hasInitialLoadRef.current) {
    return;
  }

  // Markiere als geladen und lade Daten
  hasInitialLoadRef.current = true;
  loadPayrollData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [permissionsLoading, loadPayrollData]); // loadPayrollData nur wenn useCallback verwendet wird
```

#### Änderung 6: Loading-State für Berechtigungen
```typescript
// VOR dem bestehenden Check (vor Zeile 73):
if (permissionsLoading) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-700 dark:text-gray-300">
          {t('common.loadingPermissions', { defaultValue: 'Berechtigungen werden geladen...' })}
        </span>
      </div>
    </div>
  );
}
```

## Erwartetes Ergebnis

Nach der Implementierung:
1. ✅ Keine Endlosschleife mehr durch instabile `hasPermission`-Referenz
2. ✅ Korrekte Wartezeit auf geladene Berechtigungen
3. ✅ Einmaliger Load beim initialen Mount
4. ✅ Korrekte Loading-States für Benutzer-Feedback
5. ✅ Keine ESLint-Warnungen bezüglich Dependencies
6. ✅ Tab "Nomina" lädt korrekt und zeigt Daten an

## Test-Szenarien

1. **Normaler Load**: Tab öffnen → Berechtigungen werden geladen → Daten werden angezeigt
2. **Keine Berechtigung**: Tab öffnen → "Keine Berechtigung"-Meldung wird angezeigt
3. **Berechtigungen noch nicht geladen**: Tab öffnen → Loading-Spinner für Berechtigungen → dann Daten
4. **Tab-Wechsel**: Zwischen Tabs wechseln → keine mehrfachen Loads

## Risiken

- **Niedrig**: Änderungen folgen bewährtem Muster aus anderen Komponenten
- **Niedrig**: Keine API-Änderungen erforderlich
- **Niedrig**: Nur Frontend-Änderungen

## Abhängigkeiten

- Keine externen Abhängigkeiten
- Verwendet bestehende Hooks und Patterns
- Keine Backend-Änderungen erforderlich


