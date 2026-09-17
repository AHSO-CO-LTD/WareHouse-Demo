# Warehouse Demo — Implementation Plan

- Status: Approved
- Approved date: 15/09/2026
- Complexity: High
- Execution status: In Progress

## 1. Objective

Tạo sản phẩm web demo công khai của AHSO để người dùng trải nghiệm một vòng quản lý kho hoàn chỉnh, từ cấu trúc vị trí đến tồn kho, dự án, chi phí và báo giá; đồng thời giúp AHSO quản lý đăng ký, hành vi sử dụng và yêu cầu tư vấn.

Demo là sandbox dùng thử 30 ngày. Product production sau ký hợp đồng là dự án khác và sẽ được khảo sát/thiết kế lại theo nhu cầu thực tế.

## 2. Business requirements

### Required

- Đăng ký email/password, xác minh email bằng OTP và onboarding company/contact/consent.
- Workspace độc lập cho từng demo user.
- Hạn mức và vòng đời demo tự động.
- Dữ liệu mẫu end-to-end và reset an toàn.
- Quản lý kho, khu, kệ, tầng, slot và QR vị trí.
- Sản phẩm, đơn vị quy đổi, lô, hạn sử dụng, giá vốn.
- Inventory ledger cho tồn đầu kỳ, nhập, xuất, điều chuyển, kiểm kê, điều chỉnh và giữ hàng.
- FEFO/FIFO suggestions và trạng thái tồn.
- Dự án, ngân sách và cost snapshot.
- Công ty, người liên hệ, khách cá nhân và nhà cung cấp tùy chọn.
- Dự toán nội bộ, báo giá khách hàng, VAT và PDF song ngữ.
- Dashboard tenant và dashboard Platform DEV/ADMIN.
- Support Mode đặc quyền có audit.
- Email lifecycle, security và consultation lead pipeline.
- Warehouse Layout Designer 2D theo kích thước thật.

### Out of scope

- Keyence/Android app, native scanner SDK và offline sync.
- Multi-user trong tenant demo.
- Phê duyệt hai người hoạt động trong demo.
- Procurement/PO.
- Production migration hoặc demo-to-production upgrade.
- CAD, 3D, polygon floor plan hoặc nhiều tầng tòa nhà.
- Import toàn bộ lịch sử Excel.

## 3. Architecture

### Application

- Next.js App Router full-stack, TypeScript strict.
- Better Auth handles email/password for all users and email OTP for verification/password reset; Google OAuth and account linking are removed.
- Tách module theo domain: `platform`, `workspace`, `warehouse`, `catalog`, `inventory`, `project`, `crm`, `quotation`, `layout`, `audit`, `email`.
- Component không truy cập Prisma trực tiếp.
- Domain service xử lý validation, authorization, transaction và audit.
- Server Actions cho form mutation; `/api/v1` Route Handlers cho endpoint có contract HTTP.

### Data

- PostgreSQL là nguồn dữ liệu chuẩn.
- Prisma migrations; không dùng schema push trong deployment production-like.
- Mọi bảng tenant có `workspaceId` và index tương ứng.
- Unique constraint phải bao gồm workspace scope khi dữ liệu chỉ duy nhất trong tenant.
- Decimal DB type cho số lượng, hệ số quy đổi và tiền; không dùng floating point cho cost.

### Scheduled operations

- Database-backed email outbox với bounded retry.
- VPS scheduled task xử lý email, reservation expiry, workspace lock/purge và expiry reminders.
- Job idempotent, có lock/chống chạy trùng và lưu kết quả.

## 4. Data design outline

### Platform and access

- Better Auth `User`, `Session`, `Account`, `Verification` dùng chung cho danh tính; role tách Demo User, Platform ADMIN và Platform DEV.
- `Workspace`, `WorkspaceLimit`, `ConsentRecord`.
- `SupportSession`, `AuditLog`, `EmailOutbox`, `ConsultationLead`, `LeadActivity`.

### Warehouse catalog

- `Warehouse`, `Zone`, `Rack`, `RackLevel`, `Slot`.
- `RackType`, `RackTemplate`, `Layout`, `LayoutObject`, `LayoutRevision`.
- Parent FK dùng restrictive delete khi còn dữ liệu con hoặc tồn kho.
- Mã vị trí unique trên toàn workspace, xuyên Kho/Khu/Kệ/Tầng/Ô; tầng vừa có mã unique vừa có số thứ tự unique trong kệ.

