"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBatchPaymentTone } from "@/lib/payment-status";
import { searchStudentIds } from "@/lib/search";
import { createReceiptSchema, type CreateReceiptInput } from "@/components/pos/pos-schema";

// POS is available to Admin/Cashier/Teacher (requirements.md §1.3), but a
// Teacher may only collect fees for batches they are the assigned teacher
// of (edumanager-ops §8) — enforced server-side in createReceipt below.

export async function searchStudents(query: string) {
  const currentUser = await getCurrentUser();
  const matchingIds = await searchStudentIds(query);

  if (currentUser.role === "TEACHER" && currentUser.teacherId) {
    // A teacher only searches within students enrolled in their own classes.
    return prisma.student.findMany({
      where: {
        id: { in: matchingIds },
        enrollments: { some: { class: { primaryTeacherId: currentUser.teacherId } } },
      },
      select: { id: true, code: true, fullName: true, phone: true },
      take: 10,
      orderBy: { code: "asc" },
    });
  }

  return prisma.student.findMany({
    where: { id: { in: matchingIds } },
    select: { id: true, code: true, fullName: true, phone: true },
    take: 10,
    orderBy: { code: "asc" },
  });
}

export async function getStudentPaymentOverview(studentId: string) {
  const currentUser = await getCurrentUser();

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      ...(currentUser.role === "TEACHER" && currentUser.teacherId
        ? { class: { primaryTeacherId: currentUser.teacherId } }
        : {}),
    },
    include: {
      class: {
        include: {
          subject: { select: { name: true } },
          batches: { orderBy: { batchNumber: "asc" }, include: { teacher: { select: { fullName: true } } } },
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  });

  const lineItems = await prisma.receiptLineItem.findMany({
    where: { receipt: { studentId } },
    select: { classId: true, batchId: true, amount: true },
  });
  const paidByBatch = new Map<string, number>();
  const classesWithPriorPayment = new Set<string>();
  for (const li of lineItems) {
    paidByBatch.set(li.batchId, (paidByBatch.get(li.batchId) ?? 0) + li.amount);
    classesWithPriorPayment.add(li.classId);
  }

  return enrollments.map((e) => {
    const lastBatchNumber = e.endBatchNumber ?? 12;
    const batchesInRange = e.class.batches.filter(
      (b) => b.batchNumber >= e.startBatchNumber && b.batchNumber <= lastBatchNumber,
    );
    return {
      enrollmentId: e.id,
      classId: e.classId,
      className: e.class.name,
      subjectName: e.class.subject.name,
      isActive: e.endBatchNumber === null,
      isFirstPayment: !classesWithPriorPayment.has(e.classId),
      batches: batchesInRange.map((b) => {
        const paid = paidByBatch.get(b.id) ?? 0;
        return {
          batchId: b.id,
          batchNumber: b.batchNumber,
          batchName: b.name,
          fee: b.feePerBatch,
          paid,
          outstanding: Math.max(b.feePerBatch - paid, 0),
          tone: getBatchPaymentTone(b.status, b.feePerBatch, paid),
          teacherId: b.teacherId,
        };
      }),
    };
  });
}

async function nextReceiptCode(): Promise<string> {
  const count = await prisma.receipt.count({ where: { receiptType: "PRINTED" } });
  return `BL${String(count + 1).padStart(6, "0")}`;
}

export async function createReceipt(input: CreateReceiptInput) {
  const currentUser = await getCurrentUser();
  const data = createReceiptSchema.parse(input);

  if (currentUser.role === "TEACHER") {
    if (!currentUser.teacherId) throw new Error("Tài khoản giáo viên chưa gắn hồ sơ giáo viên.");
    const batches = await prisma.batch.findMany({
      where: { id: { in: data.items.map((i) => i.batchId) } },
      select: { id: true, teacherId: true },
    });
    const notOwned = batches.some((b) => b.teacherId !== currentUser.teacherId);
    if (notOwned) {
      throw new Error("Bạn chỉ được thu học phí cho các lớp/đợt do chính mình phụ trách.");
    }
  }

  const totalAmount = data.items.reduce((sum, i) => sum + i.amount, 0);
  const receiptCode = data.receiptType === "PRINTED" ? await nextReceiptCode() : null;

  const receipt = await prisma.receipt.create({
    data: {
      studentId: data.studentId,
      receiptType: data.receiptType,
      receiptCode,
      manualReceiptCode: data.receiptType === "MANUAL" ? data.manualReceiptCode : null,
      totalAmount,
      createdByUserId: currentUser.id,
      lineItems: {
        create: data.items.map((i) => ({ classId: i.classId, batchId: i.batchId, amount: i.amount })),
      },
    },
    include: {
      student: { select: { code: true, fullName: true } },
      lineItems: { include: { class: { select: { name: true } }, batch: { select: { name: true } } } },
    },
  });

  revalidatePath("/pos");
  revalidatePath(`/students/${data.studentId}`);

  return {
    studentName: receipt.student.fullName,
    studentCode: receipt.student.code,
    receiptCode: receipt.receiptCode ?? "",
    issuedAt: receipt.issuedAt.toISOString(),
    receiptType: receipt.receiptType,
    manualReceiptCode: receipt.manualReceiptCode ?? undefined,
    items: receipt.lineItems.map((li) => ({
      className: li.class.name,
      batchName: li.batch.name,
      amount: li.amount,
    })),
    totalAmount: receipt.totalAmount,
  };
}

export async function getDebtReport(classId: string, batchNumber: number) {
  const currentUser = await getCurrentUser();

  const klass = await prisma.class.findUniqueOrThrow({ where: { id: classId } });
  if (currentUser.role === "TEACHER" && klass.primaryTeacherId !== currentUser.teacherId) {
    throw new Error("Bạn không có quyền xem báo cáo nợ của lớp này.");
  }

  const batch = await prisma.batch.findUniqueOrThrow({
    where: { classId_batchNumber: { classId, batchNumber } },
  });
  const batchId = batch.id;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      classId,
      startBatchNumber: { lte: batch.batchNumber },
      OR: [{ endBatchNumber: null }, { endBatchNumber: { gte: batch.batchNumber } }],
    },
    include: { student: { select: { id: true, code: true, fullName: true } } },
  });

  const lineItems = await prisma.receiptLineItem.findMany({
    where: { batchId },
    include: { receipt: { select: { studentId: true } } },
  });
  const paidByStudent = new Map<string, number>();
  for (const li of lineItems) {
    paidByStudent.set(li.receipt.studentId, (paidByStudent.get(li.receipt.studentId) ?? 0) + li.amount);
  }

  return enrollments.map((e) => {
    const paid = paidByStudent.get(e.studentId) ?? 0;
    return {
      studentId: e.student.id,
      studentCode: e.student.code,
      studentName: e.student.fullName,
      paid,
      fee: batch.feePerBatch,
      tone: getBatchPaymentTone(batch.status, batch.feePerBatch, paid),
    };
  });
}
