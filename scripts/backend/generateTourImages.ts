/**
 * Script zum Generieren von Tour-Bildern mit Gemini API (Nano Banana)
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/generateTourImages.ts <tourId> [apiKey]
 * 
 * Beispiel:
 *   npx ts-node backend/scripts/generateTourImages.ts 2
 */

import { GeminiImageService } from '../src/services/geminiImageService';
import { prisma } from '../src/utils/prisma';
import { logger } from '../src/utils/logger';
import path from 'path';
import fs from 'fs';

async function main() {
  const tourId = parseInt(process.argv[2], 10);
  const apiKey = process.argv[3] || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY nicht gefunden!');
    console.error('   Bitte als Parameter übergeben oder in .env hinterlegen:');
    console.error('   GEMINI_API_KEY=dein-api-key');
    process.exit(1);
  }

  try {
    // Tour-Daten (kann auch direkt übergeben werden)
    let tour: any = null;
    
    if (tourId && !isNaN(tourId)) {
      console.log(`\n🎨 Starte Bildgenerierung für Tour ${tourId}...\n`);
      
      // Versuche Tour aus Datenbank zu laden
      try {
        tour = await prisma.tour.findUnique({
          where: { id: tourId },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            price: true,
            currency: true,
            location: true,
            includes: true
          }
        });
      } catch (dbError) {
        console.log('⚠️  Datenbankzugriff fehlgeschlagen, verwende direkte Tour-Daten...');
      }
    }

    // Fallback: Direkte Tour-Daten für Guatapé (Tour ID 2)
    if (!tour && tourId === 2) {
      tour = {
        id: 2,
        title: 'Guatapé',
        description: 'Tour de pasadía a Guatapé. Incluye: * Transporte * Desayuno y almuerzo * Visita a "El Alto Del Chocho" * Pueblo del Peñol * Replica del Peñol * Tour en barco por la represa * Visita a la Piedra del Peñol * Municipio de Guatapé * Calle de los Recuerdos * Plaza de los Zócalos * Malecón * Parque central * Iglesia * Tarjeta de asistencia médica',
        type: 'external',
        price: 109000,
        currency: 'COP',
        location: '',
        includes: 'Transporte, Desayuno y almuerzo, Visita a "El Alto Del Chocho", Pueblo del Peñol, Replica del Peñol, Tour en barco por la represa, Visita a la Piedra del Peñol, Municipio de Guatapé, Calle de los Recuerdos, Plaza de los Zócalos, Malecón, Parque central, Iglesia, Tarjeta de asistencia médica'
      };
    }

    if (!tour) {
      console.error(`❌ Tour mit ID ${tourId} nicht gefunden!`);
      console.error('   Bitte Tour-ID angeben oder Script für direkte Tour-Daten anpassen.');
      process.exit(1);
    }

    console.log(`📋 Tour: ${tour.title}`);
    console.log(`📝 Beschreibung: ${tour.description?.substring(0, 100)}...\n`);

    // Baue vollständige Beschreibung für Prompts
    let fullDescription = tour.description || '';
    if (tour.includes) {
      fullDescription += ` Includes: ${tour.includes}`;
    }
    if (tour.location) {
      fullDescription += ` Location: ${tour.location}`;
    }
    if (tour.price) {
      fullDescription += ` Price: ${tour.price} ${tour.currency || 'COP'}`;
    }

    // Generiere Bilder
    console.log('🖼️  Generiere Hauptbild...');
    const { mainImage, galleryImages, flyer } = await GeminiImageService.generateTourImages(
      tour.id,
      tour.title,
      fullDescription,
      apiKey
    );

    console.log('✅ Hauptbild generiert:', path.basename(mainImage));
    console.log(`✅ ${galleryImages.length} Galerie-Bilder generiert`);
    console.log('✅ Flyer generiert:', path.basename(flyer));

    // Zeige Dateigrößen
    console.log('\n📊 Dateigrößen:');
    const mainSize = (fs.statSync(mainImage).size / 1024).toFixed(2);
    console.log(`   Hauptbild: ${mainSize} KB`);
    
    galleryImages.forEach((img, i) => {
      const size = (fs.statSync(img).size / 1024).toFixed(2);
      console.log(`   Galerie ${i + 1}: ${size} KB`);
    });
    
    const flyerSize = (fs.statSync(flyer).size / 1024).toFixed(2);
    console.log(`   Flyer: ${flyerSize} KB`);

    console.log('\n✅ Alle Bilder erfolgreich generiert!');
    console.log('\n📁 Speicherort: backend/uploads/tours/');
    console.log('\n💡 Nächste Schritte:');
    console.log('   1. Bilder überprüfen');
    console.log('   2. Hauptbild über API hochladen: POST /api/tours/' + tourId + '/image');
    console.log('   3. Galerie-Bilder über API hochladen: POST /api/tours/' + tourId + '/gallery');
    console.log('   4. Flyer kann separat verwendet werden\n');

  } catch (error: any) {
    console.error('\n❌ Fehler:', error.message);
    if (error.response) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

