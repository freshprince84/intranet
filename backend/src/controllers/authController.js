const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.register = async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;
        console.log('Register-Versuch für:', { username, email, first_name, last_name });
        
        // Hash das Passwort
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password gehashed:', !!hashedPassword);
        
        // Erstelle den Benutzer
        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash: hashedPassword,
                firstName: first_name,
                lastName: last_name
            }
        });
        console.log('Benutzer erstellt:', { id: user.id, email: user.email });

        // Erstelle Token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Benutzer erfolgreich erstellt',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({ 
            message: 'Fehler bei der Registrierung', 
            error: error.message 
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login-Versuch für:', email);
        console.log('Eingegebenes Passwort:', password);
        
        // Finde den Benutzer
        const user = await prisma.user.findUnique({
            where: { email }
        });
        console.log('Benutzer gefunden:', !!user);
        console.log('Benutzer Daten:', {
            id: user?.id,
            email: user?.email,
            hasPasswordHash: !!user?.passwordHash,
            passwordHashLength: user?.passwordHash?.length,
            passwordHash: user?.passwordHash
        });
        
        if (!user) {
            console.log('Benutzer nicht gefunden');
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }

        // Überprüfe das Passwort
        console.log('Versuche Passwortvergleich mit:', {
            passwordVorhanden: !!password,
            passwordHashVorhanden: !!user.passwordHash,
            passwordLaenge: password?.length,
            hashLaenge: user.passwordHash?.length
        });
        
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log('Passwort gültig:', isValid);
        
        if (!isValid) {
            console.log('Passwort ungültig');
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }

        // Erstelle Token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('Token erstellt');

        res.json({
            message: 'Login erfolgreich',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName
            }
        });
    } catch (error) {
        console.error('Login-Fehler:', error);
        res.status(500).json({ 
            message: 'Fehler beim Login', 
            error: error.message 
        });
    }
};

exports.logout = async (req, res) => {
    try {
        res.json({ message: 'Logout erfolgreich' });
    } catch (error) {
        res.status(500).json({ 
            message: 'Fehler beim Logout', 
            error: error.message 
        });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const userId = req.userId;
        console.log('getCurrentUser für ID:', userId);
        
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        console.log('Benutzer gefunden:', !!user);

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName
            }
        });
    } catch (error) {
        console.error('getCurrentUser Fehler:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen des Benutzers', 
            error: error.message 
        });
    }
}; 