-- Migration: Update Message Templates für alle Branches
-- Fügt die Default-Templates aus dem Code in die Datenbank ein
-- 
-- WICHTIG: Diese SQL-Datei muss auf dem Produktionsserver ausgeführt werden!
-- 
-- Ausführung:
-- psql -d intranet -f update_message_templates.sql
-- ODER direkt in psql:
-- \i update_message_templates.sql

-- JSON-Struktur für messageTemplates:
-- {
--   "checkInInvitation": {
--     "en": { "whatsappTemplateName": "...", "whatsappTemplateParams": [...], "emailSubject": "...", "emailContent": "..." },
--     "es": { ... },
--     "de": { ... }
--   },
--   "checkInConfirmation": {
--     "en": { ... },
--     "es": { ... },
--     "de": { ... }
--   }
-- }

-- Update NUR für Branches Manila (ID: 3) und Poblado (ID: 4)
UPDATE "Branch"
SET "messageTemplates" = '{
  "checkInInvitation": {
    "en": {
      "whatsappTemplateName": "reservation_checkin_invitation_en",
      "whatsappTemplateParams": ["{{1}}", "{{2}}", "{{3}}"],
      "emailSubject": "Welcome to La Familia Hostel - Online Check-in",
      "emailContent": "Hello {{guestName}},\n\nWe are pleased to welcome you to La Familia Hostel! 🎊\n\nIn case that you arrive after 18:00 or before 09:00, our recepcion 🛎️ will be closed.\n\nWe would then kindly ask you to complete check-in & payment online in advance:\n\nCheck-In:\n{{checkInLink}}\n\nPlease make the payment in advance:\n{{paymentLink}}\n\nPlease write us briefly once you have completed both the check-in and the payment, so we can send you your pin code 🔑 for the entrance door.\n\nThank you!\n\nWe look forward to seeing you soon!"
    },
    "es": {
      "whatsappTemplateName": "reservation_checkin_invitation",
      "whatsappTemplateParams": ["{{1}}", "{{2}}", "{{3}}"],
      "emailSubject": "Bienvenido a La Familia Hostel - Check-in en línea",
      "emailContent": "Hola {{guestName}},\n\n¡Nos complace darte la bienvenida a La Familia Hostel! 🎊\n\nEn caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.\n\nTe pedimos amablemente que completes el check-in y el pago en línea con anticipación:\n\nCheck-In:\n{{checkInLink}}\n\nPor favor, realiza el pago por adelantado:\n{{paymentLink}}\n\nPor favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.\n\n¡Gracias!\n\n¡Esperamos verte pronto!"
    },
    "de": {
      "whatsappTemplateName": "reservation_checkin_invitation_de",
      "whatsappTemplateParams": ["{{1}}", "{{2}}", "{{3}}"],
      "emailSubject": "Willkommen im La Familia Hostel - Online Check-in",
      "emailContent": "Hallo {{guestName}},\n\nwir freuen uns, Sie im La Familia Hostel willkommen zu heißen! 🎊\n\nFalls Sie nach 18:00 Uhr oder vor 09:00 Uhr ankommen, ist unsere Rezeption 🛎️ geschlossen.\n\nWir bitten Sie freundlich, den Check-in und die Zahlung im Voraus online abzuschließen:\n\nCheck-In:\n{{checkInLink}}\n\nBitte zahlen Sie im Voraus:\n{{paymentLink}}\n\nBitte schreiben Sie uns kurz, sobald Sie sowohl den Check-in als auch die Zahlung abgeschlossen haben, damit wir Ihnen Ihren PIN-Code 🔑 für die Eingangstür senden können.\n\nVielen Dank!\n\nWir freuen uns darauf, Sie bald zu sehen!"
    }
  },
  "checkInConfirmation": {
    "en": {
      "whatsappTemplateName": "reservation_checkin_completed_en",
      "whatsappTemplateParams": ["{{1}}", "{{2}}"],
      "emailSubject": "Your check-in is completed - Room information",
      "emailContent": "Hello {{guestName}},\n\nYour check-in has been completed successfully!\n\nYour room information:\n- Room: {{roomDisplay}}\n\nAccess:\n- Door PIN: {{doorPin}}\n- App: {{doorAppName}}\n\nWe wish you a pleasant stay!"
    },
    "es": {
      "whatsappTemplateName": "reservation_checkin_completed",
      "whatsappTemplateParams": ["{{1}}", "{{2}}"],
      "emailSubject": "Tu check-in está completado - Información de habitación",
      "emailContent": "Hola {{guestName}},\n\n¡Tu check-in se ha completado exitosamente!\n\nInformación de tu habitación:\n- Habitación: {{roomDisplay}}\n\nAcceso:\n- PIN de la puerta: {{doorPin}}\n- App: {{doorAppName}}\n\n¡Te deseamos una estancia agradable!"
    },
    "de": {
      "whatsappTemplateName": "reservation_checkin_completed_de",
      "whatsappTemplateParams": ["{{1}}", "{{2}}"],
      "emailSubject": "Ihr Check-in ist abgeschlossen - Zimmerinformationen",
      "emailContent": "Hallo {{guestName}},\n\nIhr Check-in wurde erfolgreich abgeschlossen!\n\nIhre Zimmerinformationen:\n- Zimmer: {{roomDisplay}}\n\nZugang:\n- Tür-PIN: {{doorPin}}\n- App: {{doorAppName}}\n\nWir wünschen Ihnen einen angenehmen Aufenthalt!"
    }
  }
}'::jsonb
WHERE "id" IN (3, 4);

-- Zeige aktualisierte Branches
SELECT id, name, "messageTemplates" IS NOT NULL as "has_templates" FROM "Branch" WHERE "id" IN (3, 4);
