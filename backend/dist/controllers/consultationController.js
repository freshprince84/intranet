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
exports.deleteConsultation = exports.updateConsultationNotes = exports.createTaskForConsultation = exports.linkTaskToConsultation = exports.getConsultations = exports.stopConsultation = exports.startConsultation = void 0;
const organization_1 = require("../middleware/organization");
const prisma_1 = require("../utils/prisma");
// Beratung starten (erweiterte Version von worktime/start)
const startConsultation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { branchId, clientId, startTime, notes } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!clientId) {
            return res.status(400).json({ message: 'Client ist erforderlich' });
        }
        // Validierung: Prüfe ob Client zur Organisation gehört
        const clientFilter = (0, organization_1.getDataIsolationFilter)(req, 'client');
        const client = yield prisma_1.prisma.client.findFirst({
            where: Object.assign(Object.assign({}, clientFilter), { id: Number(clientId) })
        });
        if (!client) {
            return res.status(400).json({ message: 'Client gehört nicht zu Ihrer Organisation' });
        }
        // Prüfe, ob bereits eine aktive Zeiterfassung existiert
        const activeWorktime = yield prisma_1.prisma.workTime.findFirst({
            where: {
                userId: Number(userId),
                endTime: null
            }
        });
        if (activeWorktime) {
            return res.status(400).json({ message: 'Es läuft bereits eine Zeiterfassung' });
        }
        const now = startTime ? new Date(startTime) : new Date();
        const consultation = yield prisma_1.prisma.workTime.create({
            data: {
                startTime: now,
                userId: Number(userId),
                branchId: Number(branchId),
                clientId: Number(clientId),
                notes: notes || null,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                organizationId: req.organizationId || null
            },
            include: {
                branch: true,
                client: true
            }
        });
        res.status(201).json(consultation);
    }
    catch (error) {
        console.error('Fehler beim Starten der Beratung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.startConsultation = startConsultation;
// Beratung beenden
const stopConsultation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { endTime, notes } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Finde die aktive Beratung für den Benutzer
        const activeConsultation = yield prisma_1.prisma.workTime.findFirst({
            where: {
                userId: Number(userId),
                endTime: null,
                clientId: { not: null }
            }
        });
        if (!activeConsultation) {
            return res.status(404).json({ message: 'Keine aktive Beratung gefunden' });
        }
        const now = endTime ? new Date(endTime) : new Date();
        const consultation = yield prisma_1.prisma.workTime.update({
            where: { id: activeConsultation.id },
            data: {
                endTime: now,
                notes: notes || activeConsultation.notes
            },
            include: {
                branch: true,
                client: true,
                user: true
            }
        });
        res.json(consultation);
    }
    catch (error) {
        console.error('Fehler beim Beenden der Beratung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.stopConsultation = stopConsultation;
// Alle Beratungen abrufen
const getConsultations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { clientId, from, to } = req.query;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Datenisolation: Verwende getDataIsolationFilter für WorkTimes
        // Zeigt alle WorkTimes der Organisation (wenn User Organisation hat) oder nur eigene (wenn standalone)
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        let whereClause = Object.assign(Object.assign({}, worktimeFilter), { clientId: { not: null } });
        if (clientId) {
            whereClause.clientId = Number(clientId);
        }
        if (from || to) {
            whereClause.startTime = whereClause.startTime || {};
            if (from)
                whereClause.startTime.gte = new Date(from);
            if (to)
                whereClause.startTime.lte = new Date(to);
        }
        const consultations = yield prisma_1.prisma.workTime.findMany({
            where: whereClause,
            include: {
                branch: true,
                client: true,
                taskLinks: {
                    include: {
                        task: true
                    }
                },
                invoiceItems: {
                    include: {
                        invoice: {
                            select: {
                                id: true,
                                invoiceNumber: true,
                                status: true,
                                issueDate: true,
                                total: true
                            }
                        }
                    }
                },
                monthlyReport: {
                    select: {
                        id: true,
                        reportNumber: true,
                        status: true
                    }
                }
            },
            orderBy: {
                startTime: 'desc'
            }
        });
        res.json(consultations);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Beratungen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getConsultations = getConsultations;
// Task mit Beratung verknüpfen
const linkTaskToConsultation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { taskId } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfe ob die Beratung dem User gehört
        const consultation = yield prisma_1.prisma.workTime.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId)
            }
        });
        if (!consultation) {
            return res.status(404).json({ message: 'Beratung nicht gefunden' });
        }
        const link = yield prisma_1.prisma.workTimeTask.create({
            data: {
                workTimeId: Number(id),
                taskId: Number(taskId)
            },
            include: {
                task: true,
                workTime: {
                    include: {
                        client: true
                    }
                }
            }
        });
        res.status(201).json(link);
    }
    catch (error) {
        console.error('Fehler beim Verknüpfen von Task mit Beratung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.linkTaskToConsultation = linkTaskToConsultation;
// Neuen Task für Beratung erstellen
const createTaskForConsultation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description, dueDate, branchId, qualityControlId } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfe ob die Beratung dem User gehört
        const consultation = yield prisma_1.prisma.workTime.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            include: {
                client: true
            }
        });
        if (!consultation) {
            return res.status(404).json({ message: 'Beratung nicht gefunden' });
        }
        // Erstelle Task und verknüpfe ihn direkt
        const result = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Task erstellen
            const task = yield tx.task.create({
                data: {
                    title: title || `Notizen zu Beratung mit ${((_a = consultation.client) === null || _a === void 0 ? void 0 : _a.name) || 'Unbekannt'}`,
                    description,
                    responsibleId: Number(userId),
                    qualityControlId: Number(qualityControlId || userId),
                    branchId: Number(branchId || consultation.branchId),
                    dueDate: dueDate ? new Date(dueDate) : null,
                    status: 'open'
                }
            });
            // Verknüpfung erstellen
            const link = yield tx.workTimeTask.create({
                data: {
                    workTimeId: Number(id),
                    taskId: task.id
                }
            });
            return { task, link };
        }));
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Fehler beim Erstellen von Task für Beratung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.createTaskForConsultation = createTaskForConsultation;
// Notizen einer Beratung aktualisieren
const updateConsultationNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const consultation = yield prisma_1.prisma.workTime.update({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            data: { notes },
            include: {
                client: true,
                branch: true
            }
        });
        res.json(consultation);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Notizen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateConsultationNotes = updateConsultationNotes;
// Beratung löschen
const deleteConsultation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfe ob die Beratung dem User gehört
        const consultation = yield prisma_1.prisma.workTime.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId),
                clientId: { not: null } // Nur Beratungen, nicht normale Arbeitszeiten
            }
        });
        if (!consultation) {
            return res.status(404).json({ message: 'Beratung nicht gefunden oder keine Berechtigung' });
        }
        // Prüfe ob die Beratung noch aktiv ist (ohne Endzeit)
        if (!consultation.endTime) {
            return res.status(400).json({ message: 'Aktive Beratungen können nicht gelöscht werden. Bitte beenden Sie die Beratung zuerst.' });
        }
        // Lösche zuerst alle Task-Verknüpfungen
        yield prisma_1.prisma.workTimeTask.deleteMany({
            where: {
                workTimeId: Number(id)
            }
        });
        // Lösche die Beratung
        yield prisma_1.prisma.workTime.delete({
            where: {
                id: Number(id)
            }
        });
        res.json({ message: 'Beratung erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen der Beratung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteConsultation = deleteConsultation;
//# sourceMappingURL=consultationController.js.map