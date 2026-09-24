import path from "path";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sortByVietnameseGivenName, givenName } from "@/lib/vietnamese-name";
import { sortClassesBySection } from "@/lib/class-order";

// Module "In Danh Sách": pick one or more classes and download an .xlsx
// roster. This loads the center's actual paper-form template
// (templete-danh-sach.xlsx, copied verbatim from "templete danh sach.xlsx")
// and ONLY writes values into it — title, class label, and the STT/Họ và
// tên/Tên/Số ĐT columns. Every font, color, border, column width, merge,
// and formula (the header's "=$R$1" reference and each block's own
// SUBTOTAL range) is whatever the template file already has; nothing here
// restyles or recomputes them. The template has 135 pre-built 30-row
// blocks; each selected class consumes one block per 25 students (see
// edumanager-ops-style "chunk" below for overflow), in file order.
//
// Plain <form method="post"> submits here so the browser's native file
// download handles the response — no client JS blob/fetch needed.

const TEMPLATE_PATH = path.join(process.cwd(), "src/app/api/print-roster/templete-danh-sach.xlsx");
const TEMPLATE_SHEET_NAME = "HOÁ";

const BLOCK_ROWS = 30;
const DATA_FIRST_ROW = 5;
const MAX_STUDENTS_PER_BLOCK = 25; // rows 5-29
const TOTAL_BLOCKS_IN_TEMPLATE = 135;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks.length > 0 ? chunks : [[]];
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  const formData = await request.formData();
  const classIds = formData.getAll("classIds").map(String).filter(Boolean);
  if (classIds.length === 0) {
    return new Response("Chưa chọn lớp nào.", { status: 400 });
  }

  const unorderedClasses = await prisma.class.findMany({
    where: {
      id: { in: classIds },
      // Teacher can only export rosters for classes they teach — same
      // scoping as the Classes list page (edumanager-ops §8).
      ...(currentUser.role === "TEACHER" && currentUser.teacherId
        ? { primaryTeacherId: currentUser.teacherId }
        : {}),
    },
    include: {
      subject: { select: { name: true } },
      enrollments: {
        where: { endBatchNumber: null },
        include: { student: { select: { code: true, fullName: true, phone: true } } },
      },
    },
  });

  if (unorderedClasses.length === 0) {
    return new Response("Không có lớp hợp lệ để xuất.", { status: 400 });
  }

  // Ưu tiên lớp "O" đứng đầu, rồi mới tới A, B, C, D... trong thứ tự block
  // của file Excel — giống trang chọn lớp.
  const classes = sortClassesBySection(unorderedClasses);

  type EnrollmentRow = (typeof classes)[number]["enrollments"][number];
  const pagesToFill: { title: string; label: string; students: EnrollmentRow[] }[] = [];
  for (const klass of classes) {
    const baseLabel = klass.name.startsWith(klass.subject.name)
      ? klass.name.slice(klass.subject.name.length).trim() || klass.name
      : klass.name;
    const title = `DANH SÁCH ${klass.subject.name.toUpperCase()}`;
    const sorted = sortByVietnameseGivenName(klass.enrollments, (e) => e.student.fullName);
    chunk(sorted, MAX_STUDENTS_PER_BLOCK).forEach((pageStudents, pageIndex) => {
      pagesToFill.push({
        title,
        label: pageIndex === 0 ? baseLabel : `${baseLabel} (tiếp theo)`,
        students: pageStudents,
      });
    });
  }

  if (pagesToFill.length > TOTAL_BLOCKS_IN_TEMPLATE) {
    return new Response(
      `Đã chọn quá nhiều học sinh/lớp (${pagesToFill.length} trang), vượt quá số trang có sẵn trong mẫu (${TOTAL_BLOCKS_IN_TEMPLATE}).`,
      { status: 400 },
    );
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const sheet = workbook.getWorksheet(TEMPLATE_SHEET_NAME);
  if (!sheet) {
    return new Response("Không đọc được sheet mẫu.", { status: 500 });
  }

  pagesToFill.forEach((page, blockIndex) => {
    const base = blockIndex * BLOCK_ROWS; // 0 for block 1, 30 for block 2, ...

    sheet.getCell(base + 1, 1).value = page.title;
    sheet.getCell(base + 1, 9).value = page.label;

    page.students.forEach((enrollment, i) => {
      const row = base + DATA_FIRST_ROW + i;
      const ten = givenName(enrollment.student.fullName);
      const parts = enrollment.student.fullName.trim().split(/\s+/);
      const ho = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";

      sheet.getCell(row, 1).value = i + 1;
      sheet.getCell(row, 2).value = ho;
      sheet.getCell(row, 3).value = ten;
      sheet.getCell(row, 4).value = enrollment.student.phone ?? "";
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `danh-sach-lop-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
