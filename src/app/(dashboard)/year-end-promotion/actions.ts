"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/rbac";
import { BATCHES_PER_CLASS } from "@/lib/constants";

// Year-End Promotion (Lên Lớp / Kết Chuyển Niên Khóa) — edumanager-ops §2.
// Admin-only, runs once per academic year transition. See
// .claude/skills/edumanager-ops/SKILL.md §2 for the 3 required steps.
//
// Business decisions confirmed with the user (2026-09-22), since
// requirements.md doesn't spell these out:
// - Khối 12 classes are NOT cloned into a "khối 13" — they're archived in
//   place (renamed with a "K{yy}{yy}" cohort code, status -> CLOSED),
//   staying in the source academic year as a historical record.
// - Grade bump applies to every non-graduated student (STUDYING *and*
//   NO_CLASS), not just students currently enrolled somewhere.
// - New classes keep the old class's fee and primary teacher as-is (no
//   reset to Subject.defaultFeePerBatch, no clearing teacher).
// - Guarded against double-running via AcademicYear.promotedAt (set once
//   this source year has been promoted from).
// - UI must show a preview (counts) before the admin confirms.

function computeTargetYearLabel(sourceLabel: string): string {
  const [startStr, endStr] = sourceLabel.split("-");
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);
  return `${start + 1}-${end + 1}`;
}

function shiftDateOneYear(date: Date): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

// "Toán 12A" of niên khóa "2025-2026" -> "Toán 12K2526A" (cohort code
// inserted right after the grade digits; any section letter/suffix that
// followed the grade stays attached after the code).
function graduatedClassName(name: string, grade: number, yearLabel: string): string {
  const [startStr, endStr] = yearLabel.split("-");
  const cohortCode = `K${startStr.slice(-2)}${endStr.slice(-2)}`;
  const gradeStr = String(grade);
  const idx = name.indexOf(gradeStr);
  if (idx === -1) return `${name} ${cohortCode}`;
  return name.slice(0, idx) + gradeStr + cohortCode + name.slice(idx + gradeStr.length);
}

// "Toán 6A" (grade 6) -> "Toán 7A".
function promotedClassName(name: string, oldGrade: number): string {
  const oldStr = String(oldGrade);
  const newStr = String(oldGrade + 1);
  const idx = name.indexOf(oldStr);
  if (idx === -1) return name;
  return name.slice(0, idx) + newStr + name.slice(idx + oldStr.length);
}

export async function getPromotionPreview() {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const sourceYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!sourceYear) {
    return { sourceYear: null } as const;
  }

  const [studentsToPromote, studentsGraduating, classesToClone, classesGraduating, activeEnrollments] =
    await Promise.all([
      prisma.student.count({ where: { status: { in: ["STUDYING", "NO_CLASS"] }, grade: { lt: 12 } } }),
      prisma.student.count({ where: { status: { in: ["STUDYING", "NO_CLASS"] }, grade: 12 } }),
      prisma.class.count({ where: { academicYearId: sourceYear.id, grade: { lt: 12 } } }),
      prisma.class.count({ where: { academicYearId: sourceYear.id, grade: { gte: 12 } } }),
      prisma.enrollment.count({
        where: { endBatchNumber: null, class: { academicYearId: sourceYear.id } },
      }),
    ]);

  return {
    sourceYear: { id: sourceYear.id, label: sourceYear.label },
    targetLabel: computeTargetYearLabel(sourceYear.label),
    alreadyPromoted: sourceYear.promotedAt !== null,
    promotedAt: sourceYear.promotedAt,
    studentsToPromote,
    studentsGraduating,
    classesToClone,
    classesGraduating,
    activeEnrollments,
  } as const;
}

