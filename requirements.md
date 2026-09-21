# TÀI LIỆU YÊU CẦU NGHIỆP VỤ PHẦN MỀM (BUSINESS SOFTWARE REQUIREMENTS SPECIFICATION)
## DỰ ÁN: HỆ THỐNG QUẢN LÝ TRUNG TÂM DẠY THÊM (EDUMANAGER V2)

---

## 1. TỔNG QUAN HỆ THỐNG (SYSTEM OVERVIEW)

### 1.1. Mục tiêu Hệ thống
Xây dựng ứng dụng Web quản trị nội bộ dành cho Trung tâm Dạy thêm, tập trung vào 3 trụ cột nghiệp vụ:
1. **Quản lý Phân theo Niên khóa & Kết chuyển Lên lớp**: Quản lý dữ liệu phân chia rõ ràng theo từng Năm học (Ví dụ: 2025-2026, 2026-2027...), tự động kết chuyển lên lớp cho học sinh và nâng khối cho lớp học khi sang năm học mới.
2. **Quản lý Học vụ**: Quản lý hồ sơ học sinh, danh sách giáo viên, phân công lớp học và theo dõi tình trạng học tập.
3. **Quản lý Tài chính & Công nợ**: Thu học phí theo 12 đợt linh hoạt, lập biên lai thu tiền in máy / nhập tay, theo dõi công nợ nối tiếp và báo cáo doanh thu theo niên khóa.

### 1.2. Hình thức Thanh toán
- Phương thức mặc định: **Tiền mặt (CASH)**.

### 1.3. Phân quyền Người dùng (Role-Based Access Control)
Hệ thống phân chia 3 nhóm quyền nghiệp vụ chính:
- 👑 **Chủ trung tâm (Admin - Full Access)**:
  - Xem Dashboard doanh thu tổng quan, báo cáo nợ phí, quản lý danh mục lớp học, 12 đợt học, môn học, giáo viên, học sinh, thực hiện chức năng kết chuyển Lên lớp niên khóa mới và sử dụng POS thu tiền toàn trung tâm.
- 💵 **Thu ngân (Cashier Access)**:
  - Lập biên lai thu tiền học phí tại POS (in máy hoặc nhập tay), tra cứu danh sách nợ phí và in phiếu thu tiền cho phụ huynh.
- 👨‍🏫 **Giáo viên (Teacher Access)**:
  - Quản lý các lớp được phân công dạy (xem danh sách học sinh, sĩ số) và thu học phí cho học sinh thuộc các lớp do mình trực tiếp phụ trách.

### 1.4. Thương hiệu & Phong cách Giao diện
- **Tên trung tâm**: **Trung Tâm Ngoại Ngữ Grow**
- **Phong cách**: Giao diện tươi sáng (Light Mode), hiện đại, thanh lịch.
- **Tông màu chủ đạo**: **Xanh Emerald chuyên nghiệp** (`#059669` / `#10B981`).
- **Chế độ Demo Quick Switcher**: Cho phép chuyển đổi nhanh giữa 3 vai trò (Admin, Thu ngân, Giáo viên) trên thanh Tiêu đề để kiểm tra giao diện.

---

## 2. QUY ĐỊNH NGHIỆP VỤ & QUẢN LÝ THỰC THỂ (BUSINESS RULES & ENTITY SPECIFICATIONS)

### 2.1. Quản lý Năm học & Chức năng Lên lớp Tự động (Academic Years & Year-End Promotion)
- **Quản lý dữ liệu theo Niên khóa**:
  - Toàn bộ dữ liệu Lớp học, Ghi danh, Biên lai và Báo cáo công nợ được quản lý phân biệt rõ ràng theo từng **Năm học** (Ví dụ: 2025-2026, 2026-2027, 2027-2028...).
  - **Bộ lọc Năm học**: Trên giao diện quản lý có thanh chọn Năm học hoạt động. Hệ thống tự động lọc và hiển thị danh sách lớp học, học sinh và báo cáo tài chính tương ứng với niên khóa được chọn.