### Product catalog

- `Product`, `Unit`, `ProductUnitConversion`, `InventoryLot`, `Supplier`.
- `Product.currentCost` là giá vốn hiện hành.
- `ProductCostHistory` ghi giá trước/sau và actor.
- Một bộ quy đổi hiện hành trên mỗi sản phẩm; giao dịch giữ snapshot unit/factor.

### Inventory

- `InventoryDocument`, `InventoryDocumentLine`.
- `InventoryLedgerEntry` bất biến.
- `InventoryBalance` theo workspace/product/lot/slot/status.
- `Transfer`, `StocktakeSession`, `StocktakeCount`, `Reservation`.
- Composite unique/index phục vụ truy vấn balance, FIFO/FEFO và lịch sử sản phẩm/vị trí.

### Project and quotation

- `Project`, `ProjectBudgetOverride`.
- `Organization`, `Contact`, `CustomerContextSnapshot`.
- `Estimate`, `EstimateLine`, `Quotation`, `QuotationLine`, `QuotationConversion`.
- Dòng chứng từ lưu snapshot tên, đơn vị, quantity, cost, sale price, VAT và conversion factor.

## 5. Invariants and business rules

- Không có tồn tổng độc lập ngoài tổng hợp từ balance/ledger cấp slot.
- Không ghi tồn âm hoặc giữ vượt tồn khả dụng.
- Ledger entry đã post không update/delete.
- Reversal tham chiếu chứng từ gốc và không được đảo trùng.
- Điều chuyển hai bước không làm mất quyền sở hữu hàng khi ở trạng thái in-transit.
- Stocktake không sửa lịch sử; variance được post thành adjustment.
- Quote/project creation không giữ hàng.
- Reservation có expiry bắt buộc.
- Product cost change revalues current stock view nhưng không đổi snapshot lịch sử.
- Quote conversion phải idempotent.
- Mọi quota check và create thực hiện trong cùng transaction.

## 6. Security and privacy

- Workspace scope được lấy từ verified session trong Data Access Layer.
- Không nhận hoặc tin `workspaceId` từ form/API body để quyết định quyền truy cập.
- Authorization lại tại mỗi Server Action/Route Handler.
- Rate limit login, password reset, onboarding, reset workspace, PDF generation và consultation requests.
- Password hash mạnh; token reset lưu hash và dùng một lần.
- SMTP/database/auth/job secrets ngoài repository và không ghi log.
- Support Mode yêu cầu reason, có expiry, banner, before/after audit và platform actor rõ ràng.
- Không impersonation.
- Không cho mất DEV cuối cùng.
- Tenant-isolation tests là release gate bắt buộc.

## 7. UX and screens

### Public/demo

- Landing, registration, email OTP, login, password recovery, onboarding and policy consent.
- Dashboard.
- Warehouse tree và quick search.
- Products/lots/units/cost.
- Receipts, issues, transfers, stocktakes, reservations.
- Projects/budgets.
- Organizations, contacts, individual customers, suppliers.
- Estimates, quotations, PDF preview/download.
- Expiry/status views, inventory history and audit.
- Settings: language, theme, demo lifecycle, reset/delete workspace.
- Consultation request.

### Platform

- Email/password login, forgot/reset password and mandatory first-login password change.
- Overview metrics and registration funnel.
- Workspace/account list, filters and detail.
- Lead pipeline and notes.
- Support Mode entry/exit.
- Lock/reset/delete/quota operations with custom confirmation.
- Email delivery status and system audit.

### Warehouse layout

- View mode: navigate, inspect and open zone/rack/inventory.
- Edit mode: grid, scale, zoom/pan, drag/drop, rotate, dimension editor and collision warnings.
- Palette: unplaced zones/racks, doors, aisles, obstacles and predefined rack templates.
- Remove from map returns business entity to unplaced list.
- Manual Save confirmation, dirty-state protection and in-session undo/redo.

## 8. Demo quotas and lifecycle

| Resource                   | Limit |
| -------------------------- | ----: |
| Warehouse                  |     1 |
| Zone per warehouse         |     2 |
| Rack per zone              |     3 |
| Rack level per rack        |     3 |
| Slot per rack level        |     2 |
| Product                    |    20 |
| Project                    |     5 |
| Company/individual profile |     5 |
| Supplier                   |     5 |
| Estimate/quotation         |    10 |
| Inventory transaction      |   100 |

