# MODUL CEREBRO

Dieses Dokument beschreibt die Implementierung und Funktionsweise des Cerebro Wiki-Systems im Intranet-Projekt. Das Cerebro-Modul ermöglicht die Erstellung und Verwaltung einer internen Wissensdatenbank.

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Komponenten](#komponenten)
3. [Datenmodell](#datenmodell)
4. [API-Endpunkte](#api-endpunkte)
5. [Benutzeroberfläche](#benutzeroberfläche)
6. [Berechtigungen](#berechtigungen)
7. [Integration mit anderen Modulen](#integration-mit-anderen-modulen)
8. [Dateihandling](#dateihandling)

## Überblick

Das Cerebro Wiki ist ein internes Wissensmanagementsystem, das als zentrale Wissensdatenbank für das Unternehmen dient. Es ermöglicht Mitarbeitern, wichtige Dokumentationen, Anleitungen und Ressourcen zu erstellen, zu verwalten und einfach zu finden.

Hauptfunktionen:
- Erstellung und Bearbeitung von Wiki-Artikeln in Markdown-Format
- Hierarchische Organisation von Inhalten
- Medien-Upload (Bilder, Dokumente)
- Verknüpfung mit externen Ressourcen
- Tagging und Kategorisierung
- Suchfunktion
- Integration mit Tasks und Requests

## Komponenten

### Cerebro-Hauptkomponente

Die `Cerebro.tsx`-Komponente dient als Haupteinstiegspunkt und Router für das Wiki-System:

```typescript
// Vereinfachtes Beispiel
const Cerebro: React.FC = () => {
  const { hasPermission } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const canCreateArticles = hasPermission('cerebro', 'write', 'cerebro');
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cerebro Wiki</h1>
        <div className="flex space-x-4">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          {canCreateArticles && (
            <Button onClick={openNewArticleModal}>
              Neuer Artikel
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <ArticleStructure />
        </div>
        <div className="lg:col-span-3">
          <Routes>
            <Route path="/" element={<ArticleOverview />} />
            <Route path="/article/:slug" element={<ArticleView />} />
            <Route path="/edit/:id" element={<ArticleEditor />} />
            <Route path="/new" element={<ArticleEditor isNew />} />
            <Route path="/search" element={<SearchResults query={searchQuery} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};
```

### Artikel-Editor

Die `ArticleEditor`-Komponente ermöglicht das Erstellen und Bearbeiten von Artikeln:

```typescript
// Vereinfachtes Beispiel
const ArticleEditor: React.FC<{ isNew?: boolean, articleId?: number }> = ({ isNew, articleId }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [tags, setTags] = useState<Tag[]>([]);
  
  // Weitere Implementierung...
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">
        {isNew ? 'Neuen Artikel erstellen' : 'Artikel bearbeiten'}
      </h2>
      
      <form onSubmit={handleSubmit}>
        {/* Formularfelder */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        {/* Weitere Formularfelder */}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Inhalt (Markdown)</label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            preview
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button type="submit" variant="primary">
            {isNew ? 'Erstellen' : 'Aktualisieren'}
          </Button>
        </div>
      </form>
    </div>
  );
};
```

### Artikel-Anzeige

Die `ArticleView`-Komponente zeigt einen einzelnen Artikel an:

```typescript
// Vereinfachtes Beispiel
const ArticleView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, error } = useArticle(slug);
  const { hasPermission } = usePermissions();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!article) return <NotFound />;
  
  const canEdit = hasPermission('cerebro', 'write', 'cerebro');
  
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">{article.title}</h1>
        
        {canEdit && (
          <div className="flex space-x-2">
            <Button onClick={() => navigateToEdit(article.id)}>
              Bearbeiten
            </Button>
          </div>
        )}
      </div>
      
      <div className="prose max-w-none">
        <MarkdownRenderer content={article.content} />
      </div>
      
      {article.tags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Tags:</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <Tag key={tag.id} name={tag.name} />
            ))}
          </div>
        </div>
      )}
      
      {article.externalLinks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Externe Links:</h3>
          <ul className="space-y-1">
            {article.externalLinks.map(link => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {link.title || link.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

## Datenmodell

Das Cerebro Wiki-System verwendet folgendes Datenmodell:

### CerebroCarticle

```prisma
model CerebroCarticle {
  id          Int       @id @default(autoincrement())
  title       String
  content     String
  slug        String    @unique
  parentId    Int?
  parent      CerebroCarticle?  @relation("CarticleHierarchy", fields: [parentId], references: [id])
  children    CerebroCarticle[] @relation("CarticleHierarchy")
  createdById Int
  createdBy   User      @relation("CarticleCreator", fields: [createdById], references: [id])
  updatedById Int?
  updatedBy   User?     @relation("CarticleUpdater", fields: [updatedById], references: [id])
  isPublished Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  // Relationen
  tasks       TaskCerebroCarticle[]
  requests    RequestCerebroCarticle[]
  media       CerebroMedia[]
  externalLinks CerebroExternalLink[]
  tags        CerebroTag[]  @relation("CerebroCarticleToCerebroTag")
  notifications Notification[]
}
```

### CerebroMedia

```prisma
model CerebroMedia {
  id          Int       @id @default(autoincrement())
  filename    String
  originalName String
  fileType    String
  fileSize    Int
  url         String
  thumbnailUrl String?
  carticleId  Int
  carticle    CerebroCarticle @relation(fields: [carticleId], references: [id])
  createdById Int
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
}
```

### CerebroExternalLink

```prisma
model CerebroExternalLink {
  id          Int       @id @default(autoincrement())
  url         String
  title       String?
  description String?
  type        String    @default("link")
  previewImage String?
  carticleId  Int
  carticle    CerebroCarticle @relation(fields: [carticleId], references: [id])
  createdById Int
  createdBy   User      @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
}
```

### CerebroTag

```prisma
model CerebroTag {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  color       String?
  articles    CerebroCarticle[] @relation("CerebroCarticleToCerebroTag")
}
```

### Integration mit Tasks und Requests

```prisma
model TaskCerebroCarticle {
  id          Int       @id @default(autoincrement())
  taskId      Int
  task        Task      @relation(fields: [taskId], references: [id])
  carticleId  Int
  carticle    CerebroCarticle @relation(fields: [carticleId], references: [id])
  createdAt   DateTime  @default(now())
  
  @@unique([taskId, carticleId])
}

model RequestCerebroCarticle {
  id          Int       @id @default(autoincrement())
  requestId   Int
  request     Request   @relation(fields: [requestId], references: [id])
  carticleId  Int
  carticle    CerebroCarticle @relation(fields: [carticleId], references: [id])
  createdAt   DateTime  @default(now())
  
  @@unique([requestId, carticleId])
}
```

## API-Endpunkte

Das Cerebro Wiki-System verwendet folgende API-Endpunkte:

### Artikel-Endpunkte

- `GET /api/cerebro/carticles` - Alle Artikel abrufen
- `GET /api/cerebro/carticles/:id` - Artikel nach ID abrufen
- `GET /api/cerebro/carticles/slug/:slug` - Artikel nach Slug abrufen
- `GET /api/cerebro/carticles/structure` - Hierarchische Struktur abrufen
- `GET /api/cerebro/carticles/search` - Artikel suchen
- `POST /api/cerebro/carticles` - Neuen Artikel erstellen
- `PUT /api/cerebro/carticles/:id` - Artikel aktualisieren
- `DELETE /api/cerebro/carticles/:id` - Artikel löschen

### Medien-Endpunkte

- `POST /api/cerebro/media/upload` - Mediendatei hochladen
- `GET /api/cerebro/media/carticle/:carticleId` - Medien eines Artikels abrufen
- `GET /api/cerebro/media/:id` - Einzelne Mediendatei abrufen
- `PUT /api/cerebro/media/:id` - Mediendatei aktualisieren
- `DELETE /api/cerebro/media/:id` - Mediendatei löschen

### Externe Links

- `POST /api/cerebro/external-links` - Externen Link erstellen
- `GET /api/cerebro/external-links/carticle/:carticleId` - Links eines Artikels abrufen
- `GET /api/cerebro/external-links/:id` - Einzelnen Link abrufen
- `GET /api/cerebro/external-links/preview` - Vorschau für URL generieren
- `PUT /api/cerebro/external-links/:id` - Link aktualisieren
- `DELETE /api/cerebro/external-links/:id` - Link löschen

## Benutzeroberfläche

Die Benutzeroberfläche des Cerebro Wiki-Systems besteht aus folgenden Hauptkomponenten:

### 1. Navigationsstruktur

Die hierarchische Struktur der Artikel wird in einer Baumansicht dargestellt:

```tsx
// Vereinfachtes Beispiel
const ArticleStructure: React.FC = () => {
  const { data: structure, isLoading } = useArticleStructure();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-3">Navigation</h2>
      <ArticleTree items={structure} />
    </div>
  );
};

interface TreeItem {
  id: number;
  title: string;
  slug: string;
  children?: TreeItem[];
}

const ArticleTree: React.FC<{ items: TreeItem[] }> = ({ items }) => {
  return (
    <ul className="space-y-1">
      {items.map(item => (
        <li key={item.id}>
          <Link 
            to={`/cerebro/article/${item.slug}`}
            className="text-gray-700 hover:text-blue-600"
          >
            {item.title}
          </Link>
          
          {item.children && item.children.length > 0 && (
            <ul className="pl-4 mt-1 space-y-1">
              <ArticleTree items={item.children} />
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
};
```

### 2. Artikel-Übersicht

Die Startseite des Wikis zeigt eine Übersicht der wichtigsten oder kürzlich aktualisierten Artikel:

```tsx
// Vereinfachtes Beispiel
const ArticleOverview: React.FC = () => {
  const { data: recentArticles, isLoading: loadingRecent } = useRecentArticles();
  const { data: popularArticles, isLoading: loadingPopular } = usePopularArticles();
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Willkommen im Cerebro Wiki</h2>
        <p className="text-gray-600">
          Das Cerebro Wiki ist die zentrale Wissensdatenbank für unser Unternehmen.
          Hier findest du wichtige Dokumentationen, Anleitungen und Ressourcen.
        </p>
      </div>
      
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Kürzlich aktualisiert</h2>
        {loadingRecent ? (
          <LoadingSpinner />
        ) : (
          <ArticleList articles={recentArticles} />
        )}
      </div>
      
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Häufig aufgerufen</h2>
        {loadingPopular ? (
          <LoadingSpinner />
        ) : (
          <ArticleList articles={popularArticles} />
        )}
      </div>
    </div>
  );
};
```

### 3. Markdown-Editor

Der Wiki-Editor unterstützt Markdown mit Vorschau-Funktion:

```tsx
// Vereinfachtes Beispiel
const MarkdownEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  preview?: boolean;
}> = ({ value, onChange, preview }) => {
  const [showPreview, setShowPreview] = useState(false);
  
  return (
    <div className="border rounded">
      {preview && (
        <div className="flex border-b">
          <button
            className={`px-4 py-2 ${!showPreview ? 'bg-gray-100 font-medium' : ''}`}
            onClick={() => setShowPreview(false)}
          >
            Bearbeiten
          </button>
          <button
            className={`px-4 py-2 ${showPreview ? 'bg-gray-100 font-medium' : ''}`}
            onClick={() => setShowPreview(true)}
          >
            Vorschau
          </button>
        </div>
      )}
      
      {!showPreview ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 min-h-[300px] font-mono"
        />
      ) : (
        <div className="p-3 min-h-[300px] prose max-w-none">
          <MarkdownRenderer content={value} />
        </div>
      )}
    </div>
  );
};
```

## Berechtigungen

Das Cerebro Wiki-System verwendet folgende spezifische Berechtigungen:

1. **cerebro** (entityType: 'cerebro'): Grundlegende Berechtigung für das Erstellen und Bearbeiten von Artikeln
2. **cerebro_media** (entityType: 'cerebro'): Berechtigung zum Hochladen und Verwalten von Medien
3. **cerebro_links** (entityType: 'cerebro'): Berechtigung zum Hinzufügen und Verwalten von externen Links

Diese Berechtigungen können die folgenden Zugriffsebenen haben:
- **read**: Nur Lesezugriff
- **write**: Schreibzugriff (beinhaltet auch Lesezugriff)
- **both**: Voller Zugriff

Beispiel für die Implementierung der Berechtigungsprüfung:

```typescript
// Im Frontend
const { hasPermission } = usePermissions();

// Prüfen, ob der Benutzer Artikel erstellen darf
const canCreateArticles = hasPermission('cerebro', 'write', 'cerebro');

// Prüfen, ob der Benutzer Medien hochladen darf
const canUploadMedia = hasPermission('cerebro_media', 'write', 'cerebro');

// Prüfen, ob der Benutzer externe Links hinzufügen darf
const canAddLinks = hasPermission('cerebro_links', 'write', 'cerebro');
```

## Integration mit anderen Modulen

Das Cerebro Wiki-System ist mit anderen Modulen des Intranets integriert:

### 1. Task-Integration

Wiki-Artikel können mit Tasks verknüpft werden:

```typescript
// Vereinfachtes Beispiel
const TaskArticleLink: React.FC<{ taskId: number }> = ({ taskId }) => {
  const { data: linkedArticles, isLoading } = useTaskLinkedArticles(taskId);
  const { hasPermission } = usePermissions();
  
  const canLinkArticles = hasPermission('cerebro', 'write', 'cerebro');
  
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Verknüpfte Wiki-Artikel:</h3>
      
      {isLoading ? (
        <LoadingSpinner />
      ) : linkedArticles.length > 0 ? (
        <ul className="space-y-1">
          {linkedArticles.map(article => (
            <li key={article.id}>
              <Link
                to={`/cerebro/article/${article.slug}`}
                className="text-blue-600 hover:underline"
              >
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-sm">Keine Artikel verknüpft</p>
      )}
      
      {canLinkArticles && (
        <Button
          className="mt-2"
          onClick={() => openLinkArticleModal(taskId)}
        >
          Artikel verknüpfen
        </Button>
      )}
    </div>
  );
};
```

### 2. Request-Integration

Wiki-Artikel können auch mit Requests verknüpft werden:

```typescript
// Ähnliche Implementierung wie bei Tasks
const RequestArticleLink: React.FC<{ requestId: number }> = ({ requestId }) => {
  // Implementierung...
};
```

### 3. Notifications

Das Cerebro Wiki-System erzeugt Benachrichtigungen für verschiedene Ereignisse:

- Neuer Artikel erstellt
- Artikel aktualisiert
- Kommentar zu einem Artikel hinzugefügt
- Artikel mit Task/Request verknüpft

```typescript
// Backend-Implementierung (vereinfacht)
async function createNotificationsForArticleUpdate(articleId: number, userId: number) {
  // Finde alle Benutzer, die über Änderungen an diesem Artikel benachrichtigt werden sollten
  const usersToNotify = await findUsersInterestedInArticle(articleId);
  
  // Erstelle Benachrichtigungen
  for (const user of usersToNotify) {
    // Erstelle keine Benachrichtigung für den Benutzer, der die Änderung vorgenommen hat
    if (user.id === userId) continue;
    
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'CEREBRO_ARTICLE_UPDATED',
        message: 'Ein Artikel wurde aktualisiert',
        carticleId: articleId,
        isRead: false
      }
    });
  }
}
```

## Dateihandling

Das Cerebro Wiki-System unterstützt verschiedene Arten von Dateien:

### 1. Medien-Upload

Benutzer können Bilder und andere Dateien hochladen:

```typescript
// Vereinfachtes Beispiel für den Frontend-Teil
const MediaUploader: React.FC<{ carticleId: number }> = ({ carticleId }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async () => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('carticleId', carticleId.toString());
      
      files.forEach(file => {
        formData.append('files', file);
      });
      
      await axiosInstance.post('/cerebro/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Zurücksetzen nach erfolgreicher Übertragung
      setFiles([]);
      onUploadSuccess();
    } catch (error) {
      handleError(error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Dateien hochladen:</h3>
      
      <div className="border-2 border-dashed border-gray-300 p-4 rounded">
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />
        
        {files.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-medium">Ausgewählte Dateien:</h4>
            <ul className="text-sm">
              {files.map((file, index) => (
                <li key={index}>{file.name} ({formatFileSize(file.size)})</li>
              ))}
            </ul>
          </div>
        )}
        
        <Button
          className="mt-2"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
        </Button>
      </div>
    </div>
  );
};
```

### 2. Markdown-Bild-Integration

Bilder können direkt im Markdown verwendet werden:

```markdown
![Beschreibung des Bildes](/api/cerebro/media/123)
```

### 3. Datei-Download

Hochgeladene Dateien können heruntergeladen werden:

```typescript
// Vereinfachtes Beispiel
const MediaFile: React.FC<{ media: CerebroMedia }> = ({ media }) => {
  return (
    <div className="border rounded p-2 flex items-center">
      {isImage(media.fileType) ? (
        <img src={media.thumbnailUrl || media.url} alt={media.originalName} className="h-10 w-10 object-cover mr-2" />
      ) : (
        <DocumentIcon className="h-10 w-10 text-gray-400 mr-2" />
      )}
      
      <div>
        <p className="text-sm font-medium">{media.originalName}</p>
        <p className="text-xs text-gray-500">{formatFileSize(media.fileSize)}</p>
      </div>
      
      <a
        href={media.url}
        download={media.originalName}
        className="ml-auto p-1 text-gray-500 hover:text-gray-700"
        title="Herunterladen"
      >
        <DownloadIcon className="h-5 w-5" />
      </a>
    </div>
  );
};
```

---

Das Cerebro Wiki-System ist ein zentraler Bestandteil des Intranets und stellt eine flexible und leistungsstarke Plattform für die Wissensverwaltung dar. Durch die Integration mit anderen Modulen wie Tasks und Requests bietet es eine vollständige Lösung für Dokumentation und Wissensaustausch im Unternehmen. 