- **Chức năng Lên Lớp Tự Động khi Sang Năm Học Mới (Year-End Promotion)**:
  - Khi trung tâm bắt đầu năm học mới (Ví dụ: Chuyển từ năm học 2025-2026 sang 2026-2027), người quản trị nhấn nút **"Lên Lớp / Kết Chuyển Niên Khóa"**, hệ thống tự động thực hiện 3 công việc:
    1. **Tự động Tăng Khối cho Học sinh**:
       - Tất cả học sinh đang theo học được tự động tăng lên 1 khối (Ví dụ: Học sinh Khối 6 lên Khối 7, Khối 7 lên Khối 8... Khối 11 lên Khối 12).
       - Các học sinh thuộc **Khối 12** sau khi hoàn thành năm học sẽ tự động chuyển sang trạng thái **"Đã tốt nghiệp"**.
    2. **Tự động Tăng Khối & Mở Lớp học cho Năm học mới**:
       - Hệ thống tự động khởi tạo danh sách lớp học mới cho niên khóa tiếp theo với tên lớp được nâng lên 1 khối (Ví dụ: Lớp *Toán 6A (2025-2026)* được tự động nâng thành *Toán 7A (2026-2027)*, Lớp *Văn 11B (2025-2026)* thành *Văn 12B (2026-2027)*).
    3. **Tự động Kết chuyển Danh sách Học sinh sang Lớp mới**:
       - Toàn bộ học sinh trong lớp cũ được tự động chuyển sang danh sách ghi danh của lớp học mới tương ứng ở niên khóa tiếp theo.

### 2.2. Quản lý Giáo viên (Teachers)
- **Thông tin quản lý**:
  - Mã Giáo viên: Mã định danh duy nhất (VD: GV001, GV002...).
  - Họ và Tên: Bắt buộc nhập.
  - Số điện thoại: Không bắt buộc (Tùy chọn).
  - Môn phụ trách: Chọn từ Danh mục Môn học (Dropdown chọn Toán, Lý, Hóa, Văn, Anh Văn, GVNN...).

### 2.3. Quản lý Học sinh (Students)
- **Thông tin quản lý**:
  - Mã Học sinh: Tự động sinh theo định dạng duy nhất (VD: HS0001, HS0002...).
  - Họ và Tên: Bắt buộc nhập.
  - Số điện thoại liên lạc: Lưu 1 số điện thoại chính của phụ huynh/học sinh.
  - Khối học: Từ Khối 1 đến Khối 12.
  - Trạng thái học sinh:
    - *Đang học*: Học sinh đang ghi danh học tại trung tâm.
    - *Chưa có lớp*: Học sinh mới nhập hồ sơ chưa xếp lớp.
    - *Đã tốt nghiệp*: Học sinh đã hoàn thành xong chương trình Khối 12.
  - Ghi chú: Lưu trữ thông tin tự do (lưu ý học tập, lịch hẹn đóng tiền...).

### 2.4. Quản lý Lớp học & 12 Đợt học (Classes & 12 Batches per Academic Year)
- **Quy định Lớp học**:
  - Mỗi Lớp học gắn liền với một Niên khóa cụ thể và do 1 Giáo viên phụ trách chính (có thể thay đổi giáo viên phụ trách theo đợt).
  - Mức học phí mặc định: Môn thông thường (Toán, Lý, Hóa, Anh Văn, GVNN) mặc định **350.000 VNĐ / đợt**; Môn Văn mặc định **300.000 VNĐ / đợt**. Người quản trị có quyền điều chỉnh mức học phí cho từng lớp.
- **Tự động khởi tạo 12 Đợt học**:
  - Khi tạo mới một Lớp học, hệ thống **tự động sinh sẵn 12 Đợt học** (Từ Đợt 1 đến Đợt 12).
  - Trạng thái Đợt học: *Đang học* (đợt hiện tại), *Sắp tới* (chưa học), *Đã hoàn thành* (kết thúc đợt).
  - Quản lý học phí đợt: Cho phép điều chỉnh tên đợt học, giáo viên phụ trách và mức học phí riêng cho từng đợt nếu có sự thay đổi.

### 2.5. Nghiệp vụ Chuyển Lớp Học Sinh & Bảo lưu Công nợ (Student Transfers & Batch Tracking)
- **Quy tắc Chuyển Lớp giữa các Lớp học**:
  - Học sinh được phép chuyển từ lớp cũ sang lớp mới trong quá trình học (Ví dụ: Chuyển từ *Lớp 6A - Toán* sang *Lớp 6B - Toán*).
