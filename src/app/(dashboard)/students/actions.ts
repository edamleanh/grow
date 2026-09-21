"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { studentSchema, type StudentInput } from "@/components/students/student-schema";

// Student management is Admin-only (requirements.md §1.3/§4.3). Server-side
// enforcement here — never trust the UI hiding alone (edumanager-ops §8).

async function nextStudentCode(): Promise<string> {
  const last = await prisma.student.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const lastNumber = last ? parseInt(last.code.replace(/\D/g, ""), 10) : 0;
  const nextNumber = (Number.isNaN(lastNumber) ? 0 : lastNumber) + 1;
  return `HS${String(nextNumber).padStart(4, "0")}`;
}

export async function createStudent(input: StudentInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = studentSchema.parse(input);
  const code = await nextStudentCode();

  await prisma.student.create({
    data: {
      code,
      fullName: data.fullName,
      phone: data.phone,
      grade: data.grade,
      note: data.note,
      status: "NO_CLASS",
    },
  });

  revalidatePath("/students");
}

export async function updateStudent(studentId: string, input: StudentInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = studentSchema.parse(input);

  await prisma.student.update({
    where: { id: studentId },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      grade: data.grade,
      note: data.note,
    },
  });

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
}

export async function deleteStudent(studentId: string) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const enrollmentCount = await prisma.enrollment.count({ where: { studentId } });
  if (enrollmentCount > 0) {
    throw new Error("Không thể xoá học sinh đã có lịch sử ghi danh lớp học.");
  }

  await prisma.student.delete({ where: { id: studentId } });
  revalidatePath("/students");
}
