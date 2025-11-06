import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getDataIsolationFilter } from '../middleware/organization';

const prisma = new PrismaClient();

interface TestBranch {
    id: number;
    name: string;
}

// Debug-Funktion ohne DB-Zugriff
export const getTest = async (_req: Request, res: Response) => {
    const testBranches: TestBranch[] = [
        { id: 1, name: "Test-Niederlassung 1" },
        { id: 2, name: "Test-Niederlassung 2" }
    ];
    res.json(testBranches);
};

// Alle Niederlassungen abrufen
export const getAllBranches = async (req: Request, res: Response) => {
    try {
        // Datenisolation: Zeigt alle Branches der Organisation oder nur eigene (wenn standalone)
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        
        const branches = await prisma.branch.findMany({
            where: branchFilter,
            select: {
                id: true,
                name: true
            },
            orderBy: { name: 'asc' }
        });
        res.json(branches);
    } catch (error) {
        console.error('Error in getAllBranches:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Niederlassungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
}; 