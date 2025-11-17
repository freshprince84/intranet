# Plan: Automatische Weiterleitung zum Login bei abgelaufenem Token

## Problembeschreibung

Wenn ein Token abgelaufen ist oder ein User abgemeldet wurde, die Seite jedoch noch geöffnet hat und dann etwas anklickt, erscheinen unschöne Fehlermeldungen bzgl. Token abgelaufen etc. Erst wenn man die Seite neulädt, wird man zum Login geleitet.

## Ziel

Es soll automatisch zum Login "geladen" werden, wenn der Token abgelaufen ist / man abgemeldet wird. So dass man gar nicht mehr denkt man sei noch eingeloggt & etwas anklicken kann, wenn man es gar nicht mehr ist.

## Analyse des aktuellen Zustands

### Aktuelle Implementierung

1. **`frontend/src/config/axios.ts`**:
   - Response-Interceptor loggt Fehler nur, macht aber keine automatische Weiterleitung
   - Bei 401-Fehlern passiert nichts automatisch

2. **`frontend/src/hooks/useAuth.tsx`**:
   - `fetchCurrentUser` entfernt Token bei Fehlern, aber keine automatische Weiterleitung
   - User-State wird zurückgesetzt, aber die Seite bleibt auf der aktuellen Route

3. **`frontend/src/components/ProtectedRoute.tsx`**:
   - Prüft nur beim Rendern, ob ein User vorhanden ist
   - Weiterleitung zum Login nur beim initialen Rendern, nicht bei API-Fehlern

### Problem

- Bei abgelaufenem Token und User-Aktion → 401-Fehler
- Fehlermeldungen werden angezeigt
- Erst beim Neuladen der Seite wird man zum Login weitergeleitet (weil `ProtectedRoute` dann keinen User findet)

## Lösung

### Schritt 1: Erweiterung des Axios Response-Interceptors

**Datei**: `frontend/src/config/axios.ts`

**Änderungen**:
- Im Response-Interceptor bei 401-Fehlern:
  1. Token aus localStorage entfernen
  2. Authorization-Header aus Axios-Instanzen entfernen
  3. User-State zurücksetzen (über Event-Mechanismus)
  4. Automatisch zum Login weiterleiten

**Herausforderung**: 
- Axios-Interceptor läuft außerhalb des React-Kontexts
- `useNavigate` kann nicht direkt verwendet werden
- **Lösung**: `window.location.href = '/login'` verwenden für sofortige Weiterleitung

**Implementierung**:
```typescript
// Response-Interceptor erweitern
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Bei 401 Unauthorized: Token abgelaufen oder ungültig
    if (error.response?.status === 401) {
      // Token entfernen
      localStorage.removeItem('token');
      delete instance.defaults.headers.common['Authorization'];
      delete axios.defaults.headers.common['Authorization'];
      
      // User-State zurücksetzen über Custom Event
      window.dispatchEvent(new CustomEvent('auth:logout'));
      
      // Nur weiterleiten, wenn nicht bereits auf Login-Seite
      if (window.location.pathname !== '/login') {
        // Sofortige Weiterleitung zum Login
        window.location.href = '/login';
      }
      
      // Fehler nicht weiterwerfen, da wir bereits weiterleiten
      return Promise.reject(error);
    }
    
    // Andere Fehler normal behandeln
    console.error('Fehler im Response Interceptor:', error);
    return Promise.reject(error);
  }
);
```

### Schritt 2: Event-Listener im AuthProvider

**Datei**: `frontend/src/hooks/useAuth.tsx`

**Änderungen**:
- Event-Listener für `auth:logout` Event hinzufügen
- Bei Event: User-State zurücksetzen (`setUser(null)`)

**Implementierung**:
```typescript
useEffect(() => {
  const handleAuthLogout = () => {
    setUser(null);
    setIsLoading(false);
  };
  
  window.addEventListener('auth:logout', handleAuthLogout);
  
  return () => {
    window.removeEventListener('auth:logout', handleAuthLogout);
  };
}, []);
```

