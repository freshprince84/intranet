import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

// In-Memory Store (für Produktion sollte Redis verwendet werden)
const store: RateLimitStore = {};

// Cleanup alte Einträge alle 5 Minuten
setInterval(() => {
    const now = Date.now();
    Object.keys(store).forEach(key => {
        if (store[key].resetTime < now) {
            delete store[key];
        }
    });
}, 5 * 60 * 1000);

/**
 * Rate-Limiting Middleware
 * @param windowMs - Zeitfenster in Millisekunden
 * @param maxRequests - Maximale Anzahl Anfragen pro Zeitfenster
 */
export const rateLimiter = (windowMs: number = 60000, maxRequests: number = 10) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userId = req.userId || req.ip || 'anonymous';
        const key = `rate_limit_${userId}`;
        const now = Date.now();

        // Hole oder erstelle Eintrag
        if (!store[key] || store[key].resetTime < now) {
            store[key] = {
                count: 1,
                resetTime: now + windowMs
            };
            return next();
        }

        // Erhöhe Zähler
        store[key].count++;

        // Prüfe ob Limit überschritten
        if (store[key].count > maxRequests) {
            const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
            return res.status(429).json({
                message: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
                retryAfter
            });
        }

        next();
    };
};

/**
 * Spezifischer Rate-Limiter für Passwort-Manager (10 Anfragen pro Minute)
 */
export const passwordManagerRateLimiter = rateLimiter(60000, 10);

