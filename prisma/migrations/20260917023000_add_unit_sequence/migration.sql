ALTER TABLE "unit"
ADD COLUMN "sequence" INTEGER;

WITH ranked_units AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "workspaceId" ORDER BY "createdAt", "id")::INTEGER AS "sequence"
  FROM "unit"
)
UPDATE "unit"
SET "sequence" = ranked_units."sequence"
FROM ranked_units
WHERE "unit"."id" = ranked_units."id";

ALTER TABLE "unit"
ALTER COLUMN "sequence" SET NOT NULL;

CREATE UNIQUE INDEX "unit_workspaceId_sequence_key"
ON "unit"("workspaceId", "sequence");
