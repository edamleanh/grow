import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StudentDetailView } from "@/components/students/StudentDetailView";

// Trang Chi Tiết Học Sinh Full-Page (requirements.md §4.3) — Admin-only.
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser.role !== "ADMIN") {
    redirect("/pos");
  }

  const { studentId } = await params;

  const [student, otherClasses] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            class: {
              select: {
                name: true,
                subjectId: true,
                feePerBatch: true,
                batches: { where: { status: "ONGOING" }, select: { batchNumber: true } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        },
        receipts: {
          include: {
            lineItems: {
              include: {
                class: { select: { name: true, subject: { select: { name: true } } } },
                batch: { select: { name: true } },
              },
            },
          },
          orderBy: { issuedAt: "desc" },
        },
      },
    }),
    prisma.class.findMany({
      where: { status: "OPEN" },
      select: { id: true, name: true, subjectId: true, grade: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!student) {
    notFound();
  }

  // "Chuyển sang Lớp" chỉ nên gợi ý lớp cùng khối với học sinh — chuyển
  // khác khối không phải "chuyển lớp" bình thường (đó là trường hợp đặc
  // biệt admin nên tự làm thủ công, không nên xuất hiện làm mặc định).
  const sameGradeClasses = otherClasses.filter((c) => c.grade === student.grade);

  return (
    <StudentDetailView
      student={{
        id: student.id,
        code: student.code,
        fullName: student.fullName,
        phone: student.phone,
        grade: student.grade,
        note: student.note,
        status: student.status,
      }}
      enrollments={student.enrollments.map((e) => ({
        id: e.id,
        classId: e.classId,
        className: e.class.name,
        subjectId: e.class.subjectId,
        feePerBatch: e.class.feePerBatch,
        enrolledAt: e.enrolledAt.toISOString(),
        isActive: e.endBatchNumber === null,
        currentBatchNumber: e.class.batches[0]?.batchNumber ?? 1,
      }))}
      receipts={student.receipts.map((r) => ({
        id: r.id,
        code: r.receiptCode ?? "—",
        issuedAt: r.issuedAt.toISOString(),
        receiptType: r.receiptType,
        manualReceiptCode: r.manualReceiptCode,
        totalAmount: r.totalAmount,
        lineItems: r.lineItems.map((li) => ({
          className: li.class.name,
          subjectName: li.class.subject.name,
          batchName: li.batch.name,
          amount: li.amount,
        })),
      }))}
      canManage={currentUser.role === "ADMIN"}
      otherClasses={sameGradeClasses}
    />
  );
}
