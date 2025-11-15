# API-Aufruf-Standardisierung: Umstellungsplan

## Problemanalyse

Bei der Analyse des Codes wurden inkonsistente API-Aufrufe im Frontend identifiziert, die in der Produktionsumgebung zu Problemen führen:

1. **Diagnose des Problems**:
   - Im Entwicklungsmodus wird die API-URL korrekt als `http://localhost:5000/api` gesetzt
   - Im Produktionsmodus wird sie als `/api` gesetzt (relativ, da Nginx die Weiterleitung übernimmt)
   - Einige Komponenten verwenden jedoch direkte axios-Aufrufe mit Konkatenation der API-Pfade:
     - `axios.get(`${API_URL}${API_ENDPOINTS.X}`)` führt zu doppelten `/api/api/...` Pfaden
     - `axios.get(`${API_BASE_URL}/api/...`)` führt ebenfalls zu doppelten Pfaden

2. **Betroffene Komponenten**:
   - `PayrollComponent.tsx`: Verwendet `API_BASE_URL` mit `/api/` direkt
   - `SavedFilterTags.tsx`: Verwendet `API_URL` mit API_ENDPOINTS konkateniert
   - `FilterPane.tsx`: Verwendet ähnliche problematische Muster
   - Mehrere andere Komponenten verwenden direkte axios-Aufrufe statt der standardisierten Instanz

## Standardisierungslösung

Die in `config/axios.ts` definierte Lösung soll überall einheitlich verwendet werden:

```javascript
// Bereits korrekt konfiguriert:
const instance = axios.create({
  baseURL: API_URL, // Enthält bereits den korrekten Pfad
  withCredentials: true,
  // ...
});
```

## Notwendige Änderungen

### 1. Direkte axios-Aufrufe mit API_URL/API_BASE_URL

#### 1.1. `PayrollComponent.tsx` (5 Änderungen)

**Zeile 1-2:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import { API_BASE_URL } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
```

**Zeile 64:** Mitarbeiter laden
```javascript
// ALT:
const response = await axios.get(`${API_BASE_URL}/api/users`);

// NEU:
const response = await axiosInstance.get('/users');
```

**Zeile 87:** Abrechnungen laden
```javascript
// ALT:
const response = await axios.get(`${API_BASE_URL}/api/payroll?userId=${selectedUser}`);

// NEU:
const response = await axiosInstance.get(`/payroll?userId=${selectedUser}`);
```

**Zeile 117-123:** Stunden speichern und Berechnung starten
```javascript
// ALT:
const response = await axios.post(`${API_BASE_URL}/api/payroll/hours`, {
  userId: selectedUser,
  hours
});
// Automatisch berechnen
const calculatedPayroll = await axios.get(`${API_BASE_URL}/api/payroll/calculate?payrollId=${response.data.id}`);

// NEU:
const response = await axiosInstance.post(`/payroll/hours`, {
  userId: selectedUser,
  hours
});
// Automatisch berechnen
const calculatedPayroll = await axiosInstance.get(`/payroll/calculate?payrollId=${response.data.id}`);
```

**Zeile 142:** Abrechnung berechnen
```javascript
// ALT:
const response = await axios.get(`${API_BASE_URL}/api/payroll/calculate?payrollId=${payrollId}`);

// NEU:
const response = await axiosInstance.get(`/payroll/calculate?payrollId=${payrollId}`);
```

**Zeile 154:** PDF generieren
```javascript
// ALT:
window.open(`${API_BASE_URL}/api/payroll/pdf/${payrollId}`, '_blank');

// NEU:
window.open(`${window.location.origin}/api/payroll/pdf/${payrollId}`, '_blank');
```

#### 1.2. `SavedFilterTags.tsx` (2 Änderungen)

**Zeile 3-4:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
```

**Zeile 46:** Filter laden
```javascript
// ALT:
const response = await axios.get(`${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// NEU:
const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId));
```

**Zeile 99:** Filter löschen
```javascript
// ALT:
await axios.delete(`${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_ID(filterId)}`, {
  headers: {
    Authorization: `Bearer ${token}`
  }
});

// NEU:
await axiosInstance.delete(API_ENDPOINTS.SAVED_FILTERS.BY_ID(filterId));
```

#### 1.3. `TeamWorktimeControl.tsx` (3 Änderungen)

**Zeile 2-3:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
```

