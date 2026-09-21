---
name: edumanager-ops
description: Business rules and domain logic for EduManager V2 (Trung Tâm Ngoại Ngữ Grow). Use whenever implementing or reviewing features related to academic years, year-end promotion, classes/batches, student enrollment, transfers, debt carryover, receipts/POS, or teacher payroll. Load this before writing any backend logic, Prisma schema, or UI for these domains, to avoid violating business rules from requirements.md.
---

# EduManager V2 — Business Rules (Nghiệp vụ)

Nguồn gốc: [requirements.md](../../../requirements.md) tại gốc dự án. Luôn đọc lại file đó khi có mâu thuẫn — skill này là bản tóm tắt vận hành, không thay thế tài liệu gốc.

## 0. Bối cảnh chung
- Đơn vị: Trung Tâm Ngoại Ngữ Grow. Giao diện Light Mode, tông Emerald (`#059669` / `#10B981`).
- Thanh toán mặc định: Tiền mặt (CASH) — không có online payment trong V2.
- 3 vai trò RBAC: **Admin** (toàn quyền), **Cashier/Thu ngân** (POS + tra nợ), **Teacher/Giáo viên** (chỉ lớp được phân công).
- Có "Quick Switcher" đổi vai trò nhanh trên header để demo/test UI — không phải cơ chế auth thật, chỉ dùng khi seed/demo.

## 1. Năm học (Academic Year) — luôn là biên giới dữ liệu
- MỌI entity nghiệp vụ chính (Lớp học, Ghi danh/Enrollment, Biên lai, Đợt học) đều gắn với một `academic_year` cụ thể (VD: "2025-2026"). Không được query/lọc dữ liệu lớp/báo cáo mà thiếu điều kiện năm học.
- UI luôn có Academic Year Selector ở header — mọi trang danh sách/báo cáo phải tôn trọng bộ lọc này.
- Học sinh (Student) là entity xuyên suốt nhiều năm học (không gắn cứng 1 năm) — nhưng Enrollment (ghi danh vào lớp) thì gắn năm học qua Class.

## 2. Lên Lớp / Kết Chuyển Niên Khóa (Year-End Promotion) — nút bấm 1 lần, 3 hành động nguyên tử
Khi Admin bấm "Lên Lớp / Kết Chuyển Niên Khóa" (năm cũ → năm mới), hệ thống PHẢI thực hiện tuần tự và transactional (toàn bộ thành công hoặc rollback hết):
1. **Tăng khối học sinh**: mọi học sinh đang "Đang học" → `grade += 1`. Học sinh đang ở Khối 12 → chuyển status thành `"Đã tốt nghiệp"` thay vì tăng khối lên 13.
2. **Nhân bản lớp học sang năm mới**: với mỗi lớp của năm cũ, tạo lớp mới ở năm mới với `grade + 1`, tên lớp được suy ra (VD: "Toán 6A (2025-2026)" → "Toán 7A (2026-2027)"). Lớp mới tự động sinh lại đủ 12 đợt học mới (theo mục 3).
3. **Kết chuyển ghi danh**: toàn bộ học sinh đang ghi danh (enrollment active) ở lớp cũ → tạo enrollment mới ở lớp mới tương ứng năm sau. KHÔNG copy nợ phí cũ sang lớp mới (nợ phí cũ ở batch cũ vẫn nằm nguyên ở lớp/năm cũ, xem mục 5 về bảo lưu công nợ).
- Học sinh đã tốt nghiệp (Khối 12 xong năm) KHÔNG được kết chuyển enrollment sang lớp mới.
- Thao tác này chỉ nên chạy 1 lần cho mỗi cặp (năm cũ → năm mới); cần cơ chế idempotency/guard chống bấm nhầm 2 lần (kiểm tra xem năm mới đã có lớp kết chuyển từ năm cũ chưa trước khi chạy).

## 3. Lớp học & 12 Đợt học (Batches)
- Mỗi lớp thuộc đúng 1 năm học, do 1 giáo viên phụ trách chính (có thể đổi theo từng đợt — xem mục 6).
- Học phí mặc định theo môn: các môn thường (Toán, Lý, Hóa, Anh Văn, GVNN...) = 350.000đ/đợt; môn Văn = 300.000đ/đợt. Admin có thể override học phí theo từng lớp và theo từng đợt riêng lẻ.
- **Khi tạo lớp mới**: hệ thống tự động sinh đúng 12 bản ghi Batch (Đợt 1 → Đợt 12) cho lớp đó, mỗi batch có `batch_number` (1-12), tên đợt, học phí riêng (mặc định = học phí lớp), giáo viên phụ trách đợt (mặc định = giáo viên lớp), trạng thái.
- Trạng thái đợt: `UPCOMING` (sắp tới) / `ONGOING` (đang học — chỉ 1 đợt "hiện tại" tại 1 thời điểm cho mỗi lớp) / `COMPLETED` (đã hoàn thành).
- Mỗi lớp có đúng 12 batch — không tự phát sinh thêm hay xoá bớt qua UI thường; chỉ sửa tên/giáo viên/học phí của batch có sẵn (modal `modal-batch-form`).

## 4. Ghi danh, chuyển lớp & theo dõi đợt (Transfer-In / Transfer-Out)
- Mỗi Enrollment (học sinh–lớp) có `start_batch_number` bắt buộc — đợt mà học sinh THỰC SỰ bắt đầu học ở lớp đó. Nếu học sinh vào giữa chừng (VD từ Đợt 4), `start_batch_number = 4` và hệ thống KHÔNG được tạo nghĩa vụ nợ phí cho Đợt 1-3 của lớp đó (không có nợ ảo).
- Khi học sinh chuyển lớp (Lớp A → Lớp B):
  - Enrollment cũ ở Lớp A được set `end_batch_number` = đợt cuối cùng còn học ở A (VD: học xong Đợt 4 rồi chuyển thì `end_batch_number = 4`).
  - Enrollment mới ở Lớp B có `start_batch_number` = đợt bắt đầu ở B (VD: `5`).
  - Enrollment cũ KHÔNG bị xoá — giữ lại để truy vết lịch sử và công nợ đợt cũ.
