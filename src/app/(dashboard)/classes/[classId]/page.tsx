import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ClassDetailView } from "@/components/classes/ClassDetailView";

// Trang Chi Tiết Lớp Học Full-Page (requirements.md §4.4) — Admin + Teacher.
export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser.role === "CASHIER") {
    redirect("/pos");
  }

  const { classId } = await params;

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      subject: { select: { name: true } },
      academicYear: { select: { label: true } },
      primaryTeacher: { select: { fullName: true } },
      batches: {
        include: { teacher: { select: { fullName: true } } },
        orderBy: { batchNumber: "asc" },
      },
      enrollments: {
        where: { endBatchNumber: null },
        include: { student: { select: { id: true, code: true, fullName: true } } },
      },
    },
  });

  if (!klass) {
    notFound();
  }

  if (currentUser.role === "TEACHER" && klass.primaryTeacherId !== currentUser.teacherId) {
    redirect("/classes");
  }

  const currentBatch = klass.batches.find((b) => b.status === "ONGOING");

  const paidByStudent = new Map<string, number>();
  if (currentBatch) {
    const lineItems = await prisma.receiptLineItem.findMany({
      where: { batchId: currentBatch.id },
      include: { receipt: { select: { studentId: true } } },
    });
    for (const item of lineItems) {
      const prev = paidByStudent.get(item.receipt.studentId) ?? 0;
      paidByStudent.set(item.receipt.studentId, prev + item.amount);
    }
  }

  const enrolledStudentIds = new Set(klass.enrollments.map((e) => e.studentId));

  const [subjects, academicYears, teachers, allStudents] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.academicYear.findMany({ orderBy: { label: "desc" } }),
    prisma.teacher.findMany({ orderBy: { fullName: "asc" } }),
    currentUser.role === "ADMIN"
      ? prisma.student.findMany({
          where: { status: { not: "GRADUATED" } },
          select: { id: true, code: true, fullName: true },
          orderBy: { code: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const eligibleStudents = allStudents.filter((s) => !enrolledStudentIds.has(s.id));

  return (
    <ClassDetailView
      klass={{
        id: klass.id,
        name: klass.name,
        grade: klass.grade,
        subjectId: klass.subjectId,
        subjectName: klass.subject.name,
        academicYearId: klass.academicYearId,
        academicYearLabel: klass.academicYear.label,
        primaryTeacherId: klass.primaryTeacherId,
        primaryTeacherName: klass.primaryTeacher.fullName,
        feePerBatch: klass.feePerBatch,
        status: klass.status,
      }}
      batches={klass.batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        name: b.name,
        feePerBatch: b.feePerBatch,
        status: b.status,
        teacherId: b.teacherId,
        teacherName: b.teacher.fullName,
      }))}
      students={klass.enrollments.map((e) => {
        const paid = paidByStudent.get(e.studentId) ?? 0;
        const fee = currentBatch?.feePerBatch ?? klass.feePerBatch;
        const paidStatus = !currentBatch
          ? ("na" as const)
          : paid >= fee
            ? ("paid" as const)
            : paid > 0
              ? ("partial" as const)
              : ("unpaid" as const);
        return {
          enrollmentId: e.id,
          studentId: e.student.id,
          studentCode: e.student.code,
          studentName: e.student.fullName,
          paidStatus,
        };
      })}
      subjects={subjects}
      academicYears={academicYears.map((y) => ({ id: y.id, name: y.label }))}
      teachers={teachers.map((t) => ({ id: t.id, name: t.fullName }))}
      eligibleStudents={eligibleStudents}
      canManage={currentUser.role === "ADMIN"}
    />
  );
}
