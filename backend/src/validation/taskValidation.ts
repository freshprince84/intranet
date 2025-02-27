import { TaskStatus } from '@prisma/client';

export interface TaskData {
    title: string;
    description?: string;
    status?: TaskStatus;
    responsibleId: number;
    qualityControlId?: number;
    branchId: number;
    dueDate?: string;
}

export const validateTask = (taskData: Partial<TaskData>): string | null => {
    if (!taskData.title || typeof taskData.title !== 'string' || taskData.title.trim().length === 0) {
        return 'Titel ist erforderlich';
    }

    if (taskData.description && typeof taskData.description !== 'string') {
        return 'Beschreibung muss ein Text sein';
    }

    if (taskData.status && !Object.values(TaskStatus).includes(taskData.status)) {
        return 'Ungültiger Status';
    }

    if (!taskData.responsibleId || typeof taskData.responsibleId !== 'number') {
        return 'Verantwortlicher Benutzer ist erforderlich';
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