- **Quản Lý Đợt Nhập Học & Đợt Chuyển Đi (Transfer-In / Transfer-Out Batch Tracking)**:
  - **Nhập học mới giữa chừng**: Khi học sinh gia nhập lớp học từ một Đợt học bất kỳ (Ví dụ: Xin vào lớp từ Đợt 4), hệ thống phải **ghi nhớ chính xác Đợt bắt đầu học (`start_batch_number`)**. Hệ thống chỉ tính học phí và theo dõi nợ phí từ Đợt bắt đầu này trở đi, tuyệt đối không báo nợ ảo các đợt trước đó (Đợt 1, 2, 3).
  - **Chuyển lớp giữa chừng**: Khi học sinh chuyển từ Lớp A sang Lớp B (Ví dụ: Học hết Đợt 4 ở Lớp A rồi chuyển sang Lớp B từ Đợt 5), hệ thống phải **ghi nhớ chính xác Đợt kết thúc ở Lớp A (`end_batch_number = 4`)** và **Đợt bắt đầu ở Lớp B (`start_batch_number = 5`)**.
  - **Đợt học độc lập & Không liên tục giữa các Lớp (Non-contiguous & Independent Batches)**: Các đợt học của mỗi Lớp học được quản lý hoàn toàn độc lập (`batch_id` riêng). Học sinh có thể tham gia các khoảng đợt không liên tục giữa các lớp khác nhau (Ví dụ: Học Lớp A ở Đợt 1-4 $\to$ Học Lớp B ở Đợt 2-5 $\to$ Quay lại Lớp A ở Đợt 6-9). Hệ thống theo dõi chính xác từng đợt học của từng lớp mà không bị xung đột.
  - **Minh bạch sĩ số & công nợ**: Mỗi dòng đóng tiền trên biên lai ghi nhận chính xác `class_id` và `batch_id` của từng lớp riêng biệt. Tuyệt đối không gây thu trùng học phí hay nhầm lẫn công nợ.
- **Quy tắc Bảo lưu & Thu nợ Nối tiếp**:
  - Khi học sinh chuyển lớp, nếu **chưa đóng tiền các đợt ở lớp cũ** (Ví dụ: Còn nợ Đợt 2, 3 của Lớp A):
    - Khoản nợ phí đợt học cũ ở Lớp A được **giữ nguyên và bảo lưu** tại đúng Đợt học đó.
    - Tại màn hình thu tiền POS, hệ thống sẽ tự động hiển thị **cả khoản nợ đợt cũ ở Lớp A lẫn các đợt ở Lớp B** để Thu ngân dễ dàng theo dõi và thu gộp trên 1 biên lai.

### 2.6. Nghiệp vụ Phân công Giáo viên theo Đợt & Quyết toán Thù lao (Teacher Assignment per Batch)
- **Thay đổi Giáo viên theo Đợt**:
  - Cho phép phân công các giáo viên khác nhau phụ trách từng đợt học cụ thể trong cùng một lớp.
- **Quyết toán Thù lao Giáo viên**:
  - Báo cáo thù lao giáo viên được tổng hợp dựa trên số tiền học phí thực thu của các đợt học mà giáo viên đó trực tiếp phụ trách, đảm bảo tính chính xác khi lớp thay đổi giáo viên giữa chừng.

---

## 3. THU HỌC PHÍ, BIÊN LAI & BÁO CÁO CÔNG NỢ (PAYMENTS, RECEIPTS & DEBT REPORTING)

### 3.1. Quy tắc Lập Biên Lai & Màn hình POS
- **Giao diện POS Chọn Học sinh Thông minh**:
  - Khi chọn học sinh, hệ thống hiển thị toàn bộ danh sách lớp học sinh đang học kèm theo 12 đợt học và trạng thái đóng phí của từng đợt (*Đã đóng, Chưa đóng, Nợ quá hạn*).
  - Thu ngân có thể chọn 1 hoặc nhiều đợt của nhiều lớp khác nhau để thu gộp trên cùng 1 biên lai.
- **Cảnh báo Học sinh mới / Lần đầu đóng phí**:
  - Tự động hiển thị cảnh báo nhắc nhở kiểm tra giảm giá hoặc trừ tiền nếu đây là lần đầu tiên học sinh đóng học phí cho lớp đó.
- **Phân loại & Lưu trữ Biên lai**:
  - Phân loại Biên lai *In máy* (tự sinh mã) hoặc Biên lai *Nhập tay* (nhập mã từ cuống sổ).
  - Lưu trữ chính xác **Ngày & Giờ lập biên lai** (`HH:mm:ss DD/MM/YYYY`), danh sách chi tiết các môn/lớp/đợt đóng tiền, số tiền từng đợt và tổng tiền thu.

### 3.2. Tra Cứu Công Nợ & Báo Cáo
- **Tra cứu Công nợ theo Lớp & Đợt**:
  - Cho phép xem danh sách học sinh theo Lớp và Đợt học phân loại thành: *Đã đóng đủ*, *Đóng thiếu*, và *Chưa đóng*.
