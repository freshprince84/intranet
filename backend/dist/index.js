"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const PORT = process.env.PORT || 5000;
app_1.default.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`API erreichbar unter: http://localhost:${PORT}/api`);
    console.log('Alle Routen registriert und aktiv.');
});
//# sourceMappingURL=index.js.map