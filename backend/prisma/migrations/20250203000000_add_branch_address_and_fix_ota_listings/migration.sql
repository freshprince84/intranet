-- AlterTable: Branch - Add address, city, country fields
ALTER TABLE "Branch" ADD COLUMN "address" TEXT;
ALTER TABLE "Branch" ADD COLUMN "city" TEXT;
ALTER TABLE "Branch" ADD COLUMN "country" TEXT;

-- AlterTable: OTAListing - Remove categoryId, add city/country, make branchId nullable, add discoveredAt/lastScrapedAt
-- Step 1: Add new columns
ALTER TABLE "OTAListing" ADD COLUMN "city" TEXT;
ALTER TABLE "OTAListing" ADD COLUMN "country" TEXT;
ALTER TABLE "OTAListing" ADD COLUMN "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OTAListing" ADD COLUMN "lastScrapedAt" TIMESTAMP(3);

-- Step 2: Migrate existing data - Set city/country from Branch (if available)
UPDATE "OTAListing" ol
SET "city" = b."city", "country" = b."country"
FROM "Branch" b
WHERE ol."branchId" = b."id" AND b."city" IS NOT NULL;

-- Step 3: For listings without city, set a default (will need manual update later)
UPDATE "OTAListing" SET "city" = 'Unknown' WHERE "city" IS NULL;

-- Step 4: Make city NOT NULL after setting defaults
ALTER TABLE "OTAListing" ALTER COLUMN "city" SET NOT NULL;

-- Step 5: Drop old unique constraint and indexes
ALTER TABLE "OTAListing" DROP CONSTRAINT IF EXISTS "OTAListing_branchId_platform_listingId_key";
DROP INDEX IF EXISTS "OTAListing_branchId_idx";
DROP INDEX IF EXISTS "OTAListing_categoryId_idx";

-- Step 6: Remove categoryId column
ALTER TABLE "OTAListing" DROP COLUMN IF EXISTS "categoryId";

-- Step 7: Make branchId nullable
ALTER TABLE "OTAListing" ALTER COLUMN "branchId" DROP NOT NULL;

-- Step 8: Add new unique constraint
ALTER TABLE "OTAListing" ADD CONSTRAINT "OTAListing_platform_listingId_city_key" UNIQUE ("platform", "listingId", "city");

-- Step 9: Add new indexes
CREATE INDEX "OTAListing_city_idx" ON "OTAListing"("city");
CREATE INDEX "OTAListing_country_idx" ON "OTAListing"("country");
CREATE INDEX "OTAListing_branchId_idx" ON "OTAListing"("branchId");