**Zeile 23:** Aktive Benutzer laden
```javascript
// ALT:
const response = await axios.get(API_ENDPOINTS.TEAM_WORKTIME.ACTIVE);

// NEU:
const response = await axiosInstance.get(API_ENDPOINTS.TEAM_WORKTIME.ACTIVE);
```

**Zeile 39:** Benutzer-Tag laden
```javascript
// ALT:
const response = await axios.get(`${API_ENDPOINTS.TEAM_WORKTIME.USER_DAY}?date=${selectedDate}`);

// NEU:
const response = await axiosInstance.get(`${API_ENDPOINTS.TEAM_WORKTIME.USER_DAY}?date=${selectedDate}`);
```

**Zeile 55:** Benutzer-Zeiterfassung stoppen
```javascript
// ALT:
await axios.post(API_ENDPOINTS.TEAM_WORKTIME.STOP_USER, {
  userId: userId,
  date: selectedDate
});

// NEU:
await axiosInstance.post(API_ENDPOINTS.TEAM_WORKTIME.STOP_USER, {
  userId: userId,
  date: selectedDate
});
```

#### 1.4. `FilterPane.tsx` (2 Änderungen)

**Zeile 3-4:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
```

**Zeile 59:** Existierende Filter laden
```javascript
// ALT:
const response = await axios.get(
  `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)}`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

// NEU:
const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId));
```

**Zeile 174:** Filter speichern
```javascript
// ALT:
const response = await axios.post(
  `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
  {
    tableId,
    name: filterName,
    conditions: validConditions,
    operators: logicalOperators
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

// NEU:
const response = await axiosInstance.post(
  API_ENDPOINTS.SAVED_FILTERS.BASE,
  {
    tableId,
    name: filterName,
    conditions: validConditions,
    operators: logicalOperators
  }
);
```

#### 1.5. `FilterRow.tsx` (2 Änderungen)

**Zeile 2-3:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
```

**Zeile 104:** Benutzer für Dropdown laden
```javascript
// ALT:
const response = await axios.get(
  `${API_URL}/users`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

// NEU:
const response = await axiosInstance.get('/users');
```

**Zeile 123:** Rollen für Dropdown laden
```javascript
// ALT:
const response = await axios.get(
  `${API_URL}/roles`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

// NEU:
const response = await axiosInstance.get('/roles');
```

#### 1.6. `RoleManagementTab.tsx` (2 Änderungen)

**Zeile 5:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
```

**Zeile 959:** Existierende Filter laden
```javascript
// ALT:
const existingFiltersResponse = await axios.get(
  `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)}`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

// NEU:
const existingFiltersResponse = await axiosInstance.get(
  API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)
);
```

**Zeile 980:** Filter speichern
```javascript
// ALT:
await axios.post(
  `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BASE}`,
  {
    tableId,
    name: filterName,
    conditions: validConditions,
    operators: logicalOperators
  },
  {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

// NEU:
await axiosInstance.post(
  API_ENDPOINTS.SAVED_FILTERS.BASE,
  {
    tableId,
    name: filterName,
    conditions: validConditions,
    operators: logicalOperators
  }
);
```

### 2. API-Module mit direktem API_BASE_URL Import

#### 2.1. `worktimeApi.ts` (Umfassende Änderung)

**Zeile 1-2:** Import-Änderung
```javascript
// ALT:
import api from '../config/axios.ts';
import { API_BASE_URL } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
```

**Weitere Änderungen in worktimeApi.ts**:
```javascript
// ALT:
const response = await api.post('/worktime', {

// NEU:
const response = await axiosInstance.post('/worktime', {
```
Alle `api.` Aufrufe durch `axiosInstance.` ersetzen.

#### 2.2. `identificationDocumentApi.ts` (1 Änderung)

**Zeile 136-141:** Download-URL generieren
```javascript
// ALT:
export const getDocumentDownloadUrl = (docId: number): string => {
  return `${API_URL}${API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.DOWNLOAD(docId)}`;
};

// NEU:
export const getDocumentDownloadUrl = (docId: number): string => {
  // Verwende window.location.origin für eine robuste absolute URL
  return `${window.location.origin}/api${API_ENDPOINTS.IDENTIFICATION_DOCUMENTS.DOWNLOAD(docId)}`;
};
```

