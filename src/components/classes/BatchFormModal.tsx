"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { batchSchema } from "@/components/classes/class-schema";
import { updateBatch } from "@/app/(dashboard)/classes/actions";
import { dongToThousands, thousandsToDong } from "@/lib/currency";
import type { BatchStatus } from "@prisma/client";

const STATUS_LABELS: Record<BatchStatus, string> = {
  UPCOMING: "Sắp tới",
  ONGOING: "Đang học",
  COMPLETED: "Đã hoàn thành",
};
const STATUS_OPTIONS: BatchStatus[] = ["UPCOMING", "ONGOING", "COMPLETED"];

type Option = { id: string; name: string };
type TeacherOption = Option & { subjectId: string };
type BatchRecord = {
  id: string;
  batchNumber: number;
  name: string;
  teacherId: string;
  feePerBatch: number;
  status: BatchStatus;
};

export function BatchFormModal({
  open,
  onClose,
  batch,
  teachers,
  classSubjectId,
}: {
  open: boolean;
  onClose: () => void;
  batch?: BatchRecord;
  teachers: TeacherOption[];
  classSubjectId: string;
}) {
  const [name, setName] = useState(batch?.name ?? "");
  const [teacherId, setTeacherId] = useState(batch?.teacherId ?? "");
  // Chỉ đề xuất giáo viên đúng môn của lớp; nếu đợt đang gán giáo viên khác
  // môn (dữ liệu cũ), vẫn giữ họ trong danh sách kèm ghi chú thay vì làm mất
  // lựa chọn hiện tại — tương tự lọc khối ở EnrollStudentModal.
  const matchingTeachers = teachers.filter((t) => t.subjectId === classSubjectId);
  const currentMismatched = teachers.find((t) => t.id === teacherId && t.subjectId !== classSubjectId);
  const teacherOptions = currentMismatched ? [currentMismatched, ...matchingTeachers] : matchingTeachers;
  const [feeThousands, setFeeThousands] = useState(
    batch ? dongToThousands(batch.feePerBatch) : 0,
  );
  const [status, setStatus] = useState<BatchStatus>(batch?.status ?? "UPCOMING");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!batch) return;

    const parsed = batchSchema.safeParse({
      name,
      teacherId,
      feePerBatch: thousandsToDong(feeThousands),
      status,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startTransition(async () => {
      try {
        await updateBatch(batch.id, parsed.data);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  if (!batch) return null;

  return (
    <Modal open={open} onClose={handleClose} title={`Sửa Đợt Học — ${batch.name}`}>
      <form key={batch.id} className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tên đợt <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            defaultValue={batch.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Giáo viên phụ trách đợt <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            defaultValue={batch.teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            {teacherOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
                {teacher.id === currentMismatched?.id ? " (khác môn)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Học phí đợt (nghìn VNĐ) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            defaultValue={dongToThousands(batch.feePerBatch)}
            onChange={(e) => setFeeThousands(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Trạng thái đợt <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            defaultValue={batch.status}
            onChange={(e) => setStatus(e.target.value as BatchStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Chọn &quot;Đang học&quot; sẽ tự động chuyển đợt đang học hiện tại của lớp này (nếu có) sang &quot;Đã hoàn thành&quot;.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
