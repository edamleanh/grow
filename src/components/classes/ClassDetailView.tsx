"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { ClassFormModal } from "@/components/classes/ClassFormModal";
import { BatchFormModal } from "@/components/classes/BatchFormModal";
import { EnrollStudentModal } from "@/components/classes/EnrollStudentModal";
import { WithdrawStudentModal } from "@/components/classes/WithdrawStudentModal";
import { TransferStudentModal } from "@/components/students/TransferStudentModal";
import { formatDong } from "@/lib/currency";
import type { BatchStatus, ClassStatus } from "@prisma/client";

type Option = { id: string; name: string };
type Subject = Option & { defaultFeePerBatch: number };
type TeacherOption = Option & { subjectId: string };

const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  OPEN: "Đang Mở",
  CLOSED: "Đã Khóa",
};
const CLASS_STATUS_TONES: Record<ClassStatus, StatusTone> = {
  OPEN: "green",
  CLOSED: "gray",
};

const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  UPCOMING: "SẮP TỚI",
  ONGOING: "ĐANG HỌC",
  COMPLETED: "ĐÃ HOÀN THÀNH",
};
const BATCH_STATUS_TONES: Record<BatchStatus, StatusTone> = {
  UPCOMING: "blue",
  ONGOING: "yellow",
  COMPLETED: "gray",
};

type ClassRecord = {
  id: string;
  name: string;
  grade: number;
  subjectId: string;
  subjectName: string;
  academicYearId: string;
  academicYearLabel: string;
  primaryTeacherId: string;
  primaryTeacherName: string;
  feePerBatch: number;
  status: ClassStatus;
};

type BatchRow = {
  id: string;
  batchNumber: number;
  name: string;
  feePerBatch: number;
  status: BatchStatus;
  teacherId: string;
  teacherName: string;
};

type StudentRow = {
  enrollmentId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  paidStatus: "paid" | "partial" | "unpaid" | "na";
};

