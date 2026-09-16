-- Preserve the least sensitive value required by the registration flow before
-- removing the precise date of birth.
ALTER TABLE "user" ADD COLUMN "birthYear" INTEGER;

UPDATE "user"
SET "birthYear" = EXTRACT(YEAR FROM "dateOfBirth")::INTEGER
WHERE "dateOfBirth" IS NOT NULL;

ALTER TABLE "user" DROP COLUMN "dateOfBirth";
