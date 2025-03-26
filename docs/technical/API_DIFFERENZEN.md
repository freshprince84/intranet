# API-Differenzen: Frontend vs. Mobile App

Dieses Dokument beschreibt die Unterschiede in der API-Nutzung zwischen dem Web-Frontend und der mobilen React Native App, insbesondere im Bereich der Zeiterfassung.

## Grundlegende Unterschiede

### 1. Endpunkt-Struktur

**Web-Frontend:**
- Verwendet individuelle Funktionen pro API-Aufruf
- Zugriff erfolgt über separate Funktionen in `worktimeApi.ts`

**Mobile App:**
- Verwendet klassenbasierte Service-Struktur
- Implementiert BaseApiService mit generischen CRUD-Methoden
- Spezifische Methoden pro Entität in Service-Klassen

### 2. Authentifizierung

**Web-Frontend:**
- Verwendet localStorage für Token-Speicherung
- Token wird explizit zu jeder Anfrage hinzugefügt

**Mobile App:**
- Verwendet AsyncStorage für persistente Token-Speicherung
- Token wird über Axios-Interceptors automatisch hinzugefügt

## Zeiterfassung (Worktime)

### Endpunkte

| Funktion | Web-Frontend | Mobile App |
|----------|--------------|------------|
| Zeiterfassung starten | POST `/worktime` | POST `/worktime/start` |
| Zeiterfassung stoppen | PUT `/worktime/stop/:userId` | POST `/worktime/stop` |
| Aktive Zeit prüfen | GET `/worktime/active/:userId` | GET `/worktime/active` |
| Zeiten nach Datum | GET `/worktime/user/:userId/date/:date` | GET `/worktime?date=:date` |

### Detaillierte Unterschiede

#### 1. Zeiterfassung starten

**Web-Frontend:**
```typescript
export const startWorktime = async (
  userId: number, 
  startTime: string, 
  comment?: string
) => {
  try {
    const response = await axiosInstance.post('/worktime', {
      userId,
      startTime,
      comment
    });
    return response.data;
  } catch (error) {
    console.error('Fehler beim Starten der Zeiterfassung:', error);
    throw error;
  }
};
```

**Mobile App:**
```typescript
async start(branchId: string): Promise<MobileWorkTime> {
  const startTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
  const response = await axiosInstance.post<MobileWorkTime>(
    `${this.endpoint}/start`,
    { 
      branchId,
      startTime: startTime.toISOString()
    }
  );
  return response.data;
}
```

**Unterschiede:**
- Frontend erfordert explizite userId-Übergabe, Mobile App nutzt den authentifizierten Benutzer
- Mobile App berechnet die startTime automatisch, Frontend erwartet den Wert als Parameter
- Mobile App verwendet den speziellen `/start`-Endpunkt, Frontend nutzt den allgemeinen Worktime-Endpunkt
- Frontend unterstützt ein Kommentarfeld, Mobile App fokussiert sich auf die Kernfunktionalität

#### 2. Zeiterfassung stoppen

**Web-Frontend:**
```typescript
export const stopWorktime = async (
  userId: number,
  endTime: string
) => {
  try {
    const response = await axiosInstance.put(`/worktime/stop/${userId}`, {
      endTime
    });
    return response.data;
  } catch (error) {
    console.error('Fehler beim Stoppen der Zeiterfassung:', error);
    throw error;
  }
};
```

**Mobile App:**
```typescript
async stop(endTime?: Date): Promise<MobileWorkTime> {
  // Wenn endTime nicht übergeben wurde, aktuelle Zeit verwenden
  const stopTime = endTime || new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
  
  console.log('Stopping timer with endTime:', stopTime.toISOString());
  
  const response = await axiosInstance.post<MobileWorkTime>(
    `${this.endpoint}/stop`,
    { 
      endTime: stopTime.toISOString()
    }
  );
  
  console.log('Stop timer response:', response.data);
  
  return response.data;
}
```

**Unterschiede:**
- Frontend verwendet PUT-Methode, Mobile App verwendet POST-Methode
- Frontend benötigt die explizite userId im Pfad, Mobile App nicht
- Mobile App hat einen optionalen endTime-Parameter mit Fallback auf aktuelle Zeit
- Mobile App enthält ausführlichere Protokollierung für Debugging-Zwecke

#### 3. Aktive Zeiterfassung prüfen

**Web-Frontend:**
```typescript
export const getActiveWorktime = async (userId: number) => {
  try {
    const response = await axiosInstance.get(`/worktime/active/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
    throw error;
  }
};
```

**Mobile App:**
```typescript
async getActive(): Promise<{ active: boolean; startTime?: string; id?: number; branchId?: number }> {
  console.log('Rufe aktive Zeiterfassung ab');
  const response = await axiosInstance.get<{ active: boolean; startTime?: string; id?: number; branchId?: number }>(
    `${this.endpoint}/active`
  );
  console.log('Active worktime API response:', response.data);
  return response.data;
}
```

**Unterschiede:**
- Frontend benötigt die userId im Pfad, Mobile App nutzt den generischen Endpunkt
- Mobile App definiert einen spezifischeren Rückgabetyp mit einzelnen Feldern
- Mobile App protokolliert den API-Aufruf und die Antwort für Debugging-Zwecke

## Offline-Unterstützung

Ein wesentlicher Unterschied zwischen den beiden Plattformen ist die Offline-Unterstützung:

**Web-Frontend:**
- Keine spezifische Offline-Unterstützung
- Funktioniert nur mit aktiver Internetverbindung

**Mobile App:**
- Implementiert vollständige Offline-Unterstützung
- Lokale Speicherung von Zeiterfassungsdaten mittels AsyncStorage
- Erkennung des Verbindungsstatus mit NetInfo-Bibliothek
- Automatische Synchronisierung bei Wiederverbindung
- Spezieller API-Endpunkt für die Synchronisierung mehrerer Offline-Einträge

```typescript
// Mobile App: Offline-Synchronisierung
async syncOfflineEntries(entries: Partial<MobileWorkTime>[]): Promise<any> {
  const response = await axiosInstance.post<any>(
    `${this.endpoint}/sync-offline`,
    entries
  );
  return response.data;
}
```

## Fazit

Die Hauptunterschiede in der API-Nutzung zwischen Frontend und Mobile App bestehen in:

1. **Architektur**: Funktional vs. klassenbasiert
2. **Authentication**: Local Storage vs. AsyncStorage + Interceptors
3. **Endpunkte**: Unterschiedliche Pfade und HTTP-Methoden für ähnliche Operationen
4. **Offline-Fähigkeit**: Mobile App bietet robuste Offline-Unterstützung
5. **Debugging**: Mobile App enthält umfangreichere Protokollierung
6. **Parameter**: Mobile App nutzt mehr implizite Werte, Frontend erfordert explizite Parameter

Diese Unterschiede reflektieren die unterschiedlichen Anforderungen und Beschränkungen der jeweiligen Plattformen sowie die Entwicklung der API im Laufe der Zeit. 