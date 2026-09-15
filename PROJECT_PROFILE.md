# AHSO Warehouse Demo — Project Profile

## Project

- Trạng thái: Đang triển khai. Phase 0 hoàn tất, Phase 1 đang thực hiện.
- Mục đích: Sản phẩm web demo công khai để người dùng trải nghiệm quản lý kho và gửi yêu cầu tư vấn cho AHSO.
- Bài toán: Thay thế cách quản lý nhập, xuất, tồn, kiểm kê và vị trí kho thủ công bằng Excel trong một môi trường dùng thử có kiểm soát.
- Môi trường: Web public triển khai trên VPS, sử dụng qua desktop và trình duyệt di động.
- Product production sau ký hợp đồng là một sản phẩm/triển khai riêng; demo không được nâng cấp trực tiếp thành production.

## Stack dự kiến

- TypeScript strict.
- Next.js App Router full-stack.
- PostgreSQL.
- Prisma ORM và migrations.
- Better Auth với Google OAuth cho người dùng demo.
- Email/password và liên kết Google cho Platform DEV/ADMIN.
- UI theo hệ component composable kiểu shadcn, responsive desktop-first.
- Runtime và package được pin chính xác trong `package.json`; Node.js 24.x, Next.js 16.3.5, Better Auth 1.7.5 và Prisma 7.10.0.

## Architecture

- Một ứng dụng Next.js, không tách NestJS hoặc microservice trong demo.
- Business logic nằm trong các domain module/service, không đặt trực tiếp rải rác trong page/component.
- Server Actions dùng cho mutation nội bộ phù hợp; Route Handlers `/api/v1` dùng khi cần hợp đồng HTTP rõ ràng.
- PostgreSQL là nguồn dữ liệu chuẩn.
- Scheduled task trên VPS xử lý email, hết hạn giữ hàng và vòng đời workspace.
- Không dùng Redis, queue ngoài, WebSocket hoặc offline sync trong demo.

## Multi-tenancy

- Một Google account tạo một workspace demo độc lập.
- Không mời hoặc liên kết nhiều demo user vào cùng workspace.
- Mọi dữ liệu tenant mang `workspaceId`; phạm vi workspace lấy từ session, không tin tenant ID do client gửi.
- Platform DEV/ADMIN có thể xem và hỗ trợ chỉnh dữ liệu thông qua Support Mode có lý do, thời hạn, banner và audit trước/sau.
- Không impersonate người dùng demo.

## Authentication and authorization

### Demo user

- Đăng nhập bằng Google.
- Hoàn tất onboarding gồm tên công ty, người liên hệ, thông tin liên hệ và consent trước khi dùng demo.
- Là chủ duy nhất của workspace và có quyền thao tác các chức năng demo.
- Phê duyệt hai người bị khóa tắt vì workspace chỉ có một người dùng.

### Platform DEV

- Toàn quyền nền tảng, cấu hình kỹ thuật, chẩn đoán, quản lý ADMIN, account và workspace.
- Không được xóa hoặc hạ quyền DEV cuối cùng.

### Platform ADMIN

- Quản lý đăng ký demo, lead, workspace, hạn mức, thời hạn, thống kê và hỗ trợ người dùng.
- Không truy cập chức năng DEV-only.

### Platform credential bootstrap

- Username là email duy nhất, chuẩn hóa chữ thường.
- DEV đầu tiên được bootstrap bằng secret triển khai một lần; không có credential mặc định trong source.
- Mật khẩu băm một chiều; hỗ trợ đổi/quên mật khẩu qua SMTP và thu hồi session cũ.
- Platform account có thể liên kết Google account đã xác minh.
- Better Auth được chọn sau dependency review vì adapter chính thức hỗ trợ Prisma 7, Google OAuth, email/password và account linking trong cùng một hệ thống xác thực.

## Warehouse domain

- Cấu trúc: `Kho → Phân khu → Kệ → Tầng kệ → Slot`.
- Tồn chi tiết: `Sản phẩm + lô + slot + trạng thái + số lượng`.
- Tổng tồn cấp tầng/kệ/khu/kho được tổng hợp từ slot, không nhập hoặc lưu độc lập như nguồn sự thật khác.
- Chứng từ đã xác nhận là bất biến; sửa sai bằng chứng từ đảo/điều chỉnh liên kết chứng từ gốc.
- Giao dịch và số dư cập nhật nguyên tử trong database transaction.

## Product and costing

- Mỗi sản phẩm có mã nội bộ duy nhất, đơn vị cơ sở và bộ quy đổi tùy chọn.
- Barcode/QR bên ngoài là tùy chọn.
- Lô có mã nội bộ tự sinh, mã nhà cung cấp tùy chọn và hạn sử dụng tùy sản phẩm/lô.
- Mỗi mã sản phẩm có một giá vốn hiện hành trên toàn kho.
- Giá trị tồn hiện tại dùng giá hiện hành; giao dịch xuất, dự toán và báo giá giữ snapshot giá tại thời điểm phát sinh.
- Giá vốn lịch sử của dự án không thay đổi khi giá sản phẩm thay đổi về sau.

## Inventory operations

- Tồn đầu kỳ, nhập, xuất, điều chuyển hai bước, kiểm kê mù, điều chỉnh, đảo giao dịch và giữ hàng.
- Xuất cho dự án là tùy chọn; lý do xuất luôn bắt buộc.
- FEFO là gợi ý cho hàng có hạn sử dụng; FIFO cho hàng không có hạn.
- Trạng thái tồn: khả dụng, đang giữ, đang điều chuyển, cách ly, hư hỏng và hết hạn.
- Hàng hết hạn bị chặn xuất thông thường; override cần quyền, lý do và audit đầy đủ.
- Mỗi lệnh giữ hàng bắt buộc có ngày hết hạn và không được vượt tồn khả dụng.

