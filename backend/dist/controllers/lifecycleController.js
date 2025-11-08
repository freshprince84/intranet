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
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadContract = exports.updateContract = exports.createContract = exports.getContract = exports.getContracts = exports.downloadCertificate = exports.updateCertificate = exports.createCertificate = exports.getCertificate = exports.getCertificates = exports.updateSocialSecurity = exports.getSocialSecurity = exports.updateStatus = exports.getLifecycle = void 0;
const lifecycleService_1 = require("../services/lifecycleService");
const lifecycleRoles_1 = require("../utils/lifecycleRoles");
const client_1 = require("@prisma/client");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const prisma = new client_1.PrismaClient();
// Upload-Verzeichnis für Certificates/Contracts
const CERTIFICATES_DIR = path.join(__dirname, '../../uploads/certificates');
const CONTRACTS_DIR = path.join(__dirname, '../../uploads/contracts');
// Stelle sicher, dass die Upload-Verzeichnisse existieren
if (!fs.existsSync(CERTIFICATES_DIR)) {
    fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}
if (!fs.existsSync(CONTRACTS_DIR)) {
    fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
}
/**
 * Ruft den Lebenszyklus-Status eines Users ab
 * GET /api/users/:id/lifecycle
 */
const getLifecycle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const result = yield lifecycleService_1.LifecycleService.getLifecycle(userId);
        if (!result) {
            return res.status(404).json({ message: 'Lebenszyklus nicht gefunden' });
        }
        res.json(result);
    }
    catch (error) {
        console.error('Error in getLifecycle:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Lebenszyklus',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getLifecycle = getLifecycle;
/**
 * Aktualisiert den Lebenszyklus-Status eines Users
 * PUT /api/users/:id/lifecycle/status
 */
const updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        // Prüfe Berechtigung: Nur HR oder Admin
        const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
        }
        const { status, contractStartDate, contractEndDate, contractType, exitDate, exitReason } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status ist erforderlich' });
        }
        const updated = yield lifecycleService_1.LifecycleService.updateStatus(userId, status, {
            contractStartDate: contractStartDate ? new Date(contractStartDate) : undefined,
            contractEndDate: contractEndDate ? new Date(contractEndDate) : undefined,
            contractType,
            exitDate: exitDate ? new Date(exitDate) : undefined,
            exitReason
        });
        res.json(updated);
    }
    catch (error) {
        console.error('Error in updateStatus:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Status',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateStatus = updateStatus;
/**
 * Ruft den Status einer Sozialversicherung ab
 * GET /api/users/:id/lifecycle/social-security/:type
 */
const getSocialSecurity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const type = req.params.type;
        const currentUserId = parseInt(req.userId || '0');
        // Validierung
        if (!['arl', 'eps', 'pension', 'caja'].includes(type)) {
            return res.status(400).json({ message: 'Ungültiger Typ' });
        }
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const status = yield lifecycleService_1.LifecycleService.getSocialSecurityStatus(userId, type);
        if (!status) {
            return res.status(404).json({ message: 'Lebenszyklus nicht gefunden' });
        }
        res.json(status);
    }
    catch (error) {
        console.error('Error in getSocialSecurity:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Sozialversicherungs-Status',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getSocialSecurity = getSocialSecurity;
/**
 * Aktualisiert den Status einer Sozialversicherung
 * PUT /api/users/:id/lifecycle/social-security/:type
 */
const updateSocialSecurity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const type = req.params.type;
        const currentUserId = parseInt(req.userId || '0');
        // Validierung
        if (!['arl', 'eps', 'pension', 'caja'].includes(type)) {
            return res.status(400).json({ message: 'Ungültiger Typ' });
        }
        // Prüfe Berechtigung: Nur Legal oder Admin
        const hasAccess = yield (0, lifecycleRoles_1.isLegalOrAdmin)(req);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Keine Berechtigung - nur Legal oder Admin' });
        }
        const { status, number, provider, registrationDate, notes } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status ist erforderlich' });
        }
        const updated = yield lifecycleService_1.LifecycleService.updateSocialSecurityStatus(userId, type, {
            status,
            number,
            provider,
            registrationDate: registrationDate ? new Date(registrationDate) : undefined,
            notes
        }, currentUserId);
        res.json(updated);
    }
    catch (error) {
        console.error('Error in updateSocialSecurity:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Sozialversicherungs-Status',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateSocialSecurity = updateSocialSecurity;
/**
 * Ruft alle Arbeitszeugnisse eines Users ab
 * GET /api/users/:id/lifecycle/certificates
 */
const getCertificates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const certificates = yield lifecycleService_1.LifecycleService.getCertificates(userId);
        if (certificates === null) {
            return res.status(404).json({ message: 'Lebenszyklus nicht gefunden' });
        }
        res.json({ certificates });
    }
    catch (error) {
        console.error('Error in getCertificates:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Arbeitszeugnisse',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getCertificates = getCertificates;
/**
 * Ruft ein einzelnes Arbeitszeugnis ab
 * GET /api/users/:id/lifecycle/certificates/:certId
 */
const getCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const certificateId = parseInt(req.params.certId);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const certificate = yield lifecycleService_1.LifecycleService.getCertificate(userId, certificateId);
        if (!certificate) {
            return res.status(404).json({ message: 'Arbeitszeugnis nicht gefunden' });
        }
        res.json(certificate);
    }
    catch (error) {
        console.error('Error in getCertificate:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Arbeitszeugnisses',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getCertificate = getCertificate;
/**
 * Erstellt ein neues Arbeitszeugnis
 * POST /api/users/:id/lifecycle/certificates
 */
const createCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: Nur HR oder Admin
        const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
        }
        const { certificateType, templateUsed, templateVersion, pdfPath } = req.body;
        if (!pdfPath) {
            return res.status(400).json({ message: 'PDF-Pfad ist erforderlich' });
        }
        const certificate = yield lifecycleService_1.LifecycleService.createCertificate(userId, {
            certificateType,
            templateUsed,
            templateVersion,
            pdfPath
        }, currentUserId);
        res.status(201).json(certificate);
    }
    catch (error) {
        console.error('Error in createCertificate:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen des Arbeitszeugnisses',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createCertificate = createCertificate;
/**
 * Aktualisiert ein Arbeitszeugnis
 * PUT /api/users/:id/lifecycle/certificates/:certId
 */
const updateCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const certificateId = parseInt(req.params.certId);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: Nur HR oder Admin
        const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
        }
        const { pdfPath, templateVersion } = req.body;
        const updated = yield lifecycleService_1.LifecycleService.updateCertificate(userId, certificateId, {
            pdfPath,
            templateVersion
        }, currentUserId);
        res.json(updated);
    }
    catch (error) {
        console.error('Error in updateCertificate:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Arbeitszeugnisses',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateCertificate = updateCertificate;
/**
 * Lädt ein Arbeitszeugnis herunter
 * GET /api/users/:id/lifecycle/certificates/:certId/download
 */
const downloadCertificate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const certificateId = parseInt(req.params.certId);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const certificate = yield lifecycleService_1.LifecycleService.getCertificate(userId, certificateId);
        if (!certificate) {
            return res.status(404).json({ message: 'Arbeitszeugnis nicht gefunden' });
        }
        const filePath = path.join(CERTIFICATES_DIR, certificate.pdfPath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'PDF-Datei nicht gefunden' });
        }
        // PDF als Download bereitstellen
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="arbeitszeugnis-${certificateId}.pdf"`);
        fs.createReadStream(filePath).pipe(res);
    }
    catch (error) {
        console.error('Error in downloadCertificate:', error);
        res.status(500).json({
            message: 'Fehler beim Herunterladen des Arbeitszeugnisses',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.downloadCertificate = downloadCertificate;
/**
 * Ruft alle Arbeitsverträge eines Users ab
 * GET /api/users/:id/lifecycle/contracts
 */
const getContracts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const contracts = yield lifecycleService_1.LifecycleService.getContracts(userId);
        if (contracts === null) {
            return res.status(404).json({ message: 'Lebenszyklus nicht gefunden' });
        }
        res.json({ contracts });
    }
    catch (error) {
        console.error('Error in getContracts:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Arbeitsverträge',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getContracts = getContracts;
/**
 * Ruft einen einzelnen Arbeitsvertrag ab
 * GET /api/users/:id/lifecycle/contracts/:contractId
 */
const getContract = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const contractId = parseInt(req.params.contractId);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const contract = yield lifecycleService_1.LifecycleService.getContract(userId, contractId);
        if (!contract) {
            return res.status(404).json({ message: 'Arbeitsvertrag nicht gefunden' });
        }
        res.json(contract);
    }
    catch (error) {
        console.error('Error in getContract:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Arbeitsvertrags',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getContract = getContract;
/**
 * Erstellt einen neuen Arbeitsvertrag
 * POST /api/users/:id/lifecycle/contracts
 */
const createContract = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: Nur HR oder Admin
        const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
        }
        const { contractType, startDate, endDate, salary, workingHours, position, templateUsed, templateVersion, pdfPath } = req.body;
        if (!startDate || !pdfPath) {
            return res.status(400).json({ message: 'Startdatum und PDF-Pfad sind erforderlich' });
        }
        const contract = yield lifecycleService_1.LifecycleService.createContract(userId, {
            contractType,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            salary,
            workingHours,
            position,
            templateUsed,
            templateVersion,
            pdfPath
        }, currentUserId);
        res.status(201).json(contract);
    }
    catch (error) {
        console.error('Error in createContract:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen des Arbeitsvertrags',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createContract = createContract;
/**
 * Aktualisiert einen Arbeitsvertrag
 * PUT /api/users/:id/lifecycle/contracts/:contractId
 */
const updateContract = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const contractId = parseInt(req.params.contractId);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: Nur HR oder Admin
        const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Keine Berechtigung - nur HR oder Admin' });
        }
        const { startDate, endDate, salary, workingHours, position, pdfPath, templateVersion } = req.body;
        const updated = yield lifecycleService_1.LifecycleService.updateContract(userId, contractId, {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
            salary,
            workingHours,
            position,
            pdfPath,
            templateVersion
        }, currentUserId);
        res.json(updated);
    }
    catch (error) {
        console.error('Error in updateContract:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Arbeitsvertrags',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateContract = updateContract;
/**
 * Lädt einen Arbeitsvertrag herunter
 * GET /api/users/:id/lifecycle/contracts/:contractId/download
 */
const downloadContract = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id);
        const contractId = parseInt(req.params.contractId);
        const currentUserId = parseInt(req.userId || '0');
        // Prüfe Berechtigung: User selbst oder HR/Admin
        if (userId !== currentUserId) {
            const hasAccess = yield (0, lifecycleRoles_1.isHROrAdmin)(req);
            if (!hasAccess) {
                return res.status(403).json({ message: 'Keine Berechtigung' });
            }
        }
        const contract = yield lifecycleService_1.LifecycleService.getContract(userId, contractId);
        if (!contract) {
            return res.status(404).json({ message: 'Arbeitsvertrag nicht gefunden' });
        }
        const filePath = path.join(CONTRACTS_DIR, contract.pdfPath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'PDF-Datei nicht gefunden' });
        }
        // PDF als Download bereitstellen
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="arbeitsvertrag-${contractId}.pdf"`);
        fs.createReadStream(filePath).pipe(res);
    }
    catch (error) {
        console.error('Error in downloadContract:', error);
        res.status(500).json({
            message: 'Fehler beim Herunterladen des Arbeitsvertrags',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.downloadContract = downloadContract;
//# sourceMappingURL=lifecycleController.js.map