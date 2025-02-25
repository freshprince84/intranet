"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const taskController_1 = require("../controllers/taskController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Alle Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
// GET /api/tasks - Alle Tasks abrufen
router.get('/', taskController_1.getAllTasks);
// GET /api/tasks/:id - Einzelnen Task abrufen
router.get('/:id', taskController_1.getTaskById);
// POST /api/tasks - Neuen Task erstellen
router.post('/', taskController_1.createTask);
// PUT /api/tasks/:id - Task aktualisieren
router.put('/:id', taskController_1.updateTask);
// DELETE /api/tasks/:id - Task löschen
router.delete('/:id', taskController_1.deleteTask);
exports.default = router;
//# sourceMappingURL=tasks.js.map