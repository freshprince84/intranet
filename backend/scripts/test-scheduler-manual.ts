/**
 * Test: Manueller Start des EmailReservationScheduler
 */
import { EmailReservationScheduler } from '../src/services/emailReservationScheduler';

console.log('=== TEST: MANUELLER SCHEDULER-START ===\n');

console.log('Scheduler-Status vor Start:', EmailReservationScheduler.isRunning ? 'LÄUFT' : 'GESTOPPT');
console.log('');

console.log('Starte Scheduler manuell...');
EmailReservationScheduler.start();

console.log('');
console.log('Scheduler-Status nach Start:', EmailReservationScheduler.isRunning ? 'LÄUFT' : 'GESTOPPT');

if (EmailReservationScheduler.isRunning) {
  console.log('\n✅ Scheduler läuft jetzt!');
  console.log('Warte 5 Sekunden auf ersten Check...');
  
  setTimeout(() => {
    console.log('\n✅ Test abgeschlossen');
    process.exit(0);
  }, 5000);
} else {
  console.log('\n❌ Scheduler läuft NICHT!');
  process.exit(1);
}

