@AGENTS.md

# EduManager V2 — Trung Tâm Ngoại Ngữ Grow

Ứng dụng Web quản trị nội bộ cho trung tâm dạy thêm: quản lý học vụ (học
sinh/lớp/giáo viên), 12 đợt học/năm, thu học phí & công nợ, và kết chuyển lên
lớp tự động theo niên khóa.

**Nguồn sự thật nghiệp vụ**: [requirements.md](requirements.md) — đọc file
này trước khi thiết kế bất kỳ tính năng nào liên quan đến năm học, lớp học,
đợt học, ghi danh, chuyển lớp, biên lai hoặc công nợ.

## Skills

Ba skill trong `.claude/skills/` chứa quy ước chi tiết — load trước khi làm
việc trong phạm vi tương ứng:

- **[edumanager-ops](.claude/skills/edumanager-ops/SKILL.md)** — quy tắc
  nghiệp vụ: năm học, lên lớp tự động, 12 đợt học, chuyển lớp & bảo lưu công
  nợ, phân công giáo viên theo đợt, RBAC. Đọc trước khi viết bất kỳ logic
  backend nào.
- **[database-design](.claude/skills/database-design/SKILL.md)** — quy ước
  Prisma schema & Supabase Postgres. Đọc trước khi sửa
  `prisma/schema.prisma` hoặc viết migration/query mới.
- **[web-development](.claude/skills/web-development/SKILL.md)** — quy ước
  Next.js/React/Tailwind, cấu trúc thư mục, theme Emerald, danh sách modal.
  Đọc trước khi tạo page/component/form mới.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS 4, `src/` directory, alias `@/*`.
- Prisma 7 ORM (driver-adapter model — connection URLs live in
  `prisma.config.ts`, not in `schema.prisma`) + `@prisma/adapter-pg`.
- Database: PostgreSQL hosted trên **Supabase Cloud** (project ref
  `cfbuppqvaqvextihthva`). Prisma là query layer chính; `@supabase/supabase-js`
  + `@supabase/ssr` chỉ dùng khi cần Supabase Auth (khuyến nghị cho đăng
  nhập, xem TODO trong `src/lib/auth.ts`).
- Validation: zod (dùng chung schema giữa client form và server action).

## Project structure

```
requirements.md              # nguồn sự thật nghiệp vụ (tiếng Việt)
CLAUDE.md                    # file này
.claude/skills/              # database-design, edumanager-ops, web-development
prisma/
  schema.prisma
  seed.ts                    # seed danh mục môn học + học phí mặc định + 1 năm học
prisma.config.ts             # connection URL cho Prisma Migrate (đọc từ .env)
.env.example                 # mẫu biến môi trường Supabase — copy thành .env
src/
  app/
    (dashboard)/              # shell có sidebar/header, chứa 5 module UI
      layout.tsx
      page.tsx                 # Module 1: Dashboard
      students/                # Module 2
      classes/                 # Module 3
      teachers/                # Module 4
      pos/                     # Module 5
    api/                       # Route Handlers (khi cần, ngoài Server Actions)
    layout.tsx / globals.css   # root layout, theme Emerald (CSS variables --color-brand-*)
  components/
    ui/                       # Button, Card, StatusBadge... primitives dùng chung
    students/ classes/ teachers/ pos/   # component riêng từng module
  lib/
    prisma.ts                 # PrismaClient singleton (driver adapter)
    currency.ts                # convert "nghìn VNĐ" (UI) <-> đồng (DB)
    academic-year.ts           # đọc/ghi năm học đang chọn (cookie)
    rbac.ts                    # role guard cho Server Action/Route Handler
    auth.ts                    # STUB — chưa wire auth thật, xem TODO trong file
    supabase/
      client.ts                 # Supabase browser client (Client Components / Auth)
      server.ts                 # Supabase server client (Server Components/Actions, dùng cookies)
  types/
```

## Setup

Trạng thái hiện tại: `.env` đã có đủ `DATABASE_URL`/`DIRECT_URL` (project
`cfbuppqvaqvextihthva`, region `ap-southeast-1`) và
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Migration `init`
đã chạy và đã seed danh mục môn học + năm học 2025-2026 — DB thật đã sẵn sàng.