### Schritt 3: Verhindern von mehrfachen Weiterleitungen

**Problem**: Bei mehreren gleichzeitigen API-Calls könnte es zu mehrfachen Weiterleitungen kommen.

**Lösung**: 
- Flag setzen, um zu verhindern, dass mehrere 401-Fehler zu mehrfachen Weiterleitungen führen
- Oder: Prüfen, ob bereits auf Login-Seite, dann nicht weiterleiten (bereits in Schritt 1 implementiert)

**Implementierung in axios.ts**:
```typescript
let isRedirecting = false;

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      // ... Weiterleitung ...
    }
    return Promise.reject(error);
  }
);
```

## Umsetzungsschritte

1. ✅ **Analyse abgeschlossen**
2. ⏳ **Plan erstellt** (dieses Dokument)
3. ⏳ **Warten auf Bestätigung**
4. ⏳ **Schritt 1: Axios Response-Interceptor erweitern**
5. ⏳ **Schritt 2: Event-Listener im AuthProvider hinzufügen**
6. ⏳ **Schritt 3: Verhindern von mehrfachen Weiterleitungen**
7. ⏳ **Testen:**
   - Token manuell ablaufen lassen / entfernen
   - Aktion auf der Seite ausführen
   - Prüfen, ob automatische Weiterleitung zum Login funktioniert
   - Prüfen, ob keine Fehlermeldungen mehr erscheinen

## Technische Details

### Warum `window.location.href` statt `useNavigate`?

- Axios-Interceptor läuft außerhalb des React-Kontexts
- `useNavigate` ist ein React Hook und kann nur in Komponenten verwendet werden
- `window.location.href` funktioniert überall und führt zu einer vollständigen Seitenneuladung
- Dies ist hier gewünscht, da der User-State komplett zurückgesetzt werden soll

### Warum Custom Event für User-State?

- Axios-Interceptor hat keinen direkten Zugriff auf React-State
- Custom Event ermöglicht Kommunikation zwischen Axios-Interceptor und React-Komponenten
- AuthProvider kann auf Event reagieren und User-State zurücksetzen

## Erwartetes Verhalten nach Implementierung

1. User hat Seite geöffnet, Token läuft ab
2. User klickt auf etwas → API-Call mit abgelaufenem Token
3. Server antwortet mit 401
4. Axios-Interceptor:
   - Entfernt Token
   - Setzt User-State zurück (über Event)
   - Leitet sofort zum Login weiter
5. User sieht Login-Seite, keine Fehlermeldungen
6. User kann sich neu einloggen

## Risikoanalyse

### 🔴 Kritische Risiken

#### 1. **Infinite Redirect Loop**
**Problem**: Wenn die Login-Seite selbst einen 401 zurückgibt (z.B. bei `/auth/login` mit ungültigem Token), könnte es zu einem Loop kommen.

**Lösung**: 
- Endpoints ausschließen, die 401 zurückgeben können, aber nicht Token-Ablauf bedeuten:
  - `/auth/login` - sollte nie 401 sein, aber falls doch, nicht weiterleiten
  - `/auth/logout` - kann 401 sein, aber sollte ignoriert werden
- Prüfung: `if (window.location.pathname === '/login') return Promise.reject(error);`

#### 2. **Mehrfache gleichzeitige 401-Fehler**
**Problem**: Wenn mehrere API-Calls gleichzeitig 401 zurückgeben, könnte es zu mehrfachen Weiterleitungen kommen.

**Lösung**: 
- Flag `isRedirecting` setzen, bevor Weiterleitung
- Prüfung: `if (isRedirecting) return Promise.reject(error);`
- Flag nach kurzer Zeit zurücksetzen (falls Weiterleitung fehlschlägt)

