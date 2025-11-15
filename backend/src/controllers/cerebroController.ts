import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getDataIsolationFilter } from '../middleware/organization';
import slugify from 'slugify';

const prisma = new PrismaClient();

/**
 * Hilfsfunktion zum Erstellen eines eindeutigen Slugs
 */
const createUniqueSlug = async (title: string): Promise<string> => {
    let slug = slugify(title, { lower: true, strict: true });
    
    // Verwendung von Prisma ORM, da die CerebroCarticle-Tabelle jetzt existiert
    const existingArticle = await prisma.cerebroCarticle.findUnique({
        where: { slug }
    });
    
    // Wenn der Slug bereits existiert, füge einen Zeitstempel hinzu
    if (existingArticle) {
        slug = `${slug}-${Date.now()}`;
    }
    
    return slug;
};

/**
 * Alle Artikel abrufen
 * 
 * HINWEIS: Diese Methode verwendet Raw-SQL, da das Prisma-Modell für CerebroCarticle
 * in der Datenbank keine entsprechende Tabelle hat (Fehler P2021). Sobald die Tabelle
 * in der Datenbank erstellt wurde, kann diese Methode auf die Prisma ORM-Syntax
 * umgestellt werden, wie sie bereits vorbereitet wurde.
 */
export const getAllArticles = async (req: Request, res: Response) => {
    try {
        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const articleFilter = getDataIsolationFilter(req as any, 'cerebroCarticle');
        
        // Verwendung von Prisma ORM, da die CerebroCarticle-Tabelle jetzt existiert
        const articles = await prisma.cerebroCarticle.findMany({
            where: articleFilter,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                updatedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                _count: {
                    select: {
                        media: true,
                        externalLinks: true,
                        tasks: true,
                        requests: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        
        // Transformation für ein konsistentes Response-Format
        const formattedArticles = articles.map(article => ({
            ...article,
            creatorName: article.createdBy?.username,
            creatorFirstName: article.createdBy?.firstName,
            creatorLastName: article.createdBy?.lastName,
            updaterName: article.updatedBy?.username,
            updaterFirstName: article.updatedBy?.firstName,
            updaterLastName: article.updatedBy?.lastName,
            parentTitle: article.parent?.title,
            mediaCount: article._count.media,
            linksCount: article._count.externalLinks,
            tasksCount: article._count.tasks,
            requestsCount: article._count.requests,
        }));
        
        res.status(200).json(formattedArticles);
    } catch (error) {
        console.error('Fehler beim Abrufen der Artikel:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Artikel' });
    }
};

/**
 * Artikel nach ID abrufen
 */
export const getArticleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const articleId = parseInt(id, 10);
        
        if (isNaN(articleId)) {
            return res.status(400).json({ message: 'Ungültige Artikel-ID' });
        }
        
        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const articleFilter = getDataIsolationFilter(req as any, 'cerebroCarticle');
        
        // Verwendung von Prisma ORM, da die CerebroCarticle-Tabelle jetzt existiert
        const article = await prisma.cerebroCarticle.findFirst({
            where: {
                id: articleId,
                ...articleFilter
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                updatedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        title: true,
                        slug: true
                    }
                },
                children: {
                    select: {
                        id: true,
                        title: true,
                        slug: true
                    }
                },
                media: true,
                externalLinks: true,
                tasks: true,
                requests: true,
                tags: true
            }
        });
        
        if (!article) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        
        // Formatierung für konsistentes Response-Format
        const result = {
            ...article,
            creatorName: article.createdBy?.username,
            creatorFirstName: article.createdBy?.firstName,
            creatorLastName: article.createdBy?.lastName,
            updaterName: article.updatedBy?.username,
            updaterFirstName: article.updatedBy?.firstName,
            updaterLastName: article.updatedBy?.lastName,
            parentTitle: article.parent?.title,
            parentSlug: article.parent?.slug
        };
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Fehler beim Abrufen des Artikels:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Artikels' });
    }
};

/**
 * Artikel nach Slug abrufen
 */
