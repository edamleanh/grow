"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { studentSchema, createStudentSchema, type StudentInput, type CreateStudentInput } from "@/components/students/student-schema";

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

export async function createStudent(input: CreateStudentInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = createStudentSchema.parse(input);
  const code = await nextStudentCode();

  // Resolve each selected (classId, startBatchNumber) to its Batch row up
  // front, outside the transaction, so a bad selection fails fast with a
  // clear error instead of aborting mid-transaction.
  const startBatches = await Promise.all(
    data.enrollments.map((e) =>
      prisma.batch.findUniqueOrThrow({
        where: { classId_batchNumber: { classId: e.classId, batchNumber: e.startBatchNumber } },
      }),
    ),
  );

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.create({
      data: {
        code,
        fullName: data.fullName,
        phone: data.phone,
        grade: data.grade,
        note: data.note,
        // Ghi danh ngay từ khi tạo (nếu có chọn lớp) → "Đang học" luôn,
        // khớp requirements.md §2.3, thay vì phải NO_CLASS rồi enroll sau.
        status: data.enrollments.length > 0 ? "STUDYING" : "NO_CLASS",
      },
    });

    if (data.enrollments.length > 0) {
      await tx.enrollment.createMany({
        data: data.enrollments.map((e, i) => ({
          studentId: student.id,
          classId: e.classId,
          startBatchNumber: e.startBatchNumber,
          startBatchId: startBatches[i].id,
        })),
      });
    }
  });

  revalidatePath("/students");
  data.enrollments.forEach((e) => revalidatePath(`/classes/${e.classId}`));
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