#### 3. **Laufende Requests werden unterbrochen**
**Problem**: Wenn User gerade einen Upload/Download macht und Token abläuft, wird Request abgebrochen.

**Lösung**: 
- Bei Uploads/Downloads: Fehler anzeigen, aber nicht sofort weiterleiten?
- Oder: Request abbrechen und Fehlermeldung zeigen
- **Entscheidung**: Weiterleiten, da Token abgelaufen = keine gültige Session mehr

### 🟡 Mittlere Risiken

#### 4. **Refresh Token nicht genutzt**
**Problem**: Mobile App hat Refresh-Token-Logik, Frontend nicht. Sollten wir erst versuchen, Token zu refreshen?

**Analyse**: 
- Backend hat `/auth/refresh` Endpoint (in Mobile App verwendet)
- Frontend hat keine Refresh-Token-Logik
- **Entscheidung**: Für jetzt direkt weiterleiten. Refresh-Token kann später hinzugefügt werden.

#### 5. **Nicht alle 401 sind Token-Ablauf**
**Problem**: 401 kann auch bedeuten:
- Token ungültig (nicht nur abgelaufen)
- User wurde gelöscht
- Account wurde deaktiviert
- Token wurde manuell invalidiert

**Lösung**: 
- Alle 401-Fehler gleich behandeln: Weiterleitung zum Login
- User kann sich neu einloggen und sieht dann ggf. spezifische Fehlermeldung

#### 6. **State-Konsistenz**
**Problem**: Andere Komponenten könnten noch User-State haben (z.B. in Contexts, lokaler State).

**Lösung**: 
- `window.location.href` führt zu vollständiger Seitenneuladung
- Alle States werden zurückgesetzt
- AuthProvider wird neu initialisiert

#### 7. **User Experience: Plötzliche Weiterleitung**
**Problem**: User könnte gerade etwas tippen/eingeben, dann plötzliche Weiterleitung → Datenverlust.

**Lösung**: 
- Unvermeidlich bei Token-Ablauf
- Alternative: Kurze Nachricht anzeigen ("Ihre Sitzung ist abgelaufen") → dann weiterleiten
- **Entscheidung**: Direkt weiterleiten (wie gewünscht)

#### 8. **ErrorHandler wird umgangen**
**Problem**: ErrorHandler könnte noch Fehlermeldungen anzeigen wollen, bevor wir weiterleiten.

**Lösung**: 
- ErrorHandler wird trotzdem aufgerufen (Fehler wird weitergeworfen)
- Aber Weiterleitung passiert sofort, daher wird Fehlermeldung nicht angezeigt
- **Akzeptabel**: Weiterleitung hat Priorität

### 🟢 Geringe Risiken

#### 9. **Backend-Logout nicht aufgerufen**
**Problem**: Server wird nicht benachrichtigt, dass User abgemeldet wurde.

**Lösung**: 
- Bei Token-Ablauf ist Session bereits ungültig
- Server-Logout ist nicht notwendig
- Bei manuellem Logout wird `/auth/logout` aufgerufen (bleibt unverändert)

#### 10. **AbortController in fetchCurrentUser**
**Problem**: `fetchCurrentUser` verwendet AbortController. Was passiert, wenn Request abgebrochen wird?

**Lösung**: 
- AbortController wird bereits korrekt behandelt
- Bei 401 wird Request nicht abgebrochen, sondern fehlschlägt normal
- Keine Änderung notwendig

#### 11. **ProtectedRoute vs. Axios-Interceptor**
**Problem**: Könnten sich widersprechen, wenn beide gleichzeitig reagieren.

**Lösung**: 
- Axios-Interceptor reagiert zuerst (bei API-Call)
- ProtectedRoute reagiert nur beim Rendern
- `window.location.href` führt zu Neuladen, ProtectedRoute wird dann korrekt ausgeführt

