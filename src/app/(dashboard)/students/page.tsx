import { redirect } from "next/navigation";
import { Prisma, type StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sortByVietnameseGivenName } from "@/lib/vietnamese-name";
import { StudentsView } from "@/components/students/StudentsView";

// Module 2: Danh sách Học Sinh (requirements.md §4.3) — Admin-only.

type StudentRow = {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
  grade: number;
  note: string | null;
  status: StudentStatus;
  activeClassNames: string[];
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grade?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    redirect("/pos");
  }

  const { q, grade } = await searchParams;
  const gradeNumber = grade ? parseInt(grade, 10) : undefined;

  // Single round-trip: search + grade filter + "các lớp đang học" (ghi danh
  // chưa kết thúc) đều gộp trong 1 query thay vì 3 query riêng (mỗi round-trip
  // tới Supabase Singapore tốn ~60-200ms, gộp lại vì `include` lồng nhau của
  // Prisma sinh ra nhiều round-trip riêng khi dùng driver adapter).
  const term = q ? `%${q}%` : null;
  const rows = await prisma.$queryRaw<StudentRow[]>`
    SELECT
      s.id, s.code, s."fullName", s.phone, s.grade, s.note, s.status,
      COALESCE(
        (
          SELECT json_agg(DISTINCT c.name)
          FROM "Enrollment" e
          JOIN "Class" c ON c.id = e."classId"
          WHERE e."studentId" = s.id AND e."endBatchNumber" IS NULL
        ),
        '[]'
      ) AS "activeClassNames"
    FROM "Student" s
    WHERE 1=1
      ${
        term
          ? Prisma.sql`AND (unaccent(s."fullName") ILIKE unaccent(${term}) OR s.phone ILIKE ${term} OR s.code ILIKE ${term})`
          : Prisma.empty
      }
      ${gradeNumber ? Prisma.sql`AND s.grade = ${gradeNumber}` : Prisma.empty}
  `;

  const sortedRows = sortByVietnameseGivenName(rows, (s) => s.fullName);

  return <StudentsView students={sortedRows} />;
}
