# Implementationsplan: Task-Cerebro Verknüpfung

## Übersicht
Dieser Plan beschreibt die Implementierung einer Funktion, die es ermöglicht, einen oder mehrere Cerebro-Artikel mit Tasks zu verknüpfen.

## Technische Anforderungen
- Verknüpfung von Tasks mit Cerebro-Artikeln
- Benutzerfreundliche Auswahl von Artikeln
- Anzeige verknüpfter Artikel im Task
- Verwaltung der Verknüpfungen

## Datenbankänderungen
### Neue Tabelle: TaskCerebroLinks
```prisma
model TaskCerebroLink {
  id          Int      @id @default(autoincrement())
  taskId      Int
  cerebroId   Int
  createdAt   DateTime @default(now())
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  cerebro     Cerebro  @relation(fields: [cerebroId], references: [id], onDelete: Cascade)

  @@unique([taskId, cerebroId])
}
```

## Backend-Änderungen
1. Neue API-Endpunkte:
   - GET `/api/tasks/:taskId/cerebro` - Verknüpfte Artikel abrufen
   - POST `/api/tasks/:taskId/cerebro/:cerebroId` - Artikel verknüpfen
   - DELETE `/api/tasks/:taskId/cerebro/:cerebroId` - Verknüpfung entfernen
   - GET `/api/cerebro/search` - Artikel suchen (für Auswahl)

2. Service-Erweiterungen:
   - TaskService um Cerebro-Funktionen erweitern
   - CerebroService für Artikelsuche und -verwaltung

## Frontend-Änderungen
1. Neue Komponenten:
   - `CerebroSelector.tsx` - Suchfeld und Auswahl für Artikel
   - `LinkedArticles.tsx` - Anzeige verknüpfter Artikel
   - `ArticlePreview.tsx` - Vorschau eines Artikels

2. Integration in bestehende Komponenten:
   - Erweiterung von `CreateTaskModal.tsx` und `EditTaskModal.tsx`
   - Anpassung der Task-Detailansicht
   - Hinzufügen eines Cerebro-Tabs oder -Abschnitts

3. UI/UX:
   - Suchfeld mit Autovervollständigung
   - Chip-basierte Darstellung verknüpfter Artikel
   - Schnellvorschau von Artikeln
   - Drag & Drop Unterstützung

## Implementierungsschritte
1. Datenbank:
   - Prisma Schema aktualisieren
   - Migration erstellen und ausführen
   - Seed-Daten für Tests erstellen

2. Backend:
   - API-Endpunkte implementieren
   - Services erweitern
   - Tests schreiben

3. Frontend:
   - Neue Komponenten entwickeln
   - Integration in bestehende Modals
   - Styling und UX-Optimierung

4. Testing:
   - Unit Tests für neue Funktionen
   - Integration Tests für UI
   - End-to-End Tests für Verknüpfungen

## Geschätzter Aufwand
- Datenbankänderungen: 2h
- Backend-Implementierung: 6h
- Frontend-Implementierung: 8h
- Testing und Bugfixing: 4h
- Dokumentation: 2h

Gesamt: ~22h

## Risiken und Abhängigkeiten
- Abhängigkeit von Cerebro-API
- Performance bei vielen verknüpften Artikeln
- Konsistenz bei Artikel-Löschung
- Berechtigungsprüfung für Artikel

## Nächste Schritte
1. Review des Implementationsplans
2. Abstimmung mit Cerebro-Team
3. Beginn mit Datenbankänderungen
4. Iterative Implementierung der Features 