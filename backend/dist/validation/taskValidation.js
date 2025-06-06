"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTask = void 0;
const client_1 = require("@prisma/client");
const validateTask = (taskData) => {
    if (!taskData.title || typeof taskData.title !== 'string' || taskData.title.trim().length === 0) {
        return 'Titel ist erforderlich';
    }
    if (taskData.description && typeof taskData.description !== 'string') {
        return 'Beschreibung muss ein Text sein';
    }
    if (taskData.status && !Object.values(client_1.TaskStatus).includes(taskData.status)) {
        return 'Ungültiger Status';
    }
    if ((taskData.responsibleId === undefined || taskData.responsibleId === null) &&
        (taskData.roleId === undefined || taskData.roleId === null)) {
        return 'Entweder ein verantwortlicher Benutzer oder eine Rolle muss angegeben werden';
    }
    if (taskData.responsibleId !== undefined && taskData.responsibleId !== null &&
        taskData.roleId !== undefined && taskData.roleId !== null) {
        return 'Es kann nur entweder ein verantwortlicher Benutzer oder eine Rolle angegeben werden, nicht beides';
    }
    if (taskData.responsibleId !== undefined && taskData.responsibleId !== null &&
        typeof taskData.responsibleId !== 'number') {
        return 'Ungültige ID für verantwortlichen Benutzer';
    }
    if (taskData.roleId !== undefined && taskData.roleId !== null &&
        typeof taskData.roleId !== 'number') {
        return 'Ungültige ID für Rolle';
    }
    if (taskData.qualityControlId && typeof taskData.qualityControlId !== 'number') {
        return 'Ungültige ID für Qualitätskontrolle';
    }
    if (!taskData.branchId || typeof taskData.branchId !== 'number') {
        return 'Niederlassung ist erforderlich';
    }
    if (taskData.dueDate && isNaN(Date.parse(taskData.dueDate))) {
        return 'Ungültiges Fälligkeitsdatum';
    }
    return null;
};
exports.validateTask = validateTask;
//# sourceMappingURL=taskValidation.js.map