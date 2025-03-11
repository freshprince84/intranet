"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payrollController_1 = require("../controllers/payrollController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Alle Routen mit Token-Authentifizierung schützen
router.use(auth_1.authenticateToken);
// Stunden für Lohnabrechnung speichern
router.post('/hours', payrollController_1.saveWorkHours);
// Lohn berechnen
router.get('/calculate', payrollController_1.calculatePayroll);
// Alle Lohnabrechnungen abrufen (optional mit userId-Filter)
router.get('/', payrollController_1.getPayrolls);
// PDF generieren
router.get('/pdf/:payrollId', payrollController_1.generatePayrollPDF);
exports.default = router;
//# sourceMappingURL=payroll.js.map