"use client";

import { useEffect, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { withdrawSchema } from "@/components/classes/enrollment-schema";
import { withdrawStudent, getClassBatchNames } from "@/app/(dashboard)/classes/enrollment-actions";

type BatchOption = { batchNumber: number; name: string };

export function WithdrawStudentModal({
  open,
  onClose,
  enrollmentId,
  classId,
  className,
  studentName,
  defaultEndBatchNumber,
}: {
  open: boolean;
  onClose: () => void;
  enrollmentId: string;
  classId: string;
  className: string;
  studentName: string;
  defaultEndBatchNumber: number;
}) {
  const [endBatchNumber, setEndBatchNumber] = useState(defaultEndBatchNumber);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !classId) return;
    getClassBatchNames(classId).then(setBatches);
  }, [open, classId]);

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = withdrawSchema.safeParse({ enrollmentId, endBatchNumber });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
      return;
    }

    startTransition(async () => {
      try {
        await withdrawStudent(parsed.data);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cho Học Sinh Nghỉ Lớp">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <p className="text-sm text-slate-600">
          Cho <strong>{studentName}</strong> nghỉ lớp <strong>{className}</strong>. Học sinh sẽ không
          còn xuất hiện trong danh sách đang học của lớp này nữa.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Học hết Đợt <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            value={endBatchNumber}
            onChange={(e) => setEndBatchNumber(Number(e.target.value))}
            disabled={batches.length === 0}
          >
            {batches.map((b) => (
              <option key={b.batchNumber} value={b.batchNumber}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Nợ phí các đợt đã học (bao gồm đợt này) vẫn được giữ lại để tra cứu, không bị xoá.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button type="submit" variant="danger" disabled={isPending || batches.length === 0}>
            {isPending ? "Đang lưu..." : "Xác Nhận Nghỉ Lớp"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
