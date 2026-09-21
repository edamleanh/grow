"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { enrollSchema, transferSchema, type EnrollInput, type TransferInput } from "@/components/classes/enrollment-schema";

// Enrollment / transfer is Admin-only (requirements.md §1.3 gives this to
// "Chủ trung tâm"; Teacher only views their class rosters). See
// .claude/skills/edumanager-ops/SKILL.md §4-§5 for the batch-tracking and
// debt-carryover rules this must not violate.

export async function enrollStudent(input: EnrollInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = enrollSchema.parse(input);

  const startBatch = await prisma.batch.findUniqueOrThrow({
    where: { classId_batchNumber: { classId: data.classId, batchNumber: data.startBatchNumber } },
  });

  await prisma.$transaction([
    prisma.enrollment.create({
      data: {
        studentId: data.studentId,
        classId: data.classId,
        startBatchNumber: data.startBatchNumber,
        startBatchId: startBatch.id,
      },
    }),
    // A student with no other active enrollment moves from "Chưa có lớp" to
    // "Đang học" (requirements.md §2.3). GRADUATED students are never
    // re-enrolled through this action.
    prisma.student.updateMany({
      where: { id: data.studentId, status: "NO_CLASS" },
      data: { status: "STUDYING" },
    }),
  ]);

  revalidatePath(`/classes/${data.classId}`);
  revalidatePath(`/students/${data.studentId}`);
}

export async function transferStudent(input: TransferInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = transferSchema.parse(input);

  const oldEnrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: data.enrollmentId },
  });

  const [endBatch, startBatch] = await Promise.all([
    prisma.batch.findUniqueOrThrow({
      where: { classId_batchNumber: { classId: oldEnrollment.classId, batchNumber: data.endBatchNumber } },
    }),
    prisma.batch.findUniqueOrThrow({
      where: { classId_batchNumber: { classId: data.targetClassId, batchNumber: data.startBatchNumber } },
    }),
  ]);

  // Debt on the old class's batches up to endBatchNumber is intentionally
  // left untouched here (edumanager-ops §5 — bảo lưu công nợ). Only the
  // enrollment window is closed; no receipt/payment rows are touched.
  await prisma.$transaction([
    prisma.enrollment.update({
      where: { id: oldEnrollment.id },
      data: { endBatchNumber: data.endBatchNumber, endBatchId: endBatch.id },
    }),
    prisma.enrollment.create({
      data: {
        studentId: oldEnrollment.studentId,
        classId: data.targetClassId,
        startBatchNumber: data.startBatchNumber,
        startBatchId: startBatch.id,
      },
    }),
  ]);

  revalidatePath(`/classes/${oldEnrollment.classId}`);
  revalidatePath(`/classes/${data.targetClassId}`);
  revalidatePath(`/students/${oldEnrollment.studentId}`);
}