export const getArticleBySlug = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        
        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const articleFilter = getDataIsolationFilter(req as any, 'cerebroCarticle');
        
        // Verwendung von Prisma ORM, da die CerebroCarticle-Tabelle jetzt existiert
        const article = await prisma.cerebroCarticle.findFirst({
            where: {
                slug,
                ...articleFilter
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                updatedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        title: true,
                        slug: true
                    }
                },
                children: {
                    select: {
                        id: true,
                        title: true,
                        slug: true
                    }
                },
                media: true,
                externalLinks: true,
                tasks: true,
                requests: true,
                tags: true
            }
        });
        
        if (!article) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        
        // Formatierung für konsistentes Response-Format
        const result = {
            ...article,
            creatorName: article.createdBy?.username,
            creatorFirstName: article.createdBy?.firstName,
            creatorLastName: article.createdBy?.lastName,
            updaterName: article.updatedBy?.username,
            updaterFirstName: article.updatedBy?.firstName,
            updaterLastName: article.updatedBy?.lastName,
            parentTitle: article.parent?.title,
            parentSlug: article.parent?.slug
        };
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Fehler beim Abrufen des Artikels:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Artikels' });
    }
};

/**
 * Struktur aller Artikel abrufen
 * 
 * HINWEIS: Diese Methode verwendet Raw-SQL, da das Prisma-Modell für CerebroCarticle
 * in der Datenbank keine entsprechende Tabelle hat (Fehler P2021). Sobald die Tabelle
 * in der Datenbank erstellt wurde, kann diese Methode auf die Prisma ORM-Syntax
 * umgestellt werden, wie sie bereits vorbereitet wurde.
 */
export const getArticlesStructure = async (req: Request, res: Response) => {
    try {
        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const articleFilter = getDataIsolationFilter(req as any, 'cerebroCarticle');
        
        // Jetzt mit Prisma ORM, da die CerebroCarticle-Tabelle jetzt existiert
        const articles = await prisma.cerebroCarticle.findMany({
            where: articleFilter,
            select: {
                id: true,
                title: true,
                slug: true,
                parentId: true,
                position: true
            },
            orderBy: [
                {
                    position: 'asc'
                },
                {
                    title: 'asc'
                }
            ]
        });
        
        // Funktion zum Erstellen der Baumstruktur
        const buildTree = (articles: any[], parentId: number | null = null) => {
            return articles
                .filter(article => article.parentId === parentId)
                .sort((a, b) => {
                    // Sortiere nach Position, falls beide Artikel eine Position haben
                    if (a.position !== null && b.position !== null) {
                        return a.position - b.position;
                    }
                    // Artikel mit Position kommen vor Artikeln ohne Position
                    if (a.position !== null && b.position === null) {
                        return -1;
                    }
                    if (a.position === null && b.position !== null) {
                        return 1;
                    }
                    // Wenn beide keine Position haben, sortiere nach Titel
                    return a.title.localeCompare(b.title);
                })
                .map(article => ({
                    id: article.id,
                    title: article.title,
                    slug: article.slug,
                    children: buildTree(articles, article.id)
                }));
        };
        
        // Baumstruktur erstellen (beginnend mit Root-Artikeln)
        const structure = buildTree(articles);
        
        res.status(200).json(structure);
    } catch (error) {
        console.error('Fehler beim Abrufen der Artikelstruktur:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Artikelstruktur' });
    }
};

/**
 * Neuen Artikel erstellen
 */