### 3. Komponenten die direkt axios importieren

#### 3.1. `CerebroArticleSelector.tsx`

**Zeile 1-3:** Import-Änderung
```javascript
// ALT:
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';

// NEU:
import React, { useState, useEffect } from 'react';
import axiosInstance from '../config/axios.ts';
```

**Zeile 48-55:** Fehlerbehandlung anpassen
```javascript
// ALT:
} catch (err) {
  console.error('Fehler beim Abrufen der Artikel:', err);
  if (axios.isAxiosError(err)) {
    setError(err.response?.data?.message || err.message);
  } else {
    setError('Ein unerwarteter Fehler ist aufgetreten');
  }

// NEU:
} catch (err) {
  console.error('Fehler beim Abrufen der Artikel:', err);
  // Einfachere Fehlerbehandlung ohne axios-Import
  const axiosError = err as any;
  setError(axiosError.response?.data?.message || axiosError.message || 'Ein unerwarteter Fehler ist aufgetreten');
}
```

#### 3.2. `EditRequestModal.tsx`

**Zeile 1:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Weitere Änderungen abhängig von den Axios-Aufrufen in dieser Datei.

#### 3.3. `EditTaskModal.tsx`

**Zeile 1:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Weitere Änderungen abhängig von den Axios-Aufrufen in dieser Datei.

#### 3.4. `CreateTaskModal.tsx`

**Zeile 2:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Weitere Änderungen abhängig von den Axios-Aufrufen in dieser Datei.

#### 3.5. `CreateRequestModal.tsx`

**Zeile 1:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Weitere Änderungen abhängig von den Axios-Aufrufen in dieser Datei.

#### 3.6. `Requests.tsx`

**Zeile 1:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Axios-Aufrufe in dieser Datei müssen angepasst werden:

**Zeilen mit direkten axios-Aufrufen:**
```javascript
// ALT:
const existingFiltersResponse = await axios.get(
  `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)}`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

// NEU:
const existingFiltersResponse = await axiosInstance.get(
  API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)
);
```

Weitere Änderungen für alle ähnlichen axios-Aufrufe in der Datei.

#### 3.7. `WorktimeStats.tsx`

**Zeile 6:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Axios-Aufrufe in dieser Datei müssen angepasst werden. Überprüfung erforderlich, ob API_URL oder API_BASE_URL verwendet wird.

#### 3.8. `Worktracker.tsx`

**Zeile 1:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Axios-Aufrufe in dieser Datei müssen angepasst werden. Besondere Beachtung auf Zeilen:
```javascript
// ALT:
const existingFiltersResponse = await axios.get(
  `${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)}`,
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);

// NEU:
const existingFiltersResponse = await axiosInstance.get(
  API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)
);
```

#### 3.9. `ActiveUsersList.tsx`

**Zeile 14:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Axios-Aufrufe in dieser Datei müssen angepasst werden. Überprüfung auf Verwendung von API_URL oder API_ENDPOINTS.

#### 3.10. `WorktimeTracker.tsx`

**Zeile 4:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';

// NEU:
import axiosInstance from '../config/axios.ts';
```

Axios-Aufrufe in dieser Datei müssen wie folgt angepasst werden:
```javascript
// ALT:
const response = await axios.post(
  `${API_URL}${API_ENDPOINTS.WORKTIME.START}`,
  { branchId },
  { headers: { Authorization: `Bearer ${token}` } }
);

// NEU:
const response = await axiosInstance.post(
  API_ENDPOINTS.WORKTIME.START,
  { branchId }
);
```

### 4. Authentifizierungs-bezogene Komponenten

#### 4.1. `useAuth.tsx` (Hook) - Konkrete Änderungen

**Problemidentifikation**:
Nach Analyse der tatsächlichen Implementierung in `useAuth.tsx` wurden kritische Punkte identifiziert:

1. Es findet eine doppelte Header-Manipulation statt:
```javascript
// In useAuth.tsx, Zeile 42-43:
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

2. Die gleiche doppelte Manipulation erfolgt auch beim Login (Zeile 90-91) und wird entfernt beim Logout (Zeile 119-120)

**Erforderliche Änderungen**:

