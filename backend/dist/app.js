"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const requests_1 = __importDefault(require("./routes/requests"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const roles_1 = __importDefault(require("./routes/roles"));
const settings_1 = __importDefault(require("./routes/settings"));
const worktime_1 = __importDefault(require("./routes/worktime"));
const branches_1 = __importDefault(require("./routes/branches"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const app = (0, express_1.default)();
// CORS-Konfiguration
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'http://192.168.1.1:3000' // WLAN IP
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Body Parser Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Debug-Middleware für eingehende Anfragen
app.use((req, res, next) => {
    console.log('Eingehende Anfrage:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        headers: req.headers,
        body: req.body
    });
    next();
});
// Verbesserte Debug-Middleware zum Ausgeben aller Routen
app.use((req, res, next) => {
    // Nur beim ersten Request (oder bei bestimmten Pfaden) ausführen
    if (req.path === '/api/test' || req.path === '/') {
        console.log('DEBUG: Express App verfügt über folgende Router:');
        // Gibt die registrierten Router aus
        if (app._router && app._router.stack) {
            const routersMap = new Map();
            app._router.stack.forEach((middleware, i) => {
                if (middleware.route) {
                    // Routen, die direkt an die App angehängt wurden
                    console.log(`${i}. Direkte Route: ${middleware.route.path} (Methoden: ${Object.keys(middleware.route.methods).join(', ')})`);
                }
                else if (middleware.name === 'router') {
                    // Router-Middleware
                    const regexStr = middleware.regexp.toString();
                    const baseRoute = regexStr.substring(regexStr.indexOf("^") + 1, regexStr.lastIndexOf("\\/?")).replace(/\\\//g, '/');
                    console.log(`${i}. Router: ${baseRoute}`);
                    routersMap.set(baseRoute, middleware.handle);
                    // Versuche, die Routen des Routers zu extrahieren
                    if (middleware.handle && middleware.handle.stack) {
                        console.log(`   Router-Stack für ${baseRoute}:`);
                        middleware.handle.stack.forEach((handler, j) => {
                            if (handler.route) {
                                const routePath = handler.route.path;
                                const routeMethods = Object.keys(handler.route.methods).join(', ');
                                console.log(`   ${j}. Route: ${baseRoute}${routePath} (Methoden: ${routeMethods})`);
                            }
                            else if (handler.name === 'authenticateToken') {
                                console.log(`   ${j}. Middleware: authenticateToken`);
                            }
                            else {
                                console.log(`   ${j}. Middleware: ${handler.name || 'unbenannt'}`);
                            }
                        });
                    }
                }
                else {
                    console.log(`${i}. Middleware: ${middleware.name || 'unbenannt'}`);
                }
            });
            // Speziell für die problematischen Routen
            const problematicPaths = [
                '/api/notifications/unread/count',
                '/api/settings/notifications/user'
            ];
            problematicPaths.forEach(path => {
                console.log(`\nSuche Übereinstimmung für: ${path}`);
                const parts = path.split('/');
                const baseRoute = `/${parts[1]}/${parts[2]}`;
                console.log(`  Base Route: ${baseRoute}`);
                const router = routersMap.get(baseRoute);
                if (router && router.stack) {
                    console.log(`  Router für ${baseRoute} gefunden!`);
                    let matched = false;
                    router.stack.forEach((handler, j) => {
                        if (handler.route) {
                            const fullPath = baseRoute + handler.route.path;
                            console.log(`    Route: ${fullPath} (erwartet: ${path})`);
                            // Prüfe, ob dieser Pfad eine Übereinstimmung sein könnte
                            const pathEnd = path.substring(baseRoute.length);
                            if (pathEnd === handler.route.path || handler.route.path === '*') {
                                console.log(`    ✓ ÜBEREINSTIMMUNG GEFUNDEN!`);
                                matched = true;
                            }
                        }
                    });
                    if (!matched) {
                        console.log(`    ✗ Keine Übereinstimmung für ${path} gefunden.`);
                    }
                }
                else {
                    console.log(`  ✗ Kein Router für ${baseRoute} gefunden!`);
                }
            });
        }
    }
    next();
});
// Verbesserte Middleware zur Protokollierung von 404-Fehlern
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
        if (res.statusCode === 404) {
            console.log(`404 - Route nicht gefunden: ${req.originalUrl}`);
            console.log(`Request-Methode: ${req.method}`);
            console.log(`JWT-Token vorhanden: ${req.headers.authorization ? 'Ja' : 'Nein'}`);
            // Prüfen, ob eine der problematischen Routen betroffen ist
            if (req.originalUrl.includes('/settings/notifications/user') ||
                req.originalUrl.includes('/notifications/unread/count')) {
                console.log('KRITISCHE ROUTE NICHT GEFUNDEN!');
                console.log('Detaillierte Anfrage-Informationen:');
                console.log('URL:', req.url);
                console.log('Path:', req.path);
                console.log('Base URL:', req.baseUrl);
                // Versuche, alle Router zu überprüfen
                console.log('Router-Prüfung für kritische Route:');
                app._router.stack.forEach((layer, i) => {
                    if (layer.name === 'router') {
                        // Extrahiere den Base-Path des Routers aus dem regulären Ausdruck
                        const regexStr = layer.regexp.toString();
                        const baseRoute = regexStr.substring(regexStr.indexOf("^") + 1, regexStr.lastIndexOf("\\/?")).replace(/\\\//g, '/');
                        console.log(`Router ${i}: Base "${baseRoute}"`);
                        // Überprüfe, ob die Routen des Routers unsere gesuchte Route enthalten
                        if (layer.handle && layer.handle.stack) {
                            layer.handle.stack.forEach((stackItem, j) => {
                                if (stackItem.route) {
                                    const fullPath = baseRoute + stackItem.route.path;
                                    console.log(`  Route ${j}: "${fullPath}" (Methoden: ${Object.keys(stackItem.route.methods).join(', ')})`);
                                    // Überprüfe, ob diese Route zu der gesuchten Route passt
                                    if (req.originalUrl.endsWith(stackItem.route.path)) {
                                        console.log(`  MÖGLICHE ÜBEREINSTIMMUNG für ${req.originalUrl} -> ${fullPath}`);
                                    }
                                }
                            });
                        }
                    }
                });
            }
        }
        return originalSend.call(this, body);
    };
    next();
});
// Statische Dateien für Uploads
const uploadsPath = path_1.default.join(process.cwd(), 'uploads');
console.log('Uploads Verzeichnis:', uploadsPath);
app.use('/uploads', express_1.default.static(uploadsPath));
// Basis-Test-Route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API ist erreichbar' });
});
// Routen
app.use('/api/auth', auth_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/requests', requests_1.default);
app.use('/api/tasks', tasks_1.default);
app.use('/api/roles', roles_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/worktime', worktime_1.default);
app.use('/api/branches', branches_1.default);
app.use('/api/users', users_1.default);
// Error Handler
app.use((err, req, res, next) => {
    console.error('Fehler:', err);
    res.status(500).json({ message: 'Interner Server-Fehler', error: err.message });
});
// 404 Handler
app.use((req, res) => {
    console.log('404 - Route nicht gefunden:', req.path);
    res.status(404).json({ message: 'Route nicht gefunden' });
});
exports.default = app;
//# sourceMappingURL=app.js.map