# API Best Practices

Diese Dokumentation bietet Best Practices für API-Aufrufe im Frontend unserer Intranet-Anwendung, um eine konsistente und fehlerfreie Integration zu gewährleisten.

## Inhaltsverzeichnis

1. [API-Client Verwendung](#api-client-verwendung)
2. [API-Endpunkt Definition](#api-endpunkt-definition)
3. [Korrekter API-Aufruf](#korrekter-api-aufruf)
4. [Fehlerbehandlung](#fehlerbehandlung)
5. [Typische Fehler und deren Lösung](#typische-fehler-und-deren-lösung)
6. [Migration von bestehenden Aufrufen](#migration-von-bestehenden-aufrufen)

## API-Client Verwendung

### Korrekter Import des API-Clients

Der zentrale API-Client ist in `frontend/src/api/apiClient.ts` definiert und sollte konsistent verwendet werden.

```typescript
// RICHTIG: Import des zentralen API-Clients
import apiClient from '../api/apiClient.ts';

// RICHTIG: Import spezialisierter API-Services
import { userApi, roleApi } from '../api/apiClient.ts';
```

### Falsche Importe vermeiden

```typescript
// FALSCH: Direkter axios Import für API-Aufrufe
import axios from 'axios';

// FALSCH: Direkter Import der Axios-Instanz, wenn apiClient bereits existiert
import axiosInstance from '../config/axios.ts';
```

## API-Endpunkt Definition

API-Endpunkte sind zentral in `frontend/src/config/api.ts` definiert und sollten konsequent verwendet werden.

### Korrekte Verwendung von API_ENDPOINTS

```typescript
import { API_ENDPOINTS } from '../config/api.ts';

// RICHTIG: Verwendung von API_ENDPOINTS für den Pfad
const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
const user = await apiClient.get(API_ENDPOINTS.USERS.BY_ID(userId));
```

### Fehlerhafte Pfadkombinationen vermeiden

```typescript
import { API_URL, API_ENDPOINTS } from '../config/api.ts';

// FALSCH: Kombination von API_URL und API_ENDPOINTS
const response = await axios.get(`${API_URL}${API_ENDPOINTS.USERS.BASE}`);

// FALSCH: Doppeltes /api Präfix
const response = await apiClient.get('/api/users');
```

## Korrekter API-Aufruf

### Beispiele für korrekte API-Aufrufe

```typescript
// Beispiel 1: Benutzer laden mit apiClient
const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
setUsers(response.data);

// Beispiel 2: Verwendung spezialisierter API-Services
const users = await userApi.getAll();
const role = await roleApi.getById(roleId);

// Beispiel 3: POST-Anfrage mit apiClient
const response = await apiClient.post(API_ENDPOINTS.TASKS.BASE, newTask);
```

### Komplettes Beispiel einer Komponente

```typescript
import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient.ts';
import { API_ENDPOINTS } from '../config/api.ts';

const UserList: React.FC = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
        setUsers(response.data);
      } catch (error) {
        console.error('Fehler beim Laden der Benutzer:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Rest der Komponente...
};
```

## Fehlerbehandlung

Implementieren Sie konsistente Fehlerbehandlung in allen API-Aufrufen:

```typescript
try {
  const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
  setUsers(response.data);
} catch (error) {
  console.error('Fehler beim Laden der Benutzer:', error);
  // Benutzerfreundliche Fehleranzeige
  setError('Benutzer konnten nicht geladen werden');
} finally {
  setLoading(false);
}
```

## Typische Fehler und deren Lösung

### 1. Doppeltes /api-Präfix

**Problem:**
```typescript
const response = await api.post('/api/cerebro/links', data);
```

**Lösung:**
```typescript
const response = await api.post('/cerebro/links', data);
```

### 2. Direktes Hardcoding der API-URL

**Problem:**
```typescript
const response = await axios.get(`${API_BASE_URL}/api/users`);
```

**Lösung:**
```typescript
const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
```

### 3. Inkonsistente Pfadkombination

**Problem:**
```typescript
const response = await axios.get(`${API_URL}${API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId)}`);
```

**Lösung:**
```typescript
const response = await apiClient.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(tableId));
```

## Migration von bestehenden Aufrufen

Beim Migrieren bestehender API-Aufrufe zu der standardisierten Methode, befolgen Sie diese Schritte:

1. Identifizieren Sie die vorhandenen Endpoints in `API_ENDPOINTS` oder fügen Sie fehlende hinzu
2. Ersetzen Sie direkte axios-Aufrufe mit `apiClient`
3. Entfernen Sie Pfadkombinationen mit `API_URL` oder `API_BASE_URL`
4. Testen Sie die API-Aufrufe nach der Migration

### Beispiel einer Migration

**Vor:**
```typescript
import axios from 'axios';
import { API_BASE_URL } from '../config/api.ts';

const fetchUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/users`);
    setUsers(response.data);
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer:', error);
  }
};
```

**Nach:**
```typescript
import apiClient from '../api/apiClient.ts';
import { API_ENDPOINTS } from '../config/api.ts';

const fetchUsers = async () => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.USERS.BASE);
    setUsers(response.data);
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer:', error);
  }
};
```

Durch die konsistente Anwendung dieser Best Practices werden die API-Aufrufe in der gesamten Anwendung vereinheitlicht und die Fehleranfälligkeit reduziert. 