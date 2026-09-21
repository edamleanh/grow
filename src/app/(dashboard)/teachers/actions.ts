"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { teacherSchema, type TeacherInput } from "@/components/teachers/teacher-schema";

// Teacher management is Admin-only (requirements.md §1.3/§4.5). Server-side
// enforcement here — never trust the UI hiding alone (edumanager-ops §8).

async function nextTeacherCode(): Promise<string> {
  const last = await prisma.teacher.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastNumber = last ? parseInt(last.code.replace(/\D/g, ""), 10) : 0;
  const nextNumber = (Number.isNaN(lastNumber) ? 0 : lastNumber) + 1;
  return `GV${String(nextNumber).padStart(3, "0")}`;
}

export async function createTeacher(input: TeacherInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = teacherSchema.parse(input);
  const code = await nextTeacherCode();

  await prisma.teacher.create({
    data: {
      code,
      fullName: data.fullName,
      phone: data.phone,
      subjectId: data.subjectId,
    },
  });

  revalidatePath("/teachers");
}

export async function updateTeacher(teacherId: string, input: TeacherInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = teacherSchema.parse(input);

  await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      subjectId: data.subjectId,
    },
  });

  revalidatePath("/teachers");
}

export async function deleteTeacher(teacherId: string) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const assignedClasses = await prisma.class.count({ where: { primaryTeacherId: teacherId } });
  if (assignedClasses > 0) {
    throw new Error("Không thể xoá giáo viên đang phụ trách lớp học. Hãy đổi giáo viên phụ trách trước.");
  }

  await prisma.teacher.delete({ where: { id: teacherId } });
  revalidatePath("/teachers");
}
