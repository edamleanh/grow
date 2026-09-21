"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { StudentFormModal } from "@/components/students/StudentFormModal";
import { TransferStudentModal } from "@/components/students/TransferStudentModal";
import { formatDong } from "@/lib/currency";
import type { StudentStatus } from "@prisma/client";

const STATUS_LABELS: Record<StudentStatus, string> = {
  STUDYING: "Đang học",
  NO_CLASS: "Chưa có lớp",
  GRADUATED: "Đã tốt nghiệp",
};

const STATUS_TONES: Record<StudentStatus, StatusTone> = {
  STUDYING: "green",
  NO_CLASS: "gray",
  GRADUATED: "blue",
};

type EnrollmentRow = {
  id: string;
  classId: string;
  className: string;
  feePerBatch: number;
  enrolledAt: string;
  isActive: boolean;
  currentBatchNumber: number;
};

type ReceiptRow = {
  id: string;
  code: string;
  issuedAt: string;
  receiptType: "PRINTED" | "MANUAL";
  manualReceiptCode: string | null;
  totalAmount: number;
  lineItems: { className: string; subjectName: string; batchName: string; amount: number }[];
};

type StudentDetail = {
  id: string;
  code: string;
  fullName: string;
  phone: string | null;
  grade: number;
  note: string | null;
  status: StudentStatus;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function StudentDetailView({
  student,
  enrollments,
  receipts,
  canManage,
  otherClasses,
}: {
  student: StudentDetail;
  enrollments: EnrollmentRow[];
  receipts: ReceiptRow[];
  canManage: boolean;
  otherClasses: { id: string; name: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<"enrollments" | "receipts">("enrollments");
  const [transferEnrollment, setTransferEnrollment] = useState<EnrollmentRow | undefined>(undefined);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{student.fullName}</h1>
              <StatusBadge tone={STATUS_TONES[student.status]} label={STATUS_LABELS[student.status]} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-4">
              <div>
                <dt className="text-slate-400">Mã HS</dt>
                <dd>{student.code}</dd>
              </div>
              <div>
                <dt className="text-slate-400">SĐT</dt>
                <dd>{student.phone || "Chưa có SĐT"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Khối</dt>
                <dd>Khối {student.grade}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-slate-400">Ghi chú</dt>
                <dd>{student.note || "—"}</dd>
              </div>
            </dl>
          </div>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Sửa Thông Tin Cá Nhân
          </Button>
        </div>
      </Card>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("enrollments")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "enrollments"
              ? "border-b-2 border-brand-600 text-brand-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Lớp Đã Ghi Danh
        </button>
        <button
          type="button"
          onClick={() => setTab("receipts")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "receipts"
              ? "border-b-2 border-brand-600 text-brand-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Lịch Sử Biên Lai Thu Tiền
        </button>
      </div>

      {tab === "enrollments" && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Tên lớp</th>
                <th className="px-4 py-2 font-medium">Học phí/đợt</th>
                <th className="px-4 py-2 font-medium">Ngày đăng ký</th>
                <th className="px-4 py-2 font-medium">Trạng thái ghi danh</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Chưa ghi danh lớp nào.
                  </td>
                </tr>
              )}
              {enrollments.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 font-medium text-slate-900">{e.className}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDong(e.feePerBatch)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatDateTime(e.enrolledAt)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      tone={e.isActive ? "green" : "gray"}
                      label={e.isActive ? "Đang học" : "Đã kết thúc"}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage && e.isActive && (
                      <button
                        type="button"
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                        onClick={() => setTransferEnrollment(e)}
                      >
                        Chuyển Lớp
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "receipts" && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Mã Biên Lai</th>
                <th className="px-4 py-2 font-medium">Ngày & Giờ</th>
                <th className="px-4 py-2 font-medium">Loại thu</th>
                <th className="px-4 py-2 font-medium">Chi Tiết Mục Đóng</th>
                <th className="px-4 py-2 font-medium">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Chưa có biên lai nào.
                  </td>
                </tr>
              )}
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-slate-500">
                    {r.code}
                    {r.manualReceiptCode && (
                      <div className="text-xs text-slate-400">Mã tay: {r.manualReceiptCode}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{formatDateTime(r.issuedAt)}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.receiptType === "PRINTED" ? "In máy" : "Nhập tay"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <ul className="space-y-0.5">
                      {r.lineItems.map((li, idx) => (
                        <li key={idx}>
                          {li.className} - {li.subjectName} - {li.batchName}: {formatDong(li.amount)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-900">{formatDong(r.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StudentFormModal open={editOpen} onClose={() => setEditOpen(false)} student={student} />
      {canManage && (
        <TransferStudentModal
          key={transferEnrollment?.id ?? "none"}
          open={Boolean(transferEnrollment)}
          onClose={() => setTransferEnrollment(undefined)}
          enrollmentId={transferEnrollment?.id ?? ""}
          currentClassName={transferEnrollment?.className ?? ""}
          defaultEndBatchNumber={transferEnrollment?.currentBatchNumber ?? 1}
          targetClasses={otherClasses.filter((c) => c.id !== transferEnrollment?.classId)}
        />
      )}
    </div>
  );
}
