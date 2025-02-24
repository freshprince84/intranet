const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Alle Niederlassungen abrufen
exports.getAllBranches = async (req, res) => {
    try {
        const branches = await prisma.branch.findMany({
            select: {
                id: true,
                name: true
            }
        });
        res.json(branches);
    } catch (error) {
        console.error('Error in getAllBranches:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Niederlassungen', 
            error: error.message 
        });
    }
}; 