**Zeile 2-4:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_BASE_URL, API_URL, API_ENDPOINTS } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
```

**Zeile 42-43:** Token-Header-Manipulation
```javascript
// ALT:
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// NEU:
// Manipulation nur an axiosInstance, da config/axios.ts bereits einen Interceptor hat
axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

**Zeile 90-91:** Token-Header beim Login
```javascript
// ALT:
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// NEU:
axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

**Zeile 119-120:** Token-Header beim Logout
```javascript
// ALT:
delete axios.defaults.headers.common['Authorization'];
delete axiosInstance.defaults.headers.common['Authorization'];

// NEU:
delete axiosInstance.defaults.headers.common['Authorization'];
```

#### 4.2. `authService.ts` - Konkrete Änderungen

**Problemidentifikation**:
In `authService.ts` wird zusätzlich zu axiosInstance auch direktes axios verwendet:

```javascript
// In authService.ts, Zeilen 74-85:
// Axios Interceptor für Token
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**Erforderliche Änderungen**:

**Zeile 1-3:** Import-Änderung
```javascript
// ALT:
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_URL } from '../config/api.ts';

// NEU:
import axiosInstance from '../config/axios.ts';
```

**Zeile 74-85:** Entfernen des separaten axios-Interceptors
```javascript
// ALT:
// Axios Interceptor für Token
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// NEU:
// Entfernt, da die Token-Behandlung bereits in config/axios.ts stattfindet
```

#### 4.3. `config/axios.ts` - Optimierung der Token-Handhabung

**Problemidentifikation**:
In `config/axios.ts` gibt es mehrere Stellen, an denen der Token gesetzt wird, was zu Redundanz führt:

```javascript
// Zeile 25-28: Direkte Setzung
const token = localStorage.getItem('token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Zeile 32-35: Erneute Setzung im Interceptor
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // ...
```

**Erforderliche Änderungen**:

**Zeile 25-28:** Entfernen der redundanten Token-Setzung
```javascript
// ALT:
const token = localStorage.getItem('token');
if (token) {
  instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// NEU:
// Entfernt, da dies bereits im request-Interceptor behandelt wird
```

**Zeile 41-47**: Verbesserte Fehlerbehandlung im Response-Interceptor
```javascript
// ALT:
instance.interceptors.response.use(
  (response) => {
    console.debug(`API-Response von: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('Fehler im Response Interceptor:', error);
    return Promise.reject(error);
  }
);