#### 12. **window.location.href vs. React Router**
**Problem**: `window.location.href` führt zu vollständiger Seitenneuladung, nicht zu SPA-Navigation.

**Lösung**: 
- Gewollt: Vollständige Neuladung setzt alle States zurück
- React Router Navigation würde State behalten
- **Korrekt**: `window.location.href` ist hier die richtige Wahl

## Verbesserte Implementierung mit Risikominimierung

### Schritt 1: Erweiterte Axios-Interceptor-Logik

```typescript
let isRedirecting = false;
const REDIRECT_TIMEOUT = 100; // ms

instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Bei 401 Unauthorized: Token abgelaufen oder ungültig
    if (error.response?.status === 401) {
      // Endpoints ausschließen, die 401 zurückgeben können, aber nicht Token-Ablauf bedeuten
      const excludedPaths = ['/auth/login', '/auth/logout'];
      const requestPath = error.config?.url || '';
      
      // Prüfe ob Endpoint ausgeschlossen werden soll
      const shouldExclude = excludedPaths.some(path => requestPath.includes(path));
      
      // Prüfe ob bereits auf Login-Seite
      const isOnLoginPage = window.location.pathname === '/login';
      
      // Prüfe ob bereits Weiterleitung läuft
      if (isRedirecting) {
        return Promise.reject(error);
      }
      
      // Nur weiterleiten wenn nicht ausgeschlossen und nicht bereits auf Login
      if (!shouldExclude && !isOnLoginPage) {
        isRedirecting = true;
        
        // Token entfernen
        localStorage.removeItem('token');
        delete instance.defaults.headers.common['Authorization'];
        delete axios.defaults.headers.common['Authorization'];
        
        // User-State zurücksetzen über Custom Event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        // Kurze Verzögerung, um sicherzustellen, dass Event verarbeitet wird
        setTimeout(() => {
          // Sofortige Weiterleitung zum Login
          window.location.href = '/login';
        }, REDIRECT_TIMEOUT);
      }
      
      // Fehler weiterwerfen (für ErrorHandler, falls gewünscht)
      return Promise.reject(error);
    }
    
    // Andere Fehler normal behandeln
    console.error('Fehler im Response Interceptor:', error);
    return Promise.reject(error);
  }
);
```

### Schritt 2: Event-Listener mit Fehlerbehandlung

```typescript
useEffect(() => {
  const handleAuthLogout = () => {
    setUser(null);
    setIsLoading(false);
  };
  
  window.addEventListener('auth:logout', handleAuthLogout);
  
  return () => {
    window.removeEventListener('auth:logout', handleAuthLogout);
  };
}, []);
```

## Test-Szenarien

1. ✅ **Token abgelaufen + normale Aktion**: Weiterleitung zum Login
2. ✅ **Mehrere gleichzeitige 401-Fehler**: Nur eine Weiterleitung
3. ✅ **401 auf Login-Seite**: Keine Weiterleitung (kein Loop)
4. ✅ **401 bei /auth/logout**: Keine Weiterleitung
5. ✅ **Upload/Download bei Token-Ablauf**: Request wird abgebrochen, Weiterleitung
6. ✅ **User tippt gerade etwas**: Weiterleitung (unvermeidlich)

## Offene Fragen / Entscheidungen

- Soll bei 401-Fehlern eine kurze Nachricht angezeigt werden ("Ihre Sitzung ist abgelaufen") oder direkt weitergeleitet werden?
  - **Entscheidung**: Direkt weiterleiten, keine Nachricht (wie gewünscht)
- Soll auch bei 403-Fehlern weitergeleitet werden?
  - **Entscheidung**: Nein, nur bei 401 (Token abgelaufen). 403 ist Berechtigungsfehler, nicht Authentifizierungsfehler.
- Soll Refresh-Token-Logik implementiert werden?
  - **Entscheidung**: Nein, für jetzt. Kann später hinzugefügt werden, wenn gewünscht.

