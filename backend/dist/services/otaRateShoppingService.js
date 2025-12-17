"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTARateShoppingService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const lobbyPmsService_1 = require("./lobbyPmsService");
const otaDiscoveryService_1 = require("./otaDiscoveryService");
const prisma = new client_1.PrismaClient();
/**
 * Service für OTA Rate Shopping
 *
 * Zuständig für:
 * - Sammeln von Preisdaten von OTA-Plattformen (Booking.com, Hostelworld, etc.)
 * - Web Scraping oder API-Integration
 * - Speichern der Preisdaten in der Datenbank
 */
class OTARateShoppingService {
    /**
     * Führt Rate Shopping für eine bestimmte Plattform durch
     *
     * @param branchId - Branch-ID
     * @param platform - OTA-Plattform (z.B. 'booking.com', 'hostelworld.com')
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Job-ID
     */
    static runRateShopping(branchId, platform, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.warn(`[OTARateShoppingService] ⚡ runRateShopping aufgerufen: Branch ${branchId}, Platform ${platform}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
            try {
                // Job erstellen
                logger_1.logger.warn(`[OTARateShoppingService] 📝 Erstelle Rate Shopping Job in DB...`);
                const job = yield prisma.rateShoppingJob.create({
                    data: {
                        branchId,
                        platform,
                        startDate,
                        endDate,
                        status: 'pending'
                    }
                });
                logger_1.logger.warn(`[OTARateShoppingService] ✅ Rate Shopping Job erstellt: ID ${job.id}, Platform: ${platform}, Branch: ${branchId}`);
                // Asynchron ausführen (nicht blockieren)
                logger_1.logger.warn(`[OTARateShoppingService] 🚀 Starte asynchrones executeRateShopping für Job ${job.id}...`);
                this.executeRateShopping(job.id, branchId, platform, startDate, endDate).catch(error => {
                    logger_1.logger.error(`[OTARateShoppingService] ❌ Fehler beim Ausführen des Rate Shopping Jobs ${job.id}:`, error);
                    logger_1.logger.error(`[OTARateShoppingService] Error Stack:`, error instanceof Error ? error.stack : 'Kein Stack verfügbar');
                });
                logger_1.logger.warn(`[OTARateShoppingService] ✅ executeRateShopping wurde aufgerufen (asynchron), gebe Job ID ${job.id} zurück`);
                return job.id;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Erstellen des Rate Shopping Jobs:', error);
                throw error;
            }
        });
    }
    /**
     * Führt den Rate Shopping Job aus
     *
     * @param jobId - Job-ID
     * @param branchId - Branch-ID
     * @param platform - OTA-Plattform
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     */
    static executeRateShopping(jobId, branchId, platform, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.warn(`[OTARateShoppingService] ⚡ executeRateShopping START für Job ${jobId}, Branch ${branchId}, Platform ${platform}`);
            try {
                // Job-Status auf 'running' setzen
                logger_1.logger.warn(`[OTARateShoppingService] 🔄 Setze Job ${jobId} Status auf 'running'...`);
                yield prisma.rateShoppingJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'running',
                        startedAt: new Date()
                    }
                });
                logger_1.logger.warn(`[OTARateShoppingService] ✅ Job ${jobId} Status auf 'running' gesetzt`);
                logger_1.logger.warn(`[OTARateShoppingService] 🚀 Starte Job ${jobId} für ${platform}, Branch ${branchId}`);
                // 1. Hole Adress-Informationen vom Branch
                const branch = yield prisma.branch.findUnique({
                    where: { id: branchId },
                    select: {
                        city: true,
                        country: true,
                        name: true,
                        organizationId: true // Für Kontext
                    }
                });
                if (!branch) {
                    throw new Error(`Branch ${branchId} nicht gefunden`);
                }
                if (!branch.city) {
                    logger_1.logger.warn(`[Rate Shopping] Branch ${branchId} hat keine Stadt konfiguriert`);
                    yield prisma.rateShoppingJob.update({
                        where: { id: jobId },
                        data: {
                            status: 'failed',
                            completedAt: new Date(),
                            errors: [{ error: 'Branch hat keine Stadt konfiguriert. Bitte Adress-Informationen in Branch-Einstellungen hinzufügen.' }]
                        }
                    });
                    return;
                }
                // 2. Hole eigene Zimmer-Typen aus LobbyPMS
                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                const ownRooms = yield lobbyPmsService.checkAvailability(startDate, endDate);
                const ownRoomTypes = [...new Set(ownRooms.map(r => {
                        // Konvertiere 'compartida' -> 'dorm', 'privada' -> 'private'
                        return r.roomType === 'compartida' ? 'dorm' : 'private';
                    }))]; // ['private', 'dorm']
                if (ownRoomTypes.length === 0) {
                    logger_1.logger.warn(`[Rate Shopping] Keine eigenen Zimmer-Typen gefunden für Branch ${branchId}`);
                    yield prisma.rateShoppingJob.update({
                        where: { id: jobId },
                        data: {
                            status: 'failed',
                            completedAt: new Date(),
                            errors: [{ error: 'Keine eigenen Zimmer-Typen gefunden. Bitte zuerst Reservierungen aus LobbyPMS importieren.' }]
                        }
                    });
                    return;
                }
                logger_1.logger.warn(`[Rate Shopping] Gefundene eigene Zimmertypen: ${ownRoomTypes.join(', ')}`);
                // 3. Für jeden eigenen Zimmertyp: Finde Konkurrenz-Listings
                let totalListingsFound = 0;
                let totalPricesCollected = 0;
                const errors = [];
                for (const roomType of ownRoomTypes) {
                    logger_1.logger.warn(`[Rate Shopping] Verarbeite Zimmertyp: ${roomType}`);
                    // Prüfe ob Listings vorhanden sind oder älter als 7 Tage
                    const existingListings = yield prisma.oTAListing.findMany({
                        where: {
                            city: branch.city,
                            country: branch.country || undefined,
                            platform,
                            roomType,
                            isActive: true
                        }
                    });
                    // Falls keine Listings vorhanden oder älter als 7 Tage: Neu discoveren
                    const needsDiscovery = existingListings.length === 0 ||
                        existingListings.some(l => !l.lastScrapedAt ||
                            new Date(l.lastScrapedAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000);
                    if (needsDiscovery) {
                        logger_1.logger.warn(`[Rate Shopping] Starte Discovery für ${platform}, ${branch.city}, ${roomType}`);
                        try {
                            const discovered = yield otaDiscoveryService_1.OTADiscoveryService.discoverListings(branch.city, branch.country, roomType, platform);
                            // Speichere/aktualisiere Listings
                            for (const listing of discovered) {
                                try {
                                    yield prisma.oTAListing.upsert({
                                        where: {
                                            platform_listingId_city: {
                                                platform: listing.platform,
                                                listingId: listing.listingId,
                                                city: listing.city
                                            }
                                        },
                                        update: {
                                            listingUrl: listing.listingUrl,
                                            roomName: listing.roomName,
                                            lastScrapedAt: new Date(),
                                            isActive: true
                                        },
                                        create: {
                                            platform: listing.platform,
                                            listingId: listing.listingId,
                                            listingUrl: listing.listingUrl,
                                            city: listing.city,
                                            country: listing.country,
                                            roomType: listing.roomType,
                                            roomName: listing.roomName,
                                            branchId: branchId, // Optional: Für Filterung
                                            isActive: true,
                                            discoveredAt: new Date()
                                        }
                                    });
                                    totalListingsFound++;
                                }
                                catch (error) {
                                    logger_1.logger.error(`[Rate Shopping] Fehler beim Speichern eines Listings:`, error.message);
                                    errors.push({ error: `Fehler beim Speichern: ${error.message}` });
                                }
                            }
                        }
                        catch (error) {
                            logger_1.logger.error(`[Rate Shopping] Fehler beim Discovery:`, error.message);
                            errors.push({ error: `Discovery-Fehler: ${error.message}` });
                        }
                    }
                    else {
                        logger_1.logger.warn(`[Rate Shopping] Verwende vorhandene Listings (${existingListings.length}) für ${roomType}`);
                        totalListingsFound += existingListings.length;
                    }
                    // 4. Scrape Preise für alle Konkurrenz-Listings
                    const listings = yield prisma.oTAListing.findMany({
                        where: {
                            city: branch.city,
                            country: branch.country || undefined,
                            platform,
                            roomType,
                            isActive: true
                        }
                    });
                    logger_1.logger.warn(`[Rate Shopping] Scrape Preise für ${listings.length} Listings (${roomType})`);
                    for (const listing of listings) {
                        try {
                            if (listing.listingUrl) {
                                const pricesCollected = yield this.scrapeOTA(listing.id, platform, listing.listingUrl, startDate, endDate);
                                totalPricesCollected += pricesCollected;
                            }
                        }
                        catch (error) {
                            logger_1.logger.error(`[Rate Shopping] Fehler beim Scraping für Listing ${listing.id}:`, error.message);
                            errors.push({
                                listingId: listing.id,
                                error: error.message || String(error)
                            });
                        }
                        // Rate-Limiting: Warte 2 Sekunden zwischen Listings
                        yield new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                // Hole alle Listings für Status-Update
                const allListings = yield prisma.oTAListing.findMany({
                    where: {
                        city: branch.city,
                        country: branch.country || undefined,
                        platform,
                        isActive: true
                    }
                });
                // Job-Status auf 'completed' setzen
                yield prisma.rateShoppingJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'completed',
                        completedAt: new Date(),
                        listingsFound: allListings.length,
                        pricesCollected: totalPricesCollected,
                        errors: errors.length > 0 ? errors : null
                    }
                });
                logger_1.logger.warn(`[Rate Shopping] ✅ Job ${jobId} abgeschlossen: ${allListings.length} Listings, ${totalPricesCollected} Preise gesammelt`);
            }
            catch (error) {
                logger_1.logger.error(`[Rate Shopping] Fehler beim Ausführen des Jobs ${jobId}:`, error);
                yield prisma.rateShoppingJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        errors: [{ error: error instanceof Error ? error.message : String(error) }]
                    }
                });
            }
        });
    }
    /**
     * Generische Funktion zum Scrapen einer OTA-Plattform
     *
     * @param listingId - Listing-ID in der Datenbank
     * @param platform - OTA-Plattform
     * @param listingUrl - URL des Listings
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Anzahl gesammelter Preise
     */
    static scrapeOTA(listingId, platform, listingUrl, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!listingUrl) {
                throw new Error(`Keine URL für Listing ${listingId} angegeben`);
            }
            switch (platform.toLowerCase()) {
                case 'booking.com':
                    return yield this.scrapeBookingCom(listingId, listingUrl, startDate, endDate);
                case 'hostelworld.com':
                case 'hostelworld':
                    return yield this.scrapeHostelworld(listingId, listingUrl, startDate, endDate);
                default:
                    throw new Error(`Plattform ${platform} wird noch nicht unterstützt`);
            }
        });
    }
    /**
     * Sammelt Preise von Booking.com
     *
     * @param listingId - Listing-ID in der Datenbank
     * @param listingUrl - URL des Listings
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Anzahl gesammelter Preise
     */
    static scrapeBookingCom(listingId, listingUrl, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implementierung mit Web Scraping (Cheerio) oder API
            // Für jetzt: Placeholder-Implementierung
            logger_1.logger.warn(`[Booking.com] 🔍 Scraping für Listing ${listingId} von ${startDate.toISOString()} bis ${endDate.toISOString()}`);
            // Simuliere Preise (später durch echtes Scraping ersetzen)
            const pricesCollected = 0;
            // Beispiel-Struktur für später:
            // 1. HTTP-Request mit axios
            // 2. HTML parsen mit cheerio
            // 3. Preise extrahieren
            // 4. In savePriceData speichern
            return pricesCollected;
        });
    }
    /**
     * Sammelt Preise von Hostelworld
     *
     * @param listingId - Listing-ID in der Datenbank
     * @param listingUrl - URL des Listings
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Anzahl gesammelter Preise
     */
    static scrapeHostelworld(listingId, listingUrl, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.warn(`[Hostelworld] 🔍 Starte Scraping für Listing ${listingId} von ${startDate.toISOString()} bis ${endDate.toISOString()}`);
                let pricesCollected = 0;
                // Iteriere über alle Daten im Zeitraum
                const currentDate = new Date(startDate);
                const end = new Date(endDate);
                while (currentDate <= end) {
                    try {
                        // Erstelle URL mit Check-in Datum
                        const checkInDate = currentDate.toISOString().split('T')[0];
                        const checkOutDate = new Date(currentDate);
                        checkOutDate.setDate(checkOutDate.getDate() + 1);
                        const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
                        // Hostelworld URL-Format: /hostels/{hostel-name}-{id}?dateFrom={date}&dateTo={date}
                        let urlWithDates = listingUrl;
                        if (urlWithDates.includes('?')) {
                            urlWithDates = `${urlWithDates}&dateFrom=${checkInDate}&dateTo=${checkOutDateStr}`;
                        }
                        else {
                            urlWithDates = `${urlWithDates}?dateFrom=${checkInDate}&dateTo=${checkOutDateStr}`;
                        }
                        // HTTP-Request mit User-Agent
                        const response = yield axios_1.default.get(urlWithDates, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                                'Accept-Encoding': 'gzip, deflate, br',
                                'Connection': 'keep-alive',
                                'Upgrade-Insecure-Requests': '1'
                            },
                            timeout: 30000, // 30 Sekunden Timeout
                            maxRedirects: 5
                        });
                        // HTML parsen
                        const $ = cheerio.load(response.data);
                        // Preise extrahieren - verschiedene mögliche Selektoren für Hostelworld
                        let price = null;
                        let available = true;
                        let availableRooms = null;
                        // Versuche verschiedene Selektoren für Hostelworld
                        // 1. .price-amount oder .price
                        const priceElement1 = $('.price-amount, .price').first();
                        if (priceElement1.length > 0) {
                            const priceText = priceElement1.text().replace(/[^\d,.-]/g, '').replace(',', '.');
                            const priceMatch = priceText.match(/(\d+\.?\d*)/);
                            if (priceMatch) {
                                price = parseFloat(priceMatch[1]);
                            }
                        }
                        // 2. [data-price] oder data-price attribute
                        if (!price) {
                            const priceElement2 = $('[data-price]').first();
                            if (priceElement2.length > 0) {
                                const priceAttr = priceElement2.attr('data-price');
                                if (priceAttr) {
                                    price = parseFloat(priceAttr);
                                }
                            }
                        }
                        // 3. .room-price oder .dorm-price
                        if (!price) {
                            const priceElement3 = $('.room-price, .dorm-price, .private-price').first();
                            if (priceElement3.length > 0) {
                                const priceText = priceElement3.text().replace(/[^\d,.-]/g, '').replace(',', '.');
                                const priceMatch = priceText.match(/(\d+\.?\d*)/);
                                if (priceMatch) {
                                    price = parseFloat(priceMatch[1]);
                                }
                            }
                        }
                        // 4. Suche nach Preis in verschiedenen Formaten im Body
                        if (!price) {
                            const priceRegex = /(?:€|EUR|USD|\$|COP|COL|GBP|£)\s*(\d+[.,]?\d*)/gi;
                            const bodyText = $('body').text();
                            const matches = bodyText.match(priceRegex);
                            if (matches && matches.length > 0) {
                                // Nimm den ersten Preis-Match
                                const priceText = matches[0].replace(/[^\d,.-]/g, '').replace(',', '.');
                                const priceMatch = priceText.match(/(\d+\.?\d*)/);
                                if (priceMatch) {
                                    price = parseFloat(priceMatch[1]);
                                }
                            }
                        }
                        // Verfügbarkeit prüfen
                        // 1. Prüfe auf "Nicht verfügbar" oder ähnliche Meldungen
                        const unavailableTexts = [
                            'not available',
                            'nicht verfügbar',
                            'no beds available',
                            'keine betten verfügbar',
                            'sold out',
                            'ausgebucht',
                            'fully booked',
                            'voll belegt'
                        ];
                        const bodyTextLower = $('body').text().toLowerCase();
                        for (const text of unavailableTexts) {
                            if (bodyTextLower.includes(text.toLowerCase())) {
                                available = false;
                                break;
                            }
                        }
                        // 2. Prüfe auf Verfügbarkeits-Indikatoren
                        if (available) {
                            const availableIndicators = [
                                '.availability',
                                '.beds-available',
                                '[data-available]',
                                '.room-available'
                            ];
                            for (const selector of availableIndicators) {
                                const element = $(selector).first();
                                if (element.length > 0) {
                                    const text = element.text().toLowerCase();
                                    if (text.includes('available') || text.includes('verfügbar')) {
                                        // Versuche Anzahl verfügbarer Betten zu extrahieren
                                        const bedMatch = text.match(/(\d+)\s*(?:bed|bett|beds|betten)/i);
                                        if (bedMatch) {
                                            availableRooms = parseInt(bedMatch[1], 10);
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                        // 3. Prüfe auf "Book now" Button (indiziert Verfügbarkeit)
                        if (available) {
                            const bookButton = $('.book-now, .book-button, [data-action="book"]').first();
                            if (bookButton.length > 0) {
                                const buttonText = bookButton.text().toLowerCase();
                                if (buttonText.includes('book') || buttonText.includes('buchen')) {
                                    available = true;
                                }
                            }
                        }
                        // Speichere Preisdaten, wenn Preis gefunden wurde
                        if (price && price > 0) {
                            yield this.savePriceData(listingId, new Date(currentDate), price, 'COP', // Standard-Währung, kann später aus URL/Seite extrahiert werden
                            available, availableRooms, 'rate_shopper');
                            pricesCollected++;
                            logger_1.logger.warn(`[Hostelworld] 💰 Preis für ${checkInDate}: ${price} COP, verfügbar: ${available}`);
                        }
                        else {
                            logger_1.logger.warn(`[Hostelworld] Kein Preis gefunden für ${checkInDate}`);
                        }
                        // Rate-Limiting: Warte 3 Sekunden zwischen Requests
                        yield new Promise(resolve => setTimeout(resolve, 3000));
                        // Nächster Tag
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    catch (error) {
                        logger_1.logger.error(`[Hostelworld] Fehler beim Scraping für ${currentDate.toISOString().split('T')[0]}:`, error.message);
                        // Weiter mit nächstem Tag
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
                logger_1.logger.warn(`[Hostelworld] ✅ Scraping abgeschlossen für Listing ${listingId}: ${pricesCollected} Preise gesammelt`);
                return pricesCollected;
            }
            catch (error) {
                logger_1.logger.error(`[Hostelworld] Fehler beim Scraping für Listing ${listingId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Gibt Konkurrenzpreise für ein bestimmtes Datum zurück
     *
     * @param branchId - Branch-ID
     * @param date - Datum
     * @param roomType - Zimmertyp ('compartida' | 'privada') - LobbyPMS Format
     * @returns Durchschnittspreis der Konkurrenz
     */
    static getCompetitorPrices(branchId, date, roomType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hole Branch mit Adress-Informationen
                const branch = yield prisma.branch.findUnique({
                    where: { id: branchId },
                    select: { city: true, country: true }
                });
                if (!(branch === null || branch === void 0 ? void 0 : branch.city)) {
                    return null;
                }
                // Konvertiere LobbyPMS roomType zu OTA roomType
                const otaRoomType = roomType === 'compartida' ? 'dorm' : 'private';
                // Hole alle OTA-Listings für diese Stadt und Zimmertyp
                const listings = yield prisma.oTAListing.findMany({
                    where: {
                        city: branch.city,
                        country: branch.country || undefined,
                        roomType: otaRoomType,
                        isActive: true
                    },
                    include: {
                        priceData: {
                            where: {
                                date: date
                            }
                        }
                    }
                });
                if (listings.length === 0) {
                    return null;
                }
                // Berechne Durchschnittspreis
                let totalPrice = 0;
                let count = 0;
                for (const listing of listings) {
                    if (listing.priceData.length > 0) {
                        const price = Number(listing.priceData[0].price);
                        totalPrice += price;
                        count++;
                    }
                }
                if (count === 0) {
                    return null;
                }
                return totalPrice / count;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der Konkurrenzpreise:', error);
                return null;
            }
        });
    }
    /**
     * Ruft alle OTA-Listings für einen Branch ab
     *
     * @param branchId - Branch-ID
     * @returns Array von OTA-Listings
     */
    static getListings(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hole Branch mit Adress-Informationen
                const branch = yield prisma.branch.findUnique({
                    where: { id: branchId },
                    select: { city: true, country: true }
                });
                if (!(branch === null || branch === void 0 ? void 0 : branch.city)) {
                    return [];
                }
                // Hole alle Listings für diese Stadt (optional: gefiltert nach branchId)
                const listings = yield prisma.oTAListing.findMany({
                    where: {
                        city: branch.city,
                        country: branch.country || undefined,
                        isActive: true,
                        // Optional: Nur Listings für diesen Branch anzeigen
                        // branchId: branchId
                    },
                    include: {
                        priceData: {
                            orderBy: {
                                date: 'desc'
                            },
                            take: 30 // Letzte 30 Tage
                        }
                    },
                    orderBy: {
                        platform: 'asc'
                    }
                });
                return listings;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der OTA-Listings:', error);
                throw error;
            }
        });
    }
    /**
     * Erstellt oder aktualisiert ein OTA-Listing
     *
     * @param branchId - Branch-ID (optional)
     * @param platform - OTA-Plattform
     * @param listingId - Listing-ID auf der OTA-Plattform
     * @param city - Stadt
     * @param data - Listing-Daten
     * @returns Listing
     */
    static upsertListing(branchId, platform, listingId, city, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const listing = yield prisma.oTAListing.upsert({
                    where: {
                        platform_listingId_city: {
                            platform,
                            listingId,
                            city
                        }
                    },
                    update: Object.assign(Object.assign({}, data), { branchId: branchId || undefined, updatedAt: new Date() }),
                    create: Object.assign({ branchId: branchId || null, platform,
                        listingId,
                        city }, data)
                });
                return listing;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Erstellen/Aktualisieren des OTA-Listings:', error);
                throw error;
            }
        });
    }
    /**
     * Speichert Preisdaten für ein Listing
     *
     * @param listingId - Listing-ID
     * @param date - Datum
     * @param price - Preis
     * @param currency - Währung (Standard: COP)
     * @param available - Verfügbar
     * @param availableRooms - Anzahl verfügbarer Zimmer
     * @param source - Quelle ('rate_shopper' | 'api' | 'manual')
     * @returns Preisdaten
     */
    static savePriceData(listingId_1, date_1, price_1) {
        return __awaiter(this, arguments, void 0, function* (listingId, date, price, currency = 'COP', available = true, availableRooms, source = 'rate_shopper') {
            try {
                const priceData = yield prisma.oTAPriceData.upsert({
                    where: {
                        listingId_date: {
                            listingId,
                            date
                        }
                    },
                    update: {
                        price,
                        currency,
                        available,
                        availableRooms,
                        source,
                        scrapedAt: new Date()
                    },
                    create: {
                        listingId,
                        date,
                        price,
                        currency,
                        available,
                        availableRooms,
                        source,
                        scrapedAt: new Date()
                    }
                });
                return priceData;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Speichern der Preisdaten:', error);
                throw error;
            }
        });
    }
    /**
     * Ruft Preisdaten für ein Listing ab
     *
     * @param listingId - Listing-ID
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Array von Preisdaten
     */
    static getPriceData(listingId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const priceData = yield prisma.oTAPriceData.findMany({
                    where: {
                        listingId,
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    orderBy: {
                        date: 'asc'
                    }
                });
                return priceData;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der Preisdaten:', error);
                throw error;
            }
        });
    }
}
exports.OTARateShoppingService = OTARateShoppingService;
//# sourceMappingURL=otaRateShoppingService.js.map