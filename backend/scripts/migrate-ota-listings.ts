/**
 * Migration Script: Migriert bestehende OTA-Listings zum neuen Datenmodell
 * 
 * Führt folgende Änderungen durch:
 * - Setzt city/country aus Branch-Informationen
 * - Entfernt categoryId (wird nicht mehr benötigt)
 * - Setzt discoveredAt auf createdAt (falls nicht vorhanden)
 * - Behält branchId für Filterung (wird nullable)
 * 
 * WICHTIG: Dieses Script sollte NUR EINMAL ausgeführt werden, nachdem die Datenbank-Migration durchgeführt wurde!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateOtaListings() {
  console.log('🚀 Starte Migration von OTA-Listings...\n');

  try {
    // Hole alle bestehenden OTA-Listings
    const listings = await prisma.oTAListing.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true
          }
        }
      }
    });

    console.log(`📊 Gefunden: ${listings.length} OTA-Listings\n`);

    if (listings.length === 0) {
      console.log('✅ Keine Listings zu migrieren.');
      return;
    }

    let migrated = 0;
    let skipped = 0;
    const errors: Array<{ id: number; error: string }> = [];

    for (const listing of listings) {
      try {
        // Prüfe ob Listing bereits migriert wurde (hat city)
        if (listing.city) {
          console.log(`⏭️  Listing ${listing.id} bereits migriert (hat city: ${listing.city}), überspringe...`);
          skipped++;
          continue;
        }

        // Hole Branch-Informationen
        const branch = listing.branch;
        
        if (!branch) {
          console.log(`⚠️  Listing ${listing.id} hat keinen Branch, überspringe...`);
          skipped++;
          continue;
        }

        // Setze city aus Branch (Fallback: Branch-Name)
        const city = branch.city || branch.name || 'Unknown';
        const country = branch.country || null;

        // Setze discoveredAt auf createdAt (falls nicht vorhanden)
        const discoveredAt = listing.createdAt;

        // Update Listing
        await prisma.oTAListing.update({
          where: { id: listing.id },
          data: {
            city,
            country,
            discoveredAt,
            // branchId bleibt erhalten (wird nullable in Migration)
          }
        });

        console.log(`✅ Listing ${listing.id} migriert: city="${city}", country="${country || 'null'}"`);
        migrated++;
      } catch (error: any) {
        console.error(`❌ Fehler beim Migrieren von Listing ${listing.id}:`, error.message);
        errors.push({
          id: listing.id,
          error: error.message
        });
      }
    }

    console.log('\n📊 Migration abgeschlossen:');
    console.log(`   ✅ Migriert: ${migrated}`);
    console.log(`   ⏭️  Übersprungen: ${skipped}`);
    console.log(`   ❌ Fehler: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Fehler-Details:');
      errors.forEach(e => {
        console.log(`   - Listing ${e.id}: ${e.error}`);
      });
    }

    console.log('\n✅ Migration beendet!');
  } catch (error) {
    console.error('❌ Kritischer Fehler bei der Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
migrateOtaListings()
  .catch((error) => {
    console.error('❌ Migration fehlgeschlagen:', error);
    process.exit(1);
  });

