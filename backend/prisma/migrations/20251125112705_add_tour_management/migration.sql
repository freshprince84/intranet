-- Prüfe und erstelle Enums nur wenn sie nicht existieren
DO $$ BEGIN
    CREATE TYPE "TourType" AS ENUM ('own', 'external');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TourBookingStatus" AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MessageDirection" AS ENUM ('outgoing', 'incoming');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MessageStatus" AS ENUM ('sent', 'delivered', 'read', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (nur wenn nicht vorhanden)
CREATE TABLE IF NOT EXISTS "TourProvider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "notes" TEXT,
    "organizationId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Tour" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TourType" NOT NULL DEFAULT 'own',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "duration" INTEGER,
    "maxParticipants" INTEGER,
    "minParticipants" INTEGER,
    "price" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'COP',
    "location" TEXT,
    "meetingPoint" TEXT,
    "includes" TEXT,
    "excludes" TEXT,
    "requirements" TEXT,
    "totalCommission" DECIMAL(10,2),
    "totalCommissionPercent" DECIMAL(5,2),
    "sellerCommissionPercent" DECIMAL(5,2),
    "sellerCommissionFixed" DECIMAL(10,2),
    "externalProviderId" INTEGER,
    "externalBookingUrl" TEXT,
    "imageUrl" TEXT,
    "galleryUrls" JSONB,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "recurringSchedule" JSONB,
    "organizationId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TourBooking" (
    "id" SERIAL NOT NULL,
    "tourId" INTEGER NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tourDate" TIMESTAMP(3) NOT NULL,
    "numberOfParticipants" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerNotes" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amountPaid" DECIMAL(10,2),
    "amountPending" DECIMAL(10,2),
    "paymentLink" TEXT,
    "bookedById" INTEGER,
    "commissionAmount" DECIMAL(10,2),
    "commissionCalculatedAt" TIMESTAMP(3),
    "status" "TourBookingStatus" NOT NULL DEFAULT 'confirmed',
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "externalBookingId" TEXT,
    "externalStatus" TEXT,
    "externalMessage" TEXT,
    "alternativeTours" JSONB,
    "organizationId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TourReservation" (
    "id" SERIAL NOT NULL,
    "tourId" INTEGER NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "reservationId" INTEGER NOT NULL,
    "tourPrice" DECIMAL(10,2) NOT NULL,
    "accommodationPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "tourPricePaid" DECIMAL(10,2),
    "tourPricePending" DECIMAL(10,2),
    "accommodationPaid" DECIMAL(10,2),
    "accommodationPending" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TourWhatsAppMessage" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "direction" "MessageDirection" NOT NULL DEFAULT 'outgoing',
    "message" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MessageStatus" NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "action" TEXT,
    "extractedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourWhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (nur wenn nicht vorhanden)
CREATE INDEX IF NOT EXISTS "TourProvider_organizationId_idx" ON "TourProvider"("organizationId");
CREATE INDEX IF NOT EXISTS "TourProvider_branchId_idx" ON "TourProvider"("branchId");
CREATE INDEX IF NOT EXISTS "TourProvider_name_idx" ON "TourProvider"("name");
CREATE INDEX IF NOT EXISTS "Tour_organizationId_idx" ON "Tour"("organizationId");
CREATE INDEX IF NOT EXISTS "Tour_branchId_idx" ON "Tour"("branchId");
CREATE INDEX IF NOT EXISTS "Tour_isActive_idx" ON "Tour"("isActive");
CREATE INDEX IF NOT EXISTS "Tour_title_idx" ON "Tour"("title");
CREATE INDEX IF NOT EXISTS "TourBooking_tourId_idx" ON "TourBooking"("tourId");
CREATE INDEX IF NOT EXISTS "TourBooking_organizationId_idx" ON "TourBooking"("organizationId");
CREATE INDEX IF NOT EXISTS "TourBooking_branchId_idx" ON "TourBooking"("branchId");
CREATE INDEX IF NOT EXISTS "TourBooking_bookedById_idx" ON "TourBooking"("bookedById");
CREATE INDEX IF NOT EXISTS "TourBooking_bookingDate_idx" ON "TourBooking"("bookingDate");
CREATE INDEX IF NOT EXISTS "TourBooking_tourDate_idx" ON "TourBooking"("tourDate");
CREATE INDEX IF NOT EXISTS "TourBooking_paymentStatus_idx" ON "TourBooking"("paymentStatus");
CREATE INDEX IF NOT EXISTS "TourReservation_tourId_idx" ON "TourReservation"("tourId");
CREATE INDEX IF NOT EXISTS "TourReservation_bookingId_idx" ON "TourReservation"("bookingId");
CREATE INDEX IF NOT EXISTS "TourReservation_reservationId_idx" ON "TourReservation"("reservationId");
CREATE INDEX IF NOT EXISTS "TourWhatsAppMessage_bookingId_idx" ON "TourWhatsAppMessage"("bookingId");
CREATE INDEX IF NOT EXISTS "TourWhatsAppMessage_phoneNumber_idx" ON "TourWhatsAppMessage"("phoneNumber");
CREATE INDEX IF NOT EXISTS "TourWhatsAppMessage_sentAt_idx" ON "TourWhatsAppMessage"("sentAt");
CREATE INDEX IF NOT EXISTS "TourWhatsAppMessage_processed_idx" ON "TourWhatsAppMessage"("processed");

-- CreateUniqueIndex (nur wenn nicht vorhanden)
CREATE UNIQUE INDEX IF NOT EXISTS "TourReservation_reservationId_bookingId_key" ON "TourReservation"("reservationId", "bookingId");

-- AddForeignKey (nur wenn nicht vorhanden)
DO $$ BEGIN
    ALTER TABLE "TourProvider" ADD CONSTRAINT "TourProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourProvider" ADD CONSTRAINT "TourProvider_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Tour" ADD CONSTRAINT "Tour_externalProviderId_fkey" FOREIGN KEY ("externalProviderId") REFERENCES "TourProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Tour" ADD CONSTRAINT "Tour_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Tour" ADD CONSTRAINT "Tour_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Tour" ADD CONSTRAINT "Tour_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_bookedById_fkey" FOREIGN KEY ("bookedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourBooking" ADD CONSTRAINT "TourBooking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourReservation" ADD CONSTRAINT "TourReservation_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourReservation" ADD CONSTRAINT "TourReservation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourReservation" ADD CONSTRAINT "TourReservation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "TourWhatsAppMessage" ADD CONSTRAINT "TourWhatsAppMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "TourBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