export async function runYearEndPromotion() {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser.role);

  const sourceYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!sourceYear) throw new Error("Chưa có năm học đang hoạt động.");
  if (sourceYear.promotedAt) {
    throw new Error(
      `Niên khóa ${sourceYear.label} đã được kết chuyển vào ${sourceYear.promotedAt.toLocaleString("vi-VN")} — không thể chạy lại.`,
    );
  }

  const targetLabel = computeTargetYearLabel(sourceYear.label);

  const result = await prisma.$transaction(
    async (tx) => {
      // Re-check inside the transaction — closes the race if two admins
      // click at once.
      const freshSource = await tx.academicYear.findUniqueOrThrow({ where: { id: sourceYear.id } });
      if (freshSource.promotedAt) {
        throw new Error(`Niên khóa ${sourceYear.label} đã được kết chuyển rồi.`);
      }

      let targetYear = await tx.academicYear.findUnique({ where: { label: targetLabel } });
      if (!targetYear) {
        targetYear = await tx.academicYear.create({
          data: {
            label: targetLabel,
            startDate: shiftDateOneYear(sourceYear.startDate),
            endDate: shiftDateOneYear(sourceYear.endDate),
            isActive: false,
          },
        });
      }

      const sourceClasses = await tx.class.findMany({ where: { academicYearId: sourceYear.id } });
      const sourceClassIds = sourceClasses.map((c) => c.id);

      const sourceBatch12s = await tx.batch.findMany({
        where: { classId: { in: sourceClassIds }, batchNumber: BATCHES_PER_CLASS },
        select: { id: true, classId: true },
      });
      const oldBatch12ByClassId = new Map(sourceBatch12s.map((b) => [b.classId, b.id]));

      // --- 1. Classes: clone (grade < 12) or archive in place (grade >= 12) ---
      const classIdMap = new Map<string, string>(); // old classId -> new classId
      const newClassBatch1 = new Map<string, string>(); // new classId -> its Batch 1 id
      const classCreateData: {
        id: string;
        name: string;
        grade: number;
        subjectId: string;
        academicYearId: string;
        primaryTeacherId: string;
        feePerBatch: number;
        promotedFromId: string;
      }[] = [];
      const batchCreateData: {
        id: string;
        classId: string;
        batchNumber: number;
        name: string;
        feePerBatch: number;
        teacherId: string;
        status: "ONGOING" | "UPCOMING";
      }[] = [];

      for (const oldClass of sourceClasses) {
        if (oldClass.grade >= 12) {
          await tx.class.update({
            where: { id: oldClass.id },
            data: {
              name: graduatedClassName(oldClass.name, oldClass.grade, sourceYear.label),
              status: "CLOSED",
            },
          });
          continue;
        }

        const newClassId = randomUUID();
        classIdMap.set(oldClass.id, newClassId);
        classCreateData.push({
          id: newClassId,
          name: promotedClassName(oldClass.name, oldClass.grade),
          grade: oldClass.grade + 1,
          subjectId: oldClass.subjectId,
          academicYearId: targetYear.id,
          primaryTeacherId: oldClass.primaryTeacherId,
          feePerBatch: oldClass.feePerBatch,
          promotedFromId: oldClass.id,
        });

        for (let n = 1; n <= BATCHES_PER_CLASS; n++) {
          const batchId = randomUUID();
          if (n === 1) newClassBatch1.set(newClassId, batchId);
          batchCreateData.push({
            id: batchId,
            classId: newClassId,
            batchNumber: n,
            name: `Đợt ${n}`,
            feePerBatch: oldClass.feePerBatch,
            teacherId: oldClass.primaryTeacherId,
            status: n === 1 ? "ONGOING" : "UPCOMING",
          });
        }
      }

      if (classCreateData.length > 0) {
        await tx.class.createMany({ data: classCreateData.map((c) => ({ ...c, status: "OPEN" as const })) });
        await tx.batch.createMany({ data: batchCreateData });
      }

      // --- 2. Enrollments: close every active one at batch 12 of its old
      // class; open a fresh one (batch 1) on the new class if it was cloned.
      const activeEnrollments = await tx.enrollment.findMany({
        where: { endBatchNumber: null, class: { academicYearId: sourceYear.id } },
        select: { id: true, studentId: true, classId: true },
      });

      const enrollmentsByClass = new Map<string, typeof activeEnrollments>();
      for (const e of activeEnrollments) {
        const list = enrollmentsByClass.get(e.classId) ?? [];
        list.push(e);
        enrollmentsByClass.set(e.classId, list);
      }

      const newEnrollmentData: {
        id: string;
        studentId: string;
        classId: string;
        startBatchNumber: number;
        startBatchId: string;
      }[] = [];

      for (const [classId, list] of enrollmentsByClass) {
        const batch12Id = oldBatch12ByClassId.get(classId);
        if (batch12Id) {
          await tx.enrollment.updateMany({
            where: { id: { in: list.map((e) => e.id) } },
            data: { endBatchNumber: BATCHES_PER_CLASS, endBatchId: batch12Id },
          });
        }

        const newClassId = classIdMap.get(classId);
        if (newClassId) {
          const batch1Id = newClassBatch1.get(newClassId)!;
          for (const e of list) {
            newEnrollmentData.push({
              id: randomUUID(),
              studentId: e.studentId,
              classId: newClassId,
              startBatchNumber: 1,
              startBatchId: batch1Id,
            });
          }
        }
      }

      if (newEnrollmentData.length > 0) {
        await tx.enrollment.createMany({ data: newEnrollmentData });
      }

      // --- 3. Students: grade+1, or graduate if already at khối 12 ---
      const promotedStudents = await tx.student.updateMany({
        where: { status: { in: ["STUDYING", "NO_CLASS"] }, grade: { lt: 12 } },
        data: { grade: { increment: 1 } },
      });
      const graduatedStudents = await tx.student.updateMany({
        where: { status: { in: ["STUDYING", "NO_CLASS"] }, grade: 12 },
        data: { status: "GRADUATED" },
      });

      // --- 4. Mark done, switch the active year forward ---
      await tx.academicYear.update({
        where: { id: sourceYear.id },
        data: { promotedAt: new Date(), isActive: false },
      });
      await tx.academicYear.update({ where: { id: targetYear.id }, data: { isActive: true } });

      return {
        targetLabel: targetYear.label,
        classesCloned: classCreateData.length,
        studentsPromoted: promotedStudents.count,
        studentsGraduated: graduatedStudents.count,
        enrollmentsCarriedOver: newEnrollmentData.length,
      };
    },
    { timeout: 120_000 },
  );

  revalidatePath("/", "layout");
  return result;
}
