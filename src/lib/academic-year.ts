"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// The active Academic Year selected in the header selector (requirements.md
// §4.1) is stored in a cookie and drives every list/report query. See
// .claude/skills/database-design/SKILL.md — every Class/Enrollment/Receipt
// query must be scoped by academicYearId.

const COOKIE_NAME = "edumanager_academic_year";

export async function getActiveAcademicYearId(): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get(COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;

  const active = await prisma.academicYear.findFirst({ where: { isActive: true } });
  return active?.id ?? null;
}

export async function setActiveAcademicYearId(academicYearId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, academicYearId, { path: "/" });
  revalidatePath("/", "layout");
}

export async function listAcademicYears() {
  return prisma.academicYear.findMany({ orderBy: { label: "desc" } });
}