- Day 0: onboarding, seed sample dataset and onboarding email.
- Day 23/27/29: expiry reminders.
- Day 30: workspace read-only and locked email.
- Day 36: deletion warning.
- Day 37: purge tenant business data and send result email where allowed.

## 9. Delivery phases

| Phase | Scope                                                                      | Status      |
| ----- | -------------------------------------------------------------------------- | ----------- |
| 0     | Scaffold, project docs, ADRs, environment schema                           | Done        |
| 1     | PostgreSQL schema foundation, auth, onboarding, tenant isolation           | In Progress |
| 2     | Demo lifecycle, quotas, seed/reset, platform accounts                      | In Progress |
| 3     | Warehouse hierarchy, products, units, lots, QR                             | Complete — user accepted |
| 4     | Inventory ledger and all core stock workflows                              | In Progress — Phase 4A |
| 5     | Projects, CRM, estimates, quotations, VAT, bilingual PDF                   | Pending     |
| 6     | Dashboards, audit, email center, consultation pipeline                     | Pending     |
| 7     | Scaled 2D Warehouse Layout Designer                                        | Pending     |
| 8     | VPS packaging, scheduled jobs, security hardening and release verification | Pending     |

Inventory core must stabilize before layout editing begins. The layout phase may use a new canvas/drag library only after an implementation spike and explicit dependency review.

### Phase 1 authentication amendment — 15/09/2026

- Done: remove Google OAuth/account linking from the approved architecture and source configuration.
- Done: public email/password registration fields, E.164 phone normalization and database uniqueness constraints.
- Done: six-digit hashed email OTP foundation for verification and password reset, including resend/attempt rate limits.
- Done: password-reset OTP is verified before the new-password page; a short-lived encrypted HttpOnly grant prevents the OTP from entering JavaScript storage and lets only the server submit it to Better Auth during completion.
- Done: forced first-login password change foundation for the bootstrap DEV and DEV permission to create DEV/ADMIN.
- Done: SMTP transactional templates for OTP, verified welcome, demo activation and password-change security notice.
- Done: protected seven-day unverified-account cleanup endpoint.
- Pending: publish the approved Terms of Service and Privacy Policy content before public registration opens.
- Pending: add the bounded-retry email worker and Platform email-delivery operations planned for Phase 6.
- Done: apply both committed migrations to the configured PostgreSQL database and verify the required auth/workspace tables and new identity columns.
- Done: authenticate to the configured SMTP service and deliver one test message successfully.
- Pending: smoke-test real OTP templates, login/session revocation and scheduled cleanup on the VPS-like environment.

### Phase 2A lifecycle amendment — 16/09/2026

- Done: server-only lifecycle state evaluation and write guard for non-active or time-expired workspaces.
- Done: authenticated, bounded, conditional-transition internal lifecycle job with audit entries for lock, purge-pending and terminal purge transitions.
- Done: current demo screen shows effective active/read-only/purged lifecycle status.
- Deferred: real business-data seed/reset and quota enforcement require Phase 3 domain models.
- Deferred: lifecycle reminder/delivery operations require the bounded-retry email worker in Phase 6.

### Phase 3A warehouse hierarchy amendment — 16/09/2026

- Done in source: tenant-scoped `Warehouse → Zone → Rack → RackLevel → Slot` schema, Prisma migration and direct tree-management screen.
- Done in source: QR popup for each rack and slot; the QR payload is exactly that location's generated code, with no inventory lookup or scan workflow.
- Done in source: demo quotas, active-workspace write guard, restrictive child removal, storage-class inheritance, serializable writes with bounded retry, optimistic version checks and same-transaction audit entries.
- Done in source: workspace lifecycle purge removes the implemented warehouse hierarchy child-first before the terminal lifecycle audit entry.
- Done: applied the hierarchy migrations, including workspace-wide location-code registry, to the configured PostgreSQL database.
- Pending: run tenant isolation, quota/concurrency, lifecycle purge and Light/Dark UI verification.

### Phase 3B product catalog amendment — 17/09/2026

