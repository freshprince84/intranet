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
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Alle Clients abrufen
const getClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const clients = yield prisma.client.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(clients);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getClients = getClients;
// Einzelnen Client abrufen
const getClientById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const client = yield prisma.client.findUnique({
            where: { id: Number(id) },
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
        console.error('Fehler beim Abrufen des Clients:', error);
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
        const client = yield prisma.client.create({
            data: {
                name,
                company,
                email,
                phone,
                address,
                notes
            }
        });
        res.status(201).json(client);
    }
    catch (error) {
        console.error('Fehler beim Erstellen des Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.createClient = createClient;
// Client aktualisieren
const updateClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, company, email, phone, address, notes, isActive } = req.body;
        const client = yield prisma.client.update({
            where: { id: Number(id) },
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
        console.error('Fehler beim Aktualisieren des Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateClient = updateClient;
// Client löschen
const deleteClient = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.client.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Client erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteClient = deleteClient;
// Zuletzt beratene Clients abrufen
const getRecentClients = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('🚀 DEBUG: getRecentClients wurde aufgerufen');
        console.log('🚀 DEBUG: req.userId:', req.userId);
        console.log('🚀 DEBUG: headers:', ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...');
        const userId = req.userId;
        if (!userId) {
            console.log('❌ DEBUG: Nicht authentifiziert');
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        console.log('✅ DEBUG: Benutzer authentifiziert, userId:', userId);
        // ✅ TIMEZONE-FIX: Verwende gleiche Logik wie Frontend (getTimezoneOffset)
        // Das Frontend verwendet: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        // Backend muss dasselbe verwenden für konsistente Zeitvergleiche
        const localNow = new Date();
        const now = new Date(localNow.getTime() - localNow.getTimezoneOffset() * 60000);
        console.log('🕒 DEBUG: Timezone-korrigierte Zeit:', now.toISOString());
        // Hole vergangene Beratungen (startTime < jetzt) - diese sind "zuletzt beraten"
        const pastConsultations = yield prisma.workTime.findMany({
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
        const plannedConsultations = yield prisma.workTime.findMany({
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
        console.log('=== RECENT CLIENTS DEBUG (TIMEZONE-FIXED) ===');
        console.log('User ID:', userId);
        console.log('Local now (raw):', localNow.toISOString());
        console.log('Corrected now (with timezone offset):', now.toISOString());
        console.log('Timezone offset minutes:', localNow.getTimezoneOffset());
        console.log('Past consultations:', pastConsultations.length);
        pastConsultations.forEach((consultation, index) => {
            var _a;
            const isPast = consultation.startTime < now;
            console.log(`  Past ${index + 1}. Client: ${(_a = consultation.client) === null || _a === void 0 ? void 0 : _a.name}, StartTime: ${consultation.startTime.toISOString()}, isPast: ${isPast}`);
        });
        console.log('Planned consultations:', plannedConsultations.length);
        plannedConsultations.forEach((consultation, index) => {
            var _a;
            const isPlanned = consultation.startTime >= now;
            console.log(`  Planned ${index + 1}. Client: ${(_a = consultation.client) === null || _a === void 0 ? void 0 : _a.name}, StartTime: ${consultation.startTime.toISOString()}, isPlanned: ${isPlanned}`);
        });
        console.log('Unique planned (after filtering):', uniquePlannedConsultations.length);
        uniquePlannedConsultations.forEach((consultation, index) => {
            var _a;
            console.log(`  Unique Planned ${index + 1}. Client: ${(_a = consultation.client) === null || _a === void 0 ? void 0 : _a.name}, StartTime: ${consultation.startTime.toISOString()}`);
        });
        console.log('Final clients order with status:', recentClientsWithStatus.map(c => `${c.name} (${c.status})`));
        console.log('=== END DEBUG ===');
        res.json(recentClientsWithStatus);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der zuletzt beratenen Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getRecentClients = getRecentClients;
//# sourceMappingURL=clientController.js.map