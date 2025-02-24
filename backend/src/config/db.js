const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'intranet',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5668, // Angepasster PostgreSQL Port
        dialect: 'postgres',
        logging: false, // Deaktiviere SQL-Logging in der Produktion
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            connectTimeout: 60000 // Längeres Timeout für die Verbindung
        }
    }
);

// Teste die Verbindung
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Datenbankverbindung erfolgreich hergestellt.');
    } catch (error) {
        console.error('Fehler bei der Datenbankverbindung:', error);
        // Versuche es nach 5 Sekunden erneut
        setTimeout(testConnection, 5000);
    }
};

testConnection();

module.exports = sequelize; 