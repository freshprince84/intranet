/**
 * Direktes Skript zur Korrektur der GitHub-Links
 * Ruft die Logik direkt auf, ohne HTTP/Login
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const extractPathFromGitHubUrl = (url: string): string | null => {
    try {
        // Unterstütze verschiedene GitHub-URL-Formate:
        // - https://raw.githubusercontent.com/owner/repo/branch/path/to/file.md
        // - https://github.com/owner/repo/blob/branch/path/to/file.md
        // - https://github.com/owner/repo/tree/branch/path/to/file.md
        
        if (url.includes('raw.githubusercontent.com')) {
            // Format: https://raw.githubusercontent.com/owner/repo/branch/path/to/file.md
            const match = url.match(/raw\.githubusercontent\.com\/[^\/]+\/[^\/]+\/[^\/]+\/(.+)$/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
        } else if (url.includes('github.com')) {
            // Format: https://github.com/owner/repo/blob/branch/path/to/file.md
            // oder: https://github.com/owner/repo/tree/branch/path/to/file.md
            const match = url.match(/github\.com\/[^\/]+\/[^\/]+\/(?:blob|tree)\/[^\/]+\/(.+)$/);
            if (match && match[1]) {
                return decodeURIComponent(match[1]);
            }
        }
        
        return null;
    } catch (error) {
        console.error('[extractPathFromGitHubUrl] Fehler beim Extrahieren des Pfads:', error);
        return null;
    }
};

async function fixGitHubLinks() {
    try {
        console.log('[fixGitHubLinks] Starte Korrektur der GitHub-Links...');
        
        // Alle GitHub-Links abrufen
        const allLinks = await prisma.$queryRaw`
            SELECT * FROM "CerebroExternalLink"
            WHERE type = 'github_markdown'
            ORDER BY id
        ` as any[];
        
        console.log(`[fixGitHubLinks] Gefunden: ${allLinks.length} GitHub-Links`);
        
        // Alle Artikel mit githubPath abrufen
        const articlesWithGithubPath = await prisma.$queryRaw`
            SELECT id, slug, title, "githubPath" FROM "CerebroCarticle"
            WHERE "githubPath" IS NOT NULL AND "githubPath" != ''
            ORDER BY id
        ` as any[];
        
        console.log(`[fixGitHubLinks] Gefunden: ${articlesWithGithubPath.length} Artikel mit githubPath`);
        
        let corrected = 0;
        let notFound = 0;
        const corrections: Array<{ linkId: number; oldArticleId: number; newArticleId: number; path: string }> = [];
        
        // Für jeden Link prüfen, ob er dem richtigen Artikel zugeordnet ist
        for (const link of allLinks) {
            const pathFromUrl = extractPathFromGitHubUrl(link.url);
            
            if (!pathFromUrl) {
                console.log(`[fixGitHubLinks] Link ${link.id}: Konnte Pfad nicht aus URL extrahieren: ${link.url}`);
                notFound++;
                continue;
            }
            
            // Suche Artikel mit passendem githubPath
            const matchingArticle = articlesWithGithubPath.find((article: any) => {
                const articlePath = article.githubPath?.trim();
                if (!articlePath) return false;
                
                // Normalisiere Pfade (entferne führende/trailing Slashes, normalisiere Pfad-Trennzeichen)
                const normalizedUrlPath = pathFromUrl.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                const normalizedArticlePath = articlePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                
                return normalizedUrlPath === normalizedArticlePath || 
                       normalizedUrlPath.endsWith(normalizedArticlePath) ||
                       normalizedArticlePath.endsWith(normalizedUrlPath);
            });
            
            if (matchingArticle && matchingArticle.id !== link.carticleId) {
                // Link ist falsch zugeordnet - korrigiere
                console.log(`[fixGitHubLinks] Link ${link.id}: Korrigiere von Artikel ${link.carticleId} zu Artikel ${matchingArticle.id} (${matchingArticle.slug})`);
                console.log(`  URL-Pfad: ${pathFromUrl}`);
                console.log(`  Artikel githubPath: ${matchingArticle.githubPath}`);
                
                await prisma.$queryRaw`
                    UPDATE "CerebroExternalLink"
                    SET "carticleId" = ${matchingArticle.id}, "updatedAt" = NOW()
                    WHERE id = ${link.id}
                `;
                
                corrected++;
                corrections.push({
                    linkId: link.id,
                    oldArticleId: link.carticleId,
                    newArticleId: matchingArticle.id,
                    path: pathFromUrl
                });
            } else if (!matchingArticle) {
                console.log(`[fixGitHubLinks] Link ${link.id}: Kein passender Artikel gefunden für Pfad: ${pathFromUrl}`);
                notFound++;
            }
        }
        
        console.log(`[fixGitHubLinks] Abgeschlossen: ${corrected} Links korrigiert, ${notFound} Links ohne passenden Artikel`);
        
        console.log('\n📋 Ergebnisse:');
        console.log(JSON.stringify({
            message: 'GitHub-Links erfolgreich korrigiert',
            totalLinks: allLinks.length,
            corrected,
            notFound,
            corrections
        }, null, 2));
        
    } catch (error) {
        console.error('[fixGitHubLinks] Fehler beim Korrigieren der GitHub-Links:', error);
        throw error;
    }
}

// Hauptfunktion
async function main() {
    try {
        await fixGitHubLinks();
    } catch (error) {
        console.error('❌ Fehler:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

