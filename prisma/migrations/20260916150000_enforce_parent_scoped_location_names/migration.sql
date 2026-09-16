-- Refuse migration rather than silently changing an ambiguous existing name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "warehouse" GROUP BY "workspaceId", "name" HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM "zone" GROUP BY "warehouseId", "name" HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM "rack" GROUP BY "zoneId", "name" HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM "rack_level" GROUP BY "rackId", "name" HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM "slot" GROUP BY "rackLevelId", "name" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce parent-scoped location names: duplicate names exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX "warehouse_workspaceId_name_key" ON "warehouse"("workspaceId", "name");
CREATE UNIQUE INDEX "zone_warehouseId_name_key" ON "zone"("warehouseId", "name");
CREATE UNIQUE INDEX "rack_zoneId_name_key" ON "rack"("zoneId", "name");
CREATE UNIQUE INDEX "rack_level_rackId_name_key" ON "rack_level"("rackId", "name");
CREATE UNIQUE INDEX "slot_rackLevelId_name_key" ON "slot"("rackLevelId", "name");
