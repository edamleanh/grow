import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { searchTeacherIds } from "@/lib/search";
import { TeachersView } from "@/components/teachers/TeachersView";

// Module 4: Danh sách Giáo Viên (requirements.md §4.5) — Admin-only.

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    redirect("/pos");
  }

  const { q } = await searchParams;
  const matchingIds = q ? await searchTeacherIds(q) : undefined;

  const [teachers, subjects] = await Promise.all([
    prisma.teacher.findMany({
      where: matchingIds ? { id: { in: matchingIds } } : undefined,
      include: {
        subject: { select: { name: true } },
        _count: { select: { classesAsPrimary: true } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <TeachersView teachers={teachers} subjects={subjects} />;
}
