import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { searchStudentIds } from "@/lib/search";
import { StudentsView } from "@/components/students/StudentsView";

// Module 2: Danh sách Học Sinh (requirements.md §4.3) — Admin-only.

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    redirect("/pos");
  }

  const { q } = await searchParams;
  const matchingIds = q ? await searchStudentIds(q) : undefined;

  const students = await prisma.student.findMany({
    where: matchingIds ? { id: { in: matchingIds } } : undefined,
    include: {
      // "Các lớp đang học" = ghi danh chưa kết thúc (endBatchNumber null).
      enrollments: {
        where: { endBatchNumber: null },
        include: { class: { select: { name: true } } },
      },
    },
    orderBy: { code: "asc" },
  });

  const rows = students.map((student) => ({
    id: student.id,
    code: student.code,
    fullName: student.fullName,
    phone: student.phone,
    grade: student.grade,
    note: student.note,
    status: student.status,
    activeClassNames: [...new Set(student.enrollments.map((e) => e.class.name))],
  }));

  return <StudentsView students={rows} />;
}