- **Bộ lọc danh sách nợ**:
  - Hỗ trợ lọc nhanh danh sách các học sinh chưa hoàn thành học phí để trung tâm liên hệ nhắc phí cho phụ huynh.

---

## 4. MÔ TẢ CHI TIẾT CÁC MODULE GIAO DIỆN & TÍNH NĂNG THỰC TẾ (SYSTEM MODULES & UI SPECIFICATIONS)

### 4.1. Khung Giao Diện Chung & Điều Hướng (Global Layout & Navigation)
- **Thanh Header Hệ thống**:
  - Tên đơn vị: **Trung Tâm Ngoại Ngữ Grow** (Tông màu Emerald Green).
  - **Thanh Chuyển Quyền Nhanh 1-Click (Quick Switcher)**: Cho phép chuyển đổi linh hoạt giữa 3 vai trò *Admin (Toàn quyền)*, *Thu Ngân (Cashier)*, và *Giáo Viên (Teacher)* để kiểm tra giao diện.
  - **Bộ Lọc Phân Theo Năm Học (Academic Year Selector)**: Dropdown chọn năm học làm việc (VD: `2025-2026`, `2026-2027`...), tự động đồng bộ tất cả dữ liệu hiển thị.
- **Thanh Menu Điều Hướng Bên (Sidebar Navigation)**:
  - 📊 `Dashboard` (Tổng quan)
  - 👨‍🎓 `Quản Lý Học Sinh`
  - 🏫 `Quản Lý Lớp Học`
  - 👨‍🏫 `Quản Lý Giáo Viên`
  - 💳 `POS Thu Tiền Học Phí`

### 4.2. Module 1: Dashboard (Tổng Quan Doanh Thu & Học Vụ)
- **4 Thẻ Chỉ Số Tổng Quan**:
  - *Doanh thu hôm nay (VNĐ)*: Tổng số tiền thu học phí trong ngày.
  - *Tổng số học sinh*: Sĩ số học sinh toàn trung tâm (phân loại đang học / đã tốt nghiệp).
  - *Số lớp đang hoạt động*: Tổng số lớp đang mở trong năm học.
  - *Số lớp đã kết thúc*: Số lớp đã hoàn thành chương trình.
- **Bảng Lớp Học Kết Thúc Cần Thu Nợ**: Danh sách các lớp đã xong đợt nhưng còn công nợ chưa thu, hỗ trợ nút thao tác mở POS thu nợ nhanh.

### 4.3. Module 2: Quản Lý Học Sinh (Students Management)
- **Trang Danh Sách Học Sinh**:
  - Ô tìm kiếm theo Họ tên, SĐT, Mã HS.
  - Nút `+ Thêm Mới Học Sinh` mở Form nhập hồ sơ học sinh.
  - Bảng danh sách hiển thị: Mã HS, Họ tên, Khối, Các lớp đang học, Trạng thái (`Đang học`, `Chưa có lớp`, `Đã tốt nghiệp`), Nút `Xem Trang Chi Tiết`.
- **Trang Chi Tiết Học Sinh Full-Page**:
  - Profile Card: Họ tên học sinh, Mã HS, SĐT, Khối, Ghi chú + Nút `Sửa Thông Tin Cá Nhân`.
  - **Tab 1: Lớp Đã Ghi Danh**: Bảng danh sách các lớp học sinh đăng ký (Tên lớp, Học phí/đợt, Ngày đăng ký, Trạng thái ghi danh).
  - **Tab 2: Lịch Sử Biên Lai Thu Tiền**: Bảng liệt kê toàn bộ biên lai đã thu:
    - Mã Biên Lai, Ngày & Giờ lập chính xác (`HH:mm:ss DD/MM/YYYY`), Loại thu (`In máy` / `Nhập tay`), **Chi Tiết Mục Đóng** (hiển thị rõ: *Tên Lớp - Tên Môn - Đợt học: Số tiền từng đợt*), Tổng tiền thu, Mã biên lai tay (nếu có).

### 4.4. Module 3: Quản Lý Lớp Học (Classes Management)
- **Trang Danh Sách Lớp Học**:
  - Tìm kiếm theo Tên lớp, Giáo viên.
  - Bộ lọc Phân theo Năm học.
  - Nút `+ Tạo Lớp Học Mới`: Nhập tên lớp, khối, môn, niên khóa, giáo viên, học phí đợt. Hệ thống **tự động khởi tạo 12 Đợt học**.
  - Bảng danh sách: Tên lớp, Môn & Khối, Năm học, Giáo viên phụ trách, Học phí gốc (.000 VNĐ), Trạng thái (`Đang Mở` / `Đã Khóa`), Nút `Xem Chi Tiết Lớp`.