export function ClassDetailView({
  klass,
  batches,
  students,
  subjects,
  academicYears,
  teachers,
  otherClasses,
  canManage,
}: {
  klass: ClassRecord;
  batches: BatchRow[];
  students: StudentRow[];
  subjects: Subject[];
  academicYears: Option[];
  teachers: TeacherOption[];
  otherClasses: { id: string; name: string; subjectId: string }[];
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"batches" | "students">("batches");
  const [editClassOpen, setEditClassOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRow | undefined>(undefined);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<StudentRow | undefined>(undefined);
  const [transferTarget, setTransferTarget] = useState<StudentRow | undefined>(undefined);
  const currentBatchNumber = batches.find((b) => b.status === "ONGOING")?.batchNumber ?? 1;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{klass.name}</h1>
              <StatusBadge tone={CLASS_STATUS_TONES[klass.status]} label={CLASS_STATUS_LABELS[klass.status]} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-4">
              <div>
                <dt className="text-slate-400">Môn & Khối</dt>
                <dd>
                  {klass.subjectName} · Khối {klass.grade}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Năm học</dt>
                <dd>{klass.academicYearLabel}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Giáo viên phụ trách</dt>
                <dd>{klass.primaryTeacherName}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Học phí gốc</dt>
                <dd>{formatDong(klass.feePerBatch)}</dd>
              </div>
            </dl>
          </div>
          {canManage && (
            <Button variant="secondary" onClick={() => setEditClassOpen(true)}>
              Chỉnh Sửa Thông Tin Lớp
            </Button>
          )}
        </div>
      </Card>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("batches")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "batches"
              ? "border-b-2 border-brand-600 text-brand-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Quản Lý 12 Đợt Học
        </button>
        <button
          type="button"
          onClick={() => setTab("students")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "students"
              ? "border-b-2 border-brand-600 text-brand-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Danh Sách Học Sinh Trong Lớp ({students.length})
        </button>
      </div>

      {tab === "batches" && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Số đợt</th>
                <th className="px-4 py-2 font-medium">Tên đợt</th>
                <th className="px-4 py-2 font-medium">Học phí đợt</th>
                <th className="px-4 py-2 font-medium">Trạng thái</th>
                <th className="px-4 py-2 font-medium">Giáo viên đợt</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((batch) => (
                <tr key={batch.id}>
                  <td className="px-4 py-2 text-slate-500">{batch.batchNumber}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{batch.name}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDong(batch.feePerBatch)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      tone={BATCH_STATUS_TONES[batch.status]}
                      label={BATCH_STATUS_LABELS[batch.status]}
                    />
                  </td>
                  <td className="px-4 py-2 text-slate-600">{batch.teacherName}</td>
                  <td className="px-4 py-2 text-right">
                    {canManage && (
                      <button
                        type="button"
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                        onClick={() => setEditingBatch(batch)}
                      >
                        Sửa Đợt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "students" && (
        <div className="space-y-3">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setEnrollOpen(true)}>+ Ghi Danh Học Sinh</Button>
            </div>
          )}
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Mã HS</th>
                <th className="px-4 py-2 font-medium">Họ tên</th>
                <th className="px-4 py-2 font-medium">Đóng phí đợt hiện tại</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    Chưa có học sinh ghi danh.
                  </td>
                </tr>
              )}
              {students.map((s) => (
                <tr key={s.enrollmentId}>
                  <td className="px-4 py-2 text-slate-500">{s.studentCode}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    <a href={`/students/${s.studentId}`} className="hover:text-brand-700">
                      {s.studentName}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    {s.paidStatus === "paid" && <StatusBadge tone="green" label="Đã đóng đủ" />}
                    {s.paidStatus === "partial" && <StatusBadge tone="yellow" label="Đóng thiếu" />}
                    {s.paidStatus === "unpaid" && <StatusBadge tone="red" label="Chưa đóng" />}
                    {s.paidStatus === "na" && <StatusBadge tone="gray" label="—" />}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="text-sm font-medium text-brand-600 hover:text-brand-700"
                          onClick={() => setTransferTarget(s)}
                        >
                          Chuyển Lớp
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                          onClick={() => setWithdrawTarget(s)}
                        >
                          Nghỉ Học
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <ClassFormModal
        open={editClassOpen}
        onClose={() => setEditClassOpen(false)}
        subjects={subjects}
        academicYears={academicYears}
        teachers={teachers}
        activeAcademicYearId={klass.academicYearId}
        klass={klass}
      />
      <BatchFormModal
        key={`batch-${editingBatch?.id ?? "none"}`}
        open={Boolean(editingBatch)}
        onClose={() => setEditingBatch(undefined)}
        batch={editingBatch}
        teachers={teachers}
        classSubjectId={klass.subjectId}
      />
      {canManage && (
        <EnrollStudentModal
          open={enrollOpen}
          onClose={() => setEnrollOpen(false)}
          classId={klass.id}
          batches={batches.map((b) => ({ batchNumber: b.batchNumber, name: b.name }))}
          defaultBatchNumber={currentBatchNumber}
        />
      )}
      {canManage && (
        <WithdrawStudentModal
          key={`withdraw-${withdrawTarget?.enrollmentId ?? "none"}`}
          open={Boolean(withdrawTarget)}
          onClose={() => setWithdrawTarget(undefined)}
          enrollmentId={withdrawTarget?.enrollmentId ?? ""}
          classId={klass.id}
          className={klass.name}
          studentName={withdrawTarget?.studentName ?? ""}
          defaultEndBatchNumber={currentBatchNumber}
        />
      )}
      {canManage && (
        <TransferStudentModal
          key={`transfer-${transferTarget?.enrollmentId ?? "none"}`}
          open={Boolean(transferTarget)}
          onClose={() => setTransferTarget(undefined)}
          enrollmentId={transferTarget?.enrollmentId ?? ""}
          currentClassId={klass.id}
          currentClassName={klass.name}
          defaultEndBatchNumber={currentBatchNumber}
          targetClasses={otherClasses.filter((c) => c.id !== klass.id && c.subjectId === klass.subjectId)}
        />
      )}
    </div>
  );
}