- Done in source: tenant-isolated products, units, Decimal unit conversions, generated lots and immutable cost-history models.
- Done in source: server-side active-workspace guard, product quota, optimistic updates, atomic audit/history writes and safe dependency-aware deletion.
- Done in source: `/products` catalog management screen for units, products, conversions and lots; lots intentionally have no quantity or slot assignment.
- Done: catalog migration applied to the configured PostgreSQL database.
- Done in source: unit codes are generated server-side as immutable `UOM-001…`; users enter only the display name.
- Done in source: correct lifecycle semantics so day 30 only locks writes and terminal `PURGED` deletes catalog plus warehouse data child-first.
- Accepted by user: Phase 3 requirements are complete. Automated typecheck, lint, catalog runtime, tenant-isolation, quota/concurrency and lifecycle-purge verification are not recorded for the latest checkout.

### Phase 4A inventory foundation amendment — 17/09/2026

- Done in source: tenant-scoped immutable inventory documents, lines, ledger entries and slot balances for opening, receipt and issue operations.
- Done in source: `/inventory` has a balance/recent-document view and multi-line shadcn dialogs with confirmation, idempotency and unsaved-draft protection.
- Done in source: active-workspace, quota, scoped-resource, Decimal conversion snapshot, non-negative issue update, serializable transaction and audit safeguards.
- Done: the additive inventory migration has been applied to the configured local PostgreSQL database.
- Done in source: lifecycle purge and catalog/location deletion now respect inventory history dependencies.
- Pending: typecheck, lint, posting workflow, concurrency and cross-workspace isolation verification.

## 10. Verification plan

Execution of checks starts only after implementation is approved and underway.

- Unit tests for conversions, VAT, budgets, FIFO/FEFO, expiry and quota rules.
- Integration tests for atomic inventory transactions, reversal, transfer and reservation expiry.
- Tenant isolation tests with at least two workspaces.
- Authorization tests for Demo User, Platform ADMIN and DEV.
- PDF render inspection for Vietnamese/English fonts and totals.
- Visual/manual tests for Light/Dark, VI/EN and common desktop/mobile sizes.
- Layout tests for scale, collision, rotation, entity linking and dirty-state behavior.
- Runtime smoke test on VPS-like environment including SMTP, OTP and scheduled jobs.
- Recheck that no secrets/tokens appear in application, email or audit logs.

## 11. Risks and mitigations

| Risk                                          | Level  | Mitigation                                                              |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| Cross-tenant data leak                        | High   | Central DAL, scoped indexes, isolation tests, no client tenant trust    |
| Incorrect inventory under concurrent actions  | High   | DB transaction, row/version checks, idempotency keys, ledger invariants |
| Platform support silently changes tenant data | High   | Support Mode, reason, banner, audit before/after, no impersonation      |
| Layout module expands into CAD                | High   | Rectangle-only boundary, template-based racks, no arbitrary vector/3D   |
| Email spam or duplicate delivery              | Medium | Combined onboarding, consent, outbox idempotency, bounded retry         |
| Scheduled purge deletes wrong tenant          | High   | Explicit lifecycle state, scoped job, dry-run/reporting and audit       |
| PDF Vietnamese font/layout failure            | Medium | Embedded font and render-based visual QA                                |
| Demo code accidentally reused as production   | Medium | Explicit product boundary in docs and deployment naming                 |

## 12. Dependencies requiring review before installation

- Authentication library and Prisma adapter compatibility.
- Form/schema validation.
- i18n.
- QR encode/render.
- PDF generation.
- SMTP transport.
- Canvas/drag/geometry library for Layout Designer.

No dependency is approved merely because it appears in this list. Each choice must be checked against current packages, maintenance, bundle/runtime impact and VPS compatibility before installation.

## 13. Definition of Done

- All approved demo flows work end-to-end with real PostgreSQL data.
- Two workspaces cannot access each other's data.
- Ledger/balance invariants hold and confirmed documents are immutable.
- Cost/project/quotation snapshots remain stable after current cost changes.
- Quotas, day-30 lock and day-37 purge work server-side.
- Platform Support Mode is explicit and fully audited.
- Sample/reset, email lifecycle and lead pipeline work without duplicate actions.
- PDF is bilingual and never exposes internal cost unless the document is an internal estimate.
- Layout Designer uses real dimensions, one business source of truth and safe edit behavior.
- VI/EN, Light/Dark, loading/error/empty/validation/confirmation states are complete.
- Required project, database, security, deployment and operating documentation is current.
