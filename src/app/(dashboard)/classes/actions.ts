"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { BATCHES_PER_CLASS } from "@/lib/constants";
import { classSchema, batchSchema, type ClassInput, type BatchInput } from "@/components/classes/class-schema";
import type { ClassStatus } from "@prisma/client";

// Class management is Admin-only (requirements.md §1.3/§4.4). Server-side
// enforcement here — never trust the UI hiding alone (edumanager-ops §8).

export async function createClass(input: ClassInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = classSchema.parse(input);

  // Creating a class must atomically create exactly BATCHES_PER_CLASS
  // batches (edumanager-ops §3) — one failure rolls back both.
  await prisma.$transaction(async (tx) => {
    const klass = await tx.class.create({
      data: {
        name: data.name,
        grade: data.grade,
        subjectId: data.subjectId,
        academicYearId: data.academicYearId,
        primaryTeacherId: data.primaryTeacherId,
        feePerBatch: data.feePerBatch,
      },
    });

    await tx.batch.createMany({
      data: Array.from({ length: BATCHES_PER_CLASS }, (_, i) => {
        const batchNumber = i + 1;
        return {
          classId: klass.id,
          batchNumber,
          name: `Đợt ${batchNumber}`,
          feePerBatch: data.feePerBatch,
          teacherId: data.primaryTeacherId,
          status: batchNumber === 1 ? "ONGOING" : "UPCOMING",
        };
      }),
    });

    return klass;
  });

  revalidatePath("/classes");
}

export async function updateClass(
  classId: string,
  input: ClassInput & { status?: ClassStatus },
) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = classSchema.parse(input);

  await prisma.class.update({
    where: { id: classId },
    data: {
      name: data.name,
      grade: data.grade,
      subjectId: data.subjectId,
      academicYearId: data.academicYearId,
      primaryTeacherId: data.primaryTeacherId,
      feePerBatch: data.feePerBatch,
      ...(input.status ? { status: input.status } : {}),
    },
  });

  revalidatePath("/classes");
  revalidatePath(`/classes/${classId}`);
}

export async function deleteClass(classId: string) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const [enrollmentCount, lineItemCount] = await Promise.all([
    prisma.enrollment.count({ where: { classId } }),
    prisma.receiptLineItem.count({ where: { classId } }),
  ]);
  if (enrollmentCount > 0 || lineItemCount > 0) {
    throw new Error("Không thể xoá lớp đã có học sinh ghi danh hoặc đã thu học phí.");
  }

  await prisma.class.delete({ where: { id: classId } });
  revalidatePath("/classes");
}

export async function updateBatch(batchId: string, input: BatchInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = batchSchema.parse(input);
  const current = await prisma.batch.findUniqueOrThrow({ where: { id: batchId } });

  // edumanager-ops §3: "chỉ 1 đợt hiện tại tại 1 thời điểm cho mỗi lớp" —
  // setting this batch to ONGOING must demote any other ONGOING batch of
  // the same class first, so the invariant never breaks.
  await prisma.$transaction(async (tx) => {
    if (data.status === "ONGOING") {
      await tx.batch.updateMany({
        where: { classId: current.classId, status: "ONGOING", id: { not: batchId } },
        data: { status: "COMPLETED" },
      });
    }
    await tx.batch.update({
      where: { id: batchId },
      data: {
        name: data.name,
        teacherId: data.teacherId,
        feePerBatch: data.feePerBatch,
        status: data.status,
      },
    });
  });

  revalidatePath(`/classes/${current.classId}`);
}
