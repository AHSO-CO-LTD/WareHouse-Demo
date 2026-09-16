-- CreateEnum
CREATE TYPE "LocationCodeKind" AS ENUM ('WAREHOUSE', 'ZONE', 'RACK', 'RACK_LEVEL', 'SLOT');

-- Add a code to rack levels, which previously used sequence only.
ALTER TABLE "rack_level" ADD COLUMN "code" TEXT;
UPDATE "rack_level"
SET "code" = CONCAT('LEVEL-', UPPER(REPLACE("id"::text, '-', '')))
WHERE "code" IS NULL;
ALTER TABLE "rack_level" ALTER COLUMN "code" SET NOT NULL;

-- Normalize existing persisted codes before reserving them workspace-wide.
UPDATE "warehouse" SET "code" = UPPER(BTRIM("code"));
UPDATE "zone" SET "code" = UPPER(BTRIM("code"));
UPDATE "rack" SET "code" = UPPER(BTRIM("code"));
UPDATE "rack_level" SET "code" = UPPER(BTRIM("code"));
UPDATE "slot" SET "code" = UPPER(BTRIM("code"));

-- Refuse migration rather than silently changing an ambiguous existing location code.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "workspaceId", "code" FROM "warehouse"
      UNION ALL SELECT "workspaceId", "code" FROM "zone"
      UNION ALL SELECT "workspaceId", "code" FROM "rack"
      UNION ALL SELECT "workspaceId", "code" FROM "rack_level"
      UNION ALL SELECT "workspaceId", "code" FROM "slot"
    ) AS locations
    GROUP BY "workspaceId", "code"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce workspace-wide location codes: duplicate codes exist.';
  END IF;
END $$;

-- CreateTable
CREATE TABLE "location_code_registry" (
    "workspaceId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "locationType" "LocationCodeKind" NOT NULL,
    "locationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_code_registry_pkey" PRIMARY KEY ("workspaceId", "code")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_code_registry_workspaceId_locationType_locationId_key" ON "location_code_registry"("workspaceId", "locationType", "locationId");
CREATE INDEX "location_code_registry_workspaceId_locationType_idx" ON "location_code_registry"("workspaceId", "locationType");
CREATE UNIQUE INDEX "rack_level_rackId_code_key" ON "rack_level"("rackId", "code");

-- Reserve every current location code before the application accepts new writes.
INSERT INTO "location_code_registry" ("workspaceId", "code", "locationType", "locationId")
SELECT "workspaceId", "code", 'WAREHOUSE'::"LocationCodeKind", "id" FROM "warehouse"
UNION ALL SELECT "workspaceId", "code", 'ZONE'::"LocationCodeKind", "id" FROM "zone"
UNION ALL SELECT "workspaceId", "code", 'RACK'::"LocationCodeKind", "id" FROM "rack"
UNION ALL SELECT "workspaceId", "code", 'RACK_LEVEL'::"LocationCodeKind", "id" FROM "rack_level"
UNION ALL SELECT "workspaceId", "code", 'SLOT'::"LocationCodeKind", "id" FROM "slot";

-- AddForeignKey
ALTER TABLE "location_code_registry" ADD CONSTRAINT "location_code_registry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
