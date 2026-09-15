# ADR 0004 — Scaled 2D Warehouse Layout Designer

- Status: Accepted
- Date: 15/09/2026

## Context

Users need a quick visual way to arrange and access warehouse zones and racks. They also need real dimensions for doors, aisles, obstacles and different rack types. A full CAD or 3D editor would be disproportionately complex for the demo.

## Alternatives

1. Decorative map without scale or business links.
2. Scaled 2D editor using rectangular warehouse/zone boundaries and rack templates.
3. Arbitrary polygon CAD/3D warehouse editor.

## Decision

- Build a scaled top-down 2D editor after the inventory core.
- Use one floor plan per warehouse; rack levels are not building floors.
- Use rectangular warehouse and zone boundaries.
- Support grid, zoom/pan, drag/drop, rotation, real length/width and height metadata.
- Provide predefined rack drawings and simple custom types based on templates.
- Link each mapped zone/rack one-to-one with its business entity.
- Removing an item from the map does not delete the business entity.
- Do not support arbitrary vector drawing, irregular polygons, CAD or 3D.

## Rationale

- Provides practical navigation and planning value without becoming an engineering drawing tool.
- Maintains one source of truth between the hierarchy and the map.
- Keeps collision validation and UI behavior feasible for a demo.

## Consequences

- A canvas/geometry dependency requires a separate compatibility and maintenance review.
- Layout editing needs dirty-state protection, save confirmation and undo/redo.
- Real-world measurements need validation, consistent units and scale handling.
- Existing entities may remain unplaced and must be shown in a separate palette/list.
