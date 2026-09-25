import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveAcademicYearId } from "@/lib/academic-year";
import { sortClassesBySection } from "@/lib/class-order";
import { PrintRosterView } from "@/components/print-roster/PrintRosterView";

// Module "In Danh Sách": chọn 1 hay nhiều lớp rồi xuất file Excel (danh
// sách học sinh theo lớp) — Admin thấy mọi lớp, Teacher chỉ thấy lớp mình
// phụ trách (cùng scoping như trang Quản Lý Lớp Học).
export default async function PrintRosterPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; grade?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const { subjectId, grade } = await searchParams;
  const activeAcademicYearId = await getActiveAcademicYearId();
  const gradeNumber = grade ? parseInt(grade, 10) : undefined;

  const [classes, subjects] = await Promise.all([
    prisma.class.findMany({
      where: {
        academicYearId: activeAcademicYearId ?? undefined,
        ...(currentUser.role === "TEACHER" && currentUser.teacherId
          ? { primaryTeacherId: currentUser.teacherId }
          : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(gradeNumber ? { grade: gradeNumber } : {}),
      },
      include: {
        subject: { select: { name: true } },
        primaryTeacher: { select: { fullName: true } },
        _count: { select: { enrollments: { where: { endBatchNumber: null } } } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Sort theo môn, rồi khối (số), rồi "O" đứng đầu trước A, B, C, D... —
  // không sort được bằng `orderBy` của Prisma (chỉ so sánh chuỗi thường,
  // "10" < "2"), nên sort lại ở JS sau khi lấy dữ liệu.
  const rows = sortClassesBySection(classes).map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    subjectName: c.subject.name,
    teacherName: c.primaryTeacher.fullName,
    studentCount: c._count.enrollments,
  }));

  return (
    <PrintRosterView
      classes={rows}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
