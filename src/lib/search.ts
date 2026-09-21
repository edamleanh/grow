import { prisma } from "@/lib/prisma";

// Postgres ILIKE is case-insensitive but not accent-insensitive, so typing
// "Thuy An" (no diacritics) would miss "Thúy An" with a plain `contains`
// filter. unaccent() strips diacritics before comparing so search works
// regardless of tone marks. Requires the `unaccent` extension (see
// prisma/migrations/*_enable_unaccent). Each function returns matching ids;
// callers do a normal `where: { id: { in: ids } }` findMany afterwards so
// `include`/relations still work as usual.

export async function searchStudentIds(query: string): Promise<string[]> {
  const term = `%${query}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Student"
    WHERE unaccent("fullName") ILIKE unaccent(${term})
       OR "phone" ILIKE ${term}
       OR "code" ILIKE ${term}
  `;
  return rows.map((r) => r.id);
}

export async function searchTeacherIds(query: string): Promise<string[]> {
  const term = `%${query}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT t.id FROM "Teacher" t
    JOIN "Subject" s ON s.id = t."subjectId"
    WHERE unaccent(t."fullName") ILIKE unaccent(${term})
       OR t."phone" ILIKE ${term}
       OR unaccent(s."name") ILIKE unaccent(${term})
  `;
  return rows.map((r) => r.id);
}

export async function searchClassIds(query: string): Promise<string[]> {
  const term = `%${query}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM "Class" c
    JOIN "Teacher" t ON t.id = c."primaryTeacherId"
    WHERE unaccent(c."name") ILIKE unaccent(${term})
       OR unaccent(t."fullName") ILIKE unaccent(${term})
  `;
  return rows.map((r) => r.id);
}
