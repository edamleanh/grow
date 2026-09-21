"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { searchStudentIds } from "@/lib/search";
import { getActiveAcademicYearId } from "@/lib/academic-year";
import {
  enrollSchema,
  transferSchema,
  withdrawSchema,
  type EnrollInput,
  type TransferInput,
  type WithdrawInput,
} from "@/components/classes/enrollment-schema";

// Enrollment / transfer is Admin-only (requirements.md §1.3 gives this to
// "Chủ trung tâm"; Teacher only views their class rosters). See
// .claude/skills/edumanager-ops/SKILL.md §4-§5 for the batch-tracking and
// debt-carryover rules this must not violate.

// Backs the search box in EnrollStudentModal — searched on demand instead of
// shipping the whole non-graduated student list (hundreds of rows) down to
// the client just to support one modal. Restricted to students whose grade
// matches the class's grade — a lớp 8 class should only suggest học sinh
// khối 8, not students from other khối who happen to match the text query.
export async function searchEligibleStudents(classId: string, query: string) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  if (!query.trim()) return [];
  const [matchingIds, klass] = await Promise.all([
    searchStudentIds(query),
    prisma.class.findUniqueOrThrow({ where: { id: classId }, select: { grade: true } }),
  ]);

  return prisma.student.findMany({
    where: {
      id: { in: matchingIds },
      status: { not: "GRADUATED" },
      grade: klass.grade,
      enrollments: { none: { classId, endBatchNumber: null } },
    },
    select: { id: true, code: true, fullName: true },
    take: 10,
    orderBy: { code: "asc" },
  });
}

// A student can be in multiple classes of DIFFERENT subjects at once (e.g.
// Toán + Văn), but two active enrollments in the SAME subject is always a
// class switch, not a fresh enrollment — it must go through the same
// end-batch/start-batch bookkeeping as transferStudent (edumanager-ops §4),
// otherwise the old class's debt/roster never gets closed out. This backs
// EnrollStudentModal's check right after a student is picked.
export async function findSameSubjectActiveEnrollment(studentId: string, classId: string) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const targetClass = await prisma.class.findUniqueOrThrow({
    where: { id: classId },
    select: { subjectId: true },
  });

  const conflicting = await prisma.enrollment.findFirst({
    where: {
      studentId,
      endBatchNumber: null,
      classId: { not: classId },
      class: { subjectId: targetClass.subjectId },
    },
    include: {
      class: {
        select: {
          id: true,
          name: true,
          batches: { orderBy: { batchNumber: "asc" }, select: { batchNumber: true, name: true, status: true } },
        },
      },
    },
  });

  if (!conflicting) return null;

  const ongoing = conflicting.class.batches.find((b) => b.status === "ONGOING");

  return {
    enrollmentId: conflicting.id,
    classId: conflicting.class.id,
    className: conflicting.class.name,
    currentBatchNumber: ongoing?.batchNumber ?? conflicting.startBatchNumber,
    batches: conflicting.class.batches.map((b) => ({ batchNumber: b.batchNumber, name: b.name })),
  };
}

// Backs StudentFormModal's "Ghi danh ngay khi thêm mới" section, and
// AddClassModal's "Ghi Danh Thêm Lớp" on Student detail: open classes
// matching a grade, grouped by subject. `excludeStudentId`, when given,
// drops classes that student is already actively enrolled in — used by
// AddClassModal so the picker only shows classes actually available to add.
export async function getOpenClassesByGrade(grade: number, excludeStudentId?: string) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);
  const activeAcademicYearId = await getActiveAcademicYearId();

  const classes = await prisma.class.findMany({
    where: {
      grade,
      status: "OPEN",
      academicYearId: activeAcademicYearId ?? undefined,
      ...(excludeStudentId
        ? { enrollments: { none: { studentId: excludeStudentId, endBatchNumber: null } } }
        : {}),
    },
    include: {
      subject: { select: { name: true } },
      batches: { orderBy: { batchNumber: "asc" }, select: { batchNumber: true, name: true, status: true } },
    },
    orderBy: [{ subject: { name: "asc" } }, { name: "asc" }],
  });

  return classes.map((c) => {
    const ongoing = c.batches.find((b) => b.status === "ONGOING");
    return {
      classId: c.id,
      className: c.name,
      subjectName: c.subject.name,
      defaultBatchNumber: ongoing?.batchNumber ?? 1,
      batches: c.batches.map((b) => ({ batchNumber: b.batchNumber, name: b.name })),
    };
  });
}

// Batch display names (e.g. "Đợt 1" renamed to something else via
// modal-batch-form) for any class's 12 batches — used everywhere a "chọn
// đợt" selector needs to show the real name instead of a generic "Đợt {n}".
export async function getClassBatchNames(classId: string) {
  return prisma.batch.findMany({
    where: { classId },
    select: { batchNumber: true, name: true },
    orderBy: { batchNumber: "asc" },
  });
}

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

// "Nghỉ học" a class — closes the enrollment at endBatchNumber without
// opening a replacement anywhere (unlike transferStudent). Debt on batches
// up to and including endBatchNumber stays put (edumanager-ops §5).
export async function withdrawStudent(input: WithdrawInput) {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const data = withdrawSchema.parse(input);

  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: data.enrollmentId },
  });

  const endBatch = await prisma.batch.findUniqueOrThrow({
    where: { classId_batchNumber: { classId: enrollment.classId, batchNumber: data.endBatchNumber } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { endBatchNumber: data.endBatchNumber, endBatchId: endBatch.id },
    });

    // If this was the student's last active enrollment anywhere, they go
    // back to "Chưa có lớp" (requirements.md §2.3). GRADUATED status is
    // never overwritten here — that only changes via Year-End Promotion.
    const remainingActive = await tx.enrollment.count({
      where: { studentId: enrollment.studentId, endBatchNumber: null },
    });
    if (remainingActive === 0) {
      await tx.student.updateMany({
        where: { id: enrollment.studentId, status: "STUDYING" },
        data: { status: "NO_CLASS" },
      });
    }
  });

  revalidatePath(`/classes/${enrollment.classId}`);
  revalidatePath(`/students/${enrollment.studentId}`);
}
