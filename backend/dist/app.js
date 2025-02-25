"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const requests_1 = __importDefault(require("./routes/requests"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const roles_1 = __importDefault(require("./routes/roles"));
const settings_1 = __importDefault(require("./routes/settings"));
const worktime_1 = __importDefault(require("./routes/worktime"));
const branches_1 = __importDefault(require("./routes/branches"));
const app = (0, express_1.default)();
// CORS-Konfiguration
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// Routen
app.use('/api/auth', auth_1.default);
app.use('/api/requests', requests_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/roles', roles_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/worktimes', worktime_1.default);
app.use('/api/branches', branches_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map