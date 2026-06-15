-- AlterTable: Add contact/cover fields to tenants
ALTER TABLE "tenants"
  ADD COLUMN "coverImageUrl"  TEXT,
  ADD COLUMN "whatsappNumber" TEXT,
  ADD COLUMN "contactEmail"   TEXT,
  ADD COLUMN "website"        TEXT;

-- AlterTable: Add imageUrl to services
ALTER TABLE "services"
  ADD COLUMN "imageUrl" TEXT;
