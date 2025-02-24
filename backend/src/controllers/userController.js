const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Alle Benutzer abrufen
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Benutzer', 
            error: error.message 
        });
    }
}; 