- **Trang Chi Tiết Lớp Học Full-Page**:
  - Card thông tin tổng quan lớp + Nút `Chỉnh Sửa Thông Tin Lớp`.
  - **Tab 1: Quản Lý 12 Đợt Học**: Bảng hiển thị 12 đợt (Số đợt, Tên đợt, Học phí đợt (.000 VNĐ), Trạng thái đợt `ĐANG HỌC` / `UPCOMING` / `COMPLETED`, Giáo viên đợt, Nút `Sửa Đợt` để đổi tên, giáo viên & học phí đợt).
  - **Tab 2: Danh Sách Học Sinh Trong Lớp**: Sĩ số học sinh, Bảng danh sách học sinh ghi danh & trạng thái đóng phí đợt hiện tại.

### 4.5. Module 4: Quản Lý Giáo Viên (Teachers Management)
- **Trang Danh Sách Giáo Viên**:
  - Ô tìm kiếm theo Tên GV, SĐT, Môn phụ trách.
  - Nút `+ Thêm Mới Giáo Viên`: Mở Form nhập tên, SĐT (tùy chọn), Môn chuyên môn (Dropdown chọn từ danh mục chuẩn).
  - Bảng danh sách: Mã GV, Họ tên, SĐT (hiển thị *"Chưa có SĐT"* nếu trống), Email, Môn chuyên môn, Số lớp phụ trách, Nút `Xem Trang Chi Tiết & Payroll`.
- **Trang Chi Tiết Giáo Viên Full-Page**:
  - Card thông tin giáo viên: Họ tên, Mã GV, SĐT, Email, Môn chuyên môn.
  - **Tab 1: Lớp Đang & Đã Phụ Trách**: Danh sách toàn bộ các lớp & đợt phân công dạy.
  - **Tab 2: Báo Cáo Thù Lao & Doanh Thu Đợt (Payroll)**: Bảng tổng hợp doanh thu thực thu theo từng đợt học giáo viên trực tiếp phụ trách.

### 4.6. Module 5: POS Thu Tiền Học Phí & Tra Cứu Nợ Phí (POS Payments & Debt Report)
- **Khung 1: Tìm Kiếm & Chọn Học Sinh**:
  - Ô tìm kiếm tự động gợi ý theo Tên / SĐT / Mã HS.
  - **Banner Cảnh báo Học sinh mới**: Hiển thị khi đóng phí lần đầu cho lớp để kiểm tra giảm giá/trừ tiền học giữa chừng.
- **Khung 2: Danh Sách 12 Đợt Học Phân Theo Lớp**:
  - Gom nhóm danh sách đợt học theo từng lớp học sinh đang học.
  - Màu sắc nhận diện đợt: 🟢 *Đã đóng*, 🟡 *Đợt hiện tại*, 🔵 *Sắp tới*, 🔴 *Nợ quá hạn*.
  - Ô nhập học phí tùy chỉnh (.000 VNĐ) cho từng đợt chọn.
- **Khung 3: Lập Biên Lai & In Phiếu Thu**:
  - Phân loại `In Máy` hoặc `Nhập Tay`.
  - Tự động tính tổng tiền.
  - Nút `Xác Nhận Thu Tiền & In Phiếu Thu`: Lưu CSDL và mở Popup in biên lai chuẩn cho phụ huynh.
- **Tab 2 POS: Tra Cứu Báo Cáo Nợ Phí (Debt Report)**:
  - Chọn [Lớp học] + [Đợt học] để tra cứu danh sách học sinh *Đã đóng đủ*, *Đóng thiếu*, *Chưa đóng*.

### 4.7. Bảng Tổng Hop Các Popup / Modal Trong Hệ Thống

| STT | Tên Popup / Modal | Mã HTML ID | Chức Năng Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| 1 | Form Học Sinh | `modal-student-form` | Thêm mới hoặc cập nhật hồ sơ cá nhân học sinh |
| 2 | Form Lớp Học | `modal-class-form` | Tạo lớp mới theo niên khóa & tự động sinh 12 Đợt học |
| 3 | Form Giáo Viên | `modal-teacher-form` | Thêm mới / sửa thông tin giáo viên (SĐT tùy chọn, môn chọn Dropdown) |
| 4 | Sửa Đợt Học | `modal-batch-form` | Đổi tên đợt, giáo viên đợt & điều chỉnh học phí đợt |
| 5 | In Biên Lai POS | `modal-receipt-print` | Hiển thị phiếu thu mẫu chuẩn in máy cho phụ huynh |
