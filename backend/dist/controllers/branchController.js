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
exports.getAllBranches = exports.getTest = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Debug-Funktion ohne DB-Zugriff
const getTest = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const testBranches = [
        { id: 1, name: "Test-Niederlassung 1" },
        { id: 2, name: "Test-Niederlassung 2" }
    ];
    res.json(testBranches);
});
exports.getTest = getTest;
// Alle Niederlassungen abrufen
const getAllBranches = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const branches = yield prisma.branch.findMany({
            select: {
                id: true,
                name: true
            }
        });
        res.json(branches);
    }
    catch (error) {
        console.error('Error in getAllBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Niederlassungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllBranches = getAllBranches;
//# sourceMappingURL=branchController.js.map