export const createArticle = async (req: Request, res: Response) => {
    try {
        console.log('[createArticle] Start - userId:', req.userId, 'organizationId:', (req as any).organizationId);
        const { title, content, parentId, isPublished = false } = req.body;
        const userId = parseInt(req.userId, 10);
        
        console.log('[createArticle] Request body:', { title, parentId, isPublished, contentLength: content?.length });
        
        if (!title) {
            return res.status(400).json({ message: 'Titel ist erforderlich' });
        }
        
        // Slug erstellen
        const slug = await createUniqueSlug(title);
        
        // parentId normalisieren: String zu Number konvertieren oder null
        const normalizedParentId = parentId && parentId !== '' && parentId !== 'null' 
            ? parseInt(String(parentId), 10) 
            : null;
        
        // Überprüfen, ob der übergeordnete Artikel existiert, falls angegeben
        if (normalizedParentId) {
            if (isNaN(normalizedParentId)) {
                return res.status(400).json({ message: 'Ungültige Parent-ID' });
            }
            
            const parentArticle = await prisma.$queryRaw`
                SELECT * FROM "CerebroCarticle" WHERE id = ${normalizedParentId}
            `;
            
            if (!parentArticle || (Array.isArray(parentArticle) && parentArticle.length === 0)) {
                return res.status(404).json({ message: 'Übergeordneter Artikel nicht gefunden' });
            }
        }
        
        // Artikel erstellen
        const newArticle = await prisma.$queryRaw`
            INSERT INTO "CerebroCarticle" (title, content, slug, "parentId", "createdById", "updatedById", "isPublished", "organizationId", "createdAt", "updatedAt")
            VALUES (${title}, ${content || ''}, ${slug}, ${normalizedParentId}, ${userId}, ${userId}, ${isPublished}, ${req.organizationId || null}, NOW(), NOW())
            RETURNING *
        `;
        
        // Benachrichtigung erstellen
        await prisma.$queryRaw`
            INSERT INTO "Notification" (
                "userId", 
                title, 
                message, 
                type, 
                "relatedEntityId", 
                "relatedEntityType", 
                "carticleId", 
                "createdAt", 
                "updatedAt"
            )
            SELECT 
                u.id, 
                'Neuer Wiki-Artikel', 
                ${`Der Artikel "${title}" wurde erstellt`}, 
                'cerebro', 
                ${newArticle[0].id}, 
                'carticle', 
                ${newArticle[0].id}, 
                NOW(), 
                NOW()
            FROM "User" u
            JOIN "UserNotificationSettings" uns ON u.id = uns."userId"
            WHERE uns."carticleCreate" = true
        `;
        
        console.log('[createArticle] ✅ Artikel erfolgreich erstellt:', newArticle[0].id);
        res.status(201).json(newArticle[0]);
    } catch (error: any) {
        console.error('[createArticle] ❌ Fehler beim Erstellen des Artikels:', error);
        console.error('[createArticle] Error details:', {
            message: error?.message,
            code: error?.code,
            stack: error?.stack
        });
        const errorMessage = error?.message || 'Fehler beim Erstellen des Artikels';
        const statusCode = error?.code === 'P2002' ? 409 : 500;
        res.status(statusCode).json({ 
            message: errorMessage,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

/**
 * Artikel aktualisieren
 */
export const updateArticle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, parentId, isPublished } = req.body;
        const userId = parseInt(req.userId, 10);
        const articleId = parseInt(id, 10);
        
        if (isNaN(articleId)) {
            return res.status(400).json({ message: 'Ungültige Artikel-ID' });
        }
        
        // Prüfen, ob der Artikel existiert
        const existingArticle = await prisma.$queryRaw`
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        
        if (!existingArticle || (Array.isArray(existingArticle) && existingArticle.length === 0)) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        
        // Slug aktualisieren, wenn der Titel geändert wurde
        let slug = existingArticle[0].slug;
        if (title && title !== existingArticle[0].title) {
            slug = await createUniqueSlug(title);
        }
        
        // Überprüfen, ob der übergeordnete Artikel existiert, falls angegeben
        if (parentId && parentId !== existingArticle[0].parentId) {
            const parentArticle = await prisma.$queryRaw`
                SELECT * FROM "CerebroCarticle" WHERE id = ${parentId}
            `;
            
            if (!parentArticle || (Array.isArray(parentArticle) && parentArticle.length === 0)) {
                return res.status(404).json({ message: 'Übergeordneter Artikel nicht gefunden' });
            }
            
            // Prüfen, ob der übergeordnete Artikel nicht der Artikel selbst ist
            if (parentId === articleId) {
                return res.status(400).json({ message: 'Ein Artikel kann nicht sein eigener übergeordneter Artikel sein' });
            }
        }
        
        // Artikel aktualisieren
        const updatedArticle = await prisma.$queryRaw`
            UPDATE "CerebroCarticle"
            SET 
                title = ${title || existingArticle[0].title},
                content = ${content !== undefined ? content : existingArticle[0].content},
                slug = ${slug},
                "parentId" = ${parentId !== undefined ? parentId : existingArticle[0].parentId},
                "updatedById" = ${userId},
                "isPublished" = ${isPublished !== undefined ? isPublished : existingArticle[0].isPublished},
                "updatedAt" = NOW()
            WHERE id = ${articleId}
            RETURNING *
        `;
        
        // Benachrichtigung erstellen
        await prisma.$queryRaw`
            INSERT INTO "Notification" (
                "userId", 
                title, 
                message, 
                type, 
                "relatedEntityId", 
                "relatedEntityType", 
                "carticleId", 
                "createdAt", 
                "updatedAt"
            )
            SELECT 
                u.id, 
                'Wiki-Artikel aktualisiert', 
                ${`Der Artikel "${title || existingArticle[0].title}" wurde aktualisiert`}, 
                'cerebro', 
                ${articleId}, 
                'carticle', 
                ${articleId}, 
                NOW(), 
                NOW()
            FROM "User" u
            JOIN "UserNotificationSettings" uns ON u.id = uns."userId"
            WHERE uns."carticleUpdate" = true
        `;
        
        res.status(200).json(updatedArticle[0]);
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Artikels:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren des Artikels' });
    }
};

/**
 * Artikel löschen
 */
export const deleteArticle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const articleId = parseInt(id, 10);
        
        if (isNaN(articleId)) {
            return res.status(400).json({ message: 'Ungültige Artikel-ID' });
        }
        
        // Prüfen, ob der Artikel existiert
        const existingArticle = await prisma.$queryRaw`
            SELECT * FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        
        if (!existingArticle || (Array.isArray(existingArticle) && existingArticle.length === 0)) {
            return res.status(404).json({ message: 'Artikel nicht gefunden' });
        }
        
        // Prüfen, ob der Artikel Unterartikel hat
        const childArticles = await prisma.$queryRaw`
            SELECT * FROM "CerebroCarticle" WHERE "parentId" = ${articleId}
        `;
        
        if (childArticles && Array.isArray(childArticles) && childArticles.length > 0) {
            return res.status(400).json({ 
                message: 'Artikel kann nicht gelöscht werden, da er Unterartikel enthält',
                childArticles
            });
        }
        
        // Verknüpfungen zu Tasks löschen
        await prisma.$queryRaw`
            DELETE FROM "TaskCerebroCarticle" WHERE "carticleId" = ${articleId}
        `;
        
        // Verknüpfungen zu Requests löschen
        await prisma.$queryRaw`
            DELETE FROM "RequestCerebroCarticle" WHERE "carticleId" = ${articleId}
        `;
        
        // Medien löschen
        await prisma.$queryRaw`
            DELETE FROM "CerebroMedia" WHERE "carticleId" = ${articleId}
        `;
        
        // Externe Links löschen
        await prisma.$queryRaw`
            DELETE FROM "CerebroExternalLink" WHERE "carticleId" = ${articleId}
        `;
        
        // Tag-Verknüpfungen löschen
        await prisma.$queryRaw`
            DELETE FROM "_CerebroCarticleToCerebroTag" WHERE "A" = ${articleId}
        `;
        
        // Benachrichtigungen löschen
        await prisma.$queryRaw`
            DELETE FROM "Notification" WHERE "carticleId" = ${articleId}
        `;
        
        // Artikel löschen
        await prisma.$queryRaw`
            DELETE FROM "CerebroCarticle" WHERE id = ${articleId}
        `;
        
        // Benachrichtigung über Löschung erstellen
        await prisma.$queryRaw`
            INSERT INTO "Notification" (
                "userId", 
                title, 
                message, 
                type, 
                "relatedEntityType", 
                "createdAt", 
                "updatedAt"
            )
            SELECT 
                u.id, 
                'Wiki-Artikel gelöscht', 
                ${`Der Artikel "${existingArticle[0].title}" wurde gelöscht`}, 
                'cerebro', 
                'carticle', 
                NOW(), 
                NOW()
            FROM "User" u
            JOIN "UserNotificationSettings" uns ON u.id = uns."userId"
            WHERE uns."carticleDelete" = true
        `;
        
        res.status(200).json({ message: 'Artikel erfolgreich gelöscht' });
    } catch (error) {
        console.error('Fehler beim Löschen des Artikels:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Artikels' });
    }
};

/**
 * Nach Artikeln suchen
 */
export const searchArticles = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.status(400).json({ message: 'Suchbegriff ist erforderlich' });
        }
        
        const searchTerm = q as string;
        
        // NEU: Verwende getDataIsolationFilter für organisations-spezifische Filterung
        const articleFilter = getDataIsolationFilter(req as any, 'cerebroCarticle');
        
        // Verwendung von Prisma ORM, da die CerebroCarticle-Tabelle jetzt existiert
        const articles = await prisma.cerebroCarticle.findMany({
            where: {
                ...articleFilter,
                OR: [
                    {
                        title: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        content: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        tags: {
                            some: {
                                name: {
                                    contains: searchTerm,
                                    mode: 'insensitive'
                                }
                            }
                        }
                    }
                ]
            },
            include: {
                createdBy: {
                    select: {
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                updatedBy: {
                    select: {
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                parent: {
                    select: {
                        title: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        
        res.status(200).json(articles);
    } catch (error) {
        console.error('Fehler bei der Suche nach Artikeln:', error);
        res.status(500).json({ message: 'Fehler bei der Suche nach Artikeln' });
    }
}; 