ALTER TABLE "rack"
ADD COLUMN "configuredLevelCount" INTEGER NOT NULL DEFAULT 1;

UPDATE "rack" AS rack
SET "configuredLevelCount" = GREATEST(
  1,
  COALESCE(
    (
      SELECT MAX(level."sequence")
      FROM "rack_level" AS level
      WHERE level."rackId" = rack."id"
    ),
    1
  )
);
