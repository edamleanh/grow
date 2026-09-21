import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveAcademicYearId } from "@/lib/academic-year";
import { searchClassIds } from "@/lib/search";
import { ClassesView } from "@/components/classes/ClassesView";

// Module 3: Danh sách Lớp Học (requirements.md §4.4) — Admin + Teacher
// (Cashier không quản lý danh mục lớp học, chỉ dùng POS).
export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subjectId?: string; grade?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser.role === "CASHIER") {
    redirect("/pos");
  }

  const { q, subjectId, grade } = await searchParams;
  const activeAcademicYearId = await getActiveAcademicYearId();
  const matchingIds = q ? await searchClassIds(q) : undefined;
  const gradeNumber = grade ? parseInt(grade, 10) : undefined;

  const [classes, subjects, academicYears, teachers] = await Promise.all([
    prisma.class.findMany({
      where: {
        academicYearId: activeAcademicYearId ?? undefined,
        ...(currentUser.role === "TEACHER" && currentUser.teacherId
          ? { primaryTeacherId: currentUser.teacherId }
          : {}),
        ...(matchingIds ? { id: { in: matchingIds } } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(gradeNumber ? { grade: gradeNumber } : {}),
      },
      include: {
        subject: { select: { name: true } },
        academicYear: { select: { label: true } },
        primaryTeacher: { select: { fullName: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ orderBy: { label: "desc" } }),
    prisma.teacher.findMany({ orderBy: { fullName: "asc" } }),
  ]);

  const rows = classes.map((klass) => ({
    id: klass.id,
    name: klass.name,
    grade: klass.grade,
    subjectName: klass.subject.name,
    academicYearLabel: klass.academicYear.label,
    teacherName: klass.primaryTeacher.fullName,
    feePerBatch: klass.feePerBatch,
    status: klass.status,
  }));

  return (
    <ClassesView
      classes={rows}
      subjects={subjects}
      academicYears={academicYears.map((y) => ({ id: y.id, name: y.label }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.fullName }))}
      activeAcademicYearId={activeAcademicYearId}
      canCreate={currentUser.role === "ADMIN"}
    />
  );
}
