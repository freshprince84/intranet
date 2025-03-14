import api from './apiClient.ts';

// Typen für Artikel
export interface CerebroArticle {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  creatorFirstName: string;
  creatorLastName: string;
  updaterFirstName: string | null;
  updaterLastName: string | null;
  childrenCount: number;
  mediaCount: number;
  linksCount: number;
  position: number | null;
}

export interface CerebroArticleDetail extends CerebroArticle {
  parentTitle: string | null;
  parentSlug: string | null;
  children: {
    id: string;
    title: string;
    slug: string;
  }[];
  media: CerebroMedia[];
  externalLinks: CerebroExternalLink[];
  tasks: {
    id: string;
    title: string;
  }[];
  requests: {
    id: string;
    title: string;
  }[];
  tags: string[];
}

export interface CerebroArticleStructure {
  id: string;
  title: string;
  slug: string;
  position?: number | null;
  children: CerebroArticleStructure[];
}

// Typen für Medien
export interface CerebroMedia {
  id: string;
  filename: string;
  mimetype: string;
  path: string;
  size: number;
  createdAt: string;
  createdById: string;
  creatorFirstName: string;
  creatorLastName: string;
  carticleId: string;
}

// Typen für externe Links
export interface CerebroExternalLink {
  id: string;
  url: string;
  title: string;
  type: string | null;
  thumbnail: string | null;
  createdAt: string;
  createdById: string;
  creatorFirstName: string;
  creatorLastName: string;
  carticleId: string;
}

export interface LinkPreview {
  title: string | null;
  thumbnail: string | null;
  type: string | null;
}

// Artikel API
const articlesApi = {
  // Alle Artikel abrufen
  getAllArticles: async (): Promise<CerebroArticle[]> => {
    const response = await api.get('/cerebro/carticles');
    return response.data;
  },
  
  // Artikel nach ID abrufen
  getArticleById: async (id: string): Promise<CerebroArticleDetail> => {
    const response = await api.get(`/cerebro/carticles/${id}`);
    return response.data;
  },
  
  // Artikel nach Slug abrufen
  getArticleBySlug: async (slug: string): Promise<CerebroArticleDetail> => {
    const response = await api.get(`/cerebro/carticles/slug/${slug}`);
    return response.data;
  },
  
  // Artikel-Struktur abrufen
  getArticlesStructure: async (): Promise<CerebroArticleStructure[]> => {
    const response = await api.get('/cerebro/carticles/structure');
    return response.data;
  },
  
  // Artikel erstellen
  createArticle: async (data: {
    title: string;
    parentId?: string | null;
    content?: string;
  }): Promise<CerebroArticle> => {
    const response = await api.post('/cerebro/carticles', data);
    return response.data;
  },
  
  // Artikel aktualisieren
  updateArticle: async (
    id: string,
    data: {
      title?: string;
      parentId?: string | null;
      content?: string;
    }
  ): Promise<CerebroArticle> => {
    const response = await api.put(`/cerebro/carticles/${id}`, data);
    return response.data;
  },
  
  // Artikel löschen
  deleteArticle: async (id: string): Promise<void> => {
    await api.delete(`/cerebro/carticles/${id}`);
  },
  
  // Artikel suchen
  searchArticles: async (query: string): Promise<CerebroArticle[]> => {
    const response = await api.get(`/cerebro/carticles/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

// Medien API
const mediaApi = {
  // Medien nach Artikel-ID abrufen
  getMediaByArticle: async (carticleId: string): Promise<CerebroMedia[]> => {
    const response = await api.get(`/cerebro/media/carticle/${carticleId}`);
    return response.data;
  },
  
  // Medien nach ID abrufen
  getMediaById: async (id: string): Promise<CerebroMedia> => {
    const response = await api.get(`/cerebro/media/${id}`);
    return response.data;
  },
  
  // Medien hochladen
  uploadMedia: async (
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<CerebroMedia> => {
    const response = await api.post('/cerebro/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  },
  
  // Medien löschen
  deleteMedia: async (id: string): Promise<void> => {
    await api.delete(`/cerebro/media/${id}`);
  },
  
  // Dateiname aktualisieren
  updateMediaFilename: async (id: string, filename: string): Promise<CerebroMedia> => {
    const response = await api.put(`/cerebro/media/${id}`, { filename });
    return response.data;
  },
};

// Externe Links API
const externalLinksApi = {
  // Links nach Artikel-ID abrufen
  getLinksByArticle: async (carticleId: string): Promise<CerebroExternalLink[]> => {
    const response = await api.get(`/cerebro/links/carticle/${carticleId}`);
    return response.data;
  },
  
  // Link nach ID abrufen
  getLinkById: async (id: string): Promise<CerebroExternalLink> => {
    const response = await api.get(`/cerebro/links/${id}`);
    return response.data;
  },
  
  // Link-Vorschau abrufen
  getLinkPreview: async (url: string): Promise<LinkPreview> => {
    const response = await api.get(`/cerebro/links/preview?url=${encodeURIComponent(url)}`);
    return response.data;
  },
  
  // Link erstellen
  createLink: async (link: {
    url: string;
    title?: string;
    carticleSlug: string;
  }): Promise<CerebroExternalLink> => {
    const response = await api.post('/cerebro/links', link);
    return response.data;
  },
  
  // Link aktualisieren
  updateLink: async (id: string, title: string): Promise<CerebroExternalLink> => {
    const response = await api.put(`/cerebro/links/${id}`, { title });
    return response.data;
  },
  
  // Link löschen
  deleteLink: async (id: string): Promise<void> => {
    await api.delete(`/cerebro/links/${id}`);
  },
  
  // Link erstellen
  createExternalLink: async (data: {
    carticleSlug: string;
    url: string;
    title?: string;
    type?: string;
  }): Promise<CerebroExternalLink> => {
    const response = await api.post('/api/cerebro/links', data);
    return response.data;
  },
  
  // Link aktualisieren
  updateExternalLink: async (
    id: string,
    data: {
      url?: string;
      title?: string;
      type?: string;
    }
  ): Promise<CerebroExternalLink> => {
    const response = await api.put(`/api/cerebro/links/${id}`, data);
    return response.data;
  },
  
  // Link löschen
  deleteExternalLink: async (id: string): Promise<void> => {
    await api.delete(`/api/cerebro/links/${id}`);
  },
};

// Export des gesamten API-Clients
export const cerebroApi = {
  articles: articlesApi,
  media: mediaApi,
  externalLinks: externalLinksApi,
}; 