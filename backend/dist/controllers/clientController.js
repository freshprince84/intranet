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
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Hole die letzten 10 unterschiedlichen Clients, die der User beraten hat
        const recentConsultations = yield prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                clientId: { not: null }
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
        const recentClients = recentConsultations
            .filter(c => c.client !== null)
            .map(c => c.client);
        res.json(recentClients);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der zuletzt beratenen Clients:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getRecentClients = getRecentClients;
//# sourceMappingURL=clientController.js.map