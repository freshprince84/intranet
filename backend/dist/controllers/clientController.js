"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentClients = exports.deleteClient = exports.updateClient = exports.createClient = exports.getClientById = exports.getClients = void 0;
const organization_1 = require("../middleware/organization");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
// Alle Clients abrufen
const getClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Datenisolation: Zeigt alle Clients der Organisation oder nur eigene (wenn standalone)
        const clientFilter = (0, organization_1.getDataIsolationFilter)(req, 'client');
        const clients = yield prisma_1.prisma.client.findMany({
            where: clientFilter,
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getClients = getClients;
// Einzelnen Client abrufen
const getClientById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const clientId = Number(id);
        // Prüfe ob Client zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'client', clientId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diesen Client verweigert' });
        }
        const client = yield prisma_1.prisma.client.findUnique({
            where: { id: clientId },
            include: {
                workTimes: {
                    include: {
                        user: true,
                        branch: true
                    },
                    orderBy: { startTime: 'desc' },
                    take: 10
                }
            }
        });
        if (!client) {
            return res.status(404).json({ message: 'Client nicht gefunden' });
        }
        res.json(client);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen des Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getClientById = getClientById;
// Neuen Client erstellen
const createClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, company, email, phone, address, notes } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Name ist erforderlich' });
        }
        const client = yield prisma_1.prisma.client.create({
            data: {
                name,
                company,
                email,
                phone,
                address,
                notes,
                organizationId: req.organizationId || null
            }
        });
        res.status(201).json(client);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Erstellen des Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.createClient = createClient;
// Client aktualisieren
const updateClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const clientId = Number(id);
        const { name, company, email, phone, address, notes, isActive } = req.body;
        // Prüfe ob Client zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'client', clientId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diesen Client verweigert' });
        }
        const client = yield prisma_1.prisma.client.update({
            where: { id: clientId },
            data: {
                name,
                company,
                email,
                phone,
                address,
                notes,
                isActive
            }
        });
        res.json(client);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Aktualisieren des Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateClient = updateClient;
// Client löschen
const deleteClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const clientId = Number(id);
        // 1. Prüfe ob Client existiert und zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'client', clientId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diesen Client verweigert' });
        }
        const client = yield prisma_1.prisma.client.findUnique({
            where: { id: clientId }
        });
        if (!client) {
            return res.status(404).json({ message: 'Client nicht gefunden' });
        }
        // 2. Prüfe Verknüpfungen
        const [workTimes, consultationInvoices, monthlyReportItems] = yield Promise.all([
            prisma_1.prisma.workTime.findMany({ where: { clientId } }),
            prisma_1.prisma.consultationInvoice.findMany({ where: { clientId } }),
            prisma_1.prisma.monthlyConsultationReportItem.findMany({ where: { clientId } })
        ]);
        const hasWorkTimes = workTimes.length > 0;
        const hasInvoices = consultationInvoices.length > 0;
        const hasReportItems = monthlyReportItems.length > 0;
        // 3. Wenn Verknüpfungen existieren, blockieren
        if (hasWorkTimes || hasInvoices || hasReportItems) {
            const reasons = [];
            if (hasWorkTimes)
                reasons.push(`${workTimes.length} Zeiteinträge`);
            if (hasInvoices)
                reasons.push(`${consultationInvoices.length} Rechnungen`);
            if (hasReportItems)
                reasons.push(`${monthlyReportItems.length} Monatsberichte`);
            return res.status(409).json({
                message: 'Client kann nicht gelöscht werden',
                reason: 'Es existieren Verknüpfungen mit anderen Datensätzen',
                details: {
                    workTimes: workTimes.length,
                    consultationInvoices: consultationInvoices.length,
                    monthlyReportItems: monthlyReportItems.length
                },
                suggestion: 'Sie können den Client deaktivieren statt ihn zu löschen'
            });
        }
        // 4. Client löschen wenn keine Verknüpfungen bestehen
        yield prisma_1.prisma.client.delete({
            where: { id: clientId }
        });
        res.json({ message: 'Client erfolgreich gelöscht' });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Löschen des Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteClient = deleteClient;