// NEU:
instance.interceptors.response.use(
  (response) => {
    console.debug(`API-Response von: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    // Standardisierte Fehlerbehandlung
    console.error('API-Fehler:', error.response?.status, error.response?.data || error.message);
    
    // Token-Probleme erkennen
    if (error.response?.status === 401) {
      // Wenn 401, Token entfernen
      localStorage.removeItem('token');
      delete instance.defaults.headers.common['Authorization'];
      // Kein automatisches Redirect - überlassen wir den Komponenten
    }
    
    return Promise.reject(error);
  }
);
```

### 5. Spezialfall: Datei-Downloads und URLs

#### 5.1. `ArticleView.tsx`

Die Verwendung direkter Pfade für Medien-URLs kann bestehen bleiben, da diese korrekt als relative Pfade angegeben sind:

```javascript
// KORREKT:
const mediaPath = `/uploads/cerebro/${media.path.split('/').pop()}`;
```

### 6. Mobile App Anpassungen

#### 6.1. `IntranetMobileApp/src/api/apiClient.ts`

**Problem**: Doppelte Axios-Konfiguration in separaten Dateien:
- `IntranetMobileApp/src/config/axios.ts`
- `IntranetMobileApp/src/api/apiClient.ts`

**Änderungen**:

```javascript
// ALT: Zeile 1-17 in apiClient.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ...

// Basis-URL für alle API-Anfragen
const BASE_URL = 'http://192.168.1.120:5000/api';

// Timeouts
const TIMEOUT = 30000; // 30 Sekunden

// Erstelle eine axios-Instanz mit Standardkonfiguration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// NEU:
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ...

// Zentrale axios-Instanz importieren
import axiosInstance from '../config/axios.ts';
```

**Zeile 22-38**: Interceptor entfernen
```javascript
// ALT: 
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@IntranetApp:token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// NEU:
// Entfernt, da dies bereits in config/axios.ts behandelt wird
```

#### 6.2. `IntranetMobileApp/src/config/axios.ts`

**Zeile 74-85**: Token-Refresh korrigieren

```javascript
// ALT:
// Token aktualisieren
const response = await axios.post(
  `${API_CONFIG.API_HOST}/api/auth/refresh`,
  { refreshToken },
  { headers: API_CONFIG.HEADERS }
);

// NEU:
// Token aktualisieren mit korrektem Pfad
const response = await axios.post(
  `/auth/refresh`, // Ohne doppeltes /api
  { refreshToken },
  { 
    baseURL: API_CONFIG.API_HOST, 
    headers: API_CONFIG.HEADERS 
  }
);
```

## Testplan für Authentifizierung und API-Zugriffe

### 1. Login/Logout-Tests

**1.1 Login-Prozess**
1. Anwendung im ausgeloggten Zustand starten
2. Auf Login-Seite navigieren und Anmeldedaten eingeben
3. Im Netzwerk-Tab überprüfen, dass der Login-Request korrekt an `/api/auth/login` gesendet wird
4. Überprüfen, dass nach erfolgreichem Login zum Dashboard weitergeleitet wird

**1.2 Logout-Prozess**
1. Bei angemeldetem Benutzer auf Logout klicken
2. Im Netzwerk-Tab überprüfen, dass der Logout-Request korrekt an `/api/auth/logout` gesendet wird
3. Überprüfen, dass nach erfolgreichem Logout zur Login-Seite weitergeleitet wird

**1.3 Token-Handling**
1. Nach Login überprüfen, ob der Token korrekt im localStorage gespeichert ist
2. Überprüfen, dass nachfolgende API-Anfragen den Authorization-Header korrekt enthalten
3. Nach Logout überprüfen, ob der Token korrekt aus dem localStorage entfernt wurde

### 2. API-Aufrufe mit Authentifizierung

**2.1 Autorisierte Routen**
1. Bei angemeldetem Benutzer API-Aufrufe zu geschützten Routen testen
2. Überprüfen, dass die Anfragen den Authorization-Header korrekt enthalten
3. Überprüfen, dass die Antworten korrekt empfangen und verarbeitet werden

**2.2 Abgelaufene Tokens / Erneute Authentifizierung**
1. Mit einem manipulierten (abgelaufenen) Token Anfragen testen
2. Überprüfen, ob die Anwendung korrekt auf 401-Fehler reagiert
3. Überprüfen, ob die Weiterleitung zur Login-Seite funktioniert

### 3. Besondere Tests für window.open

**3.1 PDF-Download in PayrollComponent**
1. PayrollComponent öffnen und PDF-Download testen
2. Überprüfen, dass die URL korrekt gebildet wird (`${window.location.origin}/api/payroll/pdf/${payrollId}`)
3. In verschiedenen Umgebungen testen:
   - Lokale Entwicklung (localhost)
   - Produktionsumgebung

**3.2 Datei-Download in identificationDocumentApi**
1. Dokumenten-Download testen
2. Überprüfen, dass die URL korrekt gebildet wird
3. Testen in verschiedenen Hosting-Umgebungen

### 4. Mobile App Tests

**4.1 Mobile App API-Aufrufe**
1. Login auf der Mobile App testen
2. Überprüfen, dass API-Anfragen korrekt gesendet werden (ohne doppelte /api-Pfade)
3. Überprüfen, dass Token korrekt gespeichert und verwendet wird

**4.2 Token-Aktualisierung in der Mobile App**
1. Verhalten bei abgelaufenem Token testen
2. Überprüfen, dass die Token-Aktualisierung korrekt funktioniert
3. Testen des Fehlerhandlings, wenn keine Verbindung besteht

## Konsequenzen und weitere Anpassungen

1. **Keine Breaking Changes im Backend**:
   - Backend-Routen bleiben unverändert
   - Serverrouten beginnnen korrekt mit `/api/...`

2. **Konsistenz in API-Dokumentation**:
   - Die Dokumentation in `docs/technical/API_REFERENZ.md` ist korrekt
   - Sie weist bereits darauf hin, dass die zentrale `config/axios.ts` verwendet werden soll

3. **Cross-Environment Kompatibilität**:
   - Die standardisierte Lösung funktioniert in allen Umgebungen:
     - Lokale Entwicklung
     - Entwicklung über IP
     - Produktion

4. **Mobile App Kompatibilität**:
   - Anpassungen in der Mobile App für konsistente API-Pfade
   - Entfernung redundanter Code-Strukturen

5. **Fehlerhandling**:
   - Konsistentes Fehlerhandling durch axiosInstance-Interceptoren
   - Verbesserte Debugging-Fähigkeiten

6. **Datei- und Medien-URLs**:
   - Robuste Lösung für absolute URLs mit window.location.origin
   - Relative URLs bleiben für statische Medien erhalten

7. **Authentifizierungs-Konsistenz**:
   - Vereinheitlichung der Token-Handhabung in allen Komponenten
   - Entfernung von redundanten Token-Manipulationen

## Rollout-Strategie

1. **Schrittweise Implementierung**:
   - Tag 1: Änderungen in den kritischsten Komponenten implementieren
     - PayrollComponent.tsx
     - SavedFilterTags.tsx
     - FilterPane.tsx
   - Tag 2: API-Module und weitere Komponenten
     - worktimeApi.ts
     - identificationDocumentApi.ts
     - TeamWorktimeControl.tsx
   - Tag 3: Mobile App Anpassungen
     - IntranetMobileApp/src/api/apiClient.ts
     - IntranetMobileApp/src/config/axios.ts
   - Tag 4: Authentifizierungs-bezogene Teile
     - useAuth.tsx
     - authService.ts
     - config/axios.ts Optimierungen

2. **Monitoring**:
   - Nach jeder Batch-Implementierung die Netzwerkaufrufe überprüfen
   - Debug-Ausgaben in apiClient.ts temporär aktiviert lassen:
     ```javascript
     console.log('DEBUGAUSGABE API-Client: Vollständige Request URL:', fullUrl);
     ```

3. **Rollback-Plan**:
   - Git-Branches für jede Implementierungsphase erstellen
   - Bei Problemen auf den vorherigen Zustand zurücksetzen

## Dokumentations-Updates

1. **Code-Standards aktualisieren**:
   - In `docs/core/CODING_STANDARDS.md` klare Regeln für API-Aufrufe dokumentieren
   - Beispiel hinzufügen:
     ```javascript
     // RICHTIG:
     import axiosInstance from '../config/axios.ts';
     const response = await axiosInstance.get('/users');
     
     // FALSCH:
     import axios from 'axios';
     import { API_URL } from '../config/api.ts';
     const response = await axios.get(`${API_URL}/users`);
     ```

2. **Entwickler-Onboarding**:
   - Dokumentation in `docs/ONBOARDING.md` aktualisieren oder erstellen
   - Klare Anweisungen zur Verwendung der API-Clients

3. **Medien- und Datei-URL-Richtlinien**:
   - In `docs/technical/API_REFERENZ.md` Abschnitt zu URLs hinzufügen:
     - API-Aufrufe: Immer über axiosInstance
     - Statische Medien: Relative Pfade verwenden
     - Downloads: Robuste absolute URLs mit window.location.origin

## Zeitplan

1. **Analyse und Planung**: Abgeschlossen
2. **Implementierung**:
   - Tag 1 (2023-XX-XX): Kritische Komponenten (PayrollComponent.tsx, SavedFilterTags.tsx)
   - Tag 2 (2023-XX-XX): API-Module und weitere Komponenten
   - Tag 3 (2023-XX-XX): Mobile App Anpassungen
   - Tag 4 (2023-XX-XX): Authentifizierungs-bezogene Komponenten und Tests
3. **Testing**: 1-2 Tage nach Implementierung
   - Besonderer Fokus auf Login/Logout und geschützte Routen
4. **Rollout**: Nach bestandenen Tests
5. **Monitoring**: 1 Woche nach Rollout

## Verantwortlichkeiten

- Frontend-Entwickler: Umsetzung der Änderungen
  - Entwickler 1: PayrollComponent.tsx, FilterPane.tsx, FilterRow.tsx
  - Entwickler 2: SavedFilterTags.tsx, TeamWorktimeControl.tsx, API-Module
  - Entwickler 3: Mobile App Anpassungen
  - Entwickler 4: Authentifizierungs-bezogene Komponenten und Tests
- Backend-Entwickler: Unterstützung bei der API-Integration
- QA: Durchführung der definierten Testfälle
- DevOps: Überwachung des Rollouts, Bereitstellung der Testumgebung