- Mỗi lớp có `batch_id` độc lập hoàn toàn — học sinh có thể học Lớp A đợt 1-4, Lớp B đợt 2-5, rồi quay lại Lớp A đợt 6-9: đây là 2 (hoặc nhiều) Enrollment record khác nhau giữa cùng 1 học sinh và cùng 1 lớp A, KHÔNG được coi là conflict hay merge thành 1 record.
- Mỗi dòng chi tiết biên lai (receipt line item) phải lưu chính xác `class_id` + `batch_id` — tuyệt đối không được suy luận/gộp mập mờ giữa các lớp khi tính tiền hoặc hiển thị báo cáo.

## 5. Bảo lưu công nợ khi chuyển lớp
- Nợ phí các đợt CHƯA ĐÓNG ở lớp cũ (trong phạm vi `start_batch_number..end_batch_number` của enrollment cũ) KHÔNG bị xoá, không bị chuyển sang lớp mới — nó vẫn treo đúng tại batch cũ của lớp cũ.
- Màn hình POS khi chọn học sinh phải hiển thị GỘP: nợ đợt cũ ở Lớp A + các đợt ở Lớp B (và bất kỳ lớp nào khác đang/đã enroll), để thu ngân có thể thu gộp trên 1 biên lai duy nhất — nhưng mỗi dòng thu vẫn phải giữ đúng `class_id`/`batch_id` gốc (không gộp thành 1 dòng chung).

## 6. Phân công giáo viên theo đợt & Payroll
- Giáo viên phụ trách của một Batch có thể khác giáo viên phụ trách chính của Lớp (đổi giáo viên giữa chừng năm học) — field `teacher_id` nằm ở cấp Batch, không chỉ ở cấp Class.
- Báo cáo thù lao (Payroll) của 1 giáo viên = tổng tiền THỰC THU (không phải học phí lý thuyết) của các Batch mà giáo viên đó là `teacher_id` phụ trách, tính từ các receipt line item khớp đúng `batch_id` đó. Nếu 1 lớp đổi giáo viên giữa đợt 5, giáo viên A chỉ được tính doanh thu của Đợt 1-4, giáo viên B tính Đợt 5 trở đi — dựa theo `batch.teacher_id` tại từng đợt, không dựa theo `class.teacher_id`.

## 7. Biên lai & POS
- 2 loại biên lai: `PRINTED` (in máy, hệ thống tự sinh mã biên lai) và `MANUAL` (nhập tay, thu ngân tự nhập mã từ cuống sổ giấy) — lưu field `receipt_type` + `manual_receipt_code` (nullable, chỉ có khi `MANUAL`).
- 1 biên lai có thể chứa nhiều dòng (line items), mỗi dòng ứng với 1 (class, batch) cụ thể và số tiền thu cho đợt đó — cho phép thu gộp nhiều lớp/nhiều đợt trong 1 lần lập biên lai.
- Lưu chính xác timestamp lập biên lai (hiển thị dạng `HH:mm:ss DD/MM/YYYY`).
- Cảnh báo "học sinh mới / lần đầu đóng phí cho lớp này": kích hoạt khi đây là lần đầu tiên có receipt line item cho cặp (student, class) đó — nhắc thu ngân kiểm tra giảm giá/trừ tiền học giữa chừng. Đây là cảnh báo UI, không chặn giao dịch.
- Trạng thái đóng phí của 1 batch/student được suy ra từ tổng tiền đã thu (sum các line item) so với học phí đợt đó: `Chưa đóng` (0đ), `Đóng thiếu` (0 < thu < học phí đợt), `Đã đóng đủ` (thu ≥ học phí đợt). Không lưu 1 field trạng thái tĩnh riêng — luôn tính động từ receipt line items để tránh lệch dữ liệu.
- "Nợ quá hạn" (màu đỏ 🔴 trên UI) = batch đã ở trạng thái `COMPLETED` hoặc đã qua thời điểm hiện tại nhưng chưa đóng đủ.

## 8. Quy tắc phân quyền cần enforce ở backend (không chỉ ẩn UI)
- Teacher chỉ được xem/thu tiền cho học sinh thuộc lớp mà chính họ là `teacher_id` (ở cấp Class hoặc Batch hiện tại) — mọi API endpoint liên quan phải filter theo `teacher_id === current_user.teacher_id`, không chỉ ẩn nút trên UI.
- Cashier có quyền lập biên lai + tra cứu nợ toàn trung tâm, nhưng KHÔNG có quyền quản lý danh mục (lớp, giáo viên, học sinh, năm học) hay chạy Lên Lớp.
- Chỉ Admin được thấy Dashboard doanh thu tổng quan và chạy Year-End Promotion.

## Khi implement một feature mới
1. Xác định feature này đụng tới batch/enrollment/receipt nào — luôn hỏi "có ảnh hưởng tới bảo lưu công nợ hoặc đợt độc lập giữa các lớp không?".
2. Không bao giờ hardcode "12 đợt" thành magic number rải rác — định nghĩa hằng số `BATCHES_PER_CLASS = 12` dùng chung.
3. Mọi thao tác tiền (receipt, payroll) phải trace được về đúng `class_id` + `batch_id` — nếu không trace được thì thiết kế sai.
4. Khi nghi ngờ, đối chiếu lại [requirements.md](../../../requirements.md) mục 2 và 3 trước khi quyết định.