## Location classification

- Phân loại định tính: nhẹ, vừa, nặng.
- Nếu cấp cha có loại, cấp con bị ràng buộc theo loại đó.
- Nếu cấp cha để trống, từng cấp con được chọn loại riêng hoặc để trống.
- Kệ có các tầng khác loại được suy ra là `Hỗn hợp`.
- Đổi loại được phép nhưng phải báo các nhánh và hàng hóa không tương thích; không tự sửa hoặc di chuyển dữ liệu.

## Warehouse Layout Designer

- Một mặt bằng 2D cho mỗi kho; `tầng` trong domain chỉ là tầng của kệ, không phải tầng tòa nhà.
- Kho và phân khu dùng hình chữ nhật trong demo.
- Canvas có tỷ lệ thực, grid, zoom/pan, drag/drop, rotation và cảnh báo chồng lấn.
- Kho, khu, kệ, cửa, lối đi và vật cản có chiều dài/rộng; chiều cao lưu dưới dạng metadata.
- Khu/kệ trên sơ đồ liên kết 1–1 với thực thể nghiệp vụ; gỡ khỏi sơ đồ không xóa dữ liệu.
- Có thư viện mẫu kệ 2D và loại kệ tùy chỉnh từ mẫu cơ bản; không hỗ trợ vẽ CAD/vector tùy ý.
- Layout Designer là phase riêng, thực hiện sau inventory core.

## Project, customer and quotation

- Dự án có ngân sách tùy chọn; vượt ngân sách bị chặn, override cần quyền, lý do và audit.
- Tạo dự án/báo giá không tự động giữ hàng.
- Khách hàng gồm công ty/tổ chức và người liên hệ; chứng từ chọn rõ ngữ cảnh công ty hoặc cá nhân.
- Dự toán nội bộ dùng giá vốn.
- Báo giá khách hàng có giá bán riêng, dòng chi phí tùy chỉnh, VND và giá chưa VAT.
- VAT áp dụng theo dòng hoặc toàn chứng từ, không đồng thời cả hai.
- Báo giá xuất PDF song ngữ Việt–Anh và không lộ giá vốn.
- Báo giá được chấp nhận có thể tạo dự án, yêu cầu xuất hoặc lệnh giữ hàng theo thao tác chủ động.

## Demo lifecycle and quotas

- Thời hạn cố định 30 ngày từ lúc tạo workspace.
- Ngày 30 chuyển chỉ đọc; ngày 37 xóa dữ liệu nghiệp vụ.
- Cho phép người dùng tự reset về seed mẫu hoặc xóa workspace sớm.
- Hạn mức: 1 kho; 2 khu/kho; 3 kệ/khu; 3 tầng/kệ; 2 slot/tầng; 20 sản phẩm; 5 dự án; 5 hồ sơ công ty/cá nhân; 5 nhà cung cấp; 10 báo giá/dự toán; 100 giao dịch kho.

## Email and lead management

- SMTP cấu hình bằng environment secret.
- Email onboarding hợp nhất: cảm ơn, chào mừng AHSO, chính sách, hạn mức và thời hạn.
- Nhắc hết hạn vào ngày 23, 27 và 29; thông báo khóa, sắp xóa và đã xóa.
- Email đặt lại mật khẩu và cảnh báo bảo mật cho Platform DEV/ADMIN.
- Yêu cầu tư vấn tạo lead với pipeline: Mới, Đã liên hệ, Đang tư vấn, Có tiềm năng, Đã ký, Đã đóng.
- Email marketing/tư vấn chỉ gửi khi có consent phù hợp.

## UI

- Ngôn ngữ: Việt và Anh; mặc định Việt.
- Theme: Light và Dark; mặc định Light.
- Desktop-first nhưng responsive.
- Dùng custom dialog; không dùng browser alert/confirm/prompt.
- Form có validation inline, dirty-state protection và xác nhận cho Save/reset/xóa.
- Loading, error, empty và permission/unavailable state phải rõ ràng.

## Logging and audit

- Structured logs, correlation ID, redaction secret/token.
- Audit các mutation quan trọng, thay đổi giá/quyền/cấu hình, Support Mode và truy cập chéo tenant.
- Mutation quan trọng và audit nên nằm trong cùng transaction khi khả thi.

## Deployment

- VPS có HTTPS, PostgreSQL, backup và scheduled task.
- Google OAuth redirect URI và SMTP secret đặt ngoài repository.
- Cần health check, migration deployment và rollback plan trước public launch.

## Non-goals của demo

- App Android/Keyence và offline sync.
- Multi-user tenant và phê duyệt hai người thực tế.
- Purchase order/procurement.
- Chuyển dữ liệu demo thành production.
- Nâng cấp demo trực tiếp thành product production.
- CAD/3D warehouse designer.
- Import toàn bộ lịch sử Excel.

## Project documents

- [Implementation plan](docs/plans/0001-warehouse-demo-implementation-plan.md)
- [Database foundation](docs/DATABASE.md)
- [Security baseline](docs/SECURITY.md)
- [Permission model](docs/PERMISSIONS.md)
- [Development guide](docs/DEVELOPMENT.md)
- [ADR 0001 — Single Next.js demo](docs/adr/0001-single-nextjs-demo-architecture.md)
- [ADR 0002 — Multi-tenant demo lifecycle](docs/adr/0002-multi-tenant-demo-lifecycle.md)
- [ADR 0003 — Immutable inventory ledger](docs/adr/0003-immutable-inventory-ledger.md)
- [ADR 0004 — Scaled 2D warehouse layout](docs/adr/0004-scaled-2d-warehouse-layout.md)
