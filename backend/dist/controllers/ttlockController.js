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
exports.deletePasscode = exports.createPasscode = exports.getLockInfo = exports.getLocks = void 0;
const ttlockService_1 = require("../services/ttlockService");
/**
 * GET /api/ttlock/locks
 * Ruft alle verfügbaren TTLock Locks ab
 */
const getLocks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organizationId;
        const ttlockService = new ttlockService_1.TTLockService(organizationId);
        const locks = yield ttlockService.getLocks();
        res.json({
            success: true,
            locks: locks.map(lockId => ({ lockId, name: lockId })) // lockId ist bereits ein String
        });
    }
    catch (error) {
        console.error('Error getting TTLock locks:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Locks'
        });
    }
});
exports.getLocks = getLocks;
/**
 * GET /api/ttlock/locks/:lockId/info
 * Ruft Informationen zu einem Lock ab
 */
const getLockInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lockId } = req.params;
        const organizationId = req.organizationId;
        // TODO: Implementiere getLockInfo in TTLockService wenn benötigt
        // Für jetzt: Basis-Informationen
        res.json({
            success: true,
            lockId,
            message: 'Lock-Info-Endpoint noch nicht implementiert'
        });
    }
    catch (error) {
        console.error('Error getting lock info:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Lock-Informationen'
        });
    }
});
exports.getLockInfo = getLockInfo;
/**
 * POST /api/ttlock/passcodes
 * Erstellt einen temporären Passcode
 */
const createPasscode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lockId, startDate, endDate, passcodeName } = req.body;
        const organizationId = req.organizationId;
        if (!lockId || !startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'lockId, startDate und endDate sind erforderlich'
            });
        }
        const ttlockService = new ttlockService_1.TTLockService(organizationId);
        const passcode = yield ttlockService.createTemporaryPasscode(lockId, new Date(startDate), new Date(endDate), passcodeName);
        res.json({
            success: true,
            passcode,
            message: 'Passcode erfolgreich erstellt'
        });
    }
    catch (error) {
        console.error('Error creating passcode:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Erstellen des Passcodes'
        });
    }
});
exports.createPasscode = createPasscode;
/**
 * DELETE /api/ttlock/passcodes/:passcodeId
 * Löscht einen Passcode
 */
const deletePasscode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { passcodeId } = req.params;
        const { lockId } = req.body;
        const organizationId = req.organizationId;
        if (!lockId) {
            return res.status(400).json({
                success: false,
                message: 'lockId ist erforderlich'
            });
        }
        const ttlockService = new ttlockService_1.TTLockService(organizationId);
        yield ttlockService.deleteTemporaryPasscode(lockId, passcodeId);
        res.json({
            success: true,
            message: 'Passcode erfolgreich gelöscht'
        });
    }
    catch (error) {
        console.error('Error deleting passcode:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Löschen des Passcodes'
        });
    }
});
exports.deletePasscode = deletePasscode;
//# sourceMappingURL=ttlockController.js.map