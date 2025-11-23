"use strict";
/**
 * Script zum Aktualisieren bestehender Check-in-Links auf dem Hetzner-Server
 *
 * Aktualisiert alle Check-in-Links, die noch die interne ID (id) verwenden,
 * auf die LobbyPMS-Reservierungsnummer (lobbyReservationId).
 *
 * Betroffene Stellen:
 * - Reservation.sentMessage (falls Check-in-Link im Text enthalten)
 * - ReservationNotificationLog.checkInLink
 * - ReservationNotificationLog.message (falls Check-in-Link im Text enthalten)
 *
 * Usage:
 *   npx ts-node backend/scripts/update-checkin-links-to-lobbyid.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const checkInLinkUtils_1 = require("../src/utils/checkInLinkUtils");
const prisma = new client_1.PrismaClient();
async function updateCheckInLinks() {
    console.log('🔄 Starte Aktualisierung der Check-in-Links...\n');
    try {
        // Hole alle Reservierungen mit lobbyReservationId
        const reservations = await prisma.reservation.findMany({
            where: {
                lobbyReservationId: {
                    not: null
                }
            },
            select: {
                id: true,
                lobbyReservationId: true,
                guestEmail: true,
                sentMessage: true,
            },
            orderBy: {
                id: 'asc'
            }
        });
        console.log(`📋 Gefunden: ${reservations.length} Reservierungen mit lobbyReservationId\n`);
        const results = [];
        let updatedReservations = 0;
        let updatedNotificationLogs = 0;
        let totalChecked = 0;
        for (const reservation of reservations) {
            totalChecked++;
            const result = {
                reservationId: reservation.id,
                lobbyReservationId: reservation.lobbyReservationId,
                updated: false
            };
            try {
                // Generiere neuen Check-in-Link mit lobbyReservationId
                const newCheckInLink = (0, checkInLinkUtils_1.generateLobbyPmsCheckInLink)({
                    id: reservation.id,
                    lobbyReservationId: reservation.lobbyReservationId,
                    guestEmail: reservation.guestEmail || ''
                });
                // Prüfe und aktualisiere sentMessage
                if (reservation.sentMessage) {
                    // Suche nach alten Links mit reservation.id
                    const oldLinkPattern = new RegExp(`https://app\\.lobbypms\\.com/checkinonline/confirmar\\?codigo=${reservation.id}[^\\s]*`, 'g');
                    if (oldLinkPattern.test(reservation.sentMessage)) {
                        const oldLink = reservation.sentMessage.match(oldLinkPattern)?.[0];
                        result.oldLink = oldLink;
                        result.newLink = newCheckInLink;
                        // Ersetze alten Link durch neuen Link
                        const updatedMessage = reservation.sentMessage.replace(oldLinkPattern, newCheckInLink);
                        await prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { sentMessage: updatedMessage }
                        });
                        result.updated = true;
                        updatedReservations++;
                        console.log(`✅ Reservation ${reservation.id}: sentMessage aktualisiert`);
                    }
                }
                // Prüfe und aktualisiere ReservationNotificationLog
                const notificationLogs = await prisma.reservationNotificationLog.findMany({
                    where: {
                        reservationId: reservation.id,
                        OR: [
                            {
                                checkInLink: {
                                    contains: `codigo=${reservation.id}`
                                }
                            },
                            {
                                message: {
                                    contains: `codigo=${reservation.id}`
                                }
                            }
                        ]
                    }
                });
                for (const log of notificationLogs) {
                    let logUpdated = false;
                    // Aktualisiere checkInLink-Feld
                    if (log.checkInLink && log.checkInLink.includes(`codigo=${reservation.id}`)) {
                        const oldLinkPattern = new RegExp(`https://app\\.lobbypms\\.com/checkinonline/confirmar\\?codigo=${reservation.id}[^\\s]*`, 'g');
                        const updatedCheckInLink = log.checkInLink.replace(oldLinkPattern, newCheckInLink);
                        await prisma.reservationNotificationLog.update({
                            where: { id: log.id },
                            data: { checkInLink: updatedCheckInLink }
                        });
                        logUpdated = true;
                    }
                    // Aktualisiere message-Feld
                    if (log.message && log.message.includes(`codigo=${reservation.id}`)) {
                        const oldLinkPattern = new RegExp(`https://app\\.lobbypms\\.com/checkinonline/confirmar\\?codigo=${reservation.id}[^\\s]*`, 'g');
                        const updatedMessage = log.message.replace(oldLinkPattern, newCheckInLink);
                        await prisma.reservationNotificationLog.update({
                            where: { id: log.id },
                            data: { message: updatedMessage }
                        });
                        logUpdated = true;
                    }
                    if (logUpdated) {
                        updatedNotificationLogs++;
                        console.log(`✅ NotificationLog ${log.id}: aktualisiert`);
                    }
                }
                if (!result.updated && notificationLogs.length === 0) {
                    // Keine Updates nötig
                    if (totalChecked % 50 === 0) {
                        console.log(`⏳ Geprüft: ${totalChecked}/${reservations.length} Reservierungen...`);
                    }
                }
                results.push(result);
            }
            catch (error) {
                result.error = error instanceof Error ? error.message : 'Unbekannter Fehler';
                console.error(`❌ Fehler bei Reservation ${reservation.id}:`, result.error);
                results.push(result);
            }
        }
        // Zusammenfassung
        console.log('\n' + '='.repeat(60));
        console.log('📊 ZUSAMMENFASSUNG');
        console.log('='.repeat(60));
        console.log(`Gesamt geprüft: ${totalChecked} Reservierungen`);
        console.log(`Reservierungen aktualisiert: ${updatedReservations}`);
        console.log(`Notification-Logs aktualisiert: ${updatedNotificationLogs}`);
        console.log(`Fehler: ${results.filter(r => r.error).length}`);
        // Zeige Beispiele
        const updatedResults = results.filter(r => r.updated);
        if (updatedResults.length > 0) {
            console.log('\n📝 Beispiele aktualisierter Links:');
            updatedResults.slice(0, 5).forEach(r => {
                console.log(`\n  Reservation ${r.reservationId} (lobbyReservationId: ${r.lobbyReservationId}):`);
                if (r.oldLink) {
                    console.log(`    Alt: ${r.oldLink.substring(0, 80)}...`);
                }
                if (r.newLink) {
                    console.log(`    Neu: ${r.newLink.substring(0, 80)}...`);
                }
            });
        }
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            console.log('\n⚠️  Fehler:');
            errors.forEach(r => {
                console.log(`  Reservation ${r.reservationId}: ${r.error}`);
            });
        }
        console.log('\n✅ Aktualisierung abgeschlossen!\n');
    }
    catch (error) {
        console.error('❌ Kritischer Fehler:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Führe Script aus
updateCheckInLinks()
    .then(() => {
    console.log('✅ Script erfolgreich beendet');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
});