// Zuletzt beratene Clients abrufen
const getRecentClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        logger_1.logger.log('🚀 DEBUG: getRecentClients wurde aufgerufen');
        logger_1.logger.log('🚀 DEBUG: req.userId:', req.userId);
        logger_1.logger.log('🚀 DEBUG: headers:', ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...');
        const userId = req.userId;
        if (!userId) {
            logger_1.logger.log('❌ DEBUG: Nicht authentifiziert');
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        logger_1.logger.log('✅ DEBUG: Benutzer authentifiziert, userId:', userId);
        // ✅ TIMEZONE-FIX: Verwende gleiche Logik wie Frontend (getTimezoneOffset)
        // Das Frontend verwendet: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        // Backend muss dasselbe verwenden für konsistente Zeitvergleiche
        const localNow = new Date();
        const now = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000);
        logger_1.logger.log('🕒 DEBUG: Timezone-korrigierte Zeit:', now.toISOString());
        // Hole vergangene Beratungen (startTime < jetzt) - diese sind "zuletzt beraten"
        const pastConsultations = yield prisma_1.prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                clientId: { not: null },
                startTime: { lt: now }
            },
            select: {
                clientId: true,
                client: true,
                startTime: true
            },
            orderBy: { startTime: 'desc' },
            distinct: ['clientId'],
            take: 10
        });
        // Hole geplante Beratungen (startTime >= jetzt)
        const plannedConsultations = yield prisma_1.prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                clientId: { not: null },
                startTime: { gte: now }
            },
            select: {
                clientId: true,
                client: true,
                startTime: true
            },
            orderBy: { startTime: 'asc' }, // Geplante chronologisch sortiert
            distinct: ['clientId'],
            take: 5
        });
        // Sammle alle Client-IDs aus vergangenen Beratungen
        const pastClientIds = new Set(pastConsultations.map(c => c.clientId));
        // Filtere geplante Beratungen: nur Clients die noch nicht in vergangenen enthalten sind
        const uniquePlannedConsultations = plannedConsultations.filter(c => !pastClientIds.has(c.clientId));
        // Kombiniere: Vergangene Beratungen zuerst, dann geplante
        const combinedConsultations = [
            ...pastConsultations,
            ...uniquePlannedConsultations
        ];
        // Limitiere auf 10 Clients insgesamt
        const limitedConsultations = combinedConsultations.slice(0, 10);
        // Erweiterte Antwort mit Status und Startzeit
        const recentClientsWithStatus = limitedConsultations
            .filter(c => c.client !== null)
            .map(consultation => (Object.assign(Object.assign({}, consultation.client), { lastConsultationDate: consultation.startTime, status: consultation.startTime < now ? 'past' : 'planned' })));
        // DEBUG: Log die Sortierreihenfolge mit Timezone-Infos
        logger_1.logger.log('=== RECENT CLIENTS DEBUG (TIMEZONE-FIXED) ===');
        logger_1.logger.log('User ID:', userId);
        logger_1.logger.log('Local now (raw):', localNow.toISOString());
        logger_1.logger.log('Corrected now (with timezone offset):', now.toISOString());
        logger_1.logger.log('Timezone offset minutes:', localNow.getTimezoneOffset());
        logger_1.logger.log('Past consultations:', pastConsultations.length);
        pastConsultations.forEach((consultation, index) => {
            var _a;
            const isPast = consultation.startTime < now;
            logger_1.logger.log(`  Past ${index + 1}. Client: ${(_a = consultation.client) === null || _a === void 0 ? void 0 : _a.name}, StartTime: ${consultation.startTime.toISOString()}, isPast: ${isPast}`);
        });
        logger_1.logger.log('Planned consultations:', plannedConsultations.length);
        plannedConsultations.forEach((consultation, index) => {
            var _a;
            const isPlanned = consultation.startTime >= now;
            logger_1.logger.log(`  Planned ${index + 1}. Client: ${(_a = consultation.client) === null || _a === void 0 ? void 0 : _a.name}, StartTime: ${consultation.startTime.toISOString()}, isPlanned: ${isPlanned}`);
        });
        logger_1.logger.log('Unique planned (after filtering):', uniquePlannedConsultations.length);
        uniquePlannedConsultations.forEach((consultation, index) => {
            var _a;
            logger_1.logger.log(`  Unique Planned ${index + 1}. Client: ${(_a = consultation.client) === null || _a === void 0 ? void 0 : _a.name}, StartTime: ${consultation.startTime.toISOString()}`);
        });
        logger_1.logger.log('Final clients order with status:', recentClientsWithStatus.map(c => `${c.name} (${c.status})`));
        logger_1.logger.log('=== END DEBUG ===');
        res.json(recentClientsWithStatus);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der zuletzt beratenen Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getRecentClients = getRecentClients;
//# sourceMappingURL=clientController.js.map