1. `npm install`
2. `npx prisma generate` (nếu `node_modules/@prisma/client` chưa có sau khi clone máy mới).
3. `npm run dev`.

Lệnh dùng khi cần: `npx prisma migrate dev --name <mô_tả>` (đổi schema),
`npx prisma db seed` (chạy lại seed), `npx prisma studio` (xem dữ liệu).

Ghi chú kết nối: connection string dùng `sslmode=no-verify` vì cert chain
của Supabase pooler không nằm trong trust store mặc định của Node — vẫn mã
hoá, chỉ bỏ qua xác thực CA. `.env` chứa secret thật, đã nằm trong
`.gitignore` (chỉ `.env.example` được commit) — không paste key/password vào
chat hay commit nhầm file này.

## Đã xong

- **"Auth" theo đúng requirements.md** (không có login thật, chỉ có Quick
  Switcher demo §1.4): `src/lib/auth.ts` resolve current user từ cookie do
  Quick Switcher set; 3 demo User (Admin/Cashier/Teacher) đã seed sẵn.
  `src/app/(dashboard)/quick-switcher-actions.ts` là Server Action đổi user,
  `src/components/layout/QuickSwitcher.tsx` là UI, gate bằng
  `NEXT_PUBLIC_ENABLE_QUICK_SWITCHER`.
- **Academic Year selector**: hoạt động thật qua cookie
  (`src/lib/academic-year.ts`), dropdown ở header.
- **RBAC enforce ở server**: sidebar lọc theo role + mỗi page
  (Dashboard/Students/Teachers) tự redirect nếu role không đủ quyền (không
  chỉ ẩn UI) — theo edumanager-ops §8.
- **Module Giáo Viên (Teachers) — CRUD đầy đủ**, dùng làm pattern mẫu cho
  các module còn lại: `src/app/(dashboard)/teachers/page.tsx` (list + tìm
  kiếm), `actions.ts` (create/update/delete, admin-only, tự sinh mã
  GV001/GV002...), `src/components/teachers/` (schema zod dùng chung
  client/server, modal form, table). `src/components/ui/Modal.tsx` là
  primitive modal dùng chung cho các module sau.
- Dashboard (`(dashboard)/page.tsx`) đã query dữ liệu thật (doanh thu hôm
  nay, sĩ số, số lớp theo năm học đang chọn) thay vì placeholder.
- **Module Học Sinh (Students) — CRUD đầy đủ + trang chi tiết**:
  `src/app/(dashboard)/students/` (list có tìm kiếm, `actions.ts` tự sinh mã
  HS0001/HS0002..., admin-only) và `src/components/students/` (form modal,
  table, `StudentDetailView` với 2 tab: Lớp Đã Ghi Danh / Lịch Sử Biên Lai).
  **Thêm Mới Học Sinh cho ghi danh ngay**: chọn Khối xong, `StudentFormModal`
  tự tải danh sách lớp đang mở đúng khối đó (`getOpenClassesByGrade`, nhóm
  theo môn), tick chọn lớp + đợt nhập học cho từng lớp — `createStudent`
  tạo Student + các Enrollment trong 1 `prisma.$transaction`, status ra
  luôn `STUDYING` nếu có ghi danh (thay vì phải tạo `NO_CLASS` rồi vào từng
  lớp ghi danh riêng). Không áp dụng khi sửa học sinh có sẵn (dùng "+ Ghi
  Danh Học Sinh" ở Class detail cho việc đó). Đã test trên DB thật: tạo học
  sinh + ghi danh 2 lớp khác môn với đợt bắt đầu khác nhau trong 1 lần, dọn
  sạch dữ liệu test.
- **Module Lớp Học (Classes) — CRUD đầy đủ + tự động sinh 12 Batch**:
  `src/app/(dashboard)/classes/actions.ts` — `createClass` chạy trong
  `prisma.$transaction` tạo Class + đúng `BATCHES_PER_CLASS` (12, hằng số ở
  `src/lib/constants.ts`) Batch cùng lúc; học phí mặc định tự điền theo môn
  (`Subject.defaultFeePerBatch`) nhưng cho sửa tay. Trang chi tiết
  (`[classId]/page.tsx` + `ClassDetailView`) có Tab 1 Quản Lý 12 Đợt Học
  (sửa tên/giáo viên/học phí/**trạng thái** từng đợt qua `modal-batch-form`
  pattern — `BatchFormModal`) và Tab 2 Danh Sách Học Sinh (trạng thái đóng
  phí đợt hiện tại, tính động từ `ReceiptLineItem`). List page lọc theo năm
  học đang chọn ở header; Teacher chỉ thấy lớp mình phụ trách; Cashier
  không vào được module này. Đổi trạng thái đợt sang `ONGOING` tự động
  chuyển đợt `ONGOING` khác của cùng lớp (nếu có) sang `COMPLETED` — enforce
  trong `updateBatch` (`prisma.$transaction`) để luôn chỉ có đúng 1 đợt
  "Đang học" mỗi lớp, đúng edumanager-ops §3. Đã test: transaction tạo lớp
  + 12 đợt trên DB thật, chuyển đợt 1→2 verify đúng invariant, dọn sạch dữ
  liệu test.
- **Ghi danh & Chuyển lớp (Enrollment)**, admin-only, theo đúng
  edumanager-ops §4-§5:
  `src/app/(dashboard)/classes/enrollment-actions.ts` — `enrollStudent`
  (ghi danh từ 1 đợt bất kỳ, không tạo nợ ảo các đợt trước; học sinh
  `NO_CLASS` tự chuyển `STUDYING`) và `transferStudent` (đóng enrollment cũ
  tại `endBatchNumber` — **không xoá**, nợ đợt cũ bảo lưu nguyên vẹn — rồi
  mở enrollment mới ở lớp đích). UI: nút "+ Ghi Danh Học Sinh" ở Class
  detail Tab 2 (`EnrollStudentModal`), nút "Chuyển Lớp" trên mỗi dòng
  enrollment đang active ở Student detail Tab 1 (`TransferStudentModal`).
  Đã test trên DB thật: ghi danh giữa chừng đợt 4, chuyển lớp ở đợt 6 sang
  lớp khác đợt 2 — verify cả 2 enrollment record cùng tồn tại đúng
  start/end, dọn sạch dữ liệu test.
- **Nghỉ Học (Withdraw)** — `withdrawStudent` trong cùng file
  `enrollment-actions.ts`: đóng enrollment tại `endBatchNumber` (như nửa
  đầu của `transferStudent`) nhưng **không mở enrollment mới ở đâu cả**; nợ
  phí đợt cũ vẫn bảo lưu nguyên vẹn. Nếu đây là enrollment active cuối cùng
  của học sinh, status tự chuyển `STUDYING` → `NO_CLASS` (không đụng
  `GRADUATED`). UI dùng chung `WithdrawStudentModal`
  (`src/components/classes/`) ở cả 2 nơi: nút "Nghỉ Học" trên mỗi dòng học
  sinh ở Class detail Tab 2, và trên mỗi dòng enrollment active ở Student
  detail Tab 1 (cạnh nút "Chuyển Lớp"). Đã test trên DB thật: nghỉ lớp duy
  nhất → status về NO_CLASS; nghỉ 1 trong 2 lớp đang học → status vẫn
  STUDYING vì còn lớp kia active.
- **Ghi Danh Thêm Lớp từ Student detail** — trước đây chỉ có "Chuyển Lớp"
  (đổi lớp) ở trang chi tiết học sinh, chưa có cách *thêm* ghi danh lớp mới
  mà không tạo học sinh mới. Nút "+ Ghi Danh Thêm Lớp" (cạnh tab "Lớp Đã Ghi
  Danh", ẩn nếu học sinh `GRADUATED`) mở `AddClassModal`
  (`src/components/classes/`) — đối xứng với "+ Ghi Danh Học Sinh" ở Class
  detail (chọn lớp thay vì chọn học sinh, vì học sinh đã cố định). Danh
  sách lớp gợi ý = `getOpenClassesByGrade(studentGrade, studentId)`, loại
  trừ lớp đang active, nhóm theo môn. Tái dùng nguyên logic phát hiện xung
  đột cùng môn (`findSameSubjectActiveEnrollment`) như EnrollStudentModal —
  chọn lớp cùng môn với lớp đang học sẽ tự chuyển sang luồng `transferStudent`
  thay vì `enrollStudent`. Đã test trên DB thật: loại đúng lớp đang học,
  vẫn gợi ý lớp khác môn, phát hiện đúng xung đột khi chọn lớp cùng môn.
- **Module POS (Module 5)** — đầy đủ theo requirements.md §4.6, cho cả 3
  vai trò (Teacher chỉ thấy/thu học sinh & lớp mình phụ trách, enforce ở
  `src/app/(dashboard)/pos/actions.ts`):
  - Tab **Thu Tiền**: tìm học sinh (debounced search action), hiển thị GỘP
    tất cả đợt còn nợ qua mọi lớp/enrollment (kể cả lớp cũ đã chuyển đi —
    đúng bảo lưu công nợ §5), chỉ hiện đúng dải batch trong phạm vi
    `startBatchNumber..endBatchNumber` của từng enrollment (không nợ ảo),
    màu sắc đợt dùng chung util `src/lib/payment-status.ts`
    (`getBatchPaymentTone`), banner cảnh báo lần đầu đóng phí, chọn nhiều
    đợt nhiều lớp thu gộp 1 biên lai (`createReceipt` tạo Receipt +
    nhiều ReceiptLineItem trong 1 lần, PRINTED tự sinh mã `BL000001...`),
    `ReceiptPrintModal` hiển thị phiếu thu sau khi xác nhận.
  - Tab **Tra Cứu Báo Cáo Nợ Phí**: chọn Lớp + Đợt, liệt kê học sinh với
    trạng thái đóng phí (dùng chung `getBatchPaymentTone`).
  - Đã test trên DB thật: học sinh ghi danh giữa chừng (đợt 3) chỉ hiện nợ
    từ đợt 3 trở đi (không phải đợt 1-2), đóng thiếu 200k/350k → đúng trạng
    thái "Đóng thiếu"; verify Class detail Tab 2 và Student detail Tab 2
    (Lịch Sử Biên Lai) đều phản ánh đúng biên lai vừa tạo. Dọn sạch dữ liệu
    test.
- **Import dữ liệu học sinh cũ từ [ds_tong_backup.csv](ds_tong_backup.csv)**:
  1423 học sinh đã import vào DB thật (script chạy 1 lần rồi xoá, không còn
  trong repo). Quy ước đã thống nhất với user khi đọc file CSV này:
  - Cột TOÁN/Lý/Hóa/VĂN/AV chứa 1 ký tự (A/B/C/D/O, hoặc VĂN có "1"/"2") =
    **tên nhóm lớp** của học sinh trong môn đó → mỗi giá trị khác rỗng tạo
    1 Class `"{Môn} {Khối}{Ký tự}"` (VD "Toán 6B"; VĂN dùng dấu gạch
    `"Văn 11-2"` vì ký tự là số) và 1 Enrollment (`startBatchNumber = 1`,
    vì CSV không có dữ liệu đợt).
  - `LỚP = "12N26"` = học sinh Khối 12 **đã tốt nghiệp niên khóa 2025-2026**
    → `grade = 12, status = GRADUATED`.
  - Tất cả lớp mới tạo từ import này đều gán tạm giáo viên demo **GV001**
    (`Nguyễn Văn Demo`) làm `primaryTeacherId` — **cần vào từng lớp đổi
    sang giáo viên thật** khi có danh sách GV thật.
  - Kết quả: 77 lớp (924 batch), 1423 học sinh (64 GRADUATED / 545 NO_CLASS
    / 814 STUDYING), 1223 enrollment. Đã verify qua UI (Dashboard, danh
    sách/chi tiết Học sinh, danh sách/chi tiết Lớp) trên DB thật.
- **Lọc theo thuộc tính liên quan ở các dropdown chọn đối tượng** — tránh
  đề xuất sai (học sinh khác khối, giáo viên khác môn, lớp đích khác môn):
  - `searchEligibleStudents` (Ghi Danh) chỉ gợi ý học sinh **cùng khối** với
    lớp đang ghi danh.
  - `ClassFormModal`/`BatchFormModal`: dropdown Giáo viên chỉ hiện giáo
    viên có `subjectId` khớp môn của lớp/đợt. **Vì dữ liệu import cũ gán
    tạm GV001 (Toán) cho cả 76 lớp không phải Toán**, cả 2 modal vẫn giữ
    giáo viên hiện tại trong danh sách kèm nhãn "(khác môn)" nếu bị lệch —
    không làm mất lựa chọn đang có, chỉ chặn việc *chọn mới* sai môn.
  - `TransferStudentModal`: "Chuyển sang Lớp" chỉ liệt kê lớp **cùng môn
    và cùng khối** với lớp đang học (đúng ví dụ "Toán 6A → Toán 6B" ở
    edumanager-ops §4). Lọc khối được thêm sau khi phát hiện thiếu sót —
    ban đầu `students/[studentId]/page.tsx` chỉ lấy `status: OPEN` mà quên
    lọc `grade`, khiến chuyển lớp gợi ý cả lớp khác khối (VD khối 6 gợi ý
    cả khối 10/11); đã thêm `sameGradeClasses` filter trước khi truyền
    xuống view.
  - Đã verify cả 3 trên DB thật (khối không khớp bị loại, môn không khớp bị
    loại, giáo viên lệch môn từ dữ liệu import vẫn hiện kèm nhãn cảnh báo
    thay vì biến mất).
- **Module "In Danh Sách"** (`/print-roster`, Admin + Teacher — Teacher chỉ
  thấy lớp mình phụ trách): chọn nhiều lớp (filter theo môn/khối, lọc theo
  năm học đang chọn ở header) → submit form thường (`method="POST"`, không
  cần JS fetch/blob) tới Route Handler `src/app/api/print-roster/route.ts`
  → trả về `.xlsx` tải trực tiếp qua header `Content-Disposition`. Dùng
  `exceljs` (không phải Python/openpyxl vì phải chạy trong Next.js server).
  **Nạp thẳng file mẫu gốc của trung tâm** —
  `src/app/api/print-roster/templete-danh-sach.xlsx` (copy y nguyên từ
  `templete danh sach.xlsx`) — bằng `workbook.xlsx.readFile()`, rồi **chỉ
  ghi giá trị vào**, không style/format/công thức gì cả: mỗi lớp chiếm 1
  trong 135 khối 30-dòng có sẵn của sheet "HOÁ", chỉ set tiêu đề (A1 =
  "DANH SÁCH {MÔN}"), nhãn lớp (I1), và cột STT/Họ và tên/Tên/SĐT (dòng
  5-29, tối đa 25 học sinh, sắp theo `sortByVietnameseGivenName`). Toàn bộ
  font/màu/viền/độ rộng cột/công thức (`=$R$1` ở header, `SUBTOTAL` ở dòng
  30) đều là của file mẫu, chưa từng bị code đụng tới. **Lớp quá 25 học
  sinh tự động tràn sang khối tiếp theo** (nhãn thêm "(tiếp theo)"), dùng
  đúng khối kế tiếp có sẵn trong 135 khối — không tạo/xoá khối nào cả.
  `next.config.ts` có `outputFileTracingIncludes` đảm bảo file mẫu này
  được đóng gói cùng function khi deploy (Vercel). Đã test qua POST thật:
  font/màu Times New Roman đúng nguyên bản, khối chưa dùng vẫn giữ
  placeholder gốc "DANH SÁCH AV 1A", công thức header/subtotal nguyên vẹn,
  và 1 lớp 30 học sinh tự tách đúng 2 khối (25+5, nhãn "tiếp theo").

## Việc còn thiếu (chưa implement)

- Year-End Promotion (kết chuyển niên khóa, edumanager-ops §2) — cần chạy
  trong `prisma.$transaction`.
- Payroll report theo giáo viên/đợt (Tab 2 trang chi tiết Giáo viên).
- Trang chi tiết Giáo viên (hiện là placeholder "Chưa có dữ liệu").
- Chưa có test suite.

## Quy ước làm việc chung

- Không hardcode màu Emerald bằng hex rải rác — dùng token
  `--color-brand-*` (định nghĩa ở `src/app/globals.css`) / class
  `bg-brand-600` v.v.
- Tiền luôn lưu ở DB dạng đồng nguyên (Int) — convert qua `lib/currency.ts`,
  không nhân/chia 1000 rải rác trong code.
- Mọi Server Action mutate dữ liệu phải gọi `lib/rbac.ts` để enforce quyền —
  không chỉ ẩn nút